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
    <div className="page-padding flex flex-col min-h-screen bg-white">
      {/* 닫기 */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 active:bg-gray-100"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* 로고 + 안내 */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-12">
        <div className="w-20 h-20 rounded-3xl bg-gray-900 flex items-center justify-center mb-5">
          <span className="text-4xl">💊</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">PilloSuffer</h1>
        <p className="text-base text-gray-500 mt-2 text-center leading-relaxed">
          간편하게 로그인하고<br />
          내 약 정보를 안전하게 관리하세요
        </p>
      </div>

      {/* 로그인 버튼 */}
      <div className="space-y-3 pb-2">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white border border-gray-200 text-gray-800 text-base font-semibold rounded-2xl active:bg-gray-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-3 shadow-sm"
        >
          {loading ? (
            <span>이동 중...</span>
          ) : (
            <>
              <GoogleIcon />
              Google로 시작하기
            </>
          )}
        </button>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <p className="text-center text-xs text-gray-400 pt-3 leading-relaxed">
          로그인하면 약 정보가 기기 사이에서 동기화됩니다.<br />
          로그인 없이도 서비스 이용이 가능합니다.
        </p>

        <button
          onClick={() => router.push('/')}
          className="w-full py-3 text-sm text-gray-500 font-medium active:text-gray-700"
        >
          로그인 없이 둘러보기
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page-padding min-h-screen bg-white" />}>
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
