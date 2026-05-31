'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import SaveSuccessOverlay from '@/components/SaveSuccessOverlay'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth } from '@/components/AuthProvider'
import { getProfile, saveProfile, getSavedDrugs, type UserProfile } from '@/lib/storage'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({})
  const [savedCount, setSavedCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    setProfile(getProfile())
    setSavedCount(getSavedDrugs().length)
    setLoaded(true)
  }, [])

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    saveProfile(profile)
    setShowSuccess(true)
    setTimeout(() => router.push('/'), 1500)
  }

  async function handleSignOut() {
    if (!confirm('로그아웃 하시겠어요?')) return
    await signOut()
    router.push('/')
  }

  if (!loaded || authLoading) return null

  const displayName = user?.user_metadata?.name ?? profile.name ?? '게스트'
  const userEmail = user?.email
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="page-padding flex flex-col min-h-screen lg:max-w-2xl lg:mx-auto">
      <SaveSuccessOverlay show={showSuccess} message="내 정보가 저장되었어요" />

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/')}
          aria-label="뒤로"
          className="w-9 h-9 rounded-full glass flex items-center justify-center text-zinc-300 active:bg-white/[0.08]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs tracking-wider text-zinc-500 font-medium">계정</p>
          <h1 className="text-lg font-semibold text-zinc-100">내 정보</h1>
        </div>
      </div>

      {/* 프로필 카드 */}
      <div className="card p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-7 h-7 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-zinc-100 truncate">{displayName}</p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{userEmail ?? '로그인 안 됨'}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="dot bg-accent-lime" />
            <span className="text-xs tracking-wider text-zinc-500 font-medium">
              저장된 약 {savedCount}개
            </span>
          </div>
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="mb-5">
        <p className="text-xs tracking-wider text-zinc-500 font-medium mb-2">테마</p>
        <ThemeToggle />
      </div>

      {/* 로그인/로그아웃 */}
      {!user ? (
        <Link
          href="/login"
          className="card flex items-center gap-3 px-5 py-4 mb-5 active:bg-white/[0.05]"
        >
          <svg width="22" height="22" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          <span className="text-zinc-100 text-sm font-semibold flex-1">Google로 로그인</span>
          <span className="text-zinc-500">›</span>
        </Link>
      ) : (
        <button
          onClick={handleSignOut}
          className="card flex items-center gap-3 px-5 py-4 mb-5 active:bg-white/[0.05] w-full"
        >
          <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-sm font-semibold text-zinc-200 flex-1 text-left">로그아웃</span>
        </button>
      )}

      {/* 폼 */}
      <div className="space-y-4 mb-5">
        <Field label="이름">
          <input
            type="text"
            value={profile.name ?? ''}
            onChange={e => update('name', e.target.value)}
            placeholder="홍길동"
            className="profile-input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="나이">
            <input
              type="number"
              inputMode="numeric"
              value={profile.age ?? ''}
              onChange={e => update('age', e.target.value)}
              placeholder="29"
              className="profile-input"
            />
          </Field>
          <Field label="성별">
            <select
              value={profile.gender ?? ''}
              onChange={e => update('gender', e.target.value as UserProfile['gender'])}
              className="profile-input"
            >
              <option value="">선택 안 함</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
            </select>
          </Field>
        </div>

        <Field label="알레르기" hint="약물·식품 알레르기">
          <textarea
            value={profile.allergies ?? ''}
            onChange={e => update('allergies', e.target.value)}
            placeholder="페니실린, 갑각류…"
            rows={2}
            className="profile-input resize-none"
          />
        </Field>

        <Field label="만성질환" hint="고혈압·당뇨 등">
          <textarea
            value={profile.conditions ?? ''}
            onChange={e => update('conditions', e.target.value)}
            placeholder="고혈압, 당뇨…"
            rows={2}
            className="profile-input resize-none"
          />
        </Field>
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-500 leading-relaxed mb-5">
        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        이 기기에만 저장되며 외부로 전송되지 않습니다
      </div>

      <div className="mt-auto">
        <button onClick={handleSave} disabled={showSuccess} className="btn-primary">
          저장하기
        </button>
      </div>

      <BottomNav />

      <style jsx global>{`
        .profile-input {
          width: 100%;
          padding: 0.7rem 1rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 0.875rem;
          font-size: 0.9rem;
          color: rgb(244 244 245);
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .profile-input:focus {
          border-color: rgba(96, 165, 250, 0.5);
          background: rgba(255,255,255,0.06);
        }
        .profile-input::placeholder {
          color: rgb(82 82 91);
        }
        select.profile-input option {
          background: #18181b;
          color: rgb(244 244 245);
        }
        /* 라이트 모드 */
        html[data-theme="light"] .profile-input {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.08);
          color: rgb(24, 24, 27);
        }
        html[data-theme="light"] .profile-input:focus {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(37, 99, 235, 0.5);
        }
        html[data-theme="light"] .profile-input::placeholder {
          color: rgb(161, 161, 170);
        }
        html[data-theme="light"] select.profile-input option {
          background: white;
          color: rgb(24, 24, 27);
        }
      `}</style>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs tracking-wider text-zinc-500 font-medium mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}
