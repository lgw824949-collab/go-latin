# GO LATIN — Local development

This project is **not** automatically running on your computer. Start the local server from the repository:

```bash
git clone https://github.com/lgw824949-collab/go-latin.git
cd go-latin
git checkout feature/quick-parties-3-cities
cd web
npm ci
npm run dev -- --host 127.0.0.1
```

If the repository already exists, skip cloning and switch to the feature branch after safely saving any local work.

- Home: http://localhost:5173/
- Parties: http://localhost:5173/parties
- Moderator: http://localhost:5173/admin/party-review

Vite may choose another port if 5173 is occupied; follow the `Local:` address printed in the terminal.

**Important:** The party feature is still a prototype. Live Supabase configuration may be required to render data and sign in. Draft migrations have not been applied to production. Submissions remain preview-only. Do not put Supabase service-role credentials into `VITE_*` variables or commit secrets. Use a separate staging Supabase project for integration testing. Do not deploy or merge this feature without release authorization.
