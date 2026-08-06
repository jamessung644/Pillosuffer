import type { DrugInfo } from '@/types'

export function maskPII(text: string): string {
  let masked = text

  // 주민등록번호: 000000-1234567 패턴
  masked = masked.replace(/\d{6}-[1-4]\d{6}/g, '[주민번호 삭제]')

  // 환자명/환자정보/성명/이름: ':' 뒤 한글 2~4자
  masked = masked.replace(/(환자명|환자정보|성명|이름)\s*[:：]\s*[가-힣]{2,4}/g, '$1: [이름 삭제]')

  // 나이/성별: (만 NN세/남|여) 패턴
  masked = masked.replace(/\(\s*만\s*\d{1,3}\s*세\s*[\/／]\s*[남여]\s*\)/g, '(나이·성별 삭제)')

  // 조제약사: 뒤의 사람 이름
  masked = masked.replace(/(조제약사|처방의|담당의)\s*[:：]\s*[가-힣]{2,4}/g, '$1: [이름 삭제]')

  // 처방전 교부번호 (긴 숫자열)
  masked = masked.replace(/(처방전\s*교부번호|교부번호)\s*[:：]?\s*\d{10,}/g, '$1: [교부번호 삭제]')

  // 첫 줄이 한글 이름(2~4자) 단독인 경우
  masked = masked.replace(/^([가-힣]{2,4})\s*$/gm, '[이름 삭제]')

  // 병원명: 병원, 의원, 클리닉, 한의원 포함 단어
  masked = masked.replace(/[가-힣a-zA-Z0-9]+(?:병원|의원|클리닉|한의원|약국)/g, '[병원명 삭제]')

  // 전화번호: 02-xxxx-xxxx, 010-xxxx-xxxx 등
  masked = masked.replace(/\d{2,3}-\d{3,4}-\d{4}/g, '[전화번호 삭제]')

  return masked
}

// 줄 또는 전체 텍스트에서 투여횟수 추출 (예: "1일 3회", "3회/일")
function extractFrequency(text: string): string | undefined {
  const m =
    text.match(/1일\s*(\d+)\s*회/) ||
    text.match(/(\d+)\s*회\s*[\/\/]\s*일/) ||
    text.match(/하루\s*(\d+)\s*번/)
  if (m) return `1일 ${m[1]}회`
  return undefined
}

// 줄 또는 전체 텍스트에서 투약 일수 추출 (예: "3일분", "5일")
function extractDays(text: string): string | undefined {
  const m = text.match(/(\d+)\s*일\s*분?/)
  if (m) return `${m[1]}일`
  return undefined
}

// 줄 또는 전체 텍스트에서 용법 추출 (예: "식후 30분", "취침 전")
function extractUsage(text: string): string | undefined {
  const patterns = [
    /식후\s*\d*\s*분?/,
    /식전\s*\d*\s*분?/,
    /식간/,
    /취침\s*전/,
    /공복/,
    /아침\s*(?:식후|식전)?/,
    /저녁\s*(?:식후|식전)?/,
    /점심\s*(?:식후|식전)?/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[0].trim()
  }
  return undefined
}

/* ────────────────────────────────────────────────────────
 * 약품명 오인식 방지를 위한 블랙리스트
 * — OCR로 자주 잘못 추출되는 안내문 단어들
 * ──────────────────────────────────────────────────────── */
const NAME_BLACKLIST = new Set([
  // 환자/안내 관련
  '환자정', '환자명', '환자주', '환자주의', '환자분',
  '주의', '주의사항', '운전주', '졸음운전주', '졸음주',
  '복용주', '식후주', '식전주', '공복주', '취침주',
  // 처방/약사 관련
  '처방정', '처방주', '조제정', '조제주', '약사정',
  '용법정', '용량정', '함량정', '효능정', '효과정',
  '용법주', '용량주', '함량주', '효능주', '효과주',
  // 의약 관련
  '의약정', '의사주', '의사정', '의원정', '병원정',
  '약국정', '약사주', '면허주',
  // 단순 동사 어미 — '먹는다정', '드시는주' 같은 자연어 매칭 차단
  '복용', '복용량', '복용시', '복용일',
  // 식품/영양 관련
  '영양제', '영양정', '음식주',
])

/** 약품명이 의미 있는지 검증 */
function isValidDrugName(name: string): boolean {
  // 블랙리스트
  if (NAME_BLACKLIST.has(name)) return false

  // 너무 짧음 (한글 1글자 + 접미사 = 2글자) → 보통 약품 아님
  if (name.length < 3) return false

  // '주' 단일 접미사인데 3글자 미만이면 의심
  // 예: "운전주", "졸음주" → 블랙리스트로 잡히지만 새로운 케이스도 차단
  if (/^[가-힣]{1,2}주$/.test(name)) return false

  // '정' 단일 접미사인데 너무 짧고 흔한 단어 패턴
  // (블랙리스트로 거의 잡히지만 safety net)
  return true
}

