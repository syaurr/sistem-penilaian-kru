import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';       // Koneksi biasa (user anonim)
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Koneksi super admin

export async function GET() {
    console.log("\n--- [RLS TEST] MEMULAI TES HAK AKSES ---");

    try {
        console.log("[RLS TEST] 1. Mencoba membaca tabel 'outlets' dengan KUNCI BIASA (anon)...");
        const { data: normalData, error: normalError } = await supabase
            .from('outlets')
            .select('*')
            .limit(1);

        if (normalError) {
            console.log(`[RLS TEST] -> HASIL: GAGAL, seperti yang diharapkan. Error: ${normalError.message}`);
        } else if (normalData && normalData.length === 0) {
            console.log("[RLS TEST] -> HASIL: GAGAL, seperti yang diharapkan. Data yang diterima kosong karena diblokir RLS.");
        } else {
            console.log("[RLS TEST] -> HASIL: ANEH, seharusnya gagal tapi berhasil. Data:", normalData);
        }

    } catch (e) {
        console.log("[RLS TEST] -> HASIL: GAGAL (catch block), seperti yang diharapkan. Error:", (e as Error).message);
    }

    try {
        console.log("\n[RLS TEST] 2. Mencoba membaca tabel 'outlets' dengan KUNCI SUPER ADMIN (service_role)...");
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('outlets')
            .select('*')
            .limit(1);

        if (adminError) {
            console.error("[RLS TEST] -> HASIL: GAGAL. INI ADALAH AKAR MASALAHNYA! Error:", adminError.message);
        } else if (adminData && adminData.length > 0) {
            console.log("[RLS TEST] -> HASIL: BERHASIL, seperti yang diharapkan! Admin bisa membaca data:", adminData);
        } else {
             console.error("[RLS TEST] -> HASIL: GAGAL. INI ADALAH AKAR MASALAHNYA! Admin tidak bisa membaca data.");
        }
    } catch (e) {
         console.error("[RLS TEST] -> HASIL: GAGAL (catch block). INI ADALAH AKAR MASALAHNYA! Error:", (e as Error).message);
    }
    
    console.log("\n--- [RLS TEST] TES SELESAI ---");
    return NextResponse.json({ message: "Test complete. Check your server console." });
}