import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
export const revalidate = 0;
// GET: Mengambil semua periode
export async function GET() {
    const { data, error } = await supabaseAdmin.from('assessment_periods').select('*').order('start_date', { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500,
        headers: { 'Cache-Control': 'no-store' }
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

// POST: Membuat periode baru
export async function POST(request: Request) {
    const body = await request.json();
    const { error } = await supabaseAdmin.from('assessment_periods').insert(body);
    if (error) return NextResponse.json({ message: error.message }, { status: 500,
        headers: { 'Cache-Control': 'no-store' }
    });
    return NextResponse.json({ message: 'Periode berhasil dibuat' }, { status: 201,
        headers: { 'Cache-Control': 'no-store' }
    });
}

// PATCH: Mengaktifkan sebuah periode
export async function PATCH(request: Request) {
    try {
        const { id } = await request.json();
        
        // Panggil fungsi database dan TANGKAP HASILNYA
        const { error } = await supabaseAdmin.rpc('deactivate_all_periods_and_activate_one', { 
            period_id_to_activate: id 
        });

        // JIKA ADA ERROR dari fungsi tersebut, lemparkan error
        if (error) {
            console.error("RPC Error:", error);
            throw new Error("Fungsi database gagal dieksekusi. Pastikan sudah dibuat.");
        }

        // Jika tidak ada error, baru kirim pesan sukses
        return NextResponse.json({ message: 'Periode berhasil diaktifkan' }, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        // Blok catch ini akan menangkap error yang kita lemparkan
        return NextResponse.json({ message: error.message }, { status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}