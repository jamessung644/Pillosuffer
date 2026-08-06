'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { createClient } from '@/lib/supabase'
import { handleAuthDeepLink, toUserMessage } from '@/lib/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  authError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  authError: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // 초기 세션 로드
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // 세션 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  /**
   * 앱에서만: OAuth 콜백 딥링크 처리.
   * 웹은 /auth/callback 라우트가 서버에서 코드를 교환하므로 여기 올 일이 없다.
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listener: PluginListenerHandle | undefined
    let cancelled = false

    async function consume(url: string) {
      try {
        await handleAuthDeepLink(url)
        if (!cancelled) setAuthError(null)
      } catch (err) {
        if (!cancelled) setAuthError(toUserMessage(err))
      }
    }

    App.addListener('appUrlOpen', ({ url }) => { void consume(url) }).then(handle => {
      if (cancelled) { void handle.remove(); return }
      listener = handle
    })

    // 앱이 딥링크로 콜드 스타트되면 리스너 등록 전에 URL 이 도착할 수 있다.
    App.getLaunchUrl().then(launch => {
      if (launch?.url) void consume(launch.url)
    })

    return () => {
      cancelled = true
      void listener?.remove()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
