-- 약 분석(안전 확인) 월 사용량 제한
--
-- Supabase 대시보드 → SQL Editor 에 붙여 실행한다.
--
-- 설계 의도:
--  * 카운트는 서버(Postgres)에만 있다. 클라이언트가 보내는 숫자는 믿지 않는다.
--  * 증가는 consume_analysis() RPC 로만 한다. analysis_usage 에 insert/update
--    정책을 주지 않아서 anon 키로 직접 카운트를 되돌릴 수 없다.
--  * 한도 검사와 증가를 하나의 UPDATE 로 처리한다. 따로 하면 동시 요청 두 개가
--    같은 잔여 횟수를 읽고 둘 다 통과하는 경쟁 조건이 생긴다.

create table if not exists public.analysis_usage (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  -- 'YYYY-MM' (KST 기준). 서버가 계산해서 넘긴다 — DB 타임존에 의존하지 않는다.
  period     text        not null,
  count      int         not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.analysis_usage enable row level security;

-- 본인 사용량 조회만 허용(남은 횟수 표시용). 쓰기 정책은 일부러 없다.
drop policy if exists "read own analysis usage" on public.analysis_usage;
create policy "read own analysis usage" on public.analysis_usage
  for select using (auth.uid() = user_id);

/**
 * 분석 1회를 소비한다.
 *
 * 반환: allowed(허용 여부), used(소비 후 사용량), remaining(남은 횟수)
 * 한도에 걸리면 카운트를 올리지 않고 allowed=false 를 준다.
 */
create or replace function public.consume_analysis(p_period text, p_limit int)
returns table (allowed boolean, used int, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.analysis_usage (user_id, period, count)
  values (v_uid, p_period, 0)
  on conflict (user_id, period) do nothing;

  -- count < p_limit 조건을 UPDATE 안에 두어 검사와 증가를 원자적으로 처리한다.
  update public.analysis_usage
     set count = count + 1, updated_at = now()
   where user_id = v_uid
     and period  = p_period
     and count   < p_limit
  returning count into v_count;

  if v_count is null then
    -- 한도 초과 — 실제 사용량을 다시 읽어 돌려준다.
    select au.count into v_count
      from public.analysis_usage au
     where au.user_id = v_uid and au.period = p_period;
    return query select false, coalesce(v_count, p_limit), 0;
  else
    return query select true, v_count, greatest(p_limit - v_count, 0);
  end if;
end;
$$;

/**
 * 소비한 1회를 되돌린다.
 *
 * 분석은 경쟁 조건을 막기 위해 실행 전에 카운트를 올린다. 그래서 LLM 호출이
 * 실패하면 사용자가 아무 결과도 못 받고 횟수만 잃는다 — 월 3회 중 1회면
 * 33% 다. 서버 오류일 때만 서버가 호출한다.
 */
create or replace function public.refund_analysis(p_period text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.analysis_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where user_id = v_uid and period = p_period;
end;
$$;

revoke all on function public.consume_analysis(text, int) from public, anon;
revoke all on function public.refund_analysis(text) from public, anon;
grant execute on function public.consume_analysis(text, int) to authenticated;
grant execute on function public.refund_analysis(text) to authenticated;
