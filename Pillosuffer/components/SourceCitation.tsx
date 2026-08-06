'use client'

interface Props {
  source?: string
}

/**
 * 출처 신뢰도 시각화 (라이트 모드)
 * - DB 매칭: 초록 점 (높은 신뢰)
 * - 임상 합의: 노랑 점 (중간 신뢰)
 * - AI 추론: 회색 점 (낮은 신뢰)
 */
export default function SourceCitation({ source }: Props) {
  if (!source) return null

  const lower = source.toLowerCase()
  const isDbDirect =
    (lower.includes('drugbank') || lower.includes('식약처') || lower.includes('mfds')) &&
    !lower.includes('참고') && !lower.includes('context')
  const isDbContext =
    (lower.includes('drugbank') || lower.includes('식약처')) &&
    (lower.includes('참고') || lower.includes('context'))
  const isConsensus =
    lower.includes('임상') || lower.includes('합의') || lower.includes('consensus')

  const tier =
    isDbDirect ? 'db' :
    isDbContext ? 'dbContext' :
    isConsensus ? 'consensus' : 'ai'

  const config = {
    db: {
      dot: 'bg-emerald-500',
      label: 'DB 매칭',
      tooltip: '검색된 데이터베이스에서 직접 매칭됨',
    },
    dbContext: {
      dot: 'bg-sky-500',
      label: 'DB 참고',
      tooltip: 'DB 검색 결과를 컨텍스트로 참고하여 LLM이 안내',
    },
    consensus: {
      dot: 'bg-amber-500',
      label: '임상 합의',
      tooltip: 'DB 미매칭, 잘 알려진 임상 사실',
    },
    ai: {
      dot: 'bg-gray-400',
      label: 'AI 추론',
      tooltip: 'DB 매칭 없음 — LLM 자체 의학 지식',
    },
  } as const

  const cfg = config[tier]

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/60">
      <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${cfg.dot}`} />
      <span className="text-[10px] tracking-wider text-gray-600 font-semibold uppercase">
        {cfg.label}
      </span>
      <span className="text-[10px] text-gray-400 leading-relaxed truncate" title={cfg.tooltip}>
        · {source}
      </span>
    </div>
  )
}
