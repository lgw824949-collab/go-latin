import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { openPasswordRecovery } from "../lib/passwordRecovery.js";

let pending;
let releaseTimer;
function startRecovery() {
  clearTimeout(releaseTimer);
  if (pending) return pending;
  const href = window.location.href;
  // Remove credentials before rendering links or allowing navigation.
  window.history.replaceState(null, "", window.location.pathname);
  pending = (async () => {
    const env = import.meta.env;
    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error("Authentication is not configured.");
    const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
        storageKey: "go-latin-password-recovery", debug: false },
    });
    try {
      return await openPasswordRecovery(client.auth, href);
    } catch (error) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      throw error;
    }
  })();
  return pending;
}

export default function PasswordRecovery() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(null);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    startRecovery().then(value => { if (live) setRecovery(value); })
      .catch(() => { if (live) setMessage("This recovery link is invalid, expired, or not for an administrator. Request a new link."); });
    return () => {
      live = false;
      // StrictMode remounts immediately; a real route exit releases recovery credentials.
      releaseTimer = setTimeout(() => {
        const previous = pending;
        pending = null;
        previous?.then(value => value.dispose()).catch(() => {});
      }, 0);
    };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (!recovery || busy) return;
    setBusy(true); setMessage("");
    try {
      await recovery.save(password, confirmation);
      setPassword(""); setConfirmation("");
      navigate("/admin", { replace: true });
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="wrap detail">
    <h1>Reset administrator password</h1>
    <p>Enter a new password using your password recovery link.</p>
    {message && <p role="alert">{message}</p>}
    {recovery && <form onSubmit={submit}>
      <label>New password <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
      <label>Confirm password <input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
    </form>}
    <Link to="/admin">Back to admin sign-in</Link>
  </main>;
}
