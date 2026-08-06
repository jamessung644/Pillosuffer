'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/Icon'

const NAV_ITEMS = [
  { href: '/',        icon: 'home',      label: '홈' },
  { href: '/my-meds', icon: 'clipboard', label: '약 관리' },
  { href: '/profile', icon: 'user',      label: '내 정보' },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-200 px-2 py-2.5 z-50">
      <div className="flex">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors ${
                active ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
              }`}
            >
              <Icon name={item.icon} size={28} stroke={active ? 2.4 : 2} />
              <span className="text-sm font-bold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
