'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import ThemeToggle from '@/components/ThemeToggle'

/**
 * 데스크탑 좌측 사이드 네비게이션 (≥ 1024px에서만 표시)
 * - 로고
 * - 메인 네비 5개
 * - 데이터베이스 상태 / 프로필
 */
export default function SideNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.name ?? '게스트'

  const links = [
    { href: '/',         label: '대시보드',      icon: HomeIcon },
    { href: '/scan',     label: '약 봉투 촬영',  icon: CameraIcon },
    { href: '/food',     label: '음식·영양제',   icon: FoodIcon },
    { href: '/my-meds',  label: '내 약 관리',    icon: BookIcon },
    { href: '/profile',  label: '내 정보',       icon: UserIcon },
  ]

  return (
    <aside className="side-nav">
      {/* 로고 */}
      <Link href="/" className="flex items-center gap-3 px-2 py-2 mb-2">
        <div className="relative">
          <div className="absolute inset-0 bg-accent-lime/30 blur-xl rounded-2xl" />
          <div className="relative w-10 h-10 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-100 tracking-tight">PilloSuffer</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="dot bg-accent-lime relative pulse-dot" />
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Live</p>
          </div>
        </div>
      </Link>

      {/* 네비 */}
      <nav className="flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                active
                  ? 'bg-white/[0.08] text-zinc-100'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              <Icon active={active} />
              <span className={`text-sm font-medium flex-1 ${active ? 'text-zinc-100' : ''}`}>
                {label}
              </span>
              {active && (
                <span className="dot bg-accent-lime" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* 푸터: 테마 토글 + 프로필 + DB 정보 */}
      <div className="mt-auto space-y-3">
        <ThemeToggle />

        <div className="card p-3">
          <p className="text-[10px] tracking-widest text-zinc-500 font-medium uppercase mb-2">데이터베이스</p>
          <div className="space-y-1.5 text-xs">
            <Row label="식품 영양" value="277K" />
            <Row label="약물 상호작용" value="2.5K" />
            <Row label="DB 상태" value="정상" color="lime" />
          </div>
        </div>

        <Link href="/profile" className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-100 truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email ?? '로그인 안 됨'}</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: 'lime' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-medium num ${color === 'lime' ? 'text-accent-lime' : 'text-zinc-300'}`}>
        {value}
      </span>
    </div>
  )
}

/* ── 아이콘 ── */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-zinc-100' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  )
}
function CameraIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-zinc-100' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  )
}
function FoodIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-zinc-100' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5c0-1.5 1-3 3-3" />
    </svg>
  )
}
function BookIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-zinc-100' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-zinc-100' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
