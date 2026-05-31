import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] })
  }

  // 음식 + 영양제 동시 검색
  const [foodRes, suppRes] = await Promise.all([
    supabase
      .from('processed_foods')
      .select('food_code, food_name, main_category, mid_category, energy_kcal, manufacturer')
      .ilike('food_name', `%${query}%`)
      .limit(7),
    supabase
      .from('supplements')
      .select('id, product_name, main_category, main_ingredient, manufacturer, serving_size')
      .or(`product_name.ilike.%${query}%,main_ingredient.ilike.%${query}%`)
      .limit(5),
  ])

  const foodResults = (foodRes.data ?? []).map(item => ({
    food_code: item.food_code,
    food_name: item.food_name,
    main_category: item.main_category,
    mid_category: item.mid_category,
    energy_kcal: item.energy_kcal,
    manufacturer: item.manufacturer,
    type: 'food' as const,
  }))

  const suppResults = (suppRes.data ?? []).map(item => ({
    food_code: `supp-${item.id}`,
    food_name: item.product_name,
    main_category: item.main_category,
    mid_category: item.main_ingredient,
    energy_kcal: null as null,
    manufacturer: item.manufacturer,
    type: 'supplement' as const,
    serving_size: item.serving_size,
  }))

  if (foodRes.error) console.error('[food-search] food:', foodRes.error)
  if (suppRes.error) console.error('[food-search] supp:', suppRes.error)

  return NextResponse.json({ results: [...foodResults, ...suppResults] })
}
