// File: app/api/supervisors/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('crew')
            .select('id, full_name')
            .eq('role', 'supervisor')
            .eq('is_active', true)
            .order('full_name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}