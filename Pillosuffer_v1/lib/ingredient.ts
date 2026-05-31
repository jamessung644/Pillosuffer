/**
 * 식약처 의약품 제품 허가정보 API (DrugPrdtPrmsnInfoService07)
 * 약품명(item_name) → 공식 영문 주성분명(ITEM_INGR_NAME) 동적 해석
 *
 * 하드코딩 매핑(DRUG_KOR_TO_ENG)에 없는 약도 실시간으로 공식 성분 데이터를 받아
 * DrugBank 검색 키워드로 활용한다.
 *   예) "카데프엘릭서" → "Digoxin" → DrugBank digoxin 상호작용 매칭
 *
 * ⚠️ LLM 성분 추측은 의도적으로 쓰지 않는다.
 *   (Gemini는 "카데프엘릭서"를 확신을 갖고 dextromethorphan으로 오답 → 위험)
 *   성분은 반드시 공식 인허가 데이터에서만 가져온다.
 *
 * 활성화: data.go.kr "의약품 제품 허가정보" 활용신청 후 동일 MFDS_API_KEY로 동작.
 * 미승인/오류 시 자동 비활성(회로차단)되어 절대 가짜 데이터를 만들지 않고 null 반환.
 */

const PRMSN_URL =
  'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07'

export interface ResolvedIngredient {
  source: '식약처 제품허가'
  itemName: string      // 공식 제품명 (예: "카데프엘릭서(디곡신)")
  productType: string | null // 분류 (코드 제거, 예: "강심제")
  entpName: string | null    // 제조사
  kor: string | null    // 한글 주성분 (제품명 괄호에서 추출)
  eng: string[]         // 영문 성분명 (DrugBank 검색용, 염·제형어 제거)
}

// 프로세스 단위 캐시 & 회로차단
const cache = new Map<string, ResolvedIngredient | null>()
let failureCount = 0
let disabled = false
const MAX_FAILURES = 4

// 염·수화물 — 기본 INN 검색을 위해 제거
const SALT_WORDS = new Set([
  'hydrochloride', 'hydrobromide', 'sulfate', 'sulphate', 'sodium', 'potassium',
  'calcium', 'magnesium', 'besylate', 'besilate', 'maleate', 'mesylate', 'mesilate',
  'tartrate', 'citrate', 'phosphate', 'succinate', 'fumarate', 'acetate', 'nitrate',
  'bromide', 'chloride', 'dihydrate', 'monohydrate', 'hydrate', 'hemihydrate',
  'trihydrate', 'anhydrous', 'base', 'salt', 'monohydrochloride', 'dihydrochloride',
])

// 제형·부가어 — ITEM_INGR_NAME에 섞여 들어오는 경우 제거 (예: "Acetaminophen Granules")
const FORM_WORDS = new Set([
  'granules', 'granule', 'tablet', 'tablets', 'capsule', 'capsules', 'injection',
  'syrup', 'solution', 'elixir', 'suspension', 'cream', 'gel', 'ointment', 'powder',
  'drops', 'spray', 'patch', 'inhaler', 'liquid', 'extended', 'release', 'sustained',
  'film', 'coated', 'oral', 'for', 'children', 'and', 'the', 'with',
])

/** ITEM_INGR_NAME(영문, '/'·공백 구분 복합 가능) → 기본 성분명 배열 */
function parseEng(raw: string | undefined | null): string[] {
  if (!raw) return []
  const set = new Set<string>()
  for (const part of raw.split(/[/,]/)) {
    for (const tok of part.split(/\s+/)) {
      const low = tok.toLowerCase().replace(/[^a-z-]/g, '')
      if (low.length >= 4 && !SALT_WORDS.has(low) && !FORM_WORDS.has(low)) set.add(low)
    }
  }
  return [...set]
}

/** 제품명 괄호 안 한글 성분 추출: "카데프엘릭서(디곡신)" → "디곡신" */
function parseKor(itemName: string | undefined | null): string | null {
  if (!itemName) return null
  const m = itemName.match(/[（(]([^）)]+)[）)]/)
  return m ? m[1].trim() : null
}

