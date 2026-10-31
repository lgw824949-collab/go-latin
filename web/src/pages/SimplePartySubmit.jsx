import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadCapital } from "../lib/directory.js";
import {
  SIMPLE_PARTY_CITIES,
  SIMPLE_PARTY_GENRES,
  isSimplePartyCity,
  loadSimpleParties,
  reuseContacts,
  submitSimpleParty,
} from "../lib/simpleParty.js";

const EMPTY = {
  capitalId: "",
  date: "",
  startTime: "",
  genre: "",
  venueName: "",
  venueId: "",
  snsUrl: "",
  posterFile: null,
};

export default function SimplePartySubmit() {
  const { id } = useParams();
  const startCity = isSimplePartyCity(id) ? id : "seoul";
  const [form, setForm] = useState({ ...EMPTY, capitalId: startCity });
  const [saved, setSaved] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [prior, setPrior] = useState([]);
  const [venues, setVenues] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, capitalId: startCity }));
  }, [startCity]);

  useEffect(() => {
    let live = true;
    setStatus("loading");
    Promise.all([
      loadCapital(form.capitalId).catch((err) => {
        throw err;
      }),
      loadSimpleParties(form.capitalId).catch(() => []),
    ]).then(([city, rows]) => {
      if (!live) return;
      setVenues(city?.venues ?? []);
      setPrior(rows);
      setError("");
      setStatus("ready");
    }).catch((err) => {
      if (!live) return;
      setVenues([]);
      setPrior([]);
      setError(err.message);
      setStatus("error");
    });
    return () => {
      live = false;
    };
  }, [form.capitalId]);

  const selected = SIMPLE_PARTY_CITIES.find((city) => city.id === form.capitalId) ?? simpleFallback(form.capitalId);
  const contacts = reuseContacts(venues, prior);

  if (!isSimplePartyCity(id)) {
    return (
      <main className="wrap admin">
        <p><Link to="/">Directory</Link></p>
        <h1>Not listed</h1>
        <p className="lede">Simple party registration is open for Seoul, Bangkok, and Hanoi.</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="wrap admin">
        <p><Link to={`/c/${id}`}>{id}</Link></p>
        <p className="lede">{error}</p>
      </main>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSaved("");
    try {
      const partyId = await submitSimpleParty(form);
      setSaved(String(partyId ?? "saved"));
      setForm((current) => ({
        ...EMPTY,
        capitalId: current.capitalId,
      }));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function pickContact(value) {
    const contact = contacts.find((item) => `${item.venueName}|${item.snsUrl}` === value);
    if (!contact) {
      setForm((current) => ({ ...current, venueId: "", venueName: "", snsUrl: "" }));
      return;
    }
    setForm((current) => ({
      ...current,
      venueId: contact.venueId,
      venueName: contact.venueName,
      snsUrl: contact.snsUrl,
    }));
  }

  return (
    <main className="wrap admin">
      <p><Link to={`/c/${form.capitalId}`}>{selected.city}</Link></p>
      <h1>Register a party</h1>
      <p className="lede">Poster, date, start time, genre, venue, and inquiry SNS. No extra description.</p>
      {status === "loading" ? <p className="count">Loading the directory.</p> : null}
      <form onSubmit={onSubmit}>
        <label>
          City
          <select
            value={form.capitalId}
            onChange={(event) => setForm((current) => ({
              ...current,
              capitalId: event.target.value,
              venueId: "",
              venueName: "",
              snsUrl: "",
            }))}
          >
            {SIMPLE_PARTY_CITIES.map((city) => (
              <option key={city.id} value={city.id}>{city.city}</option>
            ))}
          </select>
        </label>
        <label>
          Poster
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setForm((current) => ({ ...current, posterFile: event.target.files?.[0] ?? null }))}
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
        <label>
          Start time
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
          />
        </label>
        <fieldset>
          <legend>Genre</legend>
          {SIMPLE_PARTY_GENRES.map((genre) => (
            <label key={genre.id}>
              <input
                type="radio"
                name="genre"
                value={genre.id}
                checked={form.genre === genre.id}
                onChange={() => setForm((current) => ({ ...current, genre: genre.id }))}
              />
              {genre.name}
            </label>
          ))}
        </fieldset>
        {contacts.length > 0 ? (
          <label>
            Reuse venue and SNS
            <select
              value={form.venueName && form.snsUrl ? `${form.venueName}|${form.snsUrl}` : ""}
              onChange={(event) => pickContact(event.target.value)}
            >
              <option value="">New venue</option>
              {contacts.map((contact) => (
                <option key={`${contact.venueId}-${contact.snsUrl}`} value={`${contact.venueName}|${contact.snsUrl}`}>
                  {contact.venueName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Venue
          <input
            type="text"
            value={form.venueName}
            onChange={(event) => setForm((current) => ({ ...current, venueName: event.target.value, venueId: "" }))}
          />
        </label>
        <label>
          Inquiry SNS
          <input
            type="url"
            value={form.snsUrl}
            placeholder="https://"
            onChange={(event) => setForm((current) => ({ ...current, snsUrl: event.target.value }))}
          />
        </label>
        <p>
          <button type="submit" disabled={busy}>{busy ? "Saving" : "Register"}</button>
        </p>
      </form>
      {saved ? <p className="count">Saved. It shows on the city page if the date is today or later.</p> : null}
      {message ? <p className="empty">{message}</p> : null}
    </main>
  );
}

function simpleFallback(id) {
  return SIMPLE_PARTY_CITIES.find((city) => city.id === id) ?? { id, city: id, venues: [] };
}
