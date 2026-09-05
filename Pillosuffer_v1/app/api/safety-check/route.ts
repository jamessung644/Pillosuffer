import { NextRequest, NextResponse } from 'next/server'
import { checkSafety } from '@/lib/safety-llm'
import type { DrugInfo, MfdsContraindication, EdrugInfo, DrugProfile } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const drugs: DrugInfo[] = body.drugs || []
    const foods: string[] = body.foods || []
    const mfdsContext: MfdsContraindication[] = body.mfdsContext || []
    const edrugInfo: EdrugInfo[] = body.edrugInfo || []
    const drugProfiles: DrugProfile[] = body.drugProfiles || []

    if (!drugs.length || !foods.length) {
      return NextResponse.json({ error: '약품과 음식 정보가 필요합니다.' }, { status: 400 })
    }

    const result = await checkSafety(drugs, foods, mfdsContext, edrugInfo, drugProfiles)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API/safety-check]', error)
    return NextResponse.json({ error: '안전 확인 실패' }, { status: 500 })
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