/** 약품명 검색 후보 — 용량 제거본을 우선(매칭률↑) */
function buildCandidates(name: string): string[] {
  const cands: string[] = []
  const clean = name.replace(/\s+/g, '')
  const dosageRe = /\d+(\.\d+)?\s*(mg|ml|g|mcg|iu|μg|밀리그람|밀리그램)/gi
  const noNum = clean.replace(dosageRe, '')
  const suffixRe = /(정|캡슐|주사|시럽|액|산|환|서방정|장용정|연질캡슐|필름코팅정|엘릭서|엘릭실|내용액|점안액|현탁액)$/

  if (noNum && noNum !== clean) cands.push(noNum) // "리피토정10mg" → "리피토정" 우선
  cands.push(clean)
  for (const c of [noNum || clean]) {
    const s = c.replace(suffixRe, '')
    if (s && s !== c) cands.push(s)               // "리피토정" → "리피토"
  }
  return [...new Set(cands)].filter(s => s.length >= 2)
}

function normalizeItems(data: unknown): Record<string, string>[] {
  const d = data as Record<string, unknown>
  const body = (d?.body ?? (d?.response as Record<string, unknown>)?.body) as
    | Record<string, unknown>
    | undefined
  let items = body?.items as unknown
  if (!items) return []
  if (!Array.isArray(items)) {
    const inner = (items as Record<string, unknown>).item
    items = inner ? (Array.isArray(inner) ? inner : [inner]) : [items]
  }
  return items as Record<string, string>[]
}

async function fetchOnce(q: string, key: string): Promise<{ ok: boolean; soft: boolean; item?: Record<string, string> }> {
  const params = new URLSearchParams({
    serviceKey: key,
    item_name: q,
    type: 'json',
    numOfRows: '1',
    pageNo: '1',
  })
  try {
    const res = await fetch(`${PRMSN_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 * 60 * 24 * 7 }, // 1주 캐시 (성분은 거의 불변)
    })
    if (res.status === 403 || res.status >= 500) return { ok: false, soft: true } // 미승인/전파/일시오류
    if (!res.ok) return { ok: false, soft: false }
    const data = await res.json()
    return { ok: true, soft: false, item: normalizeItems(data)[0] }
  } catch {
    return { ok: false, soft: true } // 타임아웃·네트워크
  }
}

/**
 * 약품명 → 공식 주성분 해석. 미발견·미승인·오류 시 null (가짜 데이터 없음).
 */
export async function resolveIngredient(drugName: string): Promise<ResolvedIngredient | null> {
  const key = process.env.MFDS_API_KEY
  if (!key || disabled) return null
  if (cache.has(drugName)) return cache.get(drugName)!

  for (const q of buildCandidates(drugName)) {
    let r = await fetchOnce(q, key)
    if (!r.ok && r.soft) {
      // 403(전파 지연)·5xx·타임아웃 → 1회 재시도
      await new Promise(res => setTimeout(res, 700))
      r = await fetchOnce(q, key)
    }

    if (!r.ok) {
      if (r.soft) {
        failureCount++
        if (failureCount >= MAX_FAILURES) {
          disabled = true
          console.warn('[ingredient] 제품허가 API 연속 실패 — 동적 성분조회 비활성 (활용신청/전파 확인 필요)')
        }
      }
      continue
    }

    failureCount = 0
    const item = r.item
    if (item) {
      const eng = parseEng(item.ITEM_INGR_NAME)
      if (eng.length) {
        const result: ResolvedIngredient = {
          source: '식약처 제품허가',
          itemName: item.ITEM_NAME ?? q,
          productType: (item.PRDUCT_TYPE ?? '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || null,
          entpName: item.ENTP_NAME ?? null,
          kor: parseKor(item.ITEM_NAME),
          eng,
        }
        cache.set(drugName, result)
        console.log(`[ingredient] "${drugName}" → ${eng.join(', ')} (${result.itemName})`)
        return result
      }
    }
    // 200·0건 → 다음 후보
  }

  cache.set(drugName, null)
  return null
}
