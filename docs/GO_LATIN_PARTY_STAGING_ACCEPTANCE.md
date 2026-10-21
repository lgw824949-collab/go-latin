# GO LATIN — isolated pilot acceptance runbook

**Never execute this checklist on production.** Pilot cities: Seoul, Bangkok, Hanoi.
The SQL files named `DRAFT_*` are unverified and must be installed only in a disposable Supabase test project. Do not copy service-role secrets into Vite, pull requests, or browser code.

## Prerequisites
1. Create a separate Supabase project and configure disposable organizer, moderator, and anonymous sessions. Give the moderator `app_metadata.role = admin` using trusted admin tooling only.
2. Review the drafts in this order: `DRAFT_quick_party_submissions.sql`, `DRAFT_quick_party_storage_security.sql`, `DRAFT_quick_party_moderation.sql`, `DRAFT_quick_party_review_rpc.sql`, `DRAFT_quick_party_submit_rpc.sql`. Check actual Supabase storage ownership columns, SQL policy compatibility, and RPC owner privileges **before** applying.
3. Use test-only image objects and events; never import production BAR or `parties` records.

## Required server-side test cases (not yet executed)
| Actor | Action | Expected |
| --- | --- | --- |
| Anonymous | SELECT pending / approved | Pending hidden, approved visible |
| Anonymous | INSERT or call submit/review RPC | Denied |
| Organizer A | Direct INSERT or UPDATE to approved | Denied |
| Organizer A | Submit with organizer B's poster path | Denied |
| Organizer A | Submit nonexistent poster | Denied |
| Organizer A | Submit valid poster and future city-local time | Pending only |
| Organizer A | Submit reused poster | Denied |
| Organizer A | Submit with null genre item / empty filename | Denied |
| Organizer A | Submit five valid events, then sixth within 24h | Sixth denied |
| Organizer A | Submit concurrent sixth and seventh | Both denied |
| Organizer A | Submit today with a start time already passed locally | Denied |
| Organizer A | Approve or reject | Denied |
| Moderator | Approve pending submission | Approved, audit row created |
| Moderator | Reject pending submission | Rejected, audit row created |
| Moderator | Repeat decision or race two reviewers | At most one transition and audit entry |
| Public browser | View approved event, try direct private poster access | Event visible; direct private object denied |

## Additional release blockers
- Server-side poster magic-byte/MIME validation, safe upload size enforcement, orphan cleanup and spam mitigation.
- Signed poster delivery only after verifying approval, with short-lived URLs and no service-role credentials in the browser.
- Confirm privileges for `SECURITY DEFINER` function owners and audit-table access; exercise role revocation and stale JWT scenarios.
- Validate organizer sign-in redirects and full browser registration flow on a staging site.
- Verify pagination across 50+ approved events and city/date/genre filters.

## Acceptance gate
Mark the feature production-ready **only after** the isolated test results are recorded, vulnerabilities fixed, and the owner explicitly authorizes production migration and deployment. This runbook is preparation, **not** evidence that these cases passed.
