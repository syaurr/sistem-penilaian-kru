import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 0;

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('assessment_periods')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

        if (error || !data) {
            console.error('FINAL DEBUG: Gagal menemukan periode aktif di DB:', error);
            throw new Error('Tidak ada periode penilaian yang aktif di database.');
        }

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}