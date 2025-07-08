import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    try {
        // Langkah 1: Ambil SEMUA data crew dan SEMUA data outlets secara terpisah
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
             return NextResponse.json([]);
        }

        // Langkah 2: Buat sebuah "kamus" outlet untuk pencarian cepat. Format: { 'id-outlet': 'Nama Outlet' }
        const outletsMap = new Map(outletsData.map(o => [o.id, o.name]));

        // Langkah 3: Gabungkan data di JavaScript
        const combinedData = crewData.map(crew => ({
            id: crew.id,
            full_name: crew.full_name,
            role: crew.role,
            gender: crew.gender,
            // Ambil nama outlet dari "kamus" menggunakan outlet_id yang ada di data crew
            outlets: {
                name: outletsMap.get(crew.outlet_id) || 'Outlet Tidak Ditemukan'
            }
        }));

        // Langkah 4: Lakukan sorting seperti sebelumnya pada data yang sudah digabung
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

        return NextResponse.json(combinedData);
        
    } catch (error: any) {
        console.error("Error di API /api/all-crew:", error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}