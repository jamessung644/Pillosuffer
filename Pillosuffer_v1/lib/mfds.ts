import { createClient } from '@supabase/supabase-js'
import type { DrugInfo, MfdsContraindication } from '@/types'
import { resolveIngredient } from './ingredient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 한국어 음식명 → 영문 검색 키워드 매핑
const KOR_TO_ENG: Record<string, string[]> = {
  '자몽': ['grapefruit'],
  '우유': ['milk', 'dairy'],
  '알코올': ['alcohol', 'ethanol'],
  '술': ['alcohol', 'ethanol'],
  '녹차': ['green tea'],
  '커피': ['coffee', 'caffeine'],
  '카페인': ['caffeine'],
  '칼슘': ['calcium'],
  '철분': ['iron'],
  '비타민': ['vitamin'],
  '마그네슘': ['magnesium'],
  '오메가': ['omega', 'fish oil'],
  '홍삼': ['ginseng'],
  '인삼': ['ginseng'],
  '생강': ['ginger'],
  '마늘': ['garlic'],
  '은행': ['ginkgo'],
  '카모마일': ['chamomile'],
  '세인트존스워트': ['st. john'],
  '에키나시아': ['echinacea'],
  '발레리안': ['valerian'],
  '고수': ['cilantro'],
  '귤': ['citrus'],
  '오렌지': ['orange', 'citrus'],
  '레몬': ['lemon'],
  '유제품': ['dairy', 'milk'],
  '치즈': ['cheese', 'dairy'],
  '요거트': ['yogurt', 'dairy'],
  '두유': ['soy', 'soybean'],
  '콩': ['soy'],
  // 한식 추가
  '라면': ['ramen', 'noodle', 'sodium'],
  '김밥': ['rice', 'seaweed'],
  '김치': ['kimchi', 'fermented'],
  '된장': ['soybean paste', 'soy'],
  '고추장': ['chili paste', 'capsaicin'],
  '청국장': ['fermented soy', 'vitamin k'],
  '낫토': ['natto', 'vitamin k'],
  '시금치': ['spinach', 'vitamin k'],
  '브로콜리': ['broccoli', 'vitamin k'],
  '양배추': ['cabbage', 'vitamin k'],
  '케일': ['kale', 'vitamin k'],
  '바나나': ['banana', 'potassium'],
  '아보카도': ['avocado', 'potassium'],
  '땅콩': ['peanut'],
  '초콜릿': ['chocolate', 'caffeine', 'tyramine'],
  '에너지드링크': ['caffeine', 'energy drink'],
}

/**
 * 한국어 약품명(상품명·성분명) → 영문 성분명 매핑
 * DrugBank 검색용 — 매핑이 넓을수록 한국 약 이름으로 검색 정확도 향상
 * export: easyDrug.ts 등 다른 모듈에서도 활용 가능
 */
