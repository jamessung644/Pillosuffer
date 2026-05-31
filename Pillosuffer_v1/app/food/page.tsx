'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useAuth } from '@/components/AuthProvider'

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
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/food-recognize', { method: 'POST', body: formData })
      const data = await res.json()
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
    } catch {
      setError('이미지 인식에 실패했습니다.')
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
    <div className="page-padding flex flex-col min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600">←</button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">음식·영양제 입력</h1>
          <p className="text-xs text-gray-400">Step 3 / 4</p>
        </div>
      </div>

      {/* 약 데이터 없을 때 안내 배너 */}
      {!hasDrugs && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <span className="text-xl flex-shrink-0">💊</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">복용 중인 약을 먼저 등록하세요</p>
            <p className="text-xs text-amber-600 mt-0.5">내 약 관리에서 약을 저장하면 정확한 안전 확인이 가능합니다</p>
          </div>
          <button
            onClick={() => router.push('/my-meds')}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-xl"
          >
            등록
          </button>
        </div>
      )}

      <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
        {(['text', 'photo'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {t === 'text' ? '✏️ 텍스트 입력' : '📷 사진 인식'}
          </button>
        ))}
      </div>

      {tab === 'text' && (
        <div className="space-y-4 mb-6">
          {/* 검색창 + 자동완성 */}
          <div ref={searchRef} className="relative">
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="식품명 검색 또는 직접 입력"
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addFood(inputText)
                  if (e.key === 'Escape') setSuggestions([])
                }}
              />
              <button
                onClick={() => addFood(inputText)}
                className="px-4 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium"
              >
                추가
              </button>
            </div>

            {(suggestions.length > 0 || searching) && inputText.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                {searching ? (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">검색 중...</div>
                ) : (
                  suggestions.map(item => (
                    <button
                      key={item.food_code}
                      onMouseDown={() => addFood(item.food_name)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base flex-shrink-0">
                          {item.type === 'supplement' ? '💊' : '🍎'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.food_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.type === 'supplement' ? (
                              <>
                                {[item.main_category, item.mid_category].filter(Boolean).join(' · ')}
                                {item.serving_size && ` · ${item.serving_size}`}
                              </>
                            ) : (
                              <>
                                {[item.main_category, item.mid_category].filter(Boolean).join(' › ')}
                                {item.energy_kcal != null && ` · ${item.energy_kcal}kcal`}
                                {item.manufacturer && item.manufacturer !== '해당없음' && ` · ${item.manufacturer}`}
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
            <p className="text-xs text-gray-400 mb-2">자주 확인하는 항목</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_FOODS.map(food => (
                <button
                  key={food}
                  onClick={() => addFood(food)}
                  disabled={foods.includes(food)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    foods.includes(food)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {food}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'photo' && (
        <div className="mb-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50 flex flex-col items-center justify-center gap-3 p-8 cursor-pointer active:bg-blue-100 min-h-[160px]"
          >
            {recognizing ? (
              <>
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-blue-600">Gemini AI가 인식 중...</p>
              </>
            ) : (
              <>
                <span className="text-4xl">🍎</span>
                <div className="text-center">
                  <p className="font-semibold text-blue-700 text-sm">음식·영양제 사진 선택</p>
                  <p className="text-xs text-blue-400 mt-1">AI가 자동으로 인식합니다</p>
                </div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
          {error && <p className="mt-3 text-xs text-red-500 text-center">{error}</p>}
        </div>
      )}

      {foods.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 font-medium mb-2">선택된 항목 ({foods.length})</p>
          <div className="flex flex-wrap gap-2">
            {foods.map(food => (
              <span key={food} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
                {food}
                <button onClick={() => removeFood(food)} className="text-blue-200 hover:text-white ml-0.5">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        <button onClick={proceed} disabled={foods.length === 0} className="btn-primary">
          안전 확인하기 🔍
        </button>
        {foods.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">음식 또는 영양제를 1개 이상 선택하세요</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
