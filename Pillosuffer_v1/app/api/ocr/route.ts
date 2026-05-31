import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY
const GOOGLE_VISION_URL = 'https://vision.googleapis.com/v1/images:annotate'

export async function POST(request: NextRequest) {
  if (!GOOGLE_VISION_API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_VISION_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요.' },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')

    const res = await fetch(`${GOOGLE_VISION_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: ['ko', 'en'] },
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const message = err?.error?.message || `Google Vision API 오류 (${res.status})`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    const data = await res.json()
    const response = data.responses?.[0]

    if (response?.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 })
    }

    const fullText: string = response?.fullTextAnnotation?.text ?? ''
    const lines = fullText
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((text: string) => ({ text, confidence: 1.0, bbox: [] }))

    return NextResponse.json({
      text: fullText,
      lines,
      line_count: lines.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OCR 요청 실패'
    console.error('[API/ocr]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
