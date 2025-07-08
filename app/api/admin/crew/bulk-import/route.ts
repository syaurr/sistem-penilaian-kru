import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const crewData = await request.json();

        if (!Array.isArray(crewData) || crewData.length === 0) {
            return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });
        }

        // 'upsert' akan membuat data baru jika belum ada, atau mengupdate jika sudah ada
        // berdasarkan 'full_name' dan 'outlet_id'
        const { error } = await supabaseAdmin
            .from('crew')
            .upsert(crewData, { onConflict: 'full_name,outlet_id' });

        if (error) {
            console.error("Supabase upsert error:", error);
            throw new Error("Gagal mengimpor data kru. Pastikan tidak ada duplikat nama di outlet yang sama di file Anda.");
        }

        return NextResponse.json({ message: `${crewData.length} data kru berhasil diimpor/diperbarui.` }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}