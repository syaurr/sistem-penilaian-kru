import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const assessor_id = searchParams.get('assessor_id');

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

        const { data, error } = await supabaseAdmin
            .from('assessments')
            .select('assessed_id')
            .eq('assessor_id', assessor_id)
            .eq('period_id', activePeriod.id);

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