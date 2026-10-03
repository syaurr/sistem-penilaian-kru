import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const assessor_id = searchParams.get('assessor_id');
    const assessor_code = searchParams.get('assessor_code');

    if (!assessor_id) {
        return NextResponse.json({ message: 'Assessor ID is required' }, { status: 400,
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

        // Untuk penilai spesialis (assessor_code ada dan bukan 'crew'),
        // query by assessor_code karena assessor_id mereka null di tabel assessments
        let query = supabaseAdmin
            .from('assessments')
            .select('assessed_id')
            .eq('period_id', activePeriod.id);

        if (assessor_code && assessor_code !== 'crew') {
            query = query.eq('assessor_code', assessor_code);
        } else {
            query = query.eq('assessor_id', assessor_id);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }
        
        // Kirim kembali hanya array berisi ID
        return NextResponse.json(data.map(item => item.assessed_id), { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        // Tetap simpan log error di server untuk pemantauan
        console.error("API /api/history Error:", error.message);
        return NextResponse.json({ message: "Gagal memuat riwayat penilaian." }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}