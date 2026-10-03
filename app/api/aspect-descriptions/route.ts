import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;

/**
 * GET /api/aspect-descriptions?aspect_key=preparation&area_type=dine_in
 * Mengambil deskripsi aspek berdasarkan key dan tipe area outlet.
 * 
 * Jika tidak ada parameter, mengembalikan semua deskripsi.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const aspectKey = searchParams.get('aspect_key');
    const areaType = searchParams.get('area_type');

    try {
        let query = supabaseAdmin
            .from('aspect_descriptions')
            .select('*');

        if (aspectKey) {
            query = query.eq('aspect_key', aspectKey);
        }

        if (areaType) {
            query = query.eq('area_type', areaType);
        }

        const { data, error } = await query.order('aspect_key');

        if (error) throw error;

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
