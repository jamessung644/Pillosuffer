'use client'

import { useState } from 'react'
import type { DrugInfo, EdrugInfo } from '@/types'
import type { ResolvedIngredient } from '@/lib/ingredient'

interface Props {
  drug: DrugInfo
  index: number
  onUpdate: (index: number, drug: DrugInfo) => void
  onDelete: (index: number) => void
}

/** e약은요 응답의 HTML 태그 제거 */
function clean(s: string | null | undefined): string {
  return s ? s.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim() : ''
}

export default function DrugCard({ drug, index, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(drug)
  const [infoOpen, setInfoOpen] = useState(false)
  const [info, setInfo] = useState<EdrugInfo | null>(null)
  const [permit, setPermit] = useState<ResolvedIngredient | null>(null)
  const [infoState, setInfoState] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle')

  async function toggleInfo() {
    if (infoOpen) { setInfoOpen(false); return }
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

  if (editing) {
    return (
      <div className="card p-4 border-accent-sky/40">
        <div className="space-y-3">
          <Input label="약품명" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="함량" placeholder="500mg" value={draft.dose} onChange={v => setDraft({ ...draft, dose: v })} />
            <Input label="투여횟수" placeholder="1일 3회" value={draft.frequency} onChange={v => setDraft({ ...draft, frequency: v })} />
            <Input label="투약 일수" placeholder="3일" value={draft.days} onChange={v => setDraft({ ...draft, days: v })} />
            <Input label="용법" placeholder="식후 30분" value={draft.usage} onChange={v => setDraft({ ...draft, usage: v })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className="flex-1 py-2.5 bg-white text-ink-950 rounded-xl text-sm font-semibold"
            >
              저장
            </button>
            <button
              onClick={() => { setDraft(drug); setEditing(false) }}
              className="flex-1 py-2.5 bg-white/[0.06] text-zinc-300 rounded-xl text-sm font-medium border border-white/[0.06]"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-accent-sky/10 flex items-center justify-center flex-shrink-0 text-accent-sky text-xs font-bold">
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-100 truncate">{drug.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {drug.dose && <Chip>{drug.dose}</Chip>}
              {drug.frequency && <Chip accent="sky">{drug.frequency}</Chip>}
              {drug.days && <Chip accent="amber">{drug.days}</Chip>}
              {drug.usage && <Chip accent="lime">{drug.usage}</Chip>}
              {!drug.dose && !drug.frequency && !drug.days && !drug.usage && (
                <span className="text-xs text-zinc-500">정보 없음</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <IconBtn onClick={toggleInfo} label="약 정보" active={infoOpen}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </IconBtn>
          <IconBtn onClick={() => setEditing(true)} label="편집">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </IconBtn>
          <IconBtn onClick={() => onDelete(index)} label="삭제" danger>
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </IconBtn>
        </div>
      </div>

      {infoOpen && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          {infoState === 'loading' && (
            <p className="text-zinc-500 text-xs">약품 정보를 불러오는 중…</p>
          )}
          {infoState === 'notfound' && (
            <p className="text-zinc-500 text-xs">
              식약처 DB에서 &quot;{drug.name}&quot; 정보를 찾지 못했어요. 제품명으로 다시 시도해 보세요.
            </p>
          )}
          {infoState === 'error' && (
            <p className="text-accent-red text-xs">약품 정보 API 호출에 실패했어요.</p>
          )}

          {permit && (
            <div className="rounded-xl p-2.5 bg-accent-sky/[0.08] border border-accent-sky/20">
              <p className="text-[10px] uppercase tracking-wider text-accent-sky font-semibold mb-1.5">
                성분·분류 · 식약처 제품허가
              </p>
              <p className="text-xs text-zinc-200 leading-relaxed">
                성분: {permit.eng.join(', ')}{permit.kor ? ` (${permit.kor})` : ''}
              </p>
              {permit.productType && (
                <p className="text-xs text-zinc-300 leading-relaxed mt-0.5">분류: {permit.productType}</p>
              )}
              {permit.entpName && (
                <p className="text-xs text-zinc-300 leading-relaxed mt-0.5">제조사: {permit.entpName}</p>
              )}
            </div>
          )}

          {info && (
            <>
              {clean(info.efcyQesitm) && <InfoBlock label="효능" accent="sky" text={clean(info.efcyQesitm)} />}
              {clean(info.useMethodQesitm) && <InfoBlock label="사용법" accent="lime" text={clean(info.useMethodQesitm)} />}
              {clean(info.atpnWarnQesitm) && <InfoBlock label="경고" accent="red" text={clean(info.atpnWarnQesitm)} />}
              {clean(info.atpnQesitm) && <InfoBlock label="주의사항" accent="amber" text={clean(info.atpnQesitm)} />}
              {clean(info.intrcQesitm) && <InfoBlock label="상호작용" accent="sky" text={clean(info.intrcQesitm)} />}
              {clean(info.seQesitm) && <InfoBlock label="부작용" accent="red" text={clean(info.seQesitm)} />}
              <p className="text-[10px] text-zinc-600 pt-0.5">출처: 식약처 e약은요</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, text, accent }: { label: string; text: string; accent?: 'sky' | 'amber' | 'lime' | 'red' }) {
  const styles = {
    sky:   'text-accent-sky',
    amber: 'text-accent-amber',
    lime:  'text-accent-lime',
    red:   'text-accent-red',
  }
  return (
    <div className="rounded-xl p-2.5 bg-white/[0.04]">
      <p className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${styles[accent ?? 'sky']}`}>{label}</p>
      <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-line">{text}</p>
    </div>
  )
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: 'sky' | 'amber' | 'lime' }) {
  const styles = {
    default: 'bg-white/[0.05] text-zinc-400',
    sky:     'bg-accent-sky/10 text-accent-sky',
    amber:   'bg-accent-amber/10 text-accent-amber',
    lime:    'bg-accent-lime/10 text-accent-lime',
  }
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${styles[accent ?? 'default']}`}>
      {children}
    </span>
  )
}

function IconBtn({
  children, onClick, label, danger, active,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        danger
          ? 'bg-accent-red/10 text-accent-red active:bg-accent-red/20'
          : active
            ? 'bg-accent-sky/15 text-accent-sky'
            : 'bg-white/[0.04] text-zinc-400 active:bg-white/[0.08]'
      }`}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}

function Input({
  label, value, onChange, placeholder,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</label>
      <input
        className="w-full mt-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-accent-sky/50 transition-colors"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
