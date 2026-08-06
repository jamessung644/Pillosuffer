import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * 앱용 세션 저장소.
 *
 * 웹에서 쓰는 createBrowserClient(@supabase/ssr)는 세션을 쿠키에 넣는다. 앱에는
 * 그 쿠키를 읽어줄 서버가 없고, capacitor://localhost 오리진의 쿠키 수명도 보장되지
 * 않는다. Capacitor Preferences(iOS UserDefaults)에 넣어야 앱을 껐다 켜도 로그인이
 * 유지된다. PKCE code verifier 도 여기에 저장되므로, 브라우저를 다녀오는 동안
 * 앱이 백그라운드로 내려가도 코드 교환이 가능하다.
 */
const capacitorStorage = {
  getItem: async (k: string) => (await Preferences.get({ key: k })).value,
  setItem: async (k: string, v: string) => {
    await Preferences.set({ key: k, value: v })
  },
  removeItem: async (k: string) => {
    await Preferences.remove({ key: k })
  },
}

let cached: SupabaseClient | undefined

/**
 * 브라우저·앱 공용 Supabase 인스턴스.
 * 모듈 싱글턴이다 — 인스턴스가 여러 개면 auth 상태 구독이 어긋난다.
 */
export function createClient(): SupabaseClient {
  if (cached) return cached

  cached = Capacitor.isNativePlatform()
    ? createSupabaseClient(url, key, {
        auth: {
          storage: capacitorStorage,
          persistSession: true,
          autoRefreshToken: true,
          // 앱은 커스텀 스킴 딥링크로 code 를 받아 AuthProvider 에서 직접 교환한다.
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : (createBrowserClient(url, key) as unknown as SupabaseClient)

  return cached
}
