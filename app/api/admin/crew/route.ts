import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// GET: Mengambil semua data kru
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('crew')
            .select('*, outlets(id, name)')
            .order('full_name', { ascending: true });
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// POST: Membuat kru baru
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { error } = await supabase.from('crew').insert(body);
        if (error) throw error;
        return NextResponse.json({ message: 'Kru berhasil dibuat' }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// PATCH: Mengubah data kru
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;
        const { error } = await supabase.from('crew').update(updateData).eq('id', id);
        if (error) throw error;
        return NextResponse.json({ message: 'Kru berhasil diperbarui' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// DELETE: Menghapus data kru
export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        const { error } = await supabase.from('crew').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ message: 'Kru berhasil dihapus' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}