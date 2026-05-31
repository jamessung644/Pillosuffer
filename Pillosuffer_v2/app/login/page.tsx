'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="page-padding flex flex-col min-h-screen grid-bg lg:max-w-md lg:mx-auto">
      {/* 닫기 */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => router.back()}
          aria-label="닫기"
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-zinc-400 active:bg-white/[0.08]"
        >
          ✕
        </button>
      </div>

      {/* 로고 + 안내 */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-12">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-accent-lime/30 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-accent-lime/20 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PilloSuffer" className="w-16 h-16 object-contain" />
          </div>
        </div>
        <h1 className="text-4xl font-light tracking-tight text-zinc-100">PilloSuffer</h1>
        <p className="text-sm text-zinc-500 mt-3 text-center leading-relaxed">
          스마트한 약물 × 음식 안전 검사<br />
          AI 기반
        </p>

        <div className="flex items-center gap-1.5 mt-5">
          <span className="dot bg-accent-lime relative pulse-dot" />
          <span className="text-xs tracking-widest text-zinc-500 font-medium">
            DrugBank · 2,512건 상호작용
          </span>
        </div>
      </div>

      {/* 로그인 */}
      <div className="space-y-3 pb-2">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white text-ink-950 text-base font-semibold rounded-2xl active:bg-zinc-200 disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {loading ? (
            <span>이동 중…</span>
          ) : (
            <>
              <GoogleIcon />
              Google로 시작하기
            </>
          )}
        </button>

        {error && (
          <p className="text-center text-xs text-accent-red">{error}</p>
        )}

        <p className="text-center text-xs tracking-widest text-zinc-600 pt-3 leading-relaxed">
          기기 간 동기화 · 선택사항
        </p>

        <button
          onClick={() => {
            // 다음 방문부터 로그인 페이지로 자동 리다이렉트 안 함
            localStorage.setItem('pillo-visited', '1')
            router.push('/')
          }}
          className="w-full py-3 text-sm text-zinc-500 font-medium active:text-zinc-300"
        >
          로그인 없이 둘러보기
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <LoginContent />
    </Suspense>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}
