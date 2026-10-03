import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;

/**
 * GET /api/assessors
 * Mengembalikan daftar semua asesor (untuk dropdown di halaman penilaian).
 * 
 * GET /api/assessors?code=qc1
 * Mengembalikan data asesor tunggal berdasarkan kode.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    try {
        let query = supabaseAdmin
            .from('assessors')
            .select('*');

        if (code) {
            query = query.eq('code', code);
        } else {
            query = query.neq('code', 'crew');
        }

        const { data, error } = await query.order('code');

        if (error) throw error;

        if (code) {
            // Mengembalikan objek tunggal jika query by code
            return NextResponse.json(data?.[0] || null, {
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        return NextResponse.json(data || [], {
            headers: { 'Cache-Control': 'no-store' }
        });
    } catch (error: any) {
        return NextResponse.json(
            { message: 'Internal Server Error', error: error.message },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
