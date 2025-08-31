import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// PERINTAH BARU UNTUK VERCEL: Jadikan rute ini sepenuhnya dinamis
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [crewResponse, outletsResponse] = await Promise.all([
            supabaseAdmin.from('crew').select('*').in('role', ['crew', 'leader']).eq('is_active', true),
            supabaseAdmin.from('outlets').select('id, name')
        ]);

        const { data: crewData, error: crewError } = crewResponse;
        const { data: outletsData, error: outletsError } = outletsResponse;

        if (crewError || outletsError) {
            console.error("Error fetching data:", crewError || outletsError);
            throw new Error("Gagal mengambil data crew atau outlets dari database.");
        }
        if (!crewData || !outletsData) {
             return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
        }

        const outletsMap = new Map(outletsData.map(o => [o.id, o.name]));
        
        const combinedData = crewData.map(crew => ({
            id: crew.id,
            full_name: crew.full_name,
            role: crew.role,
            outlets: {
                name: outletsMap.get(crew.outlet_id) || 'N/A'
            }
        }));
        
        combinedData.sort((a, b) => {
            const outletA = a.outlets?.name || '';
            const outletB = b.outlets?.name || '';
            if (outletA < outletB) return -1;
            if (outletA > outletB) return 1;
            if (a.role === 'leader' && b.role !== 'leader') return -1;
            if (a.role !== 'leader' && b.role === 'leader') return 1;
            if (a.full_name < b.full_name) return -1;
            if (a.full_name > b.full_name) return 1;
            return 0;
        });

        return NextResponse.json(combinedData, { headers: { 'Cache-Control': 'no-store' } });
        
    } catch (error: any) {
        console.error("Error di API /api/all-crew:", error.message);
        return NextResponse.json({ message: error.message }, { headers: { 'Cache-Control': 'no-store' } });
    }
}