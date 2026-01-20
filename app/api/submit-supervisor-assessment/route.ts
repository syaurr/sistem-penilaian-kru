// File: app/api/submit-supervisor-assessment/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Mencegah caching agar selalu mengambil data periode terbaru
export const revalidate = 0; 

export async function POST(request: Request) {
    try {
        const { supervisor_id, scores } = await request.json(); 

        // Validasi payload
        if (!supervisor_id || !scores || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json(
                { message: 'Data tidak lengkap atau kosong.' }, 
                { status: 400 }
            );
        }

        // 1. Ambil Periode Aktif
        const { data: activePeriod, error: periodError } = await supabase
            .from('assessment_periods')
            .select('id')
            .eq('is_active', true)
            .single();

        if (periodError || !activePeriod) {
            // Mengembalikan 404 agar frontend tahu masalahnya spesifik
            return NextResponse.json(
                { message: 'Tidak ada periode penilaian yang aktif saat ini.' }, 
                { status: 404 }
            );
        }

        // 2. Siapkan data
        const dataToInsert = scores.map((item: any) => ({
            period_id: activePeriod.id,
            supervisor_id: supervisor_id,
            assessed_crew_id: item.assessed_crew_id,
            score: item.score,
            // created_at: new Date() // Opsional, biasanya otomatis di DB
        }));

        // 3. Eksekusi ke Database (Pakai Upsert)
        // Pastikan tabel supervisor_assessments ada kolom-kolom ini
        const { error: insertError } = await supabase
            .from('supervisor_assessments')
            .upsert(dataToInsert, {
                // Pastikan Anda sudah set Unique Constraint di DB untuk 3 kolom ini
                onConflict: 'period_id, supervisor_id, assessed_crew_id' 
            });

        if (insertError) {
            console.error('Supabase Error:', insertError);
            throw new Error(insertError.message);
        }

        return NextResponse.json(
            { message: 'Penilaian berhasil disimpan!' }, 
            { status: 201 }
        );

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { message: 'Terjadi kesalahan server.', error: error.message }, 
            { status: 500 }
        );
    }
}