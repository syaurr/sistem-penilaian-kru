import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(request: Request) {
    try {
        const { id, category } = await request.json();
        if (!id || !category) {
            return NextResponse.json({ message: 'ID atau Kategori tidak ada' }, { status: 400,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        const { error } = await supabaseAdmin
            .from('app_feedback')
            .update({ message_category: category })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Kategori berhasil diperbarui' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}