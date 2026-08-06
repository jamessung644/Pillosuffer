/**
 * 약물 × 음식 안전 확인 LLM
 * Provider: Gemini (gemini-3.1-flash-lite)
 * — 파일명은 호환을 위해 유지 (import 경로 변경 불필요)
 */
import type { DrugInfo, SafetyResult, SafetyDetail, MfdsContraindication, EdrugInfo, DrugProfile } from '@/types'

/** HTML 태그 제거 — e약은요 API 응답에 <p><br> 등이 포함될 수 있음 */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const MODEL = 'gemini-3.1-flash-lite'

// Mock: API 키 없거나 호출 실패 시 caution 결과 반환
function buildMockResult(drugs: DrugInfo[], foods: string[]): SafetyResult {
  const details: SafetyDetail[] = []

  for (const drug of drugs) {
    for (const food of foods) {
      details.push({
        drug: drug.name,
        food,
        verdict: 'caution',
        reason: `${drug.name}과(와) ${food}의 상호작용을 즉시 확인하지 못했어요. 약사 또는 의사에게 문의해 주세요.`,
        source: 'Mock 모드 (GEMINI_API_KEY 미설정 또는 호출 실패)',
      })
    }
  }

  return {
    verdict: 'caution',
    details,
    disclaimer: '본 결과는 참고용이며 의학적 판단을 대체하지 않습니다. 주의 항목 발견 시 반드시 약사 또는 의사에게 확인하세요.',
    checkedAt: new Date().toISOString(),
  }
}

