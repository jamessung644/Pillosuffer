import { NextRequest, NextResponse } from 'next/server'
import { checkSafety } from '@/lib/safety-llm'
import type { DrugInfo, MfdsContraindication, EdrugInfo } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const drugs: DrugInfo[] = body.drugs || []
    const foods: string[] = body.foods || []
    const mfdsContext: MfdsContraindication[] = body.mfdsContext || []
    const edrugInfo: EdrugInfo[] = body.edrugInfo || []

    if (!drugs.length || !foods.length) {
      return NextResponse.json({ error: '약품과 음식 정보가 필요합니다.' }, { status: 400 })
    }

    const result = await checkSafety(drugs, foods, mfdsContext, edrugInfo)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API/safety-check]', error)
    return NextResponse.json({ error: '안전 확인 실패' }, { status: 500 })
  }
}
