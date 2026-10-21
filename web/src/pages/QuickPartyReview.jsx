import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminClient } from "../lib/admin.js";

export default function QuickPartyReview() {
  const [access, setAccess] = useState("checking");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ status: "idle", rows: [], error: "" });
  useEffect(() => {
    const client = adminClient();
    let active = true;
    const sync = async () => {
      const { data, error } = await client.auth.getUser();
      if (!active) return;
      setAccess(!error && data.user?.app_metadata?.role === "admin" ? "admin" : "denied");
    };
    sync();
    const { data } = client.auth.onAuthStateChange(() => { sync(); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (access !== "admin") return;
    let active = true;
    setState({ status: "loading", rows: [], error: "" });
    adminClient().from("quick_party_submissions")
      .select("id, city_slug, event_date, start_time, venue_name, dance_genres, contact_sns, status, created_at")
      .eq("status", "pending").order("created_at", { ascending: true }).limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        setState(error ? { status: "error", rows: [], error: error.message } : { status: "ready", rows: data ?? [], error: "" });
      });
    return () => { active = false; };
  }, [access, reload]);
  async function review(party, decision) {
    if (busyId || access !== "admin") return;
    if (!window.confirm(`${decision === "approved" ? "Approve" : "Reject"} ${party.venue_name}?`)) return;
    setBusyId(party.id);
    setNotice("");
    try {
      const { data: auth, error: authError } = await adminClient().auth.getUser();
      if (authError || auth.user?.app_metadata?.role !== "admin") throw new Error("Administrator session required.");
      const { error } = await adminClient().rpc("review_quick_party", { p_submission_id: party.id, p_decision: decision });
      if (error) throw error;
      setNotice(`${party.venue_name}: ${decision}.`);
      setReload((value) => value + 1);
    } catch (error) {
      setNotice(`Review failed: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }
  return <main className="wrap admin">
    <p className="kicker">GO LATIN · Moderation prototype</p>
    <h1>Party review</h1>
    <p className="venue-note">Review actions call a server-validated database function. They will remain unavailable until the draft moderation SQL is reviewed, tested and installed.</p>
    {notice ? <p role="status">{notice}</p> : null}
    {access === "checking" ? <p>Checking administrator session…</p> : null}
    {access === "denied" ? <p role="alert">Administrator sign-in is required. <Link to="/admin">Sign in</Link></p> : null}
    {access === "admin" && state.status === "loading" ? <p>Loading pending submissions…</p> : null}
    {access === "admin" && state.status === "error" ? <p role="alert">Unable to load review queue. {state.error}</p> : null}
    {access === "admin" && state.status === "ready" ? <ul className="bar-list">
      {state.rows.length === 0 ? <li>No pending submissions listed.</li> : null}
      {state.rows.map((party) => <li key={party.id}>
        <p className="kicker">{party.city_slug} · pending</p>
        <h2>{party.venue_name}</h2>
        <p>{party.event_date} · {party.start_time?.slice(0, 5)}</p>
        <p>{party.dance_genres?.join(" · ")}</p>
        <p>Contact: {party.contact_sns}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busyId !== null} onClick={() => review(party, "approved")}>Approve</button>
          <button type="button" disabled={busyId !== null} onClick={() => review(party, "rejected")}>Reject</button>
        </div>
      </li>)}
    </ul> : null}
  </main>;
}
