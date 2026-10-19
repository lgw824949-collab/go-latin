-- DRAFT ONLY. Do not run in production.
-- Admin read access based on server-managed JWT app_metadata.
create policy "admin read quick party submissions"
on public.quick_party_submissions for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Approval/rejection intentionally NOT permitted via browser RLS.
-- Future server endpoint must verify JWT, authorize admin, validate
-- status transition, record reviewer/audit, and rate-limit writes.
-- Service-role credentials must never be bundled into frontend.
