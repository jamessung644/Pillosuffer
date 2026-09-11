'use client'

import Icon from './Icon'
import type { EvidenceGuidance } from '@/types'

export type GuidanceStatus = EvidenceGuidance['action'] | 'legacy'

export const GUIDANCE_CONFIG = {
  allowed: {
    label: '함께 복용 가능', title: '함께 복용할 수 있어요', sub: '아래 안내와 처방된 복용법을 지켜주세요', icon: 'check',
    cardBg: 'bg-emerald-50', border: 'border-emerald-200', textStrong: 'text-emerald-700', badgeBg: 'bg-emerald-700',
  },
  avoid: {
    label: '함께 드시지 마세요', title: '피해야 할 조합이 있어요', sub: '약과 함께 피하도록 안내된 음식이 있습니다', icon: 'alert',
    cardBg: 'bg-rose-50', border: 'border-rose-200', textStrong: 'text-rose-700', badgeBg: 'bg-rose-700',
  },
  check: {
    label: '확인 필요', title: '확인이 필요한 조합이 있어요', sub: '함께 먹어도 되는지 약사에게 물어보세요', icon: 'info',
    cardBg: 'bg-amber-50', border: 'border-amber-200', textStrong: 'text-amber-700', badgeBg: 'bg-amber-700',
  },
  legacy: {
    label: '재확인 필요', title: '다시 확인해주세요', sub: '이전 방식의 결과로, 확인된 근거로 사용할 수 없습니다', icon: 'info',
    cardBg: 'bg-amber-50', border: 'border-amber-200', textStrong: 'text-amber-700', badgeBg: 'bg-amber-700',
  },
} as const

export default function SafetyBadge({ status, size = 'sm' }: { status: GuidanceStatus; size?: 'sm' | 'lg' }) {
  const cfg = GUIDANCE_CONFIG[status] ?? GUIDANCE_CONFIG.legacy
  if (size === 'lg') {
    return (
      <div data-guidance-summary={status} className={`rounded-2xl p-6 border ${cfg.cardBg} ${cfg.border}`}>
        <p className="text-sm text-gray-600 mb-2">복용 전 확인하세요</p>
        <p className={`text-2xl font-bold leading-snug ${cfg.textStrong}`}>{cfg.title}</p>
        <p className="text-base text-gray-700 mt-2 leading-relaxed">{cfg.sub}</p>
      </div>
    )
  }
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white ${cfg.badgeBg}`}><Icon name={cfg.icon} size={18} className="shrink-0" />{cfg.label}</span>
}
