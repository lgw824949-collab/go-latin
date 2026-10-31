# GO LATIN isolated offline preview

In Windows PowerShell:

```powershell
Set-Location -LiteralPath 'C:\dev\go Latin\web'
npm run preview:offline
```

Open `http://localhost:4188/`. Stop with Ctrl+C. Do not run the ordinary
`dev`, `preview`, or `build` commands for this isolated preview.

`npm run check:offline` runs only the safety tests and audited offline build,
without starting a server. Both commands use existing installed dependencies.
The preview command performs these checks before it starts listening. A test,
build, audit, or port conflict fails rather than falling back to the normal app.

## Isolation

- Real `.env*` files and inherited VITE variables are not loaded into the build.
- A dedicated Vite config replaces every Supabase SDK import with an in-memory
  client. Only a noncredential sentinel URL/key is provided to existing guards.
- The ordinary prerender build script (which fetches Supabase) is never invoked.
- Build auditing rejects the real SDK or a Supabase cloud URL in the output.
- Browser CSP permits only same-origin requests and local/data/blob images.
  Fetch/XHR guards reject external URLs; WebSocket, EventSource and sendBeacon
  are disabled. External links are prevented from navigating.
- Original index.html is not used: no Google Fonts or remote preconnect tags.
- Geolocation, camera and microphone are disabled by the preview's HTTP policy.
- Built files are placed in a fresh OS temporary directory, not production dist.
- No authentication token, cookie or preview state is persisted.

## Fixtures and limitations

The actual application initialization, routes and components are used. Data
are synthetic fixtures for Seoul, Bangkok and Hanoi; they are not updated BAR
records or confirmation of real business hours. Hanoi Monday is unknown with
empty clock fields; Tuesday fixtures are Closed; remaining fixtures show an
overnight window. Weekly dance rows deliberately contain no unsupported start
time fields. Current and past parties are included.

Use the banner's Mock admin / Mock ordinary user / Mock sign out controls.
No real login credentials are needed. Quick Parties CRUD modifies memory only
and resets on reload. Mock uploads keep only file metadata in memory and return
a local synthetic SVG poster; the selected image is not uploaded or reproduced.
Storage deletion and direct table writes are disabled. BAR administration may
be inspected, but BAR save and unrelated RPCs are intentionally unsupported.
Map/SNS/source links are local placeholders, not external business profiles.

Automated safety tests and a successful offline bundle audit do not establish
that real browser layout, operating RLS, Auth, Storage or deployment works.
Browser access to localhost must be available separately; do not bypass a
browser or sandbox policy if access is blocked.
