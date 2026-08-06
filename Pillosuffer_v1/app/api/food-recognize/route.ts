import { NextRequest, NextResponse } from 'next/server'
import { recognizeFood } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 })
    }

    // 10MB 제한
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '이미지가 10MB를 초과합니다.' }, { status: 413 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const items = await recognizeFood(base64, mimeType)
    return NextResponse.json({ items })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '이미지 인식 실패'
    console.error('[API/food-recognize]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * CORS preflight.
 *
 * iOS 앱은 capacitor://localhost 오리진에서 이 라우트를 호출한다.
 * Content-Type: application/json 인 POST 는 preflight 가 필요한데,
 * Vercel 에서는 OPTIONS 가 자동 처리되지 않아 405 가 떨어진다(로컬 next dev 는 204).
 * 405 는 브라우저가 preflight 실패로 보므로 직접 204 를 준다.
 * 헤더 자체는 next.config.mjs 의 headers() 가 붙인다.
 */
export function OPTIONS() {
  return new Response(null, { status: 204 })
}
