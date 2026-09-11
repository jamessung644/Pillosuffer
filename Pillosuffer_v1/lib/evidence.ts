import type { DrugInfo, EvidenceReference, SafetyResult } from '@/types'

export const DATASET_SHA256 = '8078106b88873f4e8c8b6656cf933a933d9fc29b6c8bf3427f6b81ec3ee9b17c'
export const DATASET_ROWS = 2512

export interface EvidenceRow {
  id: string
  drug_name: string
  interaction_description: string
  source: string
  source_reference: string
  dataset_sha256: string
}

// Literal food-name aliases only. Do not infer nutrients or ingredients from a food.
const FOOD_NAMES: Record<string, string[]> = {
  커피: ['coffee'], 우유: ['milk'], 물: ['water'], 자몽: ['grapefruit'],
  녹차: ['green tea'], 술: ['alcohol'], 알코올: ['alcohol'], 카페인: ['caffeine'],
  칼슘: ['calcium'], 철분: ['iron'], 마그네슘: ['magnesium'], 시금치: ['spinach'],
  브로콜리: ['broccoli'], 바나나: ['banana'], 마늘: ['garlic'], 생강: ['ginger'],
  치즈: ['cheese'], 요거트: ['yogurt'], 초콜릿: ['chocolate'],
}

function normalizedName(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '').trim()
}

export function sameProduct(input: string, official: string): boolean {
  const normalize = (value: string) => normalizedName(value)
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\d+(?:\.\d+)?(?:밀리그램|밀리그람|마이크로그램|mg|mcg|ml|μg)/gi, '')
    .replace(/(?:필름코팅정|연질캡슐|구강붕해정|서방정|장용정|현탁액|캡슐|시럽|정|액)$/, '')
  const name = normalize(input)
  return name.length >= 2 && name === normalize(official)
}

export function findEvidence(drug: string, food: string, drugKeywords: string[], rows: EvidenceRow[]): EvidenceReference[] {
  const keywords = new Set(drugKeywords.map(value => value.trim().toLowerCase()))
  const terms = [food.trim().toLowerCase(), ...(FOOD_NAMES[normalizedName(food)] ?? [])]
  const found = new Map<string, EvidenceReference>()
  for (const row of rows) {
    if (row.dataset_sha256 !== DATASET_SHA256 || !keywords.has(row.drug_name.trim().toLowerCase())) continue
    const term = terms.find(value => {
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = /^[a-z\s]+$/.test(value) ? `\\b${escaped}\\b` : escaped
      return value.length > 0 && new RegExp(pattern, 'i').test(row.interaction_description)
    })
    if (!term || !row.id || !row.source || !row.source_reference || !row.interaction_description.trim()) continue
    found.set(row.id, {
      id: row.id, drug, food, matchedDrug: row.drug_name, matchedTerm: term,
      quote: row.interaction_description, source: row.source, citation: row.source_reference,
      datasetSha256: row.dataset_sha256,
    })
  }
  return [...found.values()]
}

export function buildEvidenceResult(drugs: DrugInfo[], foods: string[], records: EvidenceReference[]): SafetyResult {
  return {
    mode: 'retrieval-only-v1',
    // Compatibility field for older clients, not a clinical risk classification.
    verdict: 'caution',
    details: drugs.flatMap(drug => foods.map(food => {
      const references = records.filter(record => record.drug === drug.name && record.food === food && record.datasetSha256 === DATASET_SHA256)
      return {
        drug: drug.name, food, verdict: 'caution' as const,
        evidenceStatus: references.length ? 'found' as const : 'missing' as const,
        reason: references.length
          ? '약품 성분과 음식 검색어가 일치하는 보관본 원문입니다. 검색어 일치만으로 이 조합의 안전성이나 위험도를 판단할 수 없습니다.'
          : '현재 조회 범위에서 이 조합을 확인할 근거 원문을 찾지 못했습니다. 이는 상호작용이 없거나 안전하다는 뜻이 아닙니다. 약사 또는 의사에게 확인하세요.',
        source: references.length ? '데이터셋 보관본 원문' : '확인 가능한 근거 부족',
        references,
      }
    })),
    disclaimer: '이 화면은 검색된 원문을 제공하며 복용 가능 여부를 판정하지 않습니다. 임의로 약을 중단하거나 복용량을 바꾸지 말고 약사 또는 의사에게 확인하세요.',
    checkedAt: new Date().toISOString(),
  }
}
