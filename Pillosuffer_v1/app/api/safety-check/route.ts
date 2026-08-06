import { NextRequest, NextResponse } from 'next/server'
import { authenticate, consumeAnalysis, refundAnalysis, MONTHLY_ANALYSIS_LIMIT } from '@/lib/apiAuth'
import { checkSafety } from '@/lib/safety-llm'
import type { DrugInfo, MfdsContraindication, EdrugInfo, DrugProfile } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 분석은 로그인 사용자만. 사용량을 사용자에 묶어야 한도가 의미를 갖는다.
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.', code: 'UNAUTHENTICATED' },
        { status: 401 }
      )
    }

    // 잘못된 요청으로 횟수를 잃지 않도록 본문 검증을 소비보다 먼저 한다.
    const body = await request.json()
    const drugs: DrugInfo[] = body.drugs || []
    const foods: string[] = body.foods || []
    const mfdsContext: MfdsContraindication[] = body.mfdsContext || []
    const edrugInfo: EdrugInfo[] = body.edrugInfo || []
    const drugProfiles: DrugProfile[] = body.drugProfiles || []

    if (!drugs.length || !foods.length) {
      return NextResponse.json({ error: '약품과 음식 정보가 필요합니다.' }, { status: 400 })
    }

    // 경쟁 조건을 막기 위해 분석 실행 전에 소비한다. 실패하면 아래에서 되돌린다.
    const usage = await consumeAnalysis(auth)
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `이번 달 약 분석 ${MONTHLY_ANALYSIS_LIMIT}회를 모두 사용했습니다. 다음 달 1일에 다시 이용할 수 있습니다.`,
          code: 'MONTHLY_LIMIT_REACHED',
          used: usage.used,
          limit: MONTHLY_ANALYSIS_LIMIT,
        },
        { status: 429 }
      )
    }

    try {
      const result = await checkSafety(drugs, foods, mfdsContext, edrugInfo, drugProfiles)
      return NextResponse.json({ ...result, usage: { remaining: usage.remaining, limit: MONTHLY_ANALYSIS_LIMIT } })
    } catch (analysisError) {
      // 서버 사유로 결과를 못 준 경우다 — 횟수를 돌려준다.
      await refundAnalysis(auth)
      throw analysisError
    }
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
