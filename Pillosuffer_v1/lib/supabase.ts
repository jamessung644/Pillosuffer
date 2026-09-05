import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** 브라우저(클라이언트 컴포넌트) 전용 Supabase 인스턴스 */
export function createClient() {
  return createBrowserClient(url, key)
}
