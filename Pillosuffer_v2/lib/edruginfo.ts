/**
 * 식약처 e약은요 API — 의약품개요정보 (DrbEasyDrugInfoService)
 * 약품명으로 효능효과·용법용량·주의사항·부작용 등 일반인용 정보 조회
 * https://www.data.go.kr/data/15057623/openapi.do
 */
import type { DrugInfo, EdrugInfo } from '@/types'

const EASY_DRUG_URL =
  'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList'

/** 약품명에서 검색 후보를 여러 개 생성 — e약은요 API 매칭률 향상 */
function buildCandidates(name: string): string[] {
  const set = new Set<string>()
  const clean = name.replace(/\s+/g, '')
  set.add(clean)

  // 1. 괄호 안 성분명 추출: "타이레놀정500밀리그람(아세트아미노펜)" → "아세트아미노펜"
  const paren = clean.match(/[（(]([^）)]+)[）)]/)
  if (paren) {
    set.add(paren[1])
    set.add(clean.replace(/[（(][^）)]+[）)]/g, ''))
  }

  // 2. 용량 제거: "놀텍정20mg" → "놀텍정"
  const noNum = clean.replace(/\d+(\.\d+)?\s*(mg|ml|g|mcg|iu|μg|밀리그람|밀리그램)/gi, '')
  if (noNum && noNum !== clean) set.add(noNum)

  // 3. 접미사 제거
  const suffixRe = /(정|캡슐|주사|시럽|액|산|환|서방정|장용정|연질캡슐|필름코팅정|크림|겔|로션|패취|좌제|현탁액|츄어블정|구강붕해정|과립|분말)$/
  for (const c of [...set]) {
    const stripped = c.replace(suffixRe, '')
    if (stripped && stripped !== c) set.add(stripped)
  }

  return [...set].filter(s => s.length >= 2) // 최소 2글자
}

async function fetchOne(itemName: string): Promise<EdrugInfo | null> {
  const key = process.env.MFDS_API_KEY
  if (!key) {
    console.warn('[edruginfo] MFDS_API_KEY 미설정 — null 반환')
    return null
  }

  const candidates = buildCandidates(itemName)

  for (const q of candidates) {
    const params = new URLSearchParams({
      serviceKey: key,
      itemName: q,
      pageNo: '1',
      numOfRows: '3',
      type: 'json',
    })
    try {
      const res = await fetch(`${EASY_DRUG_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
        // 하루 캐시 — 약품 정보는 자주 변경되지 않음
        next: { revalidate: 60 * 60 * 24 },
      })
      if (!res.ok) {
        console.warn(`[edruginfo] HTTP ${res.status} for "${q}"`)
        continue
      }
      const data = await res.json()
      const items = data?.body?.items ?? data?.response?.body?.items ?? []
      const first = Array.isArray(items) ? items[0] : null
      if (first?.itemName) {
        return {
          drugName: itemName,
          itemName: first.itemName,
          efcyQesitm: first.efcyQesitm ?? null,
          useMethodQesitm: first.useMethodQesitm ?? null,
          atpnWarnQesitm: first.atpnWarnQesitm ?? null,
          atpnQesitm: first.atpnQesitm ?? null,
          intrcQesitm: first.intrcQesitm ?? null,
          seQesitm: first.seQesitm ?? null,
        }
      }
    } catch (e) {
      console.warn(`[edruginfo] 요청 실패 "${q}":`, e instanceof Error ? e.message : e)
    }
  }
  return null
}

/** 약품 목록에 대해 e약은요 API를 병렬 조회 */
export async function queryEdrugInfo(drugs: DrugInfo[]): Promise<EdrugInfo[]> {
  if (!drugs.length || !process.env.MFDS_API_KEY) return []

  const results = await Promise.all(drugs.map(d => fetchOne(d.name)))
  const filtered = results.filter((r): r is EdrugInfo => r !== null)

  console.log(
    `[edruginfo] 조회: 약품 ${drugs.length}개 → 매칭 ${filtered.length}건 ` +
    `(${filtered.map(r => r.drugName).join(', ')})`
  )
  return filtered
}

/** 단일 약품 e약은요 조회 (easy-drug 라우트·DrugCard 정보 패널용) */
export function fetchEdrug(name: string): Promise<EdrugInfo | null> {
  return fetchOne(name)
}
