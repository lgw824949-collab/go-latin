import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ADMIN_DANCES,
  ADMIN_DAYS,
  loadAdminBar,
  loadAdminCities,
  saveAdminBar,
  signInAdmin,
  signOutAdmin,
  watchAdminSession,
} from "../lib/admin.js";

const DAY_NAME = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};

export default function Admin() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = id === "new";
  const requestedVenue = searchParams.get("venue");
  const [cities, setCities] = useState([]);
  const [capitalId, setCapitalId] = useState(isNew ? "" : (id ?? ""));
  const [country, setCountry] = useState("");
  const [originalCountry, setOriginalCountry] = useState("");
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(isNew ? "ready" : "loading");
  const [message, setMessage] = useState("");
  const [duplicate, setDuplicate] = useState("");
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [access, setAccess] = useState("checking");

  useEffect(() => watchAdminSession(setAccess), []);

  useEffect(() => {
    if (access !== "admin") return undefined;
    loadAdminCities().then(setCities).catch((error) => {
      setStatus("error");
      setMessage(error.message);
    });
    return undefined;
  }, [access]);

  useEffect(() => {
    if (access !== "admin" || !isNew) return;
    setForm(emptyBar());
  }, [access, isNew]);

  useEffect(() => {
    if (access !== "admin" || isNew || !capitalId) return;
    let live = true;
    setStatus("loading");
    loadAdminBar(capitalId)
      .then((loaded) => {
        if (!live) return;
        setCountry(loaded.country);
        setOriginalCountry(loaded.country);
        const picked = loaded.bars.find((bar) => bar.venueId === requestedVenue) ?? loaded.bars[0] ?? emptyBar();
        setForm(picked);
        setStatus("ready");
        setMessage("");
      })
      .catch((error) => {
        if (!live) return;
        setStatus("error");
        setMessage(error.message);
      });
    return () => {
      live = false;
    };
  }, [access, capitalId, isNew, requestedVenue]);

  async function onSave(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const savedId = await saveAdminBar({
        ...form,
        capitalId,
        country,
        originalCountry,
        confirmDuplicate,
      });
      setForm((current) => ({ ...current, venueId: savedId }));
      setOriginalCountry(country.trim());
      setDuplicate("");
      setConfirmDuplicate(false);
      setStatus("ready");
      setMessage("Saved.");
    } catch (error) {
      setStatus("ready");
      if (error.code === "duplicate") {
        setDuplicate(error.message);
        setMessage("");
        return;
      }
      setMessage(error.message);
    }
  }

  if (access !== "admin") {
    return (
      <main className="wrap admin">
        <h1>Bar editor</h1>
        {access === "checking" ? <p className="count">Checking sign-in.</p> : <SignIn access={access} />}
      </main>
    );
  }

  return (
    <main className="wrap admin">
      <h1>Bar editor</h1>
      <button type="button" className="save" onClick={() => signOutAdmin().catch((error) => setMessage(error.message))}>
        Log out
      </button>
      <form onSubmit={onSave}>
        <label>
          City
          <select
            value={capitalId}
            onChange={(event) => {
              const next = event.target.value;
              setCapitalId(next);
              if (!isNew) return;
              const city = cities.find((item) => item.id === next);
              setCountry(city?.country ?? "");
              setOriginalCountry(city?.country ?? "");
            }}
          >
            <option value="">Select a city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.city}
              </option>
            ))}
          </select>
        </label>
        {form ? (
          <>
            <Text label="BAR name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Text label="Country" value={country} onChange={setCountry} />
            <Text label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} />
            <Text label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <Text label="Website" value={form.website} onChange={(website) => setForm({ ...form, website })} />
            <Text label="Instagram" value={form.instagram} onChange={(instagram) => setForm({ ...form, instagram })} />
            <Text label="Google Maps" value={form.mapsUrl} onChange={(mapsUrl) => setForm({ ...form, mapsUrl })} />
            <fieldset>
              <legend>Dance types</legend>
              <p className="venue-note">A dance type does not fill the weekly schedule.</p>
              {ADMIN_DANCES.map((dance) => (
                <label key={dance.id} className="check">
                  <input
                    type="checkbox"
                    checked={form.dances.includes(dance.id)}
                    onChange={() => setForm({ ...form, dances: toggle(form.dances, dance.id) })}
                  />
                  {dance.name}
                </label>
              ))}
            </fieldset>
            <h2>Door hours</h2>
            <p className="venue-note">A close earlier than the open, such as 02:00 after 18:00, ends the next morning.</p>
            {form.hours.map((day) => (
              <div className="day" key={day.weekday}>
                <span>{DAY_NAME[day.weekday]}</span>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    onChange={() => updateHour(setForm, day.weekday, { closed: !day.closed })}
                  />
                  Closed
                </label>
                <input
                  type="time"
                  value={day.opens}
                  disabled={day.closed}
                  onChange={(event) => updateHour(setForm, day.weekday, { opens: event.target.value })}
                />
                <input
                  type="time"
                  value={day.closes}
                  disabled={day.closed}
                  onChange={(event) => updateHour(setForm, day.weekday, { closes: event.target.value })}
                />
              </div>
            ))}
            <h2>Dance schedule</h2>
            <p className="venue-note">A day with no dance selected stays Not confirmed.</p>
            {form.schedule.map((day) => (
              <div className="day" key={day.weekday}>
                <span>{DAY_NAME[day.weekday]}</span>
                {ADMIN_DANCES.map((dance) => (
                  <label key={dance.id} className="check">
                    <input
                      type="checkbox"
                      checked={day.dances.includes(dance.id)}
                      onChange={() => updateSchedule(setForm, day.weekday, dance.id)}
                    />
                    {dance.name}
                  </label>
                ))}
                {day.dances.length === 0 ? <em>Not confirmed</em> : null}
              </div>
            ))}
            <Text label="Last checked" type="date" value={form.lastChecked} onChange={(lastChecked) => setForm({ ...form, lastChecked })} />
            <label>
              Confidence
              <select value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value })}>
                <option value="confirmed">Confirmed</option>
                <option value="likely">Partially confirmed</option>
                <option value="unconfirmed">Not confirmed</option>
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="operating">Active</option>
                <option value="temporarily_closed">Temporarily Closed</option>
                <option value="permanently_closed">Closed</option>
                <option value="planned">Planned</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label>
              Notes
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={5} />
            </label>
            {duplicate ? (
              <p className="venue-note">
                {duplicate}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={confirmDuplicate}
                    onChange={(event) => setConfirmDuplicate(event.target.checked)}
                  />
                  Save this bar anyway
                </label>
              </p>
            ) : null}
            <button className="save" type="submit" disabled={status === "saving" || form.name.trim() === ""}>
              {status === "saving" ? "Saving" : "Save"}
            </button>
          </>
        ) : null}
        {message ? <p className="venue-note">{message}</p> : null}
      </form>
    </main>
  );
}

