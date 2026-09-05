'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import StepProgress from '@/components/StepProgress'
import { useAuth } from '@/components/AuthProvider'
import { apiUrl } from '@/lib/api'
import { searchFoods as searchFoodDb } from '@/lib/foodSearch'
import { compressImage } from '@/lib/image'
import { getSavedDrugs } from '@/lib/storage'
import { parseStoredJson, readDrugs, readFoods } from '@/lib/validation'
import type { DrugInfo } from '@/types'

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
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchVersion = useRef(0)
  const [foods, setFoods] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [tab, setTab] = useState<'text' | 'photo'>('text')
  const [recognizing, setRecognizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [savedDrugs, setSavedDrugs] = useState<DrugInfo[]>([])
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([])

  useEffect(() => {
    const saved = getSavedDrugs()
    const selected = parseStoredJson(sessionStorage.getItem('selectedDrugs'))
    setSavedDrugs(saved)
    setSelectedDrugs(Array.isArray(selected)
      ? readDrugs(selected).map(d => d.name).filter(name => saved.some(d => d.name === name))
      : saved.map(d => d.name))
    setFoods(readFoods(parseStoredJson(sessionStorage.getItem('foodList'))))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      sessionStorage.setItem('foodList', JSON.stringify(foods))
      sessionStorage.setItem('selectedDrugs', JSON.stringify(savedDrugs.filter(d => selectedDrugs.includes(d.name))))
    } catch {
      setError('입력 내용을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.')
    }
  }, [foods, selectedDrugs, savedDrugs, loaded])

  function dismissSearch() {
    searchVersion.current += 1
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSuggestions([])
    setSearching(false)
  }

  function toggleDrug(name: string) {
    setSelectedDrugs(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  function addFood(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setFoods(prev => prev.includes(trimmed) ? prev : [...prev, trimmed])
    setInputText('')
    dismissSearch()
  }

  function removeFood(name: string) {
    setFoods(prev => prev.filter(f => f !== name))
  }

  async function searchFoods(query: string, version: number) {
    try {
      const results = await searchFoodDb(query)
      if (version === searchVersion.current) setSuggestions(results)
    } catch {
      if (version === searchVersion.current) setSuggestions([])
    } finally {
      if (version === searchVersion.current) setSearching(false)
    }
  }

  function handleInputChange(value: string) {
    setInputText(value)
    dismissSearch()
    if (!value.trim()) return
    setSearching(true)
    const version = searchVersion.current
    debounceRef.current = setTimeout(() => searchFoods(value.trim(), version), 250)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        dismissSearch()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      searchVersion.current += 1
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || recognizing) return
    setRecognizing(true)
    setError(null)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('image', compressed, 'food.jpg')
      const res = await fetch(apiUrl('/api/food-recognize'), { method: 'POST', body: formData })
      if (!res.ok) throw new Error('음식 사진 분석에 실패했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.')
      const data = await res.json()
      const items = readFoods(data.items)
      if (items.length) {
        setFoods(prev => {
          const combined = [...prev]
          for (const item of items) {
            if (!combined.includes(item)) combined.push(item)
          }
          return combined
        })
      } else {
        setError('인식된 음식이 없습니다. 텍스트로 직접 입력해 주세요.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 인식에 실패했습니다.')
    } finally {
      setRecognizing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function proceed() {
    if (!loaded || authLoading || recognizing || !foods.length) return
    const chosen = savedDrugs.filter(d => selectedDrugs.includes(d.name))
    if (chosen.length === 0) {
      setError('상호작용을 확인할 약을 1개 이상 등록하고 선택해 주세요.')
      return
    }
    // 입력은 미리 저장 (로그인 왕복 후에도 유지) → 검증 결과는 로그인 필요
    try {
      sessionStorage.setItem('foodList', JSON.stringify(foods))
      sessionStorage.setItem('selectedDrugs', JSON.stringify(chosen))
    } catch {
      setError('입력 내용을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.')
      return
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/result')}`)
      return
    }
    router.push('/result')
  }

  return (
    <div className="page-padding flex flex-col min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button aria-label="뒤로 가기" onClick={() => router.back()} className="w-11 h-11 shrink-0 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-600">
          <Icon name="arrowLeft" size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">음식 입력</h1>
          <p className="text-base text-gray-500 font-medium">3단계 / 4단계</p>
        </div>
      </div>

      <div className="mb-7"><StepProgress step={3} /></div>

      {/* 약 데이터 없을 때 안내 배너 */}
      {loaded && savedDrugs.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <span className="text-amber-700 shrink-0"><Icon name="pill" size={22} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">복용 중인 약을 먼저 등록하세요</p>
            <p className="text-sm text-amber-800 mt-1">약 정보가 있어야 음식과 비교할 수 있어요</p>
          </div>
          <button
            onClick={() => router.push('/scan')}
            className="flex-shrink-0 px-3 py-3 bg-amber-700 text-white text-sm font-semibold rounded-xl"
          >
            등록
          </button>
        </div>
      )}

      {/* 확인할 내 약 선택 */}
      {savedDrugs.length > 0 && (
        <div className="mb-6">
          <p className="text-base font-bold text-gray-800 mb-1">
            확인할 내 약
          </p>
          <p className="text-sm text-gray-500 mb-2.5">
            선택한 약만 음식과 비교합니다 ({selectedDrugs.length}/{savedDrugs.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {savedDrugs.map(d => {
              const on = selectedDrugs.includes(d.name)
              return (
                <label
                  key={d.name}
                  className={`max-w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-base font-semibold border-2 transition-colors cursor-pointer ${
                    on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleDrug(d.name)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
                  <span className="min-w-0 break-words">{d.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
        {(['text', 'photo'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Icon name={t === 'text' ? 'pencil' : 'camera'} size={20} />
            {t === 'text' ? '텍스트 입력' : '사진 인식'}
          </button>
        ))}
      </div>

      {tab === 'text' && (
        <div className="space-y-4 mb-6">
          {/* 검색창 + 자동완성 */}
          <div ref={searchRef} className="relative">
            <div className="flex gap-2">
              <input
                aria-label="식품명 검색 또는 직접 입력"
                className="min-w-0 flex-1 px-3 py-4 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="식품명 검색 또는 직접 입력"
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) addFood(inputText)
                  if (e.key === 'Escape') dismissSearch()
                }}
              />
              <button
                onClick={() => addFood(inputText)}
                disabled={!inputText.trim()}
                aria-label="음식 추가"
                title="음식 추가"
                className="w-14 shrink-0 flex items-center justify-center bg-blue-600 text-white rounded-2xl disabled:opacity-50"
              >
                <Icon name="plus" size={24} />
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
                      onClick={() => addFood(item.food_name)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base flex-shrink-0">
                          {item.type === 'supplement' ? '💊' : '🍎'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words">{item.food_name}</p>
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
            <p className="text-sm text-gray-500 mb-2 font-medium">자주 확인하는 항목</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_FOODS.map(food => (
                <button
                  key={food}
                  onClick={() => addFood(food)}
                  disabled={foods.includes(food)}
                  className={`px-4 py-2.5 rounded-full text-base font-semibold border transition-colors ${
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={recognizing}
            className="w-full border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50 flex flex-col items-center justify-center gap-3 p-8 cursor-pointer active:bg-blue-100 min-h-[160px]"
          >
            {recognizing ? (
              <>
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-blue-600">Gemini AI가 인식 중...</p>
              </>
            ) : (
              <>
                <span className="text-blue-600"><Icon name="camera" size={36} /></span>
                <div className="text-center">
                  <p className="font-semibold text-blue-700 text-sm">음식·영양제 사진 선택</p>
                  <p className="text-xs text-blue-400 mt-1">AI가 자동으로 인식합니다</p>
                </div>
              </>
            )}
          </button>
          {/* scan 화면과 같은 이유로 capture 를 뺀다 — 촬영/보관함 선택 둘 다 허용. */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        </div>
      )}

      {foods.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 font-semibold mb-2">선택된 항목 ({foods.length})</p>
          <div className="flex flex-wrap gap-2">
            {foods.map(food => (
              <span key={food} className="max-w-full inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-xl text-base font-medium">
                <span className="min-w-0 break-words">{food}</span>
                <button aria-label={`${food} 삭제`} title={`${food} 삭제`} onClick={() => removeFood(food)} className="w-10 h-10 shrink-0 flex items-center justify-center hover:bg-blue-700 rounded-lg"><span className="rotate-45"><Icon name="plus" size={20} /></span></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
        <button onClick={proceed} disabled={!loaded || authLoading || recognizing || foods.length === 0 || selectedDrugs.length === 0} className="btn-primary flex items-center justify-center gap-2">
          <Icon name="search" size={22} />안전 확인하기
        </button>
        {(foods.length === 0 || selectedDrugs.length === 0) && (
          <p className="text-center text-sm text-gray-600 mt-2">{selectedDrugs.length === 0 ? '확인할 약을 1개 이상 선택하세요' : '음식 또는 영양제를 1개 이상 선택하세요'}</p>
        )}
      </div>

    </div>
  )
}
