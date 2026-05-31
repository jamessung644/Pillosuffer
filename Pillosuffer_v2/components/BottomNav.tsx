'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  /** stroke=currentColor 사용 — fill="none" */
  path: React.ReactNode
}

const NAV: NavItem[] = [
  {
    href: '/',
    label: '홈',
    path: <path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />,
  },
  {
    href: '/scan',
    label: '촬영',
    path: <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </>,
  },
  {
    href: '/food',
    label: '음식',
    path: <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5c0-1.5 1-3 3-3" />
    </>,
  },
  {
    href: '/my-meds',
    label: '내 약',
    path: <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>,
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50
        hide-on-desktop
      "
    >
      <div className="glass-strong rounded-full px-2 py-2 flex items-center justify-around shadow-2xl shadow-black/40">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all ${
                active
                  ? 'bg-white text-ink-950'
                  : 'text-zinc-500 active:bg-white/[0.06]'
              }`}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.path}
              </svg>
              {active && <span className="text-xs font-semibold">{item.label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
