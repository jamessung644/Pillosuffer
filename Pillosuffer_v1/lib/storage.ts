import type { DrugInfo } from '@/types'

const KEY = 'savedMedications'      // 평면 목록 (하위 호환 미러)
const GROUPS_KEY = 'medGroups'      // 촬영 세션 단위 그룹 (단일 진실 소스)
const PROFILE_KEY = 'userProfile'

export interface UserProfile {
  name?: string
  age?: string
  gender?: 'male' | 'female' | 'other'
  allergies?: string
  conditions?: string
}

/**
 * 한 번의 촬영/입력으로 함께 기록된 약물 묶음
 * - scannedAt: 촬영(기록)한 날짜·시각
 * - source: 'scan'(약봉투 촬영) | 'manual'(직접 입력)
 */
export interface MedGroup {
  id: string
  scannedAt: string
  source: 'scan' | 'manual'
  drugs: DrugInfo[]
}

export function getProfile(): UserProfile {
  if (!isBrowser()) return {}
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : {}
  } catch {
    return {}
  }
}

export function saveProfile(profile: UserProfile): void {
  if (!isBrowser()) return
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 그룹들을 평면 목록(savedMedications)으로 미러링 — 기존 화면 하위 호환 */
function flatten(groups: MedGroup[]): DrugInfo[] {
  const map = new Map<string, DrugInfo>()
  for (const g of groups) {
    for (const d of g.drugs) map.set(d.name, d)
  }
  return Array.from(map.values())
}

function syncFlatMirror(groups: MedGroup[]): DrugInfo[] {
  const flat = flatten(groups)
  if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(flat))
  return flat
}

// ──────────────────────────────────────────────
// 그룹(촬영 세션) 단위 API
// ──────────────────────────────────────────────

/** 저장된 그룹 목록 — 없으면 기존 평면 데이터를 1개 그룹으로 마이그레이션 */
export function getMedGroups(): MedGroup[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    if (raw) return JSON.parse(raw) as MedGroup[]
  } catch {
    // 손상된 데이터 → 마이그레이션 시도로 폴백
  }

  // 마이그레이션: 기존 savedMedications(평면) → 단일 그룹
  try {
    const legacy = localStorage.getItem(KEY)
    const legacyDrugs: DrugInfo[] = legacy ? JSON.parse(legacy) : []
    if (legacyDrugs.length) {
      const migrated: MedGroup[] = [{
        id: genId(),
        scannedAt: new Date().toISOString(),
        source: 'scan',
        drugs: legacyDrugs,
      }]
      localStorage.setItem(GROUPS_KEY, JSON.stringify(migrated))
      return migrated
    }
  } catch {
    // 무시 — 빈 목록 반환
  }
  return []
}

export function persistMedGroups(groups: MedGroup[]): void {
  if (!isBrowser()) return
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
  syncFlatMirror(groups)
}

/** 새 촬영/입력 묶음을 추가 (최신이 맨 위) */
export function addMedGroup(
  drugs: DrugInfo[],
  source: 'scan' | 'manual' = 'scan',
  scannedAt?: string
): MedGroup {
  const group: MedGroup = {
    id: genId(),
    scannedAt: scannedAt || new Date().toISOString(),
    source,
    drugs,
  }
  persistMedGroups([group, ...getMedGroups()])
  return group
}

/** 그룹 전체 삭제 */
export function deleteMedGroup(id: string): MedGroup[] {
  const next = getMedGroups().filter(g => g.id !== id)
  persistMedGroups(next)
  return next
}

/** 그룹 내 특정 약품 수정 */
export function updateDrugInGroup(groupId: string, index: number, drug: DrugInfo): MedGroup[] {
  const next = getMedGroups().map(g =>
    g.id === groupId
      ? { ...g, drugs: g.drugs.map((d, i) => (i === index ? drug : d)) }
      : g
  )
  persistMedGroups(next)
  return next
}

/** 그룹 내 특정 약품 삭제 (그룹이 비면 그룹도 제거) */
export function deleteDrugInGroup(groupId: string, index: number): MedGroup[] {
  const next = getMedGroups()
    .map(g => (g.id === groupId ? { ...g, drugs: g.drugs.filter((_, i) => i !== index) } : g))
    .filter(g => g.drugs.length > 0)
  persistMedGroups(next)
  return next
}

/** 모든 약품·그룹 삭제 */
export function clearMedGroups(): void {
  if (!isBrowser()) return
  localStorage.removeItem(GROUPS_KEY)
  localStorage.removeItem(KEY)
}

// ──────────────────────────────────────────────
// 평면 목록 API (하위 호환 — result·food·profile·home에서 사용)
// ──────────────────────────────────────────────

/** 모든 그룹을 합친 평면 약품 목록 (이름 기준 중복 제거) */
export function getSavedDrugs(): DrugInfo[] {
  if (!isBrowser()) return []
  const groups = getMedGroups()
  if (groups.length) return flatten(groups)
  // 그룹·마이그레이션 모두 비었을 때의 최종 폴백
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DrugInfo[]) : []
  } catch {
    return []
  }
}

/** @deprecated 그룹 API(addMedGroup) 사용 권장 — 평면 누적 저장 */
export function appendSavedDrugs(drugs: DrugInfo[]): DrugInfo[] {
  addMedGroup(drugs, 'scan')
  return getSavedDrugs()
}

export function clearSavedDrugs(): void {
  clearMedGroups()
}
