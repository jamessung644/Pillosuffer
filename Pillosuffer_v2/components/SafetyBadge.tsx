'use client'

import type { SafetyVerdict } from '@/types'

const VERDICT_CONFIG = {
  safe: {
    label: '양호',
    sub: '특별한 주의 보고 없음',
    dot: 'bg-accent-lime',
    text: 'text-accent-lime',
    bg: 'bg-accent-lime/[0.08]',
    border: 'border-accent-lime/30',
    hex: '#a3e635',
  },
  caution: {
    label: '주의',
    sub: '약사·의사 확인 권장',
    dot: 'bg-accent-amber',
    text: 'text-accent-amber',
    bg: 'bg-accent-amber/[0.08]',
    border: 'border-accent-amber/30',
    hex: '#fb923c',
  },
  danger: {
    label: '강한 주의',
    sub: '전문가 확인 필요',
    dot: 'bg-accent-red',
    text: 'text-accent-red',
    bg: 'bg-accent-red/[0.08]',
    border: 'border-accent-red/30',
    hex: '#f87171',
  },
} as const

interface Props {
  verdict: SafetyVerdict
  size?: 'sm' | 'lg'
}

export default function SafetyBadge({ verdict, size = 'sm' }: Props) {
  // verdict가 유효하지 않은 값이면 caution으로 fallback
  const safeVerdict: SafetyVerdict =
    verdict === 'safe' || verdict === 'caution' || verdict === 'danger'
      ? verdict
      : 'caution'
  const cfg = VERDICT_CONFIG[safeVerdict]

  if (size === 'lg') {
    return (
      <div className={`card p-6 ${cfg.bg} border ${cfg.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`dot ${cfg.dot}`} />
              <span className="text-xs tracking-wider text-zinc-500 font-medium">
                종합 안내
              </span>
            </div>
            <p className={`text-4xl font-light ${cfg.text}`}>{cfg.label}</p>
            <p className="text-sm text-zinc-400 mt-1">{cfg.sub}</p>
          </div>
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
              <circle
                cx="32" cy="32" r="28"
                stroke={cfg.hex}
                strokeWidth="3"
                fill="none"
                strokeDasharray="176"
                strokeDashoffset={verdict === 'safe' ? 0 : verdict === 'caution' ? 60 : 130}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center ${cfg.text} text-xl font-light`}>
              {verdict === 'safe' ? '✓' : verdict === 'caution' ? '!' : '⨯'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider ${cfg.bg} ${cfg.text}`}>
      <span className={`dot ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export { VERDICT_CONFIG }
