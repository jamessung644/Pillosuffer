'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'
import { apiUrl } from '@/lib/api'
import type { DrugInfo } from '@/types'
import type { EasyDrugInfo } from '@/lib/easyDrug'
import type { ResolvedIngredient } from '@/lib/ingredient'

interface Props {
  drug: DrugInfo
  index: number
  onUpdate: (index: number, drug: DrugInfo) => void
  onDelete: (index: number) => void
}

export default function DrugCard({ drug, index, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(drug)
  const [infoOpen, setInfoOpen] = useState(false)
  const [info, setInfo] = useState<EasyDrugInfo | null>(null)
  const [permit, setPermit] = useState<ResolvedIngredient | null>(null)
  const [infoState, setInfoState] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle')

  async function toggleInfo() {
    if (infoOpen) { setInfoOpen(false); return }
    setInfoOpen(true)
    if (info || permit || infoState === 'loading') return
    setInfoState('loading')
    try {
      const res = await fetch(apiUrl(`/api/easy-drug?name=${encodeURIComponent(drug.name)}`))
      const data = await res.json()
      if (data.found) {
        if (data.info) setInfo(data.info)
        if (data.permit) setPermit(data.permit)
        setInfoState('idle')
      } else {
        setInfoState('notfound')
      }
    } catch {
      setInfoState('error')
    }
  }

  function save() {
    onUpdate(index, draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-sm">
        <div className="space-y-3">
          <Field label="약 이름" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="용량" placeholder="500mg" value={draft.dose} onChange={v => setDraft({ ...draft, dose: v })} />
            <Field label="하루 몇 번" placeholder="1일 3회" value={draft.frequency} onChange={v => setDraft({ ...draft, frequency: v })} />
            <Field label="며칠 동안" placeholder="3일" value={draft.days} onChange={v => setDraft({ ...draft, days: v })} />
            <Field label="언제 먹나요" placeholder="식후 30분" value={draft.usage} onChange={v => setDraft({ ...draft, usage: v })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base font-bold active:bg-blue-700">저장</button>
            <button onClick={() => { setDraft(drug); setEditing(false) }} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-base font-bold">취소</button>
          </div>
        </div>
      </div>
    )
  }

  const chips = [
    drug.dose && { t: drug.dose, c: 'bg-gray-100 text-gray-500' },
    drug.frequency && { t: drug.frequency, c: 'bg-blue-50 text-blue-600' },
    drug.days && { t: drug.days, c: 'bg-indigo-50 text-indigo-600' },
    drug.usage && { t: drug.usage, c: 'bg-green-50 text-green-600' },
  ].filter(Boolean) as { t: string; c: string }[]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      {/* 상단: 아이콘 + 이름 */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
          <Icon name="pill" size={22} />
        </div>
        <p className="text-lg font-bold text-gray-900 min-w-0 truncate">{drug.name}</p>
      </div>

      {/* 칩 */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pl-1">
          {chips.map((ch, i) => (
            <span key={i} className={`text-sm font-semibold px-3 py-1 rounded-full ${ch.c}`}>{ch.t}</span>
          ))}
        </div>
      )}

      {/* 액션 */}
      <div className="flex gap-2 mt-3.5 pt-3.5 border-t border-gray-100">
        <ActionBtn icon="info" label="정보" onClick={toggleInfo} active={infoOpen} />
        <ActionBtn icon="pencil" label="수정" onClick={() => setEditing(true)} />
        <ActionBtn icon="trash" label="삭제" onClick={() => onDelete(index)} danger />
      </div>

      {/* 정보 패널 */}
      {infoOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {infoState === 'loading' && <p className="text-gray-400 text-sm">약품 정보를 불러오는 중…</p>}
          {infoState === 'notfound' && <p className="text-gray-400 text-sm">DB에서 &quot;{drug.name}&quot; 정보를 찾지 못했어요.</p>}
          {infoState === 'error' && <p className="text-red-400 text-sm">정보 조회에 실패했어요.</p>}
          {permit && (
            <div className="rounded-xl p-3 bg-indigo-50 text-indigo-700">
              <p className="text-xs font-bold mb-1 opacity-70">성분·분류 · 식약처 제품허가</p>
              <p className="text-sm leading-relaxed">성분: {permit.eng.join(', ')}{permit.kor ? ` (${permit.kor})` : ''}</p>
              {permit.productType && <p className="text-sm leading-relaxed mt-0.5">분류: {permit.productType}</p>}
              {permit.entpName && <p className="text-sm leading-relaxed mt-0.5">제조사: {permit.entpName}</p>}
            </div>
          )}
          {info && (
            <>
              {info.efcyQesitm && <InfoBlock label="효능" color="blue" text={info.efcyQesitm} />}
              {info.atpnQesitm && <InfoBlock label="주의사항" color="amber" text={info.atpnQesitm} />}
              {info.intrcQesitm && <InfoBlock label="상호작용" color="purple" text={info.intrcQesitm} />}
              {info.seQesitm && <InfoBlock label="부작용" color="rose" text={info.seQesitm} />}
              <p className="text-[11px] text-gray-300 pt-1">출처: 식약처 e약은요</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, danger, active }: { icon: string; label: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  const cls = danger
    ? 'bg-red-50 text-red-500 active:bg-red-100'
    : active
      ? 'bg-blue-50 text-blue-600'
      : 'bg-gray-50 text-gray-600 active:bg-gray-100'
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${cls}`}>
      <Icon name={icon} size={17} />
      {label}
    </button>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-semibold">{label}</label>
      <input
        className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value || ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function InfoBlock({ label, text, color }: { label: string; text: string; color: string }) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className={`rounded-xl p-3 ${bg[color] ?? 'bg-gray-50 text-gray-700'}`}>
      <p className="text-xs font-bold mb-1 opacity-70">{label}</p>
      <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}