function SignIn({ access }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      await signInAdmin(email, password);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {access === "forbidden" ? <p className="venue-note">This account cannot edit the directory.</p> : null}
      <label>
        Email
        <input
          type="text"
          value={email}
          autoComplete="username"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          style={secretField}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button className="save" type="submit" disabled={pending || email.trim() === "" || password === ""}>
        {pending ? "Signing in" : "Sign in"}
      </button>
      {message ? <p className="venue-note">{message}</p> : null}
    </form>
  );
}

function Text({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function emptyBar() {
  return {
    venueId: null,
    name: "",
    address: "",
    phone: "",
    website: "",
    instagram: "",
    mapsUrl: "",
    dances: [],
    hours: ADMIN_DAYS.map((weekday) => ({
      weekday,
      closed: false,
      opens: "",
      closes: "",
      originalOpens: "",
      originalCloses: "",
      text: "",
    })),
    schedule: ADMIN_DAYS.map((weekday) => ({ weekday, dances: [] })),
    lastChecked: "",
    confidence: "unconfirmed",
    status: "unknown",
    notes: "",
  };
}

function toggle(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function updateHour(setForm, weekday, patch) {
  setForm((current) => ({
    ...current,
    hours: current.hours.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)),
  }));
}

const secretField = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--ink)",
  font: "inherit",
  textTransform: "none",
  letterSpacing: 0,
};

function updateSchedule(setForm, weekday, dance) {
  setForm((current) => ({
    ...current,
    schedule: current.schedule.map((day) =>
      day.weekday === weekday ? { ...day, dances: toggle(day.dances, dance) } : day,
    ),
  }));
}
