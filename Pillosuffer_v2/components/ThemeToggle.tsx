'use client'

import { useTheme, type Theme } from '@/components/ThemeProvider'

/** 라이트/시스템/다크 3단 segmented toggle */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options: { key: Theme; label: string; icon: React.ReactNode }[] = [
    {
      key: 'light',
      label: '라이트',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ),
    },
    {
      key: 'system',
      label: '시스템',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      key: 'dark',
      label: '다크',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="card p-1 flex items-center gap-0.5">
      {options.map(opt => {
        const active = theme === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => setTheme(opt.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all text-xs font-medium ${
              active
                ? 'bg-white/[0.1] text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            aria-label={opt.label}
            aria-pressed={active}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
