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
- [ ] Add server-side file type/size validation, private poster bucket, secure upload flow and rate limits.
- [ ] Implement authenticated organizer submission; prevent forged poster paths.
- [ ] Implement authorized moderation and approval workflow.
- [ ] Add venue picker / reuse of prior organizer SNS and recurring-event copy.

## GL-PARTY-002 — Approved-only upcoming-party lookup
- [x] Added `web/src/lib/quickPartyData.js`.
- [x] Query restricts city, status=approved, and local-date lower bound.
- [x] Query sorts by event date and start time and limits to 100 rows.
- [x] UI distinguishes loading, error, no results, and returned results.
- [ ] Run query against test DB after draft migration review and safe application.
- [ ] Add pagination if more than 100 events; review time boundary and overnight events.
- [ ] Connect securely served approved poster images; check that public reads cannot access pending posters.
- [ ] Verify city isolation and date logic for all three timezones.
- [ ] Verify listing does not display unverifiable or rejected events.

## GL-PARTY-003 — Validation and security
- [ ] Run local `npm install`, `npm run build`, and `npm run lint` in `web/`.
- [ ] Add automated tests for local-date logic, city filtering, pending visibility and form validation.
- [ ] Validate RLS using anonymous, organizer, and admin identities.
- [ ] Confirm poster storage permissions and no public access to unapproved images.
- [ ] Add anti-spam and organizer identity verification appropriate to pilot.
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
5. No build, lint, integration, or security tests have been run as part of this work.
6. The first version of the draft SQL does not define a poster storage bucket, secure upload RPC, or admin approval policies. Do not apply it as a complete production migration.
7. The date filter is date-level; events earlier today may still appear. Fix before calling this a strict upcoming-only list.

## Next action (without modifying production)
1. Implement safe testable local validation and timezone-aware upcoming filtering.
2. Add unit tests for date and status handling.
3. Draft secure storage/moderation migration additions without executing SQL.
4. Verify with build/lint and update each checkbox based on actual results.

## Change log
- 2026-10-19: initial status audit from GitHub development branch. Five files confirmed present; no runtime tests or production changes claimed.
