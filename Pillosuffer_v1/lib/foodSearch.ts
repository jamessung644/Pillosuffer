import { createClient } from './supabase'

export interface FoodSearchResult {
  food_code: string
  food_name: string
  main_category: string | null
  mid_category: string | null
  energy_kcal: number | null
  manufacturer: string | null
  type: 'food' | 'supplement'
  serving_size?: string | null
}

/**
 * 가공식품 + 영양제 동시 검색.
 *
 * 원래 /api/food-search 라우트였다. anon 키(RLS 로 보호되는 공개 키)만 쓰므로
 * 서버를 거칠 이유가 없어서 클라이언트로 내렸다. 앱에서는 왕복 한 번이 줄고
 * CORS 대상도 하나 줄어든다.
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const supabase = createClient()

  const [foodRes, suppRes] = await Promise.all([
    supabase
      .from('processed_foods')
      .select('food_code, food_name, main_category, mid_category, energy_kcal, manufacturer')
      .ilike('food_name', `%${q}%`)
      .limit(7),
    supabase
      .from('supplements')
      .select('id, product_name, main_category, main_ingredient, manufacturer, serving_size')
      .or(`product_name.ilike.%${q}%,main_ingredient.ilike.%${q}%`)
      .limit(5),
  ])

  if (foodRes.error) console.error('[food-search] food:', foodRes.error)
  if (suppRes.error) console.error('[food-search] supp:', suppRes.error)

  const foods: FoodSearchResult[] = (foodRes.data ?? []).map(item => ({
    food_code: item.food_code,
    food_name: item.food_name,
    main_category: item.main_category,
    mid_category: item.mid_category,
    energy_kcal: item.energy_kcal,
    manufacturer: item.manufacturer,
    type: 'food',
  }))

  const supplements: FoodSearchResult[] = (suppRes.data ?? []).map(item => ({
    food_code: `supp-${item.id}`,
    food_name: item.product_name,
    main_category: item.main_category,
    mid_category: item.main_ingredient,
    energy_kcal: null,
    manufacturer: item.manufacturer,
    type: 'supplement',
    serving_size: item.serving_size,
  }))

  return [...foods, ...supplements]
}
