import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Gunakan client biasa, bukan admin

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
        return NextResponse.json({ message: 'Key is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}