/** 약품 정보 행이 아닐 가능성이 높은 줄 (안내문/메타 헤더) 식별
 *
 * 주의: 약효 설명(저해제·억제제 등)은 약품명과 같은 줄에 인식될 수 있으므로
 * 여기서 차단하지 않음 — 약품 접미사 정규식이 정확히 잡아낼 것.
 */
function isInfoLine(line: string): boolean {
  // 줄에 약품 접미사가 있으면 안내문 키워드가 같이 있어도 약품 추출 시도 허용
  const hasDrugSuffix = /[가-힣]{3,}(?:정|캡슐|주사|시럽|액|산|환|서방정|장용정)(?![가-힣])/.test(line)
  if (hasDrugSuffix) return false

  // 약품 접미사가 없는 줄에서만 안내문 헤더 차단
  const headerKeywords = [
    // 처방전 메타
    '처방전', '교부번호', '발행기관', '조제일자', '조제일',
    '환자정보', '환자 정보', '조제약사', '처방의', '담당의',
    // 안내문
    '주의사항', '주의 사항', '복약안내', '졸음', '운전주의',
    '복용 시 주의', '복용시 주의', '부작용',
    '보관 방법', '보관방법', '유효 기간', '유효기간',
    '문의', '상담', '환자분',
    // 약국/병원
    '약국명', '병/의원', '처방조제',
  ]
  return headerKeywords.some(kw => line.includes(kw))
}

export function parseDrugs(maskedText: string): DrugInfo[] {
  const drugs: DrugInfo[] = []
  const lines = maskedText.split('\n').filter(l => l.trim())

  // 전체 텍스트에서 공통 투약 정보 추출 (약 봉투에 한 번만 적힌 경우)
  const globalFrequency = extractFrequency(maskedText)
  const globalDays = extractDays(maskedText)
  const globalUsage = extractUsage(maskedText)

  for (const line of lines) {
    if (
      line.includes('[주민번호 삭제]') ||
      line.includes('[이름 삭제]') ||
      line.includes('[병원명 삭제]')
    ) {
      continue
    }

    // 안내문 줄은 스킵
    if (isInfoLine(line)) continue

    // ── 1순위: 약품명 + 용량(mg/g/mL/밀리그램 등) 패턴 ──
    //   예: "포리부틴서방정 100mg", "놀텍정10밀리그램", "Tylenol 500mg"
    //   negative lookahead (?![가-힣])로 단어 경계 보장
    const doseMatch = line.match(
      /([가-힣a-zA-Z]+(?:정|캡슐|주사|주|시럽|액|산|환|연질캡슐|서방정|장용정))(?![가-힣])\s*(\d+(?:\.\d+)?\s*(?:mg|g|mL|mcg|IU|밀리그램|밀리리터|그램|마이크로그램))/i
    )
    if (doseMatch && isValidDrugName(doseMatch[1].trim())) {
      // 함량 단위 정규화: "10밀리그램" → "10mg"
      let dose = doseMatch[2].trim()
      dose = dose
        .replace(/\s*밀리그램/g, 'mg')
        .replace(/\s*마이크로그램/g, 'mcg')
        .replace(/\s*밀리리터/g, 'mL')
        .replace(/\s*그램$/g, 'g')
      drugs.push({
        name: doseMatch[1].trim(),
        dose,
        frequency: extractFrequency(line) ?? globalFrequency,
        days: extractDays(line) ?? globalDays,
        usage: extractUsage(line) ?? globalUsage,
      })
      continue
    }

    // ── 2순위: 한글 약품명만 (정/캡슐/주 등으로 끝나는 단어, 뒤에 한글 없음) ──
    //   예: "놀텍정", "포리부틴서방정"
    //   (?![가-힣]) → "환자정보"의 "환자정", "졸음운전주의"의 "졸음운전주" 차단
    const nameMatch = line.match(/([가-힣]{3,}(?:정|캡슐|주사|주|시럽|액|산|환|연질캡슐|서방정|장용정))(?![가-힣])/)
    if (nameMatch && isValidDrugName(nameMatch[1].trim())) {
      drugs.push({
        name: nameMatch[1].trim(),
        frequency: extractFrequency(line) ?? globalFrequency,
        days: extractDays(line) ?? globalDays,
        usage: extractUsage(line) ?? globalUsage,
      })
    }
  }

  // 중복 제거
  const seen = new Set<string>()
  return drugs.filter(d => {
    if (seen.has(d.name)) return false
    seen.add(d.name)
    return true
  })
}
