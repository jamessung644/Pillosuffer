import { NextRequest, NextResponse } from 'next/server'
import { queryMfds } from '@/lib/mfds'
import { queryEdrugInfo } from '@/lib/easyDrug'
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
    const [contraindications, edrugInfo] = await Promise.all([
      queryMfds(drugs, foods),
      queryEdrugInfo(drugs),
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
      matchCount,
      searchedDrugs: drugs.length,
      searchedFoods: foods.length,
    })
  } catch (error) {
    console.error('[API/mfds]', error)
    return NextResponse.json({ error: 'DrugBank DB 조회 실패' }, { status: 500 })
  }
}
