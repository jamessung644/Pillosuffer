import { apiUrl } from './api'
import { isRecord, isEvidenceResult } from './validation'
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
  const response = await fetch(apiUrl('/api/safety-check'), {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drugs, foods }),
  })
  if (!response.ok) {
    const failure: unknown = await response.json().catch(() => null)
    if (isRecord(failure) && failure.code === 'EVIDENCE_UNAVAILABLE') {
      throw new Error('상호작용 근거 데이터가 확인되지 않아 결과 생성을 중단했습니다. 약사 또는 의사에게 확인해 주세요.')
    }
    throw new Error('분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  const result: unknown = await response.json()
  if (!isEvidenceResult(result)) throw new Error('검증된 원문 조회 결과가 아닙니다. 다시 조회해 주세요.')
  const expected = new Set(drugs.flatMap(drug => foods.map(food => JSON.stringify([drug.name, food]))))
  const actual = new Set(result.details.map(detail => JSON.stringify([detail.drug, detail.food])))
  if (actual.size !== expected.size || actual.size !== result.details.length || [...actual].some(pair => !expected.has(pair))) {
    throw new Error('조회한 약품·음식 조합과 결과가 일치하지 않습니다.')
  }
  onStats({ matchCount: result.details.reduce((sum, detail) => sum + (detail.references?.length ?? 0), 0),
    edrugCount: 0, searchedDrugs: drugs.length, searchedFoods: foods.length })
  return result
}
