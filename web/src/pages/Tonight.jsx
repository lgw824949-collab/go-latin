import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DANCES } from "../lib/filterCapitals.js";
import { assessVenue, cityClock, filterTonight } from "../lib/tonight.js";
import { loadTonightCities, loadTonightCity } from "../lib/tonightData.js";

export default function Tonight() {
  const [params, setParams] = useSearchParams();
  const cityId = params.get("city") || "hanoi";
  const dance = DANCES.some((item) => item.id === params.get("dance")) ? params.get("dance") : null;
  const [cities, setCities] = useState({ status: "loading", rows: [], error: "" });
  const [city, setCity] = useState({ status: "loading", row: null, error: "" });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let live = true;
    loadTonightCities()
      .then((rows) => {
        if (live) setCities({ status: "ready", rows, error: "" });
      })
      .catch((error) => {
        if (live) setCities({ status: "error", rows: [], error: error.message });
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    setCity({ status: "loading", row: null, error: "" });
    loadTonightCity(cityId)
      .then((row) => {
        if (live) setCity({ status: "ready", row, error: "" });
      })
      .catch((error) => {
        if (live) setCity({ status: "error", row: null, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [cityId]);

  useEffect(() => {
    let timer;
    const schedule = () => {
      const delay = 60000 - (Date.now() % 60000) || 60000;
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  function setCityId(value) {
    const next = new URLSearchParams(params);
    next.set("city", value);
    setParams(next);
  }

  function setDance(value) {
    const next = new URLSearchParams(params);
    if (value) next.set("dance", value);
    else next.delete("dance");
    setParams(next);
  }

  const selected = cities.rows.find((item) => item.id === cityId) ?? city.row;
  const clock = selected?.timezone ? cityClock(selected.timezone, now) : null;
  const cards = clock
    ? (city.row?.venues ?? []).map((venue) => ({
        ...venue,
        ...assessVenue(venue, clock),
      }))
    : [];
  const visible = filterTonight(cards, dance);

  return (
    <main className="wrap tonight">
      <p className="kicker">Tonight</p>
      <h1>Tonight</h1>
      <p className="lede">Latin bars you can reach tonight.</p>
      <label className="tonight-city">
        City
        <select value={cityId} onChange={(event) => setCityId(event.target.value)}>
          {cities.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.city}
            </option>
          ))}
        </select>
      </label>
      {clock ? <p className="count">{selected.city} · {clock.label}</p> : null}
      <div className="pills" role="group" aria-label="Dance">
        <button type="button" aria-pressed={dance === null} onClick={() => setDance(null)}>
          All
        </button>
        {DANCES.map((item) => (
          <button key={item.id} type="button" aria-pressed={dance === item.id} onClick={() => setDance(item.id)}>
            {item.name}
          </button>
        ))}
      </div>
      {cities.status === "error" ? <p className="empty">{cities.error}</p> : null}
      {city.status === "error" ? (
        <p className="empty">{city.error}</p>
      ) : city.status !== "ready" ? (
        <p className="count">Loading tonight.</p>
      ) : !city.row ? (
        <p className="empty">This capital is not in the directory.</p>
      ) : !clock ? (
        <p className="count">Loading tonight.</p>
      ) : visible.length === 0 ? (
        <p className="empty">
          {city.row?.venues.length
            ? `No ${DANCES.find((item) => item.id === dance)?.name} schedule is confirmed in ${selected.city} tonight.`
            : `No bar is listed in ${selected.city} yet.`}
        </p>
      ) : (
        <ul className="tonight-list">
          {visible.map((card) => (
            <li key={card.id}>
              <h2>{card.name}</h2>
              <p>{selected.country}</p>
              {card.badge ? <p className={card.badge === "OPEN NOW" ? "tonight-now" : "tonight-later"}>{card.badge}</p> : null}
              {card.hoursLabel ? <p>{card.hoursLabel}</p> : null}
              {card.statusText ? <p>{card.statusText}</p> : null}
              {card.danceText ? <p>{card.danceText}</p> : null}
              {card.danceConfirmed ? <p className="kicker">Confirmed</p> : null}
              <Link to={`/c/${selected.id}`}>View bar</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
