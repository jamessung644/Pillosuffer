export interface DrugInfo {
  name: string
  dose?: string       // 함량 (예: 500mg)
  frequency?: string  // 투여횟수 (예: 1일 3회)
  days?: string       // 투약 일수 (예: 3일)
  usage?: string      // 용법 (예: 식후 30분)
}

export type SafetyVerdict = 'safe' | 'caution' | 'danger'

export interface SafetyDetail {
  drug: string
  food: string
  verdict: SafetyVerdict
  reason: string
  source?: string
}

export interface SafetyResult {
  verdict: SafetyVerdict
  details: SafetyDetail[]
  disclaimer: string
  checkedAt: string
}

export interface MfdsContraindication {
  drug: string
  info: string
  source: string
}

export interface ScanSession {
  rawText: string
  maskedText: string
  drugs: DrugInfo[]
  imageDataUrl?: string
  scannedAt?: string   // 촬영(기록)한 날짜·시각 (ISO)
}

export interface HistoryEntry {
  id: string
  drugs: DrugInfo[]
  foods: string[]
  result: SafetyResult
}

/** 식약처 e약은요 API 응답 (DrbEasyDrugInfoService) */
export interface EdrugInfo {
  drugName: string               // 검색에 사용한 약품명 (사용자 입력)
  itemName: string               // API 반환 공식 약품명
  efcyQesitm: string | null      // 효능효과
  useMethodQesitm: string | null // 용법용량
  atpnWarnQesitm: string | null  // 경고사항
  atpnQesitm: string | null      // 복용금기
  intrcQesitm: string | null     // 병용금기·상호작용 (가장 중요)
  seQesitm: string | null        // 부작용
}
