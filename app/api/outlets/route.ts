// File: app/api/outlets/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
export const revalidate = 0;
export async function GET() {
    try {
        const { data, error } = await supabase.from('outlets').select('id, name');
        if (error) throw error;
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}