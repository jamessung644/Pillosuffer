'use client'

import { useState } from 'react'
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
    if (infoOpen) {
      setInfoOpen(false)
      return
    }
    setInfoOpen(true)
    if (info || permit || infoState === 'loading') return
    setInfoState('loading')
    try {
      const res = await fetch(`/api/easy-drug?name=${encodeURIComponent(drug.name)}`)
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

  const meta = [drug.dose, drug.frequency, drug.days, drug.usage].filter(Boolean).join(' · ')

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">약품명</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">함량</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 500mg"
                value={draft.dose || ''}
                onChange={e => setDraft({ ...draft, dose: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">투여횟수</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 1일 3회"
                value={draft.frequency || ''}
                onChange={e => setDraft({ ...draft, frequency: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">투약 일수</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 3일"
                value={draft.days || ''}
                onChange={e => setDraft({ ...draft, days: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">용법</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 식후 30분"
                value={draft.usage || ''}
                onChange={e => setDraft({ ...draft, usage: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium"
            >
              저장
            </button>
            <button
              onClick={() => { setDraft(drug); setEditing(false) }}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-lg">💊</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800">{drug.name}</p>
            {meta ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {drug.dose && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{drug.dose}</span>
                )}
                {drug.frequency && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{drug.frequency}</span>
                )}
                {drug.days && (
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{drug.days}</span>
                )}
                {drug.usage && (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{drug.usage}</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">정보 없음</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={toggleInfo}
            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-500 text-sm"
            title="식약처 e약은요 정보"
          >
            ℹ️
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 text-sm"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(index)}
            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 text-sm"
          >
            🗑️
          </button>
        </div>
      </div>

      {infoOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm space-y-2">
          {infoState === 'loading' && (
            <p className="text-gray-400 text-xs">약품 정보를 불러오는 중…</p>
          )}
          {infoState === 'notfound' && (
            <p className="text-gray-400 text-xs">식약처 DB에서 "{drug.name}" 정보를 찾지 못했어요. 제품명으로 다시 시도해 보세요.</p>
          )}
          {infoState === 'error' && (
            <p className="text-red-400 text-xs">약품 정보 API 호출에 실패했어요.</p>
          )}
          {permit && (
            <div className="rounded-xl p-2.5 bg-indigo-50 text-indigo-700">
              <p className="text-[11px] font-semibold mb-1 opacity-70">성분·분류 · 식약처 제품허가</p>
              <p className="text-xs leading-relaxed">
                성분: {permit.eng.join(', ')}{permit.kor ? ` (${permit.kor})` : ''}
              </p>
              {permit.productType && <p className="text-xs leading-relaxed mt-0.5">분류: {permit.productType}</p>}
              {permit.entpName && <p className="text-xs leading-relaxed mt-0.5">제조사: {permit.entpName}</p>}
            </div>
          )}
          {info && (
            <>
              {info.entpName && (
                <p className="text-xs text-gray-400">제조사: {info.entpName}</p>
              )}
              {info.efcyQesitm && (
                <InfoBlock label="효능" color="blue" text={info.efcyQesitm} />
              )}
              {info.useMethodQesitm && (
                <InfoBlock label="사용법" color="green" text={info.useMethodQesitm} />
              )}
              {info.atpnWarnQesitm && (
                <InfoBlock label="경고" color="red" text={info.atpnWarnQesitm} />
              )}
              {info.atpnQesitm && (
                <InfoBlock label="주의사항" color="amber" text={info.atpnQesitm} />
              )}
              {info.intrcQesitm && (
                <InfoBlock label="상호작용" color="purple" text={info.intrcQesitm} />
              )}
              {info.seQesitm && (
                <InfoBlock label="부작용" color="rose" text={info.seQesitm} />
              )}
              <p className="text-[10px] text-gray-300 pt-1">출처: 식약처 e약은요</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, text, color }: { label: string; text: string; color: string }) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className={`rounded-xl p-2.5 ${bg[color] ?? 'bg-gray-50 text-gray-700'}`}>
      <p className="text-[11px] font-semibold mb-1 opacity-70">{label}</p>
      <p className="text-xs leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}
