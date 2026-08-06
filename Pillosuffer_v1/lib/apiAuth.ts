import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/** 약 분석 월 무료 한도 */
export const MONTHLY_ANALYSIS_LIMIT = 3

/**
 * 한도가 면제되는 관리자 계정.
 *
 * 서버에서만 읽으므로 앱 번들에 들어가지 않는다(NEXT_PUBLIC_ 접두어 없음).
 * Vercel 환경변수 ADMIN_EMAILS 로 덮어쓸 수 있다(쉼표 구분).
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'lookcage12@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export interface AuthedRequest {
  user: User
  supabase: SupabaseClient
  isAdmin: boolean
}

/**
 * Authorization: Bearer <access_token> 을 검증해 사용자를 돌려준다.
 *
 * 토큰 검증을 Supabase 에 맡긴다(서명·만료 확인). 클라이언트가 보낸 이메일이나
 * user id 는 절대 신뢰하지 않는다 — 관리자 판정도 검증된 토큰의 이메일로만 한다.
 */
export async function authenticate(request: NextRequest): Promise<AuthedRequest | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const email = data.user.email?.toLowerCase() ?? ''
  return { user: data.user, supabase, isAdmin: ADMIN_EMAILS.includes(email) }
}

/**
 * 사용량 집계 기간 키 'YYYY-MM' (KST 기준).
 *
 * UTC 로 계산하면 한국 시간 매월 1일 오전 0~9시에 지난달로 집계된다.
 */
export function currentPeriod(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`
}

export interface ConsumeResult {
  allowed: boolean
  used: number
  remaining: number
}

/**
 * 분석 1회를 소비한다. 관리자는 카운트하지 않고 항상 허용한다.
 * 한도 검사·증가는 Postgres 함수에서 원자적으로 처리된다.
 */
export async function consumeAnalysis(auth: AuthedRequest): Promise<ConsumeResult> {
  if (auth.isAdmin) {
    return { allowed: true, used: 0, remaining: MONTHLY_ANALYSIS_LIMIT }
  }

  const { data, error } = await auth.supabase.rpc('consume_analysis', {
    p_period: currentPeriod(),
    p_limit: MONTHLY_ANALYSIS_LIMIT,
  })

  if (error) {
    // RPC 가 없거나 실패하면 분석을 막는다. 열어두면 한도가 무의미해진다.
    console.error('[consumeAnalysis]', error)
    throw new Error('사용량 확인에 실패했습니다.')
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: Boolean(row?.allowed),
    used: Number(row?.used ?? 0),
    remaining: Number(row?.remaining ?? 0),
  }
}

/**
 * 소비한 1회를 되돌린다. 분석이 서버 측 사유로 실패했을 때만 호출한다.
 * 환불 자체가 실패해도 원래 오류를 가리지 않도록 삼킨다.
 */
export async function refundAnalysis(auth: AuthedRequest): Promise<void> {
  if (auth.isAdmin) return
  const { error } = await auth.supabase.rpc('refund_analysis', { p_period: currentPeriod() })
  if (error) console.error('[refundAnalysis]', error)
}
