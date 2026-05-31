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
