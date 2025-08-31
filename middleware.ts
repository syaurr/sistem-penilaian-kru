import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Buat response awal. Ini akan kita modifikasi nanti.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Buat Supabase client yang bisa berjalan di server (middleware).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Jika kita perlu set cookie, kita harus update request dan response.
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // Jika kita perlu hapus cookie, kita juga harus update request dan response.
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Ambil data user dari session cookie yang ada di request.
  const { data: { session } } = await supabase.auth.getSession()

  // Jika TIDAK ADA session (user belum login) DAN mencoba akses halaman /admin
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    // Arahkan ke halaman login
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Jika ADA session (user sudah login) DAN mencoba akses halaman /login
  if (session && request.nextUrl.pathname.startsWith('/login')) {
      // Arahkan ke dashboard admin
      return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Jika semua kondisi aman, lanjutkan ke halaman yang dituju.
  return response
}

// Tentukan halaman mana saja yang akan dijaga oleh middleware ini.
export const config = {
  matcher: ['/admin/:path*', '/login'],
}