import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log(`--- [MIDDLEWARE] Menjaga rute: ${request.nextUrl.pathname} ---`);

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Cek apakah environment variables terbaca
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log(`[MIDDLEWARE] Supabase URL terbaca: ${supabaseUrl ? 'YA' : 'TIDAK'}`);
  console.log(`[MIDDLEWARE] Supabase Key terbaca: ${supabaseKey ? 'YA' : 'TIDAK'}`);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)?.value;
          console.log(`[MIDDLEWARE] Membaca cookie '${name}': ${cookie ? 'ADA' : 'TIDAK ADA'}`);
          return cookie;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  console.log("[MIDDLEWARE] Mencoba mengambil session...");
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
      console.log("[MIDDLEWARE] HASIL: Ditemukan session untuk user:", session.user.email);
  } else {
      console.log("[MIDDLEWARE] HASIL: Tidak ditemukan session (dianggap belum login).");
  }

  // Logika redirect (tidak berubah)
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    console.log("[MIDDLEWARE] KEPUTUSAN: Belum login, akses /admin ditolak -> redirect ke /login");
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (session && request.nextUrl.pathname.startsWith('/login')) {
      console.log("[MIDDLEWARE] KEPUTUSAN: Sudah login, akses /login ditolak -> redirect ke /admin");
      return NextResponse.redirect(new URL('/admin', request.url))
  }

  console.log("[MIDDLEWARE] KEPUTUSAN: Akses diizinkan.");
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}