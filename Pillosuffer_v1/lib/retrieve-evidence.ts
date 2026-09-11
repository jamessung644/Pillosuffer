import { createClient } from '@supabase/supabase-js'
import { resolveIngredient } from './ingredient'
import { buildEvidenceResult, DATASET_ROWS, DATASET_SHA256, findEvidence, sameProduct, type EvidenceRow } from './evidence'
import type { DrugInfo, EvidenceReference } from '@/types'

export async function retrieveEvidence(drugs: DrugInfo[], foods: string[]) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { count, error: corpusError } = await db.from('drug_food_interactions')
    .select('id', { count: 'exact', head: true }).eq('dataset_sha256', DATASET_SHA256)
    .abortSignal(AbortSignal.timeout(10000))
  if (corpusError || count !== DATASET_ROWS) throw new Error('Evidence corpus is unavailable or incomplete')

  const records: EvidenceReference[] = []
  await Promise.all(drugs.map(async drug => {
    const keywords = new Set([drug.name.trim().toLowerCase()])
    const profile = await resolveIngredient(drug.name)
    if (profile && sameProduct(drug.name, profile.itemName)) {
      profile.eng.forEach(name => keywords.add(name.toLowerCase()))
    }
    const rows: EvidenceRow[] = []
    for (const keyword of keywords) {
      const { data, error } = await db.from('drug_food_interactions')
        .select('id,drug_name,interaction_description,source,source_reference,dataset_sha256')
        .eq('dataset_sha256', DATASET_SHA256)
        .ilike('drug_name', keyword.replace(/[\\%_]/g, '\\$&'))
        .limit(100).abortSignal(AbortSignal.timeout(10000))
      if (error || !Array.isArray(data)) throw new Error('Evidence record lookup failed')
      rows.push(...data)
    }
    for (const food of foods) records.push(...findEvidence(drug.name, food, [...keywords], rows))
  }))
  return buildEvidenceResult(drugs, foods, records)
}
