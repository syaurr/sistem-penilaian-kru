import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('assessment_periods')
            // --- PERBAIKAN DI SINI ---
            // Minta Supabase untuk mengirimkan 'id' DAN 'name'
            .select('id, name') 
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ message: "Tidak ada periode aktif" }, { headers: { 'Cache-Control': 'no-store' } });
            }
            throw error;
        }

        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        console.error("Error fetching active period:", error);
        return NextResponse.json({ message: error.message }, { headers: { 'Cache-Control': 'no-store' } });
    }
}