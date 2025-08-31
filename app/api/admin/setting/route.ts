import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Fungsi untuk admin mengambil pengaturan saat ini
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (key) {
            const { data, error } = await supabaseAdmin
                .from('app_settings')
                .select('*')
                .eq('key', key)
                .single();

            if (error) throw error;
            return NextResponse.json({ data });
        }

        const { data, error } = await supabaseAdmin
            .from('app_settings')
            .select('*')
            .order('key', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// Fungsi untuk admin mengubah pengaturan
export async function PATCH(request: Request) {
    try {
        const { key, value } = await request.json();
        if (!key || value === undefined) {
            return NextResponse.json({ message: 'Key dan Value dibutuhkan' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ value: value, updated_at: new Date().toISOString() })
            .eq('key', key);

        if (error) throw error;

        return NextResponse.json({ message: 'Pengaturan berhasil diperbarui' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}