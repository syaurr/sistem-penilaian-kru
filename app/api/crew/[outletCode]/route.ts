import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Kita akan menggunakan tipe 'NextRequest' untuk mendapatkan detail URL
import type { NextRequest } from 'next/server';

// Perhatikan: Kita sekarang HANYA menggunakan 'request' dan mengabaikan argumen kedua
export async function GET(request: NextRequest) {
    try {
        // === SOLUSI: Ambil outletCode dari URL secara manual ===
        // request.nextUrl.pathname akan berisi sesuatu seperti "/api/crew/KBP"
        const pathname = request.nextUrl.pathname;
        const segments = pathname.split('/'); // -> ['', 'api', 'crew', 'KBP']
        const outletCode = segments[segments.length - 1]; // Ambil segmen terakhir ('KBP')

        if (!outletCode || outletCode === 'crew') {
            return NextResponse.json({ message: 'Outlet code is missing from URL' }, { status: 400,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        // --- Sisa kode sama seperti sebelumnya ---

        // Cari dulu outlet_id berdasarkan outlet_code
        const { data: outletData, error: outletError } = await supabase
            .from('outlets')
            .select('id')
            .eq('outlet_code', outletCode.toUpperCase())
            .single();

        if (outletError || !outletData) {
            return NextResponse.json({ message: `Outlet with code ${outletCode} not found` }, { status: 404,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        // Ambil semua crew dari outlet_id yang ditemukan dan aktif
        const { data: crewData, error: crewError } = await supabase
            .from('crew')
            .select('id, full_name, role, gender')
            .eq('outlet_id', outletData.id)
            .eq('is_active', true)
            .order('full_name', { ascending: true });
        
        if (crewError) {
            throw crewError;
        }

        return NextResponse.json(crewData, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        console.error('Error fetching crew by outlet:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}