export const DRUG_KOR_TO_ENG: Record<string, string[]> = {
  // ── 진통·해열·소염 ──
  '타이레놀': ['acetaminophen', 'paracetamol'],
  '아세트아미노펜': ['acetaminophen', 'paracetamol'],
  '아스피린': ['aspirin', 'acetylsalicylic'],
  '바이엘아스피린': ['aspirin'],
  '이부프로펜': ['ibuprofen'],
  '부루펜': ['ibuprofen'],
  '나프록센': ['naproxen'],
  '디클로페낙': ['diclofenac'],
  '볼타렌': ['diclofenac'],
  '멜록시캄': ['meloxicam'],
  '셀레콕시브': ['celecoxib'],
  '세레브렉스': ['celecoxib'],
  '트라마돌': ['tramadol'],
  '울트라셋': ['tramadol', 'acetaminophen'],
  '게보린': ['acetaminophen', 'caffeine'],
  // ── PPI 계열 ──
  '놀텍': ['ilaprazole'],   // 일양약품 놀텍정 = 일라프라졸 (rabeprazole 아님)
  '라베프라졸': ['rabeprazole'],
  '넥시움': ['esomeprazole'],
  '에소메프라졸': ['esomeprazole'],
  '오메프라졸': ['omeprazole'],
  '판토프라졸': ['pantoprazole'],
  '판토록': ['pantoprazole'],
  '란소프라졸': ['lansoprazole'],
  '란스톤': ['lansoprazole'],
  '덱실란트': ['dexlansoprazole'],
  // ── 위장 ──
  '포리부틴': ['trimebutine'],
  '트리메부틴': ['trimebutine'],
  '돔페리돈': ['domperidone'],
  '모티리움': ['domperidone'],
  '알지겐': ['alginic acid', 'sodium alginate', 'alginate'],
  '게비스콘': ['alginic acid', 'sodium alginate'],
  '가비스콘': ['alginic acid', 'sodium alginate'],
  '가스터': ['famotidine'],
  '파모티딘': ['famotidine'],
  '가모드': ['famotidine'],
  '가스모틴': ['mosapride'],
  '모사프리드': ['mosapride'],
  '이토프리드': ['itopride'],
  '넥시듀오': ['esomeprazole', 'domperidone'],
  '옥티늄': ['otilonium bromide'],
  '라미스타': ['ranitidine'],
  '라니티딘': ['ranitidine'],
  '잘레톤': ['rebamipide'],
  '레바미피드': ['rebamipide'],
  '스토가': ['lafutidine'],
  '스티렌': ['eupatilin'],
  '메디락': ['lactobacillus'],
  '디게스타': ['pancreatin'],
  '베스타제': ['pancreatin'],
  '훼스탈': ['pancreatin'],
  '수크랄페이트': ['sucralfate'],
  // ── 고혈압 ──
  '암로디핀': ['amlodipine'],
  '노바스크': ['amlodipine'],
  '로사르탄': ['losartan'],
  '코자': ['losartan'],
  '발사르탄': ['valsartan'],
  '디오반': ['valsartan'],
  '텔미사르탄': ['telmisartan'],
  '미카르디스': ['telmisartan'],
  '프리토': ['telmisartan'],
  '이르베사르탄': ['irbesartan'],
  '아프로벨': ['irbesartan'],
  '칸데사르탄': ['candesartan'],
  '아타칸드': ['candesartan'],
  '올메사르탄': ['olmesartan'],
  '올메텍': ['olmesartan'],
  '니페디핀': ['nifedipine'],
  '아달라트': ['nifedipine'],
  '딜티아젬': ['diltiazem'],
  '카르베딜올': ['carvedilol'],
  '아테놀올': ['atenolol'],
  '비소프롤올': ['bisoprolol'],
  '프로프라놀올': ['propranolol'],
  '히드로클로로티아지드': ['hydrochlorothiazide'],
  '인다파마이드': ['indapamide'],
  '트윈스타': ['telmisartan', 'amlodipine'],
  '엑스포지': ['amlodipine', 'valsartan'],
  // ── 고지혈증 ──
  '아토르바스타틴': ['atorvastatin', 'statin'],
  '리피토': ['atorvastatin', 'statin'],
  '심바스타틴': ['simvastatin', 'statin'],
  '조코': ['simvastatin', 'statin'],
  '로수바스타틴': ['rosuvastatin', 'statin'],
  '크레스토': ['rosuvastatin', 'statin'],
  '피타바스타틴': ['pitavastatin', 'statin'],
  '리바로': ['pitavastatin', 'statin'],
  '프라바스타틴': ['pravastatin', 'statin'],
  '에제티미브': ['ezetimibe'],
  '제티아': ['ezetimibe'],
  '바이토린': ['ezetimibe', 'simvastatin'],
  '페노피브레이트': ['fenofibrate'],
  '리피딜': ['fenofibrate'],
  // ── 당뇨 ──
  '메트포르민': ['metformin'],
  '글루코파지': ['metformin'],
  '다이아벡스': ['metformin'],
  '글리메피리드': ['glimepiride'],
  '아마릴': ['glimepiride'],
  '시타글립틴': ['sitagliptin'],
  '자누비아': ['sitagliptin'],
  '다파글리플로진': ['dapagliflozin'],
  '포시가': ['dapagliflozin'],
  '엠파글리플로진': ['empagliflozin'],
  '자디앙': ['empagliflozin'],
  // ── 강심제(디기탈리스) ──
  '디곡신': ['digoxin'],
  '디고신': ['digoxin'],
  '카데프엘릭서': ['digoxin'],
  '카데프': ['digoxin'],
  '라녹신': ['digoxin'],
  // ── 항혈전·항응고 ──
  '와파린': ['warfarin'],
  '쿠마딘': ['warfarin'],
  '클로피도그렐': ['clopidogrel'],
  '플라빅스': ['clopidogrel'],
  '리바록사반': ['rivaroxaban'],
  '자렐토': ['rivaroxaban'],
  '아픽사반': ['apixaban'],
  '엘리퀴스': ['apixaban'],
  '다비가트란': ['dabigatran'],
  '프라닥사': ['dabigatran'],
  // ── 항생제 ──
  '아목시실린': ['amoxicillin'],
  '시프로플록사신': ['ciprofloxacin'],
  '레보플록사신': ['levofloxacin'],
  '크라비트': ['levofloxacin'],
  '아지트로마이신': ['azithromycin'],
  '지스로맥스': ['azithromycin'],
  '독시사이클린': ['doxycycline'],
  '메트로니다졸': ['metronidazole'],
  '플라질': ['metronidazole'],
  '클라리트로마이신': ['clarithromycin'],
  '클래리시드': ['clarithromycin'],
  '세팔렉신': ['cephalexin'],
  '아우그멘틴': ['amoxicillin', 'clavulanate'],
  // ── 정신건강 ──
  '에스시탈로프람': ['escitalopram'],
  '렉사프로': ['escitalopram'],
  '서트랄린': ['sertraline'],
  '졸로프트': ['sertraline'],
  '파록세틴': ['paroxetine'],
  '벤라팍신': ['venlafaxine'],
  '이팩사': ['venlafaxine'],
  '미르타자핀': ['mirtazapine'],
  '알프라졸람': ['alprazolam'],
  '자낙스': ['alprazolam'],
  '로라제팜': ['lorazepam'],
  '아티반': ['lorazepam'],
  '졸피뎀': ['zolpidem'],
  '스틸녹스': ['zolpidem'],
  // ── 항경련 ──
  '가바펜틴': ['gabapentin'],
  '뉴론틴': ['gabapentin'],
  '프레가발린': ['pregabalin'],
  '리리카': ['pregabalin'],
  '카르바마제핀': ['carbamazepine'],
  '테그레톨': ['carbamazepine'],
  '라모트리진': ['lamotrigine'],
  '라믹탈': ['lamotrigine'],
  '발프로산': ['valproic acid'],
  '데파킨': ['valproic acid'],
  // ── 갑상선·통풍 ──
  '레보티록신': ['levothyroxine'],
  '신지로이드': ['levothyroxine'],
  '씬지로이드': ['levothyroxine'],
  '알로푸리놀': ['allopurinol'],
  '자일로릭': ['allopurinol'],
  '콜히친': ['colchicine'],
  '페북소스타트': ['febuxostat'],
  '페브릭': ['febuxostat'],
  // ── 호흡기·알레르기 ──
  '몬테루카스트': ['montelukast'],
  '싱귤레어': ['montelukast'],
  '테오필린': ['theophylline'],
  '세티리진': ['cetirizine'],
  '지르텍': ['cetirizine'],
  '펙소페나딘': ['fexofenadine'],
  '알레그라': ['fexofenadine'],
  '로라타딘': ['loratadine'],
  '클라리틴': ['loratadine'],
  // ── 스테로이드·면역 ──
  '프레드니솔론': ['prednisolone'],
  '덱사메타손': ['dexamethasone'],
  '메토트렉세이트': ['methotrexate'],
  '사이클로스포린': ['cyclosporine'],
  '아자티오프린': ['azathioprine'],
  // ── 비뇨·전립선 ──
  '실데나필': ['sildenafil'],
  '비아그라': ['sildenafil'],
  '타다라필': ['tadalafil'],
  '시알리스': ['tadalafil'],
  '탐스로신': ['tamsulosin'],
  '하루날': ['tamsulosin'],
  // ── 영양제·보조제 ──
  '오메가': ['omega-3', 'fish oil', 'EPA', 'DHA'],
  '철분': ['iron', 'ferrous sulfate'],
  '칼슘': ['calcium carbonate', 'calcium citrate'],
  '비타민d': ['vitamin d', 'cholecalciferol'],
  '비타민c': ['vitamin c', 'ascorbic acid'],
  '엽산': ['folic acid', 'folate'],
  '아연': ['zinc'],
  '마그네슘': ['magnesium'],
}

