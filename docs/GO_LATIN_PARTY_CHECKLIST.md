# GO LATIN — 3-city quick-party implementation checklist

Updated: 2026-10-19
Scope: Seoul / Bangkok / Hanoi only.
Branch: `feature/quick-parties-3-cities` (draft PR #1).
Rule: do not alter legacy `parties`, BAR tables, existing production records, or deploy without separate approval.

## Status key
- [x] Code/file exists in development branch (NOT a claim of runtime verification).
- [ ] Not yet implemented or not yet verified.
- Never mark a feature complete based only on a commit. Separate code, tests, security review and release.

## GL-PARTY-001 — Isolated model and registration prototype
- [x] Confirmed existing React/Vite route layout and admin/Supabase patterns by reading source.
- [x] Created independent `supabase/migrations/DRAFT_quick_party_submissions.sql`.
- [x] Draft SQL includes allowed city values, status default pending, owner reference and RLS policies.
- [x] Added `/parties` route in `web/src/App.jsx`.
- [x] Added `web/src/pages/QuickParties.jsx` and `QuickParties.css`.
- [x] UI supports poster preview, date, time, multi-genre, venue and SNS entry.
- [x] Submission button explicitly indicates preview-only; no database write occurs.
- [ ] Confirm SQL compatibility and policies against actual project schema in a safe test environment.
- [x] Drafted private poster bucket and authenticated owner-folder upload policy in separate SQL (NOT applied).
- [ ] Implement server-side file validation, secure upload flow and rate limits.
- [x] Added organizer email OTP/magic-link login UI (code only; Supabase email configuration and callback not tested).
- [x] Drafted guarded organizer submission RPC checking sign-in, poster object ownership, valid fields and a transaction-serialized quota; not applied or security-tested.
- [ ] Connect frontend to authenticated submission only after isolated-project security tests and poster scanning/rate limits; prevent forged poster paths.
- [x] Added read-only admin review queue UI and admin-read SQL policy draft (NOT applied/tested).
- [x] Drafted atomic approval/rejection RPC with admin JWT check, pending-only transition and audit insert (SQL ONLY; NOT applied/tested).
- [x] Wired admin review buttons to guarded review_quick_party RPC with confirmation and feedback (code only).
- [ ] Test secured moderation workflow end to end against isolated database.
- [ ] Add venue picker / reuse of prior organizer SNS and recurring-event copy.

## GL-PARTY-002 — Approved-only upcoming-party lookup
- [x] Added `web/src/lib/quickPartyData.js`.
- [x] Query restricts city, status=approved, and local-date lower bound.
- [x] Query sorts by event date and start time and limits to 100 rows.
- [x] UI distinguishes loading, error, no results, and returned results.
- [ ] Run query against test DB after draft migration review and safe application.
- [x] Added UI filtering by genre and exact date (client-side; code only).
- [ ] Add pagination if more than 100 events; review overnight events.
- [x] Added city-local start-time filtering for events that already started today (code only).
- [ ] Connect securely served approved poster images; check that public reads cannot access pending posters.
- [ ] Verify city isolation and date logic for all three timezones.
- [x] Changed client listing filter to fail closed unless status is explicitly approved (code review only).
- [ ] Verify listing does not display unverifiable or rejected events against test DB.

## GL-PARTY-003 — Validation and security
- [x] GitHub Actions run #39210299581: `npm ci`, 7 unit tests, lint (0 errors, 6 warnings), and Vite compilation passed.
- [x] Verified offline `npx vite build` workflow success (run #39210406663: install, tests, lint and Vite build all passed). Full `npm run build` requires GO_LATIN_SITE_ORIGIN and Supabase data for Seoul prerender.
- [x] GitHub Actions Node 22 quick-party unit tests passed (run #39208005049, job `unit`, conclusion success; checked 2026-10-19).
- [x] Added unit tests for local clocks, city filtering, approval state, real dates/times and form validation; GitHub Actions job passed.
- [ ] Validate RLS using anonymous, organizer, and admin identities.
- [x] Drafted no-public-read storage policy and owner path guard (code only; NOT security-tested).
- [ ] Verify poster storage permissions and no public access to unapproved images in test project.
- [ ] Add anti-spam and organizer identity verification appropriate to pilot.
- [x] Added poster preview URL cleanup on replacement/unmount and detailed form validation feedback (code only).
- [ ] Test mobile layout, form accessibility and error recovery.

## GL-PARTY-004 — Release gates (explicit user approval required)
- [ ] Obtain approval for production schema/storage/policy changes.
- [ ] Obtain approval for production deployment / merging to production branch if it triggers deployment.
- [ ] Record post-deployment smoke test and rollback steps.

## Verified repository files (2026-10-19)
- `supabase/migrations/DRAFT_quick_party_submissions.sql`
- `web/src/pages/QuickParties.jsx`
- `web/src/pages/QuickParties.css`
- `web/src/lib/quickPartyData.js`
- `web/src/App.jsx`

## Known issues and non-claims
1. This is a code prototype, **not** a working end-to-end party registration service.
2. The draft SQL has NOT been executed; `quick_party_submissions` may not exist in the runtime database.
3. Query errors are shown as unavailable, not as confirmed zero events.
4. Poster preview uses a local object URL; image is not uploaded or stored.
5. Quick-party unit tests passed in GitHub Actions run #39208005049; full build, lint, integration, and security tests remain unverified.
6. The first version of the draft SQL does not define a poster storage bucket, secure upload RPC, or admin approval policies. Do not apply it as a complete production migration.
7. The date filter now excludes events whose local start time is earlier than the current minute, but runtime testing is pending.

## Next action (without modifying production)
1. Implement safe testable local validation and timezone-aware upcoming filtering.
2. Add unit tests for date and status handling.
3. Test draft moderation RPC, private storage policies and JWT/RLS in a nonproduction project.
4. Verify with build/lint and update each checkbox based on actual results.

## Change log
- 2026-10-19: Fixed approved-party pagination so the Load more decision uses the original database page length before city-local filtering; added two offline regression checks to CI. No production data or deployment changed.
- 2026-10-19: Removed direct INSERT policy from the initial schema draft (guarded RPC only), strengthened array constraints, added SQL regression checks, and created docs/GO_LATIN_PARTY_STAGING_ACCEPTANCE.md for isolated end-to-end tests. No staging or production database was changed.
- 2026-10-19: Added read-only approved-party pagination (50 records/page, deterministic order) and Load more UI. Development branch only; CI verification pending. No organizer write flow enabled.
- 2026-10-19: CI #39213426986 passed (13 checks, lint, offline build). Hardened draft organizer RPC against null genre array elements and empty poster filenames; extended static safety assertions. Awaiting latest CI. No database migrations applied.
- 2026-10-19: Added four static SQL-draft safety regression checks and included them in GitHub Actions. These inspect draft code only; they do not replace isolated Supabase integration/security tests. CI run #39213327488 queued at last check.
- 2026-10-19: Hardened draft submission RPC to reject events already started in the destination city's timezone; added poster-path reuse guard and unique index. SQL not applied; isolated integration tests pending.
- 2026-10-19: Added organizer-scoped transaction lock for concurrent submission quotas and city-local event date checks to draft RPC. SQL remains unexecuted; isolated integration/security tests pending.
- 2026-10-19: Verified latest party validation CI run #39211894831 succeeded. Added DRAFT_quick_party_submit_rpc.sql with pending-only insert and storage ownership guard; no DB changes. Quota race and file-content validation remain release blockers.
- 2026-10-19: Organizer UI JSX fix CI run #39211276863 passed. Hardened public party filter against impossible dates/times and invalid genre values; added regression tests (new run pending).
- 2026-10-19: Organizer login UI CI run #39211012869 failed lint due to missing JSX `}` at QuickParties.jsx:191; fixed in commit 375e4f4. Follow-up CI pending.
- 2026-10-19: Verified CI run #39210406663 successful, and added organizer magic-link login UI while keeping submission preview-only. New UI awaits CI validation.
- 2026-10-19: CI run #39210299581: install/tests/lint/Vite compilation passed; prerender failed for missing GO_LATIN_SITE_ORIGIN. Switched CI to offline Vite build; next run pending.
- 2026-10-19: Expanded GitHub Actions to npm ci, unit tests, lint, and production build on web changes; results not yet verified.
- 2026-10-19: Verified GitHub Actions run #39208005049 and `unit` job success, including Quick-party unit tests step; full build and database tests still pending.
- 2026-10-19: Fixed poster object URL lifecycle and precise form errors. Browser runtime testing pending.
- 2026-10-19: Added client-side genre and date filters to pilot listings; build and runtime checks pending.
- 2026-10-19: Added .github/workflows/quick-party-tests.yml for automated Node unit checks; no passing CI run claimed.
- 2026-10-19: Hardened approval status filter and date/time validation; added regression tests. Runtime tests and build still pending.
- 2026-10-19: Connected approve/reject buttons to review_quick_party RPC. Backend SQL remains unapplied and runtime tests pending.
- 2026-10-19: Added DRAFT_quick_party_review_rpc.sql. Admin decision and audit transaction are draft only; no production DB mutation.
- 2026-10-19: Added read-only /admin/party-review and DRAFT_quick_party_moderation.sql. No moderation writes enabled. Build/security tests pending.
- 2026-10-19: GL-PARTY-003 in progress: added quickPartyRules.js, quickPartyRules.test.js, wired time filtering and form validation. Tests are not yet executed.
- 2026-10-19: initial status audit from GitHub development branch. Five files confirmed present; no runtime tests or production changes claimed.
