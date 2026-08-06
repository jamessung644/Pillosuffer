import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { createClient } from './supabase'

/**
 * 앱이 OAuth 콜백을 받을 커스텀 URL 스킴.
 * ios/App/App/Info.plist 의 CFBundleURLTypes 와 반드시 같아야 하고,
 * Supabase 대시보드 Authentication → URL Configuration → Redirect URLs 에도
 * 등록돼 있어야 한다.
 */
export const NATIVE_REDIRECT_URL = 'com.jamessung.pillosuffer://auth/callback'

/**
 * Google 로그인.
 *
 * 웹: 기존과 동일하게 /auth/callback 라우트로 리다이렉트된다.
 * 앱: window.location.origin 이 capacitor://localhost 라서 그쪽으로 돌아올 수 없다.
 *     시스템 브라우저(SFSafariViewController)를 띄우고, 커스텀 스킴으로 돌아오는
 *     code 는 AuthProvider 의 appUrlOpen 리스너가 세션으로 교환한다.
 */
export async function signInWithGoogle(next = '/'): Promise<void> {
  const supabase = createClient()

  if (!Capacitor.isNativePlatform()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) throw error
    return
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_REDIRECT_URL, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data.url) throw new Error('로그인 주소를 받지 못했습니다. 잠시 후 다시 시도해 주세요.')

  await Browser.open({ url: data.url })
}

/**
 * 인증 오류를 사용자용 한국어 문구로 바꾼다.
 *
 * Supabase SDK 는 "PKCE code verifier not found in storage..." 처럼 개발자용 영문
 * 메시지를 던진다. 그대로 노출하면 사용자가 이해할 수 없으므로 원문은 콘솔에만
 * 남기고 화면에는 행동 가능한 문구를 보여준다.
 */
export function toUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  console.error('[auth]', raw)

  if (/access_denied|cancell?ed/i.test(raw)) return '로그인이 취소되었습니다.'
  if (/code verifier|invalid request|expired/i.test(raw)) {
    return '로그인 정보가 만료되었습니다. 다시 시도해 주세요.'
  }
  if (/network|fetch|timeout|offline/i.test(raw)) {
    return '네트워크 연결을 확인해 주세요.'
  }
  return '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

/**
 * 딥링크 URL 에서 인증 결과를 꺼내 세션으로 교환한다.
 * 콜백이 아닌 URL 이면 아무것도 하지 않고 false 를 돌려준다.
 */
export async function handleAuthDeepLink(rawUrl: string): Promise<boolean> {
  if (!rawUrl.startsWith('com.jamessung.pillosuffer://')) return false

  let params: URLSearchParams
  try {
    params = new URL(rawUrl).searchParams
  } catch {
    return false
  }

  const code = params.get('code')
  const errorDescription = params.get('error_description') ?? params.get('error')

  // 브라우저 시트를 먼저 닫아야 사용자가 결과 화면을 바로 본다.
  await Browser.close().catch(() => {})

  if (errorDescription) throw new Error(errorDescription)
  if (!code) return false

  const { error } = await createClient().auth.exchangeCodeForSession(code)
  if (error) throw error
  return true
}
