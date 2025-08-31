import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const gender = searchParams.get('gender');

    if (!role || !gender) {
        return NextResponse.json({ message: 'Role and gender are required' }, { status: 400,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    try {
        // TENTUKAN URUTAN YANG DIINGINKAN DI SINI
        const aspectOrder = [
            "leadership", 
            "preparation", 
            "cashier", 
            "order_making", 
            "packing", 
            "stock_opname", 
            "cleanliness"
        ];
        
        let query = supabaseAdmin
            .from('assessment_weights')
            .select('aspect_key, aspect_name');

        query = query.or(`gender.eq.${gender},gender.is.null`);

        if (role === 'leader') {
             query = query.or(`role.eq.leader,role.eq.crew,role.is.null`);
        } else {
             query = query.or(`role.eq.crew,role.is.null`);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        const uniqueAspects = Array.from(new Map(data.map(item => [item.aspect_key, item])).values());

        // LAKUKAN SORTING BERDASARKAN URUTAN YANG SUDAH DITENTUKAN
        uniqueAspects.sort((a, b) => {
            const indexA = aspectOrder.indexOf(a.aspect_key);
            const indexB = aspectOrder.indexOf(b.aspect_key);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        
        if (role !== 'leader') {
            const filteredForCrew = uniqueAspects.filter(a => a.aspect_key !== 'leadership');
            return NextResponse.json(filteredForCrew, { headers: { 'Cache-Control': 'no-store' } });
        }

        return NextResponse.json(uniqueAspects, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}