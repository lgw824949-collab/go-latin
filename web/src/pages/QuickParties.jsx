import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./QuickParties.css";

const CITIES = [
  { id: "seoul", label: "Seoul", timezone: "Asia/Seoul" },
  { id: "bangkok", label: "Bangkok", timezone: "Asia/Bangkok" },
  { id: "hanoi", label: "Hanoi", timezone: "Asia/Ho_Chi_Minh" },
];
const GENRES = ["Salsa", "Bachata", "Kizomba", "Mixed"];

export default function QuickParties() {
  const [params, setParams] = useSearchParams();
  const selectedCity = CITIES.find((item) => item.id === params.get("city")) ?? CITIES[0];
  const [poster, setPoster] = useState(null);
  const [preview, setPreview] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [genres, setGenres] = useState([]);
  const [venue, setVenue] = useState("");
  const [sns, setSns] = useState("");
  const [tab, setTab] = useState("events");
  const [notice, setNotice] = useState("");

  function selectPoster(file) {
    if (preview) URL.revokeObjectURL(preview);
    setPoster(null);
    setPreview("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice("Use JPG, PNG or WEBP up to 5 MB.");
      return;
    }
    setNotice("");
    setPoster(file);
    setPreview(URL.createObjectURL(file));
  }
  function changeCity(city) {
    const next = new URLSearchParams(params);
    next.set("city", city);
    setParams(next);
  }
  function submit(event) {
    event.preventDefault();
    if (!poster || !date || !time || !genres.length || !venue.trim() || !sns.trim()) {
      setNotice("Complete all fields to preview your submission.");
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
          <p className="quick-empty">No approved upcoming parties are connected yet for {selectedCity.label}. This pilot does not invent or import events.</p>
          <p className="quick-muted">Dates will be interpreted in {selectedCity.timezone} after the data service is connected.</p>
          <button type="button" onClick={() => setTab("register")}>Post your event</button>
        </section>
      ) : (
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
      )}
      <p className="quick-muted"><Link to="/">Back to directory</Link></p>
    </main>
  );
}
