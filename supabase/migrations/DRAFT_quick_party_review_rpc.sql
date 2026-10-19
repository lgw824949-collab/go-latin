-- DRAFT ONLY. Requires DRAFT_quick_party_submissions.sql first.
-- Review and test in a separate Supabase project. NEVER apply automatically.
-- Transactional, auditable moderation with a server-controlled admin JWT claim.
-- Security-definer RPC is a privileged backend operation, not a client UPDATE policy.

create table if not exists public.quick_party_review_audit (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.quick_party_submissions(id),
  reviewer_id uuid not null references auth.users(id),
  previous_status text not null,
  new_status text not null check (new_status in ('approved','rejected')),
  reviewed_at timestamptz not null default now()
);
create index if not exists quick_party_review_audit_submission_idx
  on public.quick_party_review_audit (submission_id, reviewed_at desc);
alter table public.quick_party_review_audit enable row level security;
-- No INSERT, UPDATE, DELETE policies for client roles.
-- Audit entries can be written only inside the privileged moderation function.

create or replace function public.review_quick_party(
  p_submission_id uuid,
  p_decision text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
  v_reviewer uuid;
begin
  v_reviewer := auth.uid();
  if v_reviewer is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected') then
    raise exception 'Invalid moderation decision' using errcode = '22023';
  end if;
  select status into v_previous
  from public.quick_party_submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if v_previous <> 'pending' then
    raise exception 'Only pending submissions can be reviewed' using errcode = '22023';
  end if;
  update public.quick_party_submissions
  set status = p_decision, reviewed_at = now()
  where id = p_submission_id;
  insert into public.quick_party_review_audit
    (submission_id, reviewer_id, previous_status, new_status)
  values (p_submission_id, v_reviewer, v_previous, p_decision);
end;
$$;

revoke all on function public.review_quick_party(uuid,text) from public, anon;
grant execute on function public.review_quick_party(uuid,text) to authenticated;

-- Before release: test nonadmin denial, admin success, concurrent reviewers,
-- duplicate decisions, audit rollback, deleted users, and role revocation.
-- Role claims are server-controlled but JWTs may remain valid until expiry;
-- use short token lifetimes or an independent live admin-role check if needed.
-- Consider preventing audit mutation even by privileged nonservice roles.
