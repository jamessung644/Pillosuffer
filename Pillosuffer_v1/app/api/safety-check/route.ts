import { NextRequest, NextResponse } from 'next/server'
import { retrieveEvidence } from '@/lib/retrieve-evidence'
import { isDrug, isRecord, readDrugs, readFoods } from '@/lib/validation'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)
  if (!isRecord(body) || !Array.isArray(body.drugs) || !Array.isArray(body.foods) ||
    !body.drugs.length || body.drugs.length > 10 || !body.drugs.every(d => isDrug(d) && d.name.length <= 100) ||
    !body.foods.length || body.foods.length > 10 || !body.foods.every(f => typeof f === 'string' && !!f.trim() && f.length <= 100)) {
    return NextResponse.json({ error: '약품과 음식을 각각 1~10개 입력해 주세요.' }, { status: 400 })
  }
  try {
    // Never accept client-supplied evidence, sources, ingredient guesses, or verdicts.
    const result = await retrieveEvidence(readDrugs(body.drugs), readFoods(body.foods))
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(
      { code: 'EVIDENCE_UNAVAILABLE', error: '상호작용 근거 데이터가 확인되지 않아 결과 생성을 중단했습니다. 약사 또는 의사에게 확인해 주세요.' },
      { status: 503 }
    )
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
