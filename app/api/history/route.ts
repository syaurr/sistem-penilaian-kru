import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const assessor_id = searchParams.get('assessor_id');
    const assessor_code = searchParams.get('assessor_code');

    // Harus ada salah satu identifier: assessor_id ATAU assessor_code
    if (!assessor_id && !assessor_code) {
        return NextResponse.json({ message: 'assessor_id atau assessor_code wajib diisi.' }, { status: 400,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    try {
        const { data: activePeriod } = await supabaseAdmin
            .from('assessment_periods')
            .select('id')
            .eq('is_active', true)
            .single();

        // Jika tidak ada periode aktif, kembalikan array kosong (tidak ada riwayat)
        if (!activePeriod) {
            return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
        }

        // Build query berdasarkan identifier yang tersedia
        let query = supabaseAdmin
            .from('assessments')
            .select('assessed_id')
            .eq('period_id', activePeriod.id);

        if (assessor_code && assessor_code !== 'crew') {
            // Penilai spesialis: filter by assessor_code
            query = query.eq('assessor_code', assessor_code);
        } else if (assessor_id) {
            // Penilai crew/peer: filter by assessor_id
            query = query.eq('assessor_id', assessor_id);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }
        
        // Kembalikan array berisi ID yang sudah dinilai (plain string array)
        return NextResponse.json(data.map(item => item.assessed_id), { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        console.error("API /api/history Error:", error.message);
        return NextResponse.json({ message: "Gagal memuat riwayat penilaian." }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}