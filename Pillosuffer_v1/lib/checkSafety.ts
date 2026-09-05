import { apiUrl } from './api'
import { isRecord, isSafetyResult } from './validation'
import type { DrugInfo, SafetyResult } from '@/types'

export interface DbStats {
  matchCount: number
  edrugCount: number
  searchedDrugs: number
  searchedFoods: number
}

export async function checkSafety(
  drugs: DrugInfo[], foods: string[], signal: AbortSignal,
  onStats: (stats: DbStats) => void,
): Promise<SafetyResult> {
  const mfdsRes = await fetch(apiUrl('/api/mfds'), {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drugs, foods }),
  })
  if (!mfdsRes.ok) throw new Error('약품 데이터 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  const data: unknown = await mfdsRes.json()
  if (!isRecord(data) || !Array.isArray(data.contraindications) || data.error) {
    throw new Error('약품 데이터 응답을 확인할 수 없습니다. 다시 시도해 주세요.')
  }
  const edrugInfo = Array.isArray(data.edrugInfo) ? data.edrugInfo : []
  onStats({
    matchCount: typeof data.matchCount === 'number' ? data.matchCount : data.contraindications.length,
    edrugCount: edrugInfo.length,
    searchedDrugs: drugs.length,
    searchedFoods: foods.length,
  })
  const response = await fetch(apiUrl('/api/safety-check'), {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drugs, foods, mfdsContext: data.contraindications, edrugInfo,
      drugProfiles: Array.isArray(data.drugProfiles) ? data.drugProfiles : [] }),
  })
  if (!response.ok) throw new Error('분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  const result: unknown = await response.json()
  if (!isSafetyResult(result)) throw new Error('분석 결과가 불완전합니다. 다시 시도해 주세요.')
  return result
}
