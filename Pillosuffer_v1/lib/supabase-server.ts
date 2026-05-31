import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** 서버 컴포넌트/Route Handler 전용 Supabase 인스턴스 (쿠키 기반 세션) */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component에서는 set 불가 — middleware가 처리
          }
        },
      },
    }
  )
}
