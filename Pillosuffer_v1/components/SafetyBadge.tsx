'use client'

import type { SafetyVerdict } from '@/types'

const VERDICT_CONFIG = {
  safe: {
    label: '양호',
    sub: '특별한 주의 보고 없음',
    icon: '✓',
    // 카드용
    cardBg: 'bg-emerald-50',
    leftBar: 'bg-emerald-500',
    // 텍스트/배지용
    text: 'text-emerald-600',
    textStrong: 'text-emerald-700',
    badgeBg: 'bg-emerald-700',
    badgeText: 'text-white',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    border: 'border-emerald-200',
    hex: '#10b981',
  },
  caution: {
    label: '주의',
    sub: '약사·의사 확인 권장',
    icon: '!',
    cardBg: 'bg-amber-50',
    leftBar: 'bg-amber-500',
    text: 'text-amber-600',
    textStrong: 'text-amber-700',
    badgeBg: 'bg-amber-700',
    badgeText: 'text-white',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    border: 'border-amber-200',
    hex: '#f59e0b',
  },
  danger: {
    label: '강한 주의',
    sub: '전문가 확인 필요',
    icon: '⨯',
    cardBg: 'bg-rose-50',
    leftBar: 'bg-rose-500',
    text: 'text-rose-600',
    textStrong: 'text-rose-700',
    badgeBg: 'bg-rose-700',
    badgeText: 'text-white',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    border: 'border-rose-200',
    hex: '#ef4444',
  },
} as const

interface Props {
  verdict: SafetyVerdict
  size?: 'sm' | 'lg'
}

export default function SafetyBadge({ verdict, size = 'sm' }: Props) {
  const safeVerdict: SafetyVerdict =
    verdict === 'safe' || verdict === 'caution' || verdict === 'danger'
      ? verdict
      : 'caution'
  const cfg = VERDICT_CONFIG[safeVerdict]

  if (size === 'lg') {
    return (
      <div className={`rounded-2xl p-6 ${cfg.cardBg} border-2 ${cfg.border}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${cfg.badgeBg}`} />
              <span className="text-xs text-gray-600 font-medium">
                종합 안내
              </span>
            </div>
            <p className={`text-3xl font-bold ${cfg.textStrong}`}>{cfg.label}</p>
            <p className="text-sm text-gray-600 mt-1">{cfg.sub}</p>
          </div>
          <div className={`relative w-16 h-16 shrink-0 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
            <span className={`${cfg.iconText} text-3xl font-bold`}>
              {cfg.icon}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

export { VERDICT_CONFIG }
