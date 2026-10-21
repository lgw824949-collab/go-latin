import { useEffect, useState } from "react";
import { loadQuickParties, QUICK_CITIES } from "../lib/quickPartyData.js";
import { validateQuickParty } from "../lib/quickPartyRules.js";
import { adminClient } from "../lib/admin.js";
import { Link, useSearchParams } from "react-router-dom";
import "./QuickParties.css";

const CITIES = QUICK_CITIES;
const GENRES = ["Salsa", "Bachata", "Kizomba", "Mixed"];

export default function QuickParties() {
  const [params, setParams] = useSearchParams();
  const selectedCity = CITIES.find((item) => item.id === params.get("city")) ?? CITIES[0];
  const [poster, setPoster] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [preview, setPreview] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [genres, setGenres] = useState([]);
  const [venue, setVenue] = useState("");
  const [sns, setSns] = useState("");
  const [tab, setTab] = useState("events");
  const [genreFilter, setGenreFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [upcoming, setUpcoming] = useState({ status: "loading", rows: [], error: "", hasMore: false });
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    loadQuickParties(selectedCity.id, new Date(), page).then(({ rows, hasMore }) => {
      if (active) setUpcoming((old) => ({ status: "ready", rows: page === 0 ? rows : [...old.rows, ...rows], error: "", hasMore }));
    }).catch((error) => {
      if (active) setUpcoming((old) => ({ ...old, status: "error", error: error.message }));
    });
    return () => { active = false; };
  }, [selectedCity.id, page, retry]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    try {
      const client = adminClient();
      client.auth.getUser().then(({ data, error }) => {
        if (active) setOrganizer(error ? null : data.user ?? null);
      }).catch(() => { if (active) setOrganizer(null); });
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (active) setOrganizer(session?.user ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (error) {
      setAuthNotice(error.message);
    }
    return () => { active = false; unsubscribe(); };
  }, []);

  async function sendOrganizerLink(event) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthNotice("");
    try {
      const { error } = await adminClient().auth.signInWithOtp({
        email: organizerEmail.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setAuthNotice("Check your email for a sign-in link. Party submission is still preview-only.");
    } catch (error) {
      setAuthNotice(`Sign-in failed: ${error.message}`);
    } finally {
      setAuthBusy(false);
    }
  }

  const visibleParties = upcoming.rows.filter((party) => {
    const matchGenre = genreFilter === "all" || party.dance_genres?.includes(genreFilter);
    const matchDate = !dateFilter || party.event_date === dateFilter;
    return matchGenre && matchDate;
  });

  useEffect(() => {
    if (!poster) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(poster);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [poster]);

  function selectPoster(file) {
    setPoster(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size <= 0) {
      setNotice("Use JPG, PNG or WEBP up to 5 MB.");
      return;
    }
    setNotice("");
    setPoster(file);

  }
  function changeCity(city) {
    const next = new URLSearchParams(params);
    next.set("city", city);
    setUpcoming({ status: "loading", rows: [], error: "", hasMore: false });
    setPage(0);
    setRetry((value) => value + 1);
    setParams(next);
  }
  function submit(event) {
    event.preventDefault();
    const errors = validateQuickParty({ city: selectedCity.id, poster, date, time, genres, venue, sns });
    if (errors.length) {
      setNotice(errors.join(" "));
      return;
    }
    // Deliberately no writes until migration, storage and moderation are approved.
    setNotice("Preview complete. Submissions are not yet enabled; no data was saved.");
  }

  return (
    <main className="wrap quick-parties">
      <p className="kicker">GO LATIN · Pilot</p>
      <h1>Parties</h1>
      <p className="lede">Seoul · Bangkok · Hanoi — organizer poster submissions.</p>
      <label className="quick-field">City
        <select value={selectedCity.id} onChange={(e) => changeCity(e.target.value)}>
          {CITIES.map((city) => <option key={city.id} value={city.id}>{city.label}</option>)}
        </select>
      </label>
      <div className="quick-tabs">
        <button type="button" aria-pressed={tab === "events"} onClick={() => setTab("events")}>Upcoming parties</button>
        <button type="button" aria-pressed={tab === "register"} onClick={() => setTab("register")}>Post a party</button>
      </div>
      {tab === "events" ? (
        <section aria-label="Upcoming parties">
          <div className="quick-pair">
            <label className="quick-field">Filter by genre
              <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
                <option value="all">All genres</option>
                {GENRES.map((genre) => <option key={genre} value={genre.toLowerCase()}>{genre}</option>)}
              </select>
            </label>
            <label className="quick-field">Filter by date
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </label>
          </div>
          {upcoming.status === "loading" ? <p className="quick-muted">Loading approved parties...</p> : null}
          {upcoming.status === "error" ? <div><p role="alert" className="quick-empty">Party listings are not available yet. The pilot database may not be configured. No event availability can be confirmed.</p><button type="button" onClick={() => { setUpcoming((old) => ({ ...old, status: "loading" })); setRetry((value) => value + 1); }}>Retry loading parties</button></div> : null}
          {upcoming.status === "ready" && visibleParties.length === 0 && upcoming.hasMore ? <p className="quick-muted">No matching events on the pages loaded so far. Load more to check older pages of upcoming events.</p> : null}
          {upcoming.status === "ready" && visibleParties.length === 0 && !upcoming.hasMore ? <p className="quick-empty">No approved upcoming parties match your filters in {selectedCity.label}.</p> : null}
          {(upcoming.status === "ready" || (upcoming.status === "loading" && upcoming.rows.length > 0)) ? <ul className="quick-results">{visibleParties.map((party) => <li key={party.id}><strong>{party.venue_name}</strong><p>{party.event_date} · {party.start_time.slice(0, 5)} ({selectedCity.label} local time)</p><p>{party.dance_genres.join(" · ")}</p><p>Contact: {party.contact_sns}</p></li>)}</ul> : null}
          {upcoming.status === "ready" && upcoming.hasMore ? <button type="button" onClick={() => { setUpcoming((old) => ({ ...old, status: "loading" })); setPage((old) => old + 1); }}>Load more parties</button> : null}
          <p className="quick-muted">Event dates use {selectedCity.timezone}. Posters will appear after secure storage is configured.</p>
          <button type="button" onClick={() => setTab("register")}>Post your event</button>
        </section>
      ) : (
        <section aria-label="Organizer registration">
          {organizer ? <p className="quick-muted">Signed in as {organizer.email}. Event submission is not yet enabled.</p> : (
            <form className="quick-form" onSubmit={sendOrganizerLink}>
              <label className="quick-field">Organizer email
                <input type="email" value={organizerEmail} onChange={(event) => setOrganizerEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" />
              </label>
              <button type="submit" disabled={authBusy}>{authBusy ? "Sending…" : "Email me a sign-in link"}</button>
            </form>
          )}
          {authNotice ? <p role="status">{authNotice}</p> : null}
        <form className="quick-form" onSubmit={submit}>
          <label className="quick-field">Poster (one image)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => selectPoster(e.target.files?.[0])} />
          </label>
          {preview ? <img className="quick-poster" src={preview} alt="Selected event poster preview" /> : null}
          <div className="quick-pair">
            <label className="quick-field">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            <label className="quick-field">Start time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></label>
          </div>
          <fieldset className="quick-genres"><legend>Genre</legend>
            {GENRES.map((genre) => <label key={genre}><input type="checkbox" checked={genres.includes(genre)} onChange={(e) => setGenres((old) => e.target.checked ? [...old, genre] : old.filter((x) => x !== genre))} />{genre}</label>)}
          </fieldset>
          <label className="quick-field">Venue<input value={venue} maxLength={160} onChange={(e) => setVenue(e.target.value)} placeholder="BAR or venue name" required /></label>
          <label className="quick-field">Contact SNS<input value={sns} maxLength={500} onChange={(e) => setSns(e.target.value)} placeholder="Instagram profile or contact link" required /></label>
          <p className="quick-muted">All poster details remain on the poster. No OCR. Submissions require review before public display.</p>
          <button type="submit">Check submission (preview only)</button>
          {notice ? <p role="status">{notice}</p> : null}
        </form>
        </section>
      )}
      <p className="quick-muted"><Link to="/">Back to directory</Link></p>
    </main>
  );
}