/** 약품명에서 성분명·영문명을 최대한 추출하는 키워드 확장 */
function expandDrugKeywords(name: string): string[] {
  const keywords = new Set<string>([name.toLowerCase()])

  // 1. 괄호 안 성분명 추출: "타이레놀정500밀리그람(아세트아미노펜)" → "아세트아미노펜"
  const parenMatch = name.match(/[（(]([^）)]+)[）)]/)
  if (parenMatch) {
    keywords.add(parenMatch[1].toLowerCase())
    keywords.add(name.replace(/[（(][^）)]+[）)]/g, '').trim().toLowerCase())
  }

  // 2. 용량 제거: "놀텍정20mg" → "놀텍정"
  const noNum = name.replace(/\d+(\.\d+)?\s*(mg|ml|g|mcg|iu|μg|밀리그람|밀리그램|그램|마이크로그램)/gi, '').trim()
  if (noNum && noNum !== name) keywords.add(noNum.toLowerCase())

  // 3. 접미사(제형) 제거 — 모든 후보에 적용
  const suffixRe = /(정|캡슐|주사|시럽|액|산|환|서방정|장용정|연질캡슐|필름코팅정|크림|겔|로션|패취|좌제|현탁액|츄어블정|구강붕해정|과립|분말)$/
  for (const kw of [...keywords]) {
    const stripped = kw.replace(suffixRe, '')
    if (stripped && stripped !== kw) keywords.add(stripped)
  }

  // 4. 한글 → 영문 매핑 (모든 파생 키워드에 적용)
  for (const [kor, engs] of Object.entries(DRUG_KOR_TO_ENG)) {
    const korLow = kor.toLowerCase()
    for (const kw of [...keywords]) {
      if (kw.includes(korLow)) {
        engs.forEach(e => keywords.add(e))
        break // 이 kor는 매칭됨 → 다음 키워드로
      }
    }
  }

  return [...keywords].filter(Boolean)
}

