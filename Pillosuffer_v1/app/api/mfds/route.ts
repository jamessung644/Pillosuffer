import { NextRequest, NextResponse } from 'next/server'
import { queryMfds } from '@/lib/mfds'
import { queryEdrugInfo } from '@/lib/easyDrug'
import { resolveDrugProfiles } from '@/lib/ingredient'
import type { DrugInfo } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const drugs: DrugInfo[] = body.drugs || []
    const foods: string[] = body.foods || []

    if (!drugs.length) {
      return NextResponse.json({ contraindications: [], edrugInfo: [], matchCount: 0 })
    }

    // DrugBank DB + e약은요 API 병렬 조회
    const [contraindications, edrugInfo, drugProfiles] = await Promise.all([
      queryMfds(drugs, foods),
      queryEdrugInfo(drugs),
      resolveDrugProfiles(drugs),
    ])

    const matchCount = contraindications.length

    // 서버 콘솔에 검색 결과 로깅 — 개발자가 흐름 확인 가능
    console.log(`[mfds] 검색: 약품 ${drugs.length}개 (${drugs.map(d => d.name).join(', ')}) × 음식 ${foods.length}개 (${foods.join(', ')}) → DB 매칭 ${matchCount}건, e약은요 ${edrugInfo.length}건`)
    if (matchCount > 0) {
      console.log('[mfds] 매칭 샘플:', contraindications.slice(0, 3).map(c => `[${c.drug}] ${c.info.slice(0, 80)}`))
    }

    return NextResponse.json({
      contraindications,
      edrugInfo,
      drugProfiles,
      matchCount,
      searchedDrugs: drugs.length,
      searchedFoods: foods.length,
    })
  } catch (error) {
    console.error('[API/mfds]', error)
    return NextResponse.json({ error: 'DrugBank DB 조회 실패' }, { status: 500 })
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