export async function checkSafety(
  drugs: DrugInfo[],
  foods: string[],
  mfdsContext: MfdsContraindication[],
  edrugInfo: EdrugInfo[] = [],
  drugProfiles: DrugProfile[] = []
): Promise<SafetyResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return buildMockResult(drugs, foods)
  }

  const hasDbContext = mfdsContext.length > 0
  const mfdsText = hasDbContext
    ? mfdsContext.map(c => `- [${c.drug}] ${c.info} (출처: ${c.source})`).join('\n')
    : '※ 검색된 DB 매칭 없음 — 자체 의학 지식으로만 안내해야 함'

  const hasEdrugContext = edrugInfo.length > 0
  const edrugText = hasEdrugContext
    ? edrugInfo.map(d => {
        const lines: string[] = [
          `▶ ${d.drugName}${d.itemName && d.itemName !== d.drugName ? ` (공식명: ${d.itemName})` : ''}`,
        ]
        if (d.intrcQesitm) lines.push(`  병용금기·상호작용: ${stripTags(d.intrcQesitm).slice(0, 300)}`)
        if (d.atpnWarnQesitm) lines.push(`  경고: ${stripTags(d.atpnWarnQesitm).slice(0, 200)}`)
        if (d.atpnQesitm) lines.push(`  복용금기: ${stripTags(d.atpnQesitm).slice(0, 200)}`)
        return lines.join('\n')
      }).join('\n\n')
    : '※ e약은요 API에서 해당 약품 정보 없음'

  const hasProfiles = drugProfiles.some(p => p.ingredientEng.length || p.ingredientKor || p.productType)
  const profileText = hasProfiles
    ? drugProfiles.map(p => {
        const ing = [p.ingredientEng.join(', '), p.ingredientKor].filter(Boolean).join(' / ')
        return `- ${p.name} → 성분: ${ing || '미상'}${p.productType ? ` · 분류: ${p.productType}` : ''}`
      }).join('\n')
    : '※ 공식 성분 식별 정보 없음'

  const prompt = `당신은 DrugBank 6.0 및 식약처 DB 기반의 복약 안전성 전문 AI입니다.
실제 임상적 위험도를 정확하고 균형있게 안내하세요. 사소한 가능성만으로 과잉 경고하지 마세요.

분류 기준 (반드시 다음 기준에 따라 분류 — reason 톤과 verdict가 반드시 일치):
- "safe" → 알려진 상호작용 정보 자체가 없고, 일반인이 일상적으로 함께 섭취하는 데 어떤 단서·조건도 필요 없는 경우
  예) 일반 약물 + 물, 일반 식사 (조미료·재료에 특이 사항 없음)
  ※ reason에 "유의/주의/조심/영향/촉진/방해/상담" 단어가 들어가면 절대 safe 아님. caution 이상으로 분류.
- "caution" → 약효·흡수에 영향 가능성, 증상 악화 가능성, 고용량/특수 조건 주의, 약사 상담 권장 등 어떤 형태의 단서라도 필요한 경우
  예) 자몽 + 일부 약물(대사 영향), 칼슘/철 + 갑상선약(흡수 방해), 카페인 + 위장약, 알코올 + 위장약
- "danger" → 명확한 병용 금기, 심각한 부작용·중독·약효 소실 위험, 임상적으로 강한 주의가 필요한 조합
  예) 와파린 + 비타민K 다량, MAOI + 티라민 식품, 알코올 + 간독성약

⚠️ verdict-reason 일치 검증:
- reason에 "주의/유의/조심/상담 권장/영향 가능"이 들어가면 → 반드시 caution (또는 danger)
- "보고가 전혀 없습니다"라고 단정할 수 있을 때만 → safe
- 애매하면 caution으로 분류 (안전쪽 보수적 선택)

중요 규칙:
- drug_name은 영문 성분명(DrugBank). 한국어 약품명과 매핑하여 안내.
  예: Warfarin=와파린, Metformin=메트포르민, Atorvastatin=아토르바스타틴(스타틴계),
      Rabeprazole=놀텍정(PPI), Trimebutine=포리부틴(위장운동조절제)
- 임상적 영향이 미미하면 반드시 "safe"로 안내. 무조건 "caution"으로 보내지 말 것.
- "danger"는 진짜 금기 조합에만 사용. 단순 자극이나 미미한 영향은 "caution".
- 모든 조합에 안내를 반환하되, reason은 구체적 메커니즘 + 일상 권장사항으로 작성.

⚠️ 표현 가이드라인 — 의료법·약사법 회피를 위해 반드시 준수:
■ 절대 금지 표현 (의학적 단정·지시로 해석됨):
  ✗ "안전합니다", "안심하세요", "복용해도 됩니다", "자유롭게 섭취하셔도 무방합니다"
  ✗ "심각한 부작용을 유발", "약효를 저해", "치료 효과를 떨어뜨림"
  ✗ "복용하지 마세요", "금기입니다", "절대 ~하지 마세요"
  ✗ "임상적 근거가 없습니다" (단정), "위험합니다"
  ✗ "권장합니다", "권장되지 않습니다" 등 직접 권고
■ 권장 표현 (참고 정보 톤):
  ✓ "보고된 상호작용 정보가 없습니다", "참고할 만한 데이터가 확인되지 않았습니다"
  ✓ "주의가 필요할 수 있습니다", "영향을 줄 가능성이 있습니다"
  ✓ "약사·의사 상담을 권합니다", "전문가 확인이 좋습니다"
  ✓ "개인차가 있을 수 있어 ~ 가능성", "일반적인 경우"
■ 문장 마무리:
  ✓ "~할 수 있습니다" (가능성)
  ✓ "~가 보고된 바 없습니다" (객관적)
  ✓ "~ 약사 상담을 통해 확인하세요" (전문가 안내)
  ✗ "~하시면 됩니다" (의학적 지시)

- reason은 한국어 2~3문장. 의학 전문용어 최소화, 단정적 표현 회피.

[복용 중인 약품]
${drugs.map(d => `- ${d.name}${d.dose ? ` (${d.dose})` : ''}${d.frequency ? ` / ${d.frequency}` : ''}`).join('\n')}

[약품 식별 정보] ★ 식약처 제품허가 공식 데이터 — 각 약품의 정확한 성분·분류
${profileText}

[확인하려는 음식/영양제]
${foods.map(f => `- ${f}`).join('\n')}

[식약처 e약은요 공식 약품 정보] ★ 최우선 참고
(병용금기·복용금기·경고사항 — 한국 식약처 공식 인허가 데이터)
${edrugText}

[DrugBank 6.0 상호작용 DB 검색 결과] (보조 참고)
${mfdsText}

※ 데이터 우선순위: 식약처 e약은요 > DrugBank 6.0 > AI 일반 지식. e약은요 데이터가 있으면 반드시 최우선으로 참고.

🚫 환각 방지 & 정확도 — 가장 중요한 규칙:
- 약품의 성분·분류는 위 [약품 식별 정보](식약처 공식)를 신뢰해 사용하세요. 식별 정보가 있으면 그 성분을 기준으로 음식과의 상호작용을 판단합니다.
- 단, 구체적 상호작용·금기·수치는 [식약처 e약은요]·[DrugBank 6.0] 데이터 또는 널리 알려진 임상 합의 범위에서만 단정하세요. 데이터에 없는 내용을 지어내지 마세요.
- [약품 식별 정보]·[e약은요]·[DrugBank 6.0] 어디에도 근거가 없으면 약품을 추측·분류하지 말고, reason에 "데이터베이스에서 해당 약품 정보를 찾지 못했습니다. 정확한 확인을 위해 약사·의사 상담을 권합니다."로 작성.
- 다른 약품의 정보를 가져다 쓰지 마세요.

⚠️ 출처(source) 필드 작성 규칙 — 반드시 준수:
${(hasDbContext || hasEdrugContext)
  ? `- 식약처 e약은요 병용금기·경고 내용을 주요 근거로 사용 → "식약처 e약은요"
