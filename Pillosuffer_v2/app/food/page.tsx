'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import { compressImage } from '@/lib/image'

const COMMON_FOODS = [
  '자몽', '우유', '알코올', '녹차', '커피',
  '비타민C', '오메가3', '철분제', '칼슘', '마그네슘',
]

interface FoodResult {
  food_code: string
  food_name: string
  main_category: string | null
  mid_category: string | null
  energy_kcal: number | null
  manufacturer: string | null
  type?: 'food' | 'supplement'
  serving_size?: string | null
}

export default function FoodPage() {
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [foods, setFoods] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [tab, setTab] = useState<'text' | 'photo'>('text')
  const [recognizing, setRecognizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasDrugs, setHasDrugs] = useState(true)

  useEffect(() => {
    const hasSession = !!sessionStorage.getItem('drugList')
    const hasSaved = !!localStorage.getItem('savedMedications')
    setHasDrugs(hasSession || hasSaved)
  }, [])

  function addFood(name: string) {
    const trimmed = name.trim()
    if (!trimmed || foods.includes(trimmed)) return
    setFoods(prev => [...prev, trimmed])
    setInputText('')
    setSuggestions([])
  }

  function removeFood(name: string) {
    setFoods(prev => prev.filter(f => f !== name))
  }

  const searchFoods = useCallback(async (query: string) => {
    if (query.length < 1) { setSuggestions([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSuggestions(data.results ?? [])
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }, [])

  function handleInputChange(value: string) {
    setInputText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchFoods(value), 250)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRecognizing(true)
    setError(null)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('image', compressed, 'food.jpg')
      const res = await fetch('/api/food-recognize', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || `서버 오류 (${res.status})`)
      }

      if (data.items?.length) {
        setFoods(prev => {
          const combined = [...prev]
          for (const item of data.items) {
            if (!combined.includes(item)) combined.push(item)
          }
          return combined
        })
      } else {
        setError('인식된 음식이 없습니다. 텍스트로 직접 입력해 주세요.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '이미지 인식에 실패했어요'
      console.error('[food-recognize]', err)
      setError(msg)
    } finally {
      setRecognizing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function proceed() {
    if (!foods.length) return
    // 입력은 미리 저장 (로그인 왕복 후에도 유지) → 검증 결과는 로그인 필요
    sessionStorage.setItem('foodList', JSON.stringify(foods))
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/result')}`)
      return
    }
    router.push('/result')
  }

  return (
    <div className="page-padding flex flex-col min-h-screen lg:max-w-3xl lg:mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          className="w-9 h-9 rounded-full glass flex items-center justify-center text-zinc-300 active:bg-white/[0.08]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs tracking-wider text-zinc-500 font-medium">단계 03 / 04</p>
          <h1 className="text-lg font-semibold text-zinc-100">음식 · 영양제</h1>
        </div>
      </div>

      {/* 약 없을 때 경고 */}
      {!hasDrugs && (
        <div className="card p-3.5 mb-4 flex items-center gap-3 border-l-2 border-accent-amber bg-accent-amber/[0.04]">
          <div className="dot bg-accent-amber relative pulse-dot" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-100">등록된 약이 없어요</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">정확한 안내를 위해 약을 먼저 등록하세요</p>
          </div>
          <button
            onClick={() => router.push('/my-meds')}
            className="px-3 py-1.5 bg-accent-amber/90 text-ink-950 text-xs font-semibold rounded-full"
          >
            등록
          </button>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        {(['text', 'photo'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pill ${tab === t ? 'pill-active' : ''}`}
          >
            {t === 'text' ? '검색' : '사진'}
          </button>
        ))}
      </div>

      {tab === 'text' && (
        <div className="space-y-4 mb-5">
          {/* 검색창 */}
          <div ref={searchRef} className="relative">
            <div className="glass rounded-2xl flex items-center px-4 gap-2.5">
              <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="flex-1 bg-transparent py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
                placeholder="음식·영양제 검색…"
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addFood(inputText)
                  if (e.key === 'Escape') setSuggestions([])
                }}
              />
              {inputText && (
                <button
                  onClick={() => addFood(inputText)}
                  className="px-3 py-1 bg-white text-ink-950 rounded-full text-xs font-semibold"
                >
                  추가
                </button>
              )}
            </div>

            {(suggestions.length > 0 || searching) && inputText.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden max-h-72 overflow-y-auto">
                {searching ? (
                  <div className="px-4 py-3 text-sm text-zinc-500 text-center">검색 중…</div>
                ) : (
                  suggestions.map(item => (
                    <button
                      key={item.food_code}
                      onMouseDown={() => addFood(item.food_name)}
                      className="w-full px-4 py-3 text-left active:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                          item.type === 'supplement' ? 'bg-accent-amber/10 text-accent-amber' : 'bg-accent-lime/10 text-accent-lime'
                        }`}>
                          {item.type === 'supplement' ? '℞' : '◐'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-100 truncate">{item.food_name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            {item.type === 'supplement' ? (
                              <>
                                {[item.main_category, item.mid_category].filter(Boolean).join(' · ')}
                                {item.serving_size && ` · ${item.serving_size}`}
                              </>
                            ) : (
                              <>
                                {[item.main_category, item.mid_category].filter(Boolean).join(' › ')}
                                {item.energy_kcal != null && ` · ${item.energy_kcal}kcal`}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs tracking-wider text-zinc-500 font-medium mb-2.5">자주 확인하는 항목</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_FOODS.map(food => {
                const selected = foods.includes(food)
                return (
                  <button
                    key={food}
                    onClick={() => addFood(food)}
                    disabled={selected}
                    className={`pill ${selected ? 'pill-active' : ''}`}
                  >
                    {food}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'photo' && (
        <div className="mb-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="glass border border-dashed border-white/[0.12] rounded-3xl flex flex-col items-center justify-center gap-3 p-10 cursor-pointer active:bg-white/[0.05] min-h-[200px]"
          >
            {recognizing ? (
              <>
                <div className="w-10 h-10 border-2 border-accent-sky border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-accent-sky">AI 인식 중…</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                  <svg className="w-7 h-7 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-zinc-100 text-sm">탭하여 업로드</p>
                  <p className="text-xs text-zinc-500 mt-1">AI가 자동으로 인식합니다</p>
                </div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
          {error && (
            <p className="mt-3 text-xs text-accent-red text-center">{error}</p>
          )}
        </div>
      )}

      {/* 선택된 항목 */}
      {foods.length > 0 && (
        <div className="mb-5">
          <p className="text-xs tracking-wider text-zinc-500 font-medium mb-2.5">
            선택됨 · {foods.length}건
          </p>
          <div className="flex flex-wrap gap-2">
            {foods.map(food => (
              <span key={food} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white text-ink-950 rounded-full text-xs font-semibold">
                {food}
                <button
                  onClick={() => removeFood(food)}
                  className="w-4 h-4 rounded-full bg-ink-950/10 flex items-center justify-center text-[10px]"
                  aria-label="삭제"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        <button onClick={proceed} disabled={foods.length === 0} className="btn-primary">
          안전 검사 시작
        </button>
        {foods.length === 0 && (
          <p className="text-center text-xs text-zinc-500 mt-2">음식 또는 영양제를 1개 이상 선택하세요</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
