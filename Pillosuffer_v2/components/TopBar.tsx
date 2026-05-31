'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

interface TopBarProps {
  alertCount?: number
}

/** 검색바 + 알림 + 프로필 (이미지 2 스타일 상단 바) */
export default function TopBar({ alertCount = 0 }: TopBarProps) {
  const { user } = useAuth()
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="flex items-center gap-2.5">
      {/* 검색바 */}
      <Link
        href="/food"
        className="flex-1 flex items-center gap-2.5 glass rounded-full px-4 py-2.5 active:bg-white/[0.08] transition-colors"
      >
        <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="text-sm text-zinc-500 flex-1">음식·영양제 검색…</span>
        <kbd className="hidden sm:inline text-[10px] text-zinc-600 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
      </Link>

      {/* 알림 */}
      <button
        aria-label="알림"
        className="relative w-10 h-10 rounded-full glass flex items-center justify-center active:bg-white/[0.08] transition-colors"
      >
        <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {alertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-ink-950">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </button>

      {/* 프로필 */}
      <Link
        href="/profile"
        aria-label="프로필"
        className="w-10 h-10 rounded-full overflow-hidden glass flex items-center justify-center active:bg-white/[0.08]"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </Link>
    </div>
  )
}
