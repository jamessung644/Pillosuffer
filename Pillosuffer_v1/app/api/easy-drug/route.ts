import { NextRequest, NextResponse } from 'next/server'
import { fetchEasyDrug } from '@/lib/easyDrug'
import { resolveIngredient } from '@/lib/ingredient'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim()
  if (!name) {
    return NextResponse.json({ error: 'name 파라미터가 필요합니다.' }, { status: 400 })
  }

  try {
    // e약은요(쉬운 설명) + 제품허가(성분·분류·제조사) 병렬 조회
    // e약은요는 제품명 기반이라 성분명·일부 제품은 0건 → 제품허가가 보완
    const [info, permit] = await Promise.all([
      fetchEasyDrug(name),
      resolveIngredient(name),
    ])
    return NextResponse.json({
      found: !!(info || permit),
      info: info ?? null,
      permit: permit ?? null,
      name,
    })
  } catch (error) {
    console.error('[API/easy-drug]', error)
    return NextResponse.json({ error: '약품 정보 조회 실패' }, { status: 500 })
  }
}
