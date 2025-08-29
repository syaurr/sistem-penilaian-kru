import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Sekarang kita menerima rating_sistem dan rating_hr
        const { rating_sistem, rating_hr, assessor_id, period_id } = body;

        if (!rating_sistem || !rating_hr || !assessor_id || !period_id) {
            return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
        }

        // Kita akan membuat dua baris data, satu untuk setiap kategori
        const dataToInsert = [
            {
                category: 'sistem',
                rating: rating_sistem,
                assessor_id: assessor_id,
                period_id: period_id
            },
            {
                category: 'hr',
                rating: rating_hr,
                assessor_id: assessor_id,
                period_id: period_id
            }
        ];

        // Gunakan insert biasa, karena kita sudah cek di frontend
        const { error } = await supabaseAdmin
            .from('app_feedback')
            .insert(dataToInsert);

        if (error) throw error;

        return NextResponse.json({ message: 'Feedback berhasil disimpan' }, { status: 201 });

    } catch (error: any) {
        console.error("Error saving feedback:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}