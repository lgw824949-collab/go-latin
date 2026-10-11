import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { signInAdmin, signOutAdmin, watchAdminSession } from "../lib/admin.js";
import {
  DANCES,
  STATUS_FILTERS,
  VERIFICATION_FILTERS,
  checkedLabel,
  danceNames,
  filterBars,
  loadManagedBars,
  sourceSummary,
  statusLabel,
  verificationOf,
} from "../lib/manage.js";

const EMPTY = { query: "", city: "", dance: "", status: "", verification: "" };

export default function Manage() {
  const [access, setAccess] = useState("checking");
  const [bars, setBars] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => watchAdminSession(setAccess), []);

  useEffect(() => {
    if (access !== "admin") return undefined;
    let live = true;
    loadManagedBars()
      .then((rows) => {
        if (!live) return;
        setBars(rows);
        setStatus("ready");
      })
      .catch((error) => {
        if (!live) return;
        setStatus("error");
        setMessage(error.message);
      });
    return () => {
      live = false;
    };
  }, [access]);

  const visible = useMemo(() => filterBars(bars, filters), [bars, filters]);
  const cities = useMemo(() => {
    const seen = new Map();
    for (const bar of bars) {
      if (bar.capitalId) seen.set(bar.capitalId, bar.city);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [bars]);

  function setFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (access !== "admin") {
    return (
      <main className="wrap admin">
        <h1>Bar management</h1>
        {access === "checking" ? <p className="count">Checking sign-in.</p> : <SignIn access={access} />}
      </main>
    );
  }

  return (
    <main className="wrap admin">
      <h1>Bar management</h1>
      <button type="button" className="save" onClick={() => signOutAdmin().catch((error) => setMessage(error.message))}>
        Log out
      </button>
      <p className="count">{bars.length} venues</p>
      <p>
        <Link className="save" to="/admin/new">+ Add BAR</Link>
      </p>
      {status === "error" ? <p className="venue-note">{message}</p> : null}
      <label>
        Search bar
        <input
          type="text"
          value={filters.query}
          placeholder="Search bar or city..."
          onChange={(event) => setFilter("query", event.target.value)}
        />
      </label>
      <div className="filters">
        <Filter label="City" value={filters.city} onChange={(value) => setFilter("city", value)}>
          <option value="">All</option>
          {cities.map(([id, city]) => (
            <option key={id} value={id}>{city}</option>
          ))}
        </Filter>
        <Filter label="Dance" value={filters.dance} onChange={(value) => setFilter("dance", value)}>
          <option value="">All</option>
          {DANCES.map((dance) => (
            <option key={dance.id} value={dance.id}>{dance.name}</option>
          ))}
        </Filter>
        <Filter label="Status" value={filters.status} onChange={(value) => setFilter("status", value)}>
          {STATUS_FILTERS.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </Filter>
        <Filter label="Verification" value={filters.verification} onChange={(value) => setFilter("verification", value)}>
          {VERIFICATION_FILTERS.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </Filter>
      </div>
      {visible.length === bars.length ? null : (
        <p className="count">{visible.length} of {bars.length} venues</p>
      )}
      <ul className="bar-list">
        {visible.map((bar) => {
          const check = verificationOf(bar);
          return (
            <li key={bar.id}>
              <p className="kicker">{bar.city}</p>
              <h2>{bar.name}</h2>
              <p>{bar.country}</p>
              <p>{danceNames(bar.dances) || "No dance type"}</p>
              <p>{statusLabel(bar.status)} · {checkedLabel(bar.lastChecked)} · {check.label}</p>
              <p className="venue-note">
                {flag("Website", bar.website)}
                {" · "}
                {flag("Instagram", bar.instagram)}
                {" · "}
                {flag("Google Maps", bar.mapsUrl)}
                {" · "}
                {flag("Weekly schedule", bar.nightDances.length > 0)}
                {bar.confidence ? ` · ${bar.confidence}` : ""}
              </p>
              {bar.sources.length > 0 ? <p className="venue-note">{sourceSummary(bar.sources)}</p> : null}
              <Link to={`/admin/${bar.capitalId}?venue=${bar.id}`}>Edit</Link>
            </li>
          );
        })}
      </ul>
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

function Filter({ label, value, onChange, children }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function flag(name, present) {
  return `${name} ${present ? "yes" : "no"}`;
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
