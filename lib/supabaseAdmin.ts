import { createClient } from '@supabase/supabase-js';

// Ambil variabel dari environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cek apakah variabel ada
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL or Service Role Key is missing from environment variables.");
}

// Klien ini punya akses penuh dan bisa melewati RLS. 
// HANYA UNTUK DIGUNAKAN DI BACKEND (API Routes).
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        // Konfigurasi ini penting untuk client di server-side
        autoRefreshToken: false,
        persistSession: false
    }
});