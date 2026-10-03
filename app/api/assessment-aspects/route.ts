import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ASPECT_ORDER } from '@/lib/constants';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const gender = searchParams.get('gender');
    const assessorCode = searchParams.get('assessor_code') || 'crew';

    if (!role || !gender) {
        return NextResponse.json(
            { message: 'Role and gender are required' },
            { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
    }

    try {
        // 1. Ambil semua aspek dari assessment_weights
        let query = supabaseAdmin
            .from('assessment_weights')
            .select('aspect_key, aspect_name');

        query = query.or(`gender.eq.${gender},gender.is.null`);

        if (role === 'leader') {
            query = query.or(`role.eq.leader,role.eq.crew,role.is.null`);
        } else {
            query = query.or(`role.eq.crew,role.is.null`);
        }

        const { data: weightData, error: weightError } = await query;
        if (weightError) throw weightError;

        // 2. Ambil matriks asesor dari assessor_aspect_mapping
        const targetRole = role === 'leader' ? 'leader' : 'crew';
        const { data: mappingData, error: mappingError } = await supabaseAdmin
            .from('assessor_aspect_mapping')
            .select('aspect_key, is_enabled')
            .eq('assessor_code', assessorCode)
            .eq('target_role', targetRole)
            .eq('is_enabled', true);

        if (mappingError) throw mappingError;

        // 3. Buat set aspek yang diizinkan berdasarkan matriks
        const enabledAspects = new Set(
            (mappingData || []).map(m => m.aspect_key)
        );

        // 4. Filter aspek berdasarkan matriks asesor
        const uniqueAspects = Array.from(
            new Map((weightData || []).map(item => [item.aspect_key, item])).values()
        );

        // 5. Filter: hanya aspek yang enabled di matriks
        let filteredAspects = uniqueAspects.filter(a => enabledAspects.has(a.aspect_key));

        // 6. Untuk crew yang dinilai peer (assessor_code = 'crew'), aspek leadership tetap di-exclude
        if (role !== 'leader' && assessorCode === 'crew') {
            filteredAspects = filteredAspects.filter(a => a.aspect_key !== 'leadership');
        }

        // 7. Sorting berdasarkan urutan standar
        filteredAspects.sort((a, b) => {
            const indexA = ASPECT_ORDER.indexOf(a.aspect_key);
            const indexB = ASPECT_ORDER.indexOf(b.aspect_key);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        return NextResponse.json(filteredAspects, {
            headers: { 'Cache-Control': 'no-store' }
        });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Internal Server Error', error: error.message },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}