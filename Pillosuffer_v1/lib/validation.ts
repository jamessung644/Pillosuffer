import type { DrugInfo, HistoryEntry, SafetyResult, ScanSession } from '@/types'

export function parseStoredJson(raw: string | null): unknown {
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isDrug(value: unknown): value is DrugInfo {
  return isRecord(value) && typeof value.name === 'string' && !!value.name.trim() &&
    ['dose', 'frequency', 'days', 'usage'].every(key => value[key] === undefined || typeof value[key] === 'string')
}

export function readDrugs(value: unknown): DrugInfo[] {
  return Array.isArray(value) ? value.filter(isDrug).map(drug => ({ ...drug, name: drug.name.trim() })) : []
}

export function readFoods(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
    : []
}

export function readScanSession(raw: string | null): ScanSession | null {
  const value = parseStoredJson(raw)
  if (!isRecord(value) || !Array.isArray(value.drugs)) return null
  return {
    rawText: typeof value.rawText === 'string' ? value.rawText : '',
    maskedText: typeof value.maskedText === 'string' ? value.maskedText : '',
    drugs: readDrugs(value.drugs),
    scannedAt: typeof value.scannedAt === 'string' ? value.scannedAt : undefined,
  }
}

const isVerdict = (value: unknown) => value === 'safe' || value === 'caution' || value === 'danger'

export function isSafetyResult(value: unknown): value is SafetyResult {
  return isRecord(value) && isVerdict(value.verdict) &&
    typeof value.disclaimer === 'string' && !!value.disclaimer.trim() &&
    typeof value.checkedAt === 'string' && Number.isFinite(Date.parse(value.checkedAt)) &&
    Array.isArray(value.details) && value.details.length > 0 && value.details.every(detail =>
      isRecord(detail) && isVerdict(detail.verdict) &&
      ['drug', 'food', 'reason'].every(key => typeof detail[key] === 'string' && !!detail[key].trim()) &&
      (detail.source === undefined || typeof detail.source === 'string')
    )
}

export function readHistory(raw: string | null): HistoryEntry[] {
  const value = parseStoredJson(raw)
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is HistoryEntry =>
    isRecord(entry) && typeof entry.id === 'string' &&
    Array.isArray(entry.drugs) && entry.drugs.length > 0 && entry.drugs.every(isDrug) &&
    Array.isArray(entry.foods) && entry.foods.length > 0 && entry.foods.every(food => typeof food === 'string' && !!food.trim()) &&
    isSafetyResult(entry.result)
  ).slice(0, 10)
}
