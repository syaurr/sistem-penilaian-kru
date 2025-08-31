import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const assessor_id = searchParams.get('assessor_id');
    const period_id = searchParams.get('period_id');

    if (!assessor_id || !period_id) {
        return NextResponse.json({ message: 'ID Penilai atau Periode tidak ada' }, { status: 400,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('app_feedback')
            .select('category, rating')
            .eq('assessor_id', assessor_id)
            .eq('period_id', period_id);

        if (error) throw error;

        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        console.error("Error fetching feedback:", error);
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}