'use client'

export type EvidenceStatus = 'found' | 'missing' | 'legacy'

export const EVIDENCE_CONFIG = {
  found: {
    label: '원문 있음', sub: '검색어가 일치하는 자료이며 안전 판정이 아닙니다',
    cardBg: 'bg-blue-50', border: 'border-blue-200', textStrong: 'text-blue-800', badgeBg: 'bg-blue-700',
  },
  missing: {
    label: '근거 부족', sub: '복용 가능 여부를 판단할 수 없습니다',
    cardBg: 'bg-amber-50', border: 'border-amber-200', textStrong: 'text-amber-700', badgeBg: 'bg-amber-700',
  },
  legacy: {
    label: '재확인 필요', sub: '이전 방식의 결과로, 확인된 근거로 사용할 수 없습니다',
    cardBg: 'bg-amber-50', border: 'border-amber-200', textStrong: 'text-amber-700', badgeBg: 'bg-amber-700',
  },
} as const

export default function SafetyBadge({ status, size = 'sm' }: { status: EvidenceStatus; size?: 'sm' | 'lg' }) {
  const cfg = EVIDENCE_CONFIG[status] ?? EVIDENCE_CONFIG.legacy
  if (size === 'lg') {
    return (
      <div className={`rounded-2xl p-6 border ${cfg.cardBg} ${cfg.border}`}>
        <p className="text-xs text-gray-600 mb-2">근거 조회 상태</p>
        <p className={`text-2xl font-bold ${cfg.textStrong}`}>{cfg.label}</p>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{cfg.sub}</p>
      </div>
    )
  }
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold text-white ${cfg.badgeBg}`}>{cfg.label}</span>
}