/**
 * Supabase drug_food_interactions 테이블에서 약물-음식 상호작용 데이터 조회
 * DrugBank 6.0 기반 2,512건 데이터
 */
export async function queryMfds(
  drugs: DrugInfo[],
  foods: string[] = []
): Promise<MfdsContraindication[]> {
  if (!drugs.length) return []

  const results: MfdsContraindication[] = []
  const seen = new Set<string>()

  const addResult = (drug: string, info: string, source: string) => {
    const key = `${drug}|${info}`
    if (!seen.has(key)) {
      seen.add(key)
      results.push({ drug, info, source })
    }
  }

  // 음식명 키워드 (영문 변환) 미리 준비
  const foodKeywords = new Set<string>()
  for (const food of foods) {
    foodKeywords.add(food.toLowerCase())
    for (const [kor, engs] of Object.entries(KOR_TO_ENG)) {
      if (food.includes(kor)) {
        engs.forEach(e => foodKeywords.add(e))
      }
    }
  }
  const foodList = [...foodKeywords]

  // 약품별 검색 키워드 — 정적 매핑 + (미매칭 시) 제품허가 API 동적 성분 해석
  // 정적 매핑(DRUG_KOR_TO_ENG)에 없는 약은 공식 API로 영문 성분명을 받아 검색에 추가.
  const keywordsByDrug = new Map<string, string[]>()
  await Promise.all(
    drugs.map(async (drug) => {
      const kws = new Set(expandDrugKeywords(drug.name))
      const staticHit = Object.keys(DRUG_KOR_TO_ENG).some(
        k => drug.name.toLowerCase().includes(k.toLowerCase())
      )
      if (!staticHit) {
        const resolved = await resolveIngredient(drug.name)
        if (resolved) {
          resolved.eng.forEach(e => kws.add(e.toLowerCase()))
          if (resolved.kor) kws.add(resolved.kor.toLowerCase())
        }
      }
      keywordsByDrug.set(drug.name, [...kws])
    })
  )

  // 1. 약품 × 음식 조합 검색 — 약품 매칭된 행 중 음식 키워드 포함된 것 우선 추출
  await Promise.all(
    drugs.flatMap(drug =>
      (keywordsByDrug.get(drug.name) ?? []).flatMap(drugKw =>
        foodList.map(async (foodKw) => {
          const { data } = await supabase
            .from('drug_food_interactions')
            .select('drug_name, interaction_description, source')
            .ilike('drug_name', `%${drugKw}%`)
            .ilike('interaction_description', `%${foodKw}%`)
            .limit(5)
          if (data?.length) {
            for (const row of data) {
              addResult(row.drug_name, row.interaction_description, row.source)
            }
          }
        })
      )
    )
  )

  // 2. 약품명 단독 검색 — 조합 매칭 없을 때 약품별 일반 상호작용 정보 보충
  await Promise.all(
    drugs.flatMap(drug => (keywordsByDrug.get(drug.name) ?? []).map(async (keyword) => {
      const { data } = await supabase
        .from('drug_food_interactions')
        .select('drug_name, interaction_description, source')
        .ilike('drug_name', `%${keyword}%`)
        .limit(4)

      if (data?.length) {
        for (const row of data) {
          addResult(row.drug_name, row.interaction_description, row.source)
        }
      }
    }))
  )

  // ── 삭제된 섹션 ──
  // 이전에 "음식명 단독 검색"과 "일반적 상호작용 fallback" 섹션이 있었으나
  // 사용자 약품과 무관한 다른 약물의 데이터를 반환하여 LLM 환각을 유발하므로 제거.
  // 약품이 DrugBank에 없으면 정직하게 0건을 반환한다.

  if (!results.length) {
    console.log(
      `[mfds] DrugBank 매칭 0건: ${drugs.map(d => d.name).join(', ')} × ${foods.join(', ')}`
    )
  }

  return results
}
