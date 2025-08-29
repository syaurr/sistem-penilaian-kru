import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('assessment_periods')
            .select('name')
            .eq('is_active', true)
            .single(); // Ambil hanya satu baris

        if (error) {
            // Jika tidak ada periode aktif, jangan anggap sebagai error
            if (error.code === 'PGRST116') {
                return NextResponse.json({ name: null });
            }
            throw error;
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Error fetching active period:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}