- DrugBank 6.0 DB 컨텍스트를 주요 근거로 사용 → "DrugBank 6.0"
- 두 소스 모두 참고 → "DrugBank 6.0 · 식약처 e약은요"
- 제공된 컨텍스트와 무관하게 본인 지식만 사용 → "AI 일반 의학 지식" (드물어야 함)
※ 제공된 컨텍스트가 있으면 반드시 그것을 참고하여 답하세요.`
  : `- 검색된 DB 매칭이 없습니다.
- 매우 잘 알려진 상호작용(예: 와파린×비타민K, 자몽×스타틴)이면 → "임상 합의 (DB 미매칭)"
- 그 외 일반 의학 지식으로 안내 → "AI 일반 의학 지식"
※ 거짓 출처 절대 금지.`
}

다음 JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "verdict": "safe" | "caution" | "danger",
  "details": [
    {
      "drug": "약품명(한국어)",
      "food": "음식/영양제명",
      "verdict": "safe" | "caution" | "danger",
      "reason": "참고 근거 (한국어, 2~3문장, 구체적 메커니즘 또는 권장사항 포함)",
      "source": "DrugBank 6.0" | "식약처 e약은요" | "DrugBank 6.0 · 식약처 e약은요" | "AI 일반 의학 지식" | "임상 합의 (DB 미매칭)"
    }
  ],
  "disclaimer": "본 결과는 참고용이며 의학적 판단을 대체하지 않습니다. 주의 항목 발견 시 반드시 약사 또는 의사에게 확인하세요."
}

종합 verdict는 details 중 가장 높은 위험 단계로 자동 결정됨 (safe < caution < danger).`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
      topP: 1,
      maxOutputTokens: 2048,
    },
  }

  // 네트워크 타임아웃 보호
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    console.error('[Gemini Safety] fetch failed:', err)
    return buildMockResult(drugs, foods)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[Gemini Safety] API error:', res.status, errText.slice(0, 500))
    return buildMockResult(drugs, foods)
  }

  let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  try {
    data = await res.json()
  } catch (err) {
    console.error('[Gemini Safety] JSON parse failed:', err)
    return buildMockResult(drugs, foods)
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // responseMimeType: application/json 이라 거의 순수 JSON
  // fallback으로 ```json``` 코드블록 제거도 처리
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)

    // details 정규화
    const details: SafetyDetail[] = Array.isArray(parsed.details) ? parsed.details : []

    // 출처 자동 보정 — 컨텍스트가 있는데 LLM이 "AI 일반"으로 적었으면 자동 보정
    const anyContext = hasDbContext || hasEdrugContext
    if (anyContext) {
      for (const d of details) {
        const src = (d.source ?? '').toLowerCase()
        const isAiOnly = src.includes('ai 일반') || src.includes('general knowledge')
        if (isAiOnly) {
          if (hasDbContext && hasEdrugContext) {
            d.source = 'DrugBank 6.0 · 식약처 e약은요'
          } else if (hasEdrugContext) {
            d.source = '식약처 e약은요'
          } else {
            d.source = 'DrugBank 6.0 (컨텍스트 참고)'
          }
        }
      }
    }

    // verdict 자동 보정 — reason에 주의 표현이 있는데 safe면 caution으로 승급
    // (텍스트와 라벨 불일치 방지)
    const cautionPatterns: RegExp[] = [
      /유의(가|할|해|를|하)/,
      /주의(가|할|해|를)\s*(필요|요|권)/,
      /조심/,
      /영향을\s*(줄|줍|미칠|미치)/,
      /(촉진|방해|저해)할\s*수/,
      /흡수(를|에)\s*(방해|영향)/,
      /약효(를|에)\s*(영향|감소|저하)/,
      /상담을?\s*(권|받|필요)/,
      /확인이\s*(좋|필요)/,
      /감소(시키|할)/,
      /증가(시키|할)/,
      /증상이?\s*(있|악화)/,
      /민감한\s*경우/,
      /과량\s*섭취/,
      /고용량/,
    ]
    const dangerPatterns: RegExp[] = [
      /병용\s*금기/,
      /강한\s*주의/,
      /심각한\s*(부작|위험|증상)/,
      /위험할\s*수/,
      /절대로?\s*(피|금)/,
    ]
    for (const d of details) {
      if (typeof d.reason !== 'string') continue
      // safe → caution 승급
      if (d.verdict === 'safe' && cautionPatterns.some(p => p.test(d.reason))) {
        d.verdict = 'caution'
      }
      // caution → danger 승급
      if (d.verdict === 'caution' && dangerPatterns.some(p => p.test(d.reason))) {
        d.verdict = 'danger'
      }
    }

    // 의료법·약사법 회피 — reason 텍스트의 위험 단정 표현 자동 치환
    const dangerousPhrases: Array<[RegExp, string]> = [
      [/안심하고 복용\S*/g, '주요 상호작용 보고 없음'],
      [/안심하세요\S*/g, '주요 보고는 없습니다'],
      [/자유롭게 (섭취|복용)\S*/g, '일반적인 경우 큰 영향 보고 없음'],
      [/(섭취|복용)하셔도 무방합니다/g, '주요 상호작용 보고가 없습니다'],
      [/(섭취|복용)해도 (괜찮|문제없|상관없)\S*/g, '특별한 주의 보고는 확인되지 않습니다'],
      [/심각한 부작용을 유발/g, '주의 깊은 관찰이 필요할 수 있음'],
      [/약효를 (저해|떨어뜨)\S*/g, '성분에 영향을 줄 가능성'],
      [/금기입니다/g, '병용 시 약사 상담이 필요합니다'],
      [/위험합니다/g, '주의가 필요할 수 있습니다'],
      [/복용하지 마세요/g, '약사·의사와 상의하세요'],
      [/임상적 근거가 없습니다/g, '보고된 임상 데이터는 확인되지 않았습니다'],
      [/권장됩니다/g, '도움이 될 수 있습니다'],
      [/권장되지 않습니다/g, '주의가 필요할 수 있습니다'],
    ]
    for (const d of details) {
      if (typeof d.reason !== 'string') continue
      let r = d.reason
      for (const [pattern, replacement] of dangerousPhrases) {
        r = r.replace(pattern, replacement)
      }
      d.reason = r
    }

    if (details.length === 0) {
      for (const drug of drugs) {
        for (const food of foods) {
          details.push({
            drug: drug.name,
            food,
            verdict: 'caution',
            reason: `${drug.name}과(와) ${food}의 상호작용에 대한 LLM 응답이 불완전했습니다. 약사 상담을 권장합니다.`,
            source: 'AI 일반 의학 지식',
          })
        }
      }
    }

    // 종합 verdict 자동 계산
    const order = { safe: 0, caution: 1, danger: 2 } as const
    const maxLevel = details.reduce(
      (m: number, d: SafetyDetail) => Math.max(m, order[d.verdict] ?? 0),
      0
    )
    const overallVerdict: 'safe' | 'caution' | 'danger' =
      maxLevel === 2 ? 'danger' :
      maxLevel === 1 ? 'caution' : 'safe'

    return {
      verdict: overallVerdict,
      details,
      disclaimer:
        typeof parsed.disclaimer === 'string'
          ? parsed.disclaimer
          : '본 결과는 참고용이며 의학적 판단을 대체하지 않습니다. 주의 항목 발견 시 반드시 약사 또는 의사에게 확인하세요.',
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[Gemini Safety] parse error:', err, 'raw:', cleaned.slice(0, 500))
    return buildMockResult(drugs, foods)
  }
}
