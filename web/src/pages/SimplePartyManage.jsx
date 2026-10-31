import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { signOutAdmin, watchAdminSession } from "../lib/admin.js";
import { SIMPLE_PARTY_CITIES, SIMPLE_PARTY_GENRES, simplePartyCity, simplePartySchedule } from "../lib/simpleParty.js";
import {
  deleteSimplePartyAdmin, emptySimplePartyForm, loadSimplePartyAdmin,
  saveSimplePartyAdmin, simplePartyEditForm,
} from "../lib/simplePartyAdmin.js";

export default function SimplePartyManage() {
  const [access, setAccess] = useState("checking");
  const [error, setError] = useState("");
  useEffect(() => {
    try { return watchAdminSession(setAccess); }
    catch (err) { setError(err.message); setAccess("signedOut"); return undefined; }
  }, []);
  if (access !== "admin") return (
    <main className="wrap admin quick-party-admin">
      <h1>Quick Parties admin</h1>
      {access === "checking" ? <p>Checking sign-in.</p> : <>
        <p role="alert">{error || (access === "forbidden" ? "Admin permission is required." : "Admin sign-in is required.")}</p>
        <Link to="/admin">Admin sign-in</Link>
      </>}
    </main>
  );
  return <PartyEditor />;
}

function PartyEditor() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [city, setCity] = useState("");
  const [form, setForm] = useState(emptySimplePartyForm);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    let live = true;
    setStatus("loading"); setLoadError("");
    loadSimplePartyAdmin().then(data => {
      if (!live) return;
      setRows(data); setStatus("ready");
    }).catch(err => {
      if (!live) return;
      setRows([]); setLoadError(err.message); setStatus("error");
    });
    return () => { live = false; };
  }, [revision]);

  function reset() { setForm(emptySimplePartyForm()); setFormKey(key => key + 1); }
  function change(key, value) {
    setForm(current => ({ ...current, [key]: value,
      ...(key === "capitalId" || key === "venueName" ? { venueId: "" } : {}) }));
  }
  async function save(event) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await saveSimplePartyAdmin(form);
      reset(); setMessage("Saved."); setRevision(value => value + 1);
    } catch (err) {
      setError(`${err.message} Refresh the list to check the result before retrying.`);
      if (err.uploadedPoster?.url) {
        setForm(current => ({ ...current, posterUrl: err.uploadedPoster.url, posterFile: null }));
        setFormKey(key => key + 1);
      }
    } finally { locked.current = false; setBusy(false); }
  }
  async function remove(party) {
    if (locked.current || !window.confirm(`Delete the party at ${party.venueName}? This cannot be undone.`)) return;
    locked.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await deleteSimplePartyAdmin(party.id);
      if (form.id === party.id) reset();
      setRows(current => current.filter(row => row.id !== party.id));
      setMessage("Deleted."); setRevision(value => value + 1);
    } catch (err) { setError(`${err.message} Refresh the list to check the result before retrying.`); }
    finally { locked.current = false; setBusy(false); }
  }

  const zone = simplePartyCity(form.capitalId)?.timezone;
  const visible = city ? rows.filter(row => row.capitalId === city) : rows;
  return (
    <main className="wrap admin quick-party-admin">
      <p><Link to="/admin">Bar management</Link></p>
      <h1>Quick Parties admin</h1>
      <button type="button" disabled={busy} onClick={() => signOutAdmin().catch(err => setError(err.message))}>Log out</button>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <h2>{form.id ? "Edit party" : "Register a party"}</h2>
      <form key={formKey} onSubmit={save}>
        <fieldset disabled={busy}>
          <legend>Party information</legend>
          <label>City<select value={form.capitalId} onChange={e => change("capitalId", e.target.value)}>
            {SIMPLE_PARTY_CITIES.map(item => <option key={item.id} value={item.id}>{item.city}</option>)}
          </select></label>
          <p>Date and time are local to {zone}.</p>
          <label>Date<input required type="date" value={form.date} onChange={e => change("date", e.target.value)} /></label>
          <label>Start time<input required type="time" value={form.startTime} onChange={e => change("startTime", e.target.value)} /></label>
          <label>Genre<select required value={form.genre} onChange={e => change("genre", e.target.value)}>
            <option value="">Choose a genre</option>
            {SIMPLE_PARTY_GENRES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label>Venue<input required type="text" maxLength={200} value={form.venueName} onChange={e => change("venueName", e.target.value)} /></label>
          <label>Inquiry SNS<input required type="url" maxLength={2048} value={form.snsUrl} onChange={e => change("snsUrl", e.target.value)} /></label>
          {form.posterUrl ? <AdminPoster key={form.posterUrl} src={form.posterUrl} alt="Current poster" width={240} /> : null}
          <label>{form.posterUrl ? "Replace poster (optional)" : "Poster"}
            <input required={!form.posterUrl} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => change("posterFile", e.target.files?.[0] ?? null)} />
          </label>
          <p>JPEG, PNG or WebP. Maximum 4 MiB. Leave empty to keep the current poster when editing.</p>
          <button className="save" type="submit">{busy ? "Saving…" : "Save party"}</button>
          {" "}<button type="button" onClick={reset}>New / cancel editing</button>
        </fieldset>
      </form>
      <h2>All parties, including past dates</h2>
      <label>Filter city<select value={city} onChange={e => setCity(e.target.value)}>
        <option value="">All cities</option>
        {SIMPLE_PARTY_CITIES.map(item => <option key={item.id} value={item.id}>{item.city}</option>)}
      </select></label>
      <button type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}>Refresh list</button>
      {status === "loading" ? <p>Loading parties.</p> : null}
      {status === "error" ? <p role="alert">{loadError}</p> : null}
      {status === "ready" && !visible.length ? <p>No parties in this selection.</p> : null}
      {status === "ready" ? visible.map(party => {
        const when = simplePartySchedule(party);
        return <article className="venue" key={party.id}>
          <h2>{party.venueName}</h2>
          <p>{simplePartyCity(party.capitalId)?.city} · {when.date} · {when.time} ({when.zone})</p>
          {party.posterUrl ? <AdminPoster key={party.posterUrl} src={party.posterUrl} alt={`${party.venueName} poster`} width={160} /> : null}
          {party.snsUrl ? <p><a href={party.snsUrl} target="_blank" rel="noreferrer">Inquiry SNS</a></p> : null}
          <button type="button" disabled={busy} onClick={() => {
            try { setForm(simplePartyEditForm(party)); setFormKey(key => key + 1); setError(""); setMessage(""); }
            catch (err) { setError(err.message); }
          }}>Edit</button>
          {" "}<button type="button" disabled={busy} onClick={() => remove(party)}>Delete</button>
        </article>;
      }) : null}
    </main>
  );
}

export function AdminPoster({ src, alt, width }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <p role="status">Poster unavailable. Keep the current poster or choose a replacement.</p>
    : <p><img src={src} alt={alt} width={width} style={{ maxWidth: "100%", height: "auto" }} onError={() => setFailed(true)} /></p>;
}
