import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export const OFFLINE_CSP = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'";
const posterSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="320" height="480" fill="#263345"/><text x="20" y="240" fill="white" font-size="24">MOCK POSTER ONLY</text></svg>';
export function offlineConfig(outDir, audit = () => {}) {
  return {
    configFile: false,
    root: fileURLToPath(new URL("./", import.meta.url)),
    publicDir: fileURLToPath(new URL("../public", import.meta.url)),
    envDir: false,
    envPrefix: [],
    // Vite owns the import.meta.env object. Define its mock properties individually
    // so aliases such as `const env = import.meta.env` receive them too.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://offline.invalid"),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("offline-not-a-credential"),
    },
    resolve: { alias: [{ find: /^@supabase\/supabase-js(?:\/.*)?$/, replacement: fileURLToPath(new URL("./supabase.js", import.meta.url)) }] },
    plugins: [react(), {
      name: "offline-only-audit",
      generateBundle(_options, bundle) {
        const modules = Object.values(bundle).flatMap(item => item.type === "chunk" ? Object.keys(item.modules) : []);
        if (modules.some(id => /node_modules[\\/]@supabase[\\/]/.test(id))) throw new Error("Real Supabase SDK entered offline build.");
        if (!modules.some(id => /offline[\\/]supabase\.js/.test(id))) throw new Error("Offline client replacement missing.");
        const text = Object.values(bundle).map(item => item.type === "chunk" ? item.code : String(item.source)).join("\n");
        if (/https?:\/\/[^\s"'<>]*supabase\.(co|in)/i.test(text)) throw new Error("Supabase endpoint entered offline output.");
        audit({ modules: modules.length, realSdk: false, productionEndpoint: false });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] !== "/offline-poster.svg") return next();
          res.setHeader("Content-Type", "image/svg+xml"); res.end(posterSvg);
        });
      },
    }],
    build: { outDir, emptyOutDir: false },
    preview: { host: "localhost", port: 4188, strictPort: true,
      headers: { "Content-Security-Policy": OFFLINE_CSP, "Permissions-Policy": "geolocation=(), camera=(), microphone=()" } },
  };
}
