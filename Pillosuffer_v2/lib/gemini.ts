/**
 * Gemini Vision으로 음식·영양제 이미지 인식
 * 응답 형식: { items: string[] }
 * 실패 시 throw — API route에서 에러 처리
 */
export async function recognizeFood(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
  }

  // 안정적으로 작동하는 모델 순서대로 시도 (404 fallback)
  const MODELS = [
    'gemini-3.1-flash-lite',
  ]

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              '이 이미지에서 음식, 음료, 영양제, 약을 모두 인식하여 한국어 품목명만 JSON 배열로 응답하세요.\n' +
              '예시: ["자몽", "우유", "오메가3"]\n' +
              '브랜드명·수량·설명 없이 일반 품목명만. 음식이 없으면 빈 배열 []을 반환하세요.\n' +
              'JSON 외 다른 텍스트는 절대 포함하지 마세요.',
          },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  }

  // 모델 순회 시도
  let res: Response | null = null
  let lastErr = ''
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      console.log(`[Gemini] using model: ${model}`)
      break
    }
    // 404 (모델 없음)이면 다음 모델 시도, 그 외는 즉시 중단
    if (res.status !== 404) {
      lastErr = await res.text().catch(() => '')
      console.error(`[Gemini] ${model} → ${res.status}:`, lastErr.slice(0, 300))
      throw new Error(`Gemini API 오류 (${res.status})`)
    }
    console.warn(`[Gemini] ${model} not available, trying next...`)
  }

  if (!res || !res.ok) {
    throw new Error('Gemini 사용 가능한 모델을 찾지 못했어요. API 키 권한을 확인하세요.')
  }

  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'

  // JSON 응답 파싱 (responseMimeType json이면 거의 항상 순수 JSON)
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
    // 만약 객체로 왔다면 흔한 키 추출
    if (Array.isArray(parsed.items)) return parsed.items
    if (Array.isArray(parsed.foods)) return parsed.foods
    return []
  } catch {
    // fallback: 텍스트에서 [...] 부분만 추출
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    try {
      const arr = JSON.parse(match[0])
      return Array.isArray(arr) ? arr.filter((s: unknown): s is string => typeof s === 'string') : []
    } catch {
      return []
    }
  }
}
