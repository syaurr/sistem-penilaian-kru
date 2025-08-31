import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// GET: Mengambil semua data outlet
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('outlets')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}

// POST: Membuat outlet baru
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { error } = await supabase.from('outlets').insert(body);
        if (error) throw error;
        return NextResponse.json({ message: 'Outlet berhasil dibuat' }, { status: 201,
            headers: { 'Cache-Control': 'no-store' }
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}

// PATCH: Mengubah data outlet
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;
        const { error } = await supabase.from('outlets').update(updateData).eq('id', id);
        if (error) throw error;
        return NextResponse.json({ message: 'Outlet berhasil diperbarui' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}

// DELETE: Menghapus data outlet
export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        // Peringatan: Menghapus outlet akan menghapus semua kru yang terkait karena kita set 'ON DELETE CASCADE'
        const { error } = await supabase.from('outlets').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ message: 'Outlet berhasil dihapus' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}