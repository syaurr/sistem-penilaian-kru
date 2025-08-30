import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { rating_sistem, rating_hr, message, assessor_id, period_id } = body;

        // Validasi data inti
        if (!rating_sistem || !rating_hr || !assessor_id || !period_id) {
            return NextResponse.json({ message: 'Data rating wajib diisi' }, { status: 400 });
        }

        // Siapkan data yang akan dimasukkan ke database
        const dataToInsert = [
            {
                category: 'sistem',
                rating: rating_sistem,
                assessor_id: assessor_id,
                period_id: period_id,
                message: null // Pesan tidak relevan untuk rating sistem
            },
            {
                category: 'hr',
                rating: rating_hr,
                assessor_id: assessor_id,
                period_id: period_id,
                message: message || null // Simpan pesan di sini, jika ada
            }
        ];

        // Gunakan upsert untuk menangani jika pengguna mengubah pilihan rating
        const { error } = await supabaseAdmin
            .from('app_feedback')
            .upsert(dataToInsert, {
                onConflict: 'category, assessor_id, period_id'
            });

        if (error) throw error;

        return NextResponse.json({ message: 'Feedback berhasil disimpan' }, { status: 201 });

    } catch (error: any) {
        console.error("Error saving feedback:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}