import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;

/**
 * PATCH /api/admin/descriptions
 * Menerima array { id, description_text } dan update deskripsi aspek.
 */
export async function PATCH(request: Request) {
    try {
        const updates: { id: number; description_text: string }[] = await request.json();

        const promises = updates.map(({ id, description_text }) =>
            supabaseAdmin
                .from('aspect_descriptions')
                .update({ description_text })
                .eq('id', id)
        );

        const results = await Promise.all(promises);
        
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            throw new Error(`${errors.length} update gagal: ${errors[0].error?.message}`);
        }

        return NextResponse.json(
            { message: `${updates.length} deskripsi berhasil diperbarui.` },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
