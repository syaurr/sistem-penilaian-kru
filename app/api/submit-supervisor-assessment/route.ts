// File: app/api/submit-supervisor-assessment/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
export const revalidate = 0;
export async function POST(request: Request) {
    try {
        const { supervisor_id, scores } = await request.json(); // scores akan berbentuk: [{ assessed_crew_id: 'uuid', score: 90 }]

        if (!supervisor_id || !scores || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        const { data: activePeriod, error: periodError } = await supabase
            .from('assessment_periods')
            .select('id')
            .eq('is_active', true)
            .single();

        if (periodError || !activePeriod) {
            throw new Error('Tidak ada periode penilaian yang aktif.');
        }

        // Siapkan data untuk batch insert
        const dataToInsert = scores.map(item => ({
            period_id: activePeriod.id,
            supervisor_id,
            assessed_crew_id: item.assessed_crew_id,
            score: item.score,
        }));

        const { error: insertError } = await supabase
            .from('supervisor_assessments')
            .insert(dataToInsert);

        if (insertError) throw insertError;

        return NextResponse.json({ message: 'Semua penilaian berhasil disimpan!' }, { status: 201,
            headers: { 'Cache-Control': 'no-store' }
        });

    } catch (error: any) {
        console.error('Error submitting supervisor assessment:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}