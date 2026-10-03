import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;

/**
 * GET /api/admin/mapping
 * Mengembalikan seluruh data assessor_aspect_mapping.
 */
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('assessor_aspect_mapping')
            .select('*')
            .order('aspect_key')
            .order('target_role')
            .order('assessor_code');

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

/**
 * PATCH /api/admin/mapping
 * Menerima array { id, is_enabled } dan update satu per satu.
 */
export async function PATCH(request: Request) {
    try {
        const updates: { id: number; is_enabled: boolean }[] = await request.json();

        // Bulk update: update setiap mapping berdasarkan ID
        const promises = updates.map(({ id, is_enabled }) =>
            supabaseAdmin
                .from('assessor_aspect_mapping')
                .update({ is_enabled })
                .eq('id', id)
        );

        const results = await Promise.all(promises);
        
        // Cek apakah ada error di salah satu update
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            throw new Error(`${errors.length} update gagal: ${errors[0].error?.message}`);
        }

        return NextResponse.json(
            { message: `${updates.length} pemetaan berhasil diperbarui.` },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
