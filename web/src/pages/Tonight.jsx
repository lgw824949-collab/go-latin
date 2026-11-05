import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadCapital } from "../lib/directory.js";
import { DANCES } from "../lib/filterCapitals.js";
import { tonightBarPath } from "../lib/barAnchor.js";
import { loadTonightCities, tonightCityParam } from "../lib/tonightData.js";
import { publicBarCard, sevenDaySchedule, tonightHoursStatus, tonightLocalTime } from "../lib/tonight.js";
import { httpUrl } from "../lib/sources.js";
import { useLocalNow } from "../lib/useLocalNow.js";

export default function Tonight() {
  const now = useLocalNow();
  const [params, setParams] = useSearchParams();
  const cityId = tonightCityParam(params.get("city"));
  const dance = DANCES.some((item) => item.id === params.get("dance")) ? params.get("dance") : null;
  const [cities, setCities] = useState({ status: "loading", rows: [], error: "" });
  const [city, setCity] = useState({ id: cityId, status: cityId ? "loading" : "ready", row: null, error: "" });
  const shown = city.id === cityId ? city : { id: cityId, status: "loading", row: null, error: "" };

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
    if (!cityId) {
      setCity({ id: null, status: "ready", row: null, error: "" });
      return undefined;
    }
    let live = true;
    setCity({ id: cityId, status: "loading", row: null, error: "" });
    loadCapital(cityId)
      .then((row) => {
        if (live) setCity({ id: cityId, status: "ready", row, error: "" });
      })
      .catch((error) => {
        if (live) setCity({ id: cityId, status: "error", row: null, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [cityId]);

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

  const selected = cities.rows.find((item) => item.id === cityId) ?? shown.row;
  const clock = tonightLocalTime(shown.row, now);
  const cards = (shown.row?.venues ?? []).flatMap((venue) => {
    const card = publicBarCard(venue);
    if (!card) return [];
    return [{
      ...venue,
      dances: card.dances,
      website: httpUrl(venue.website),
      instagram: httpUrl(venue.instagram),
      statusText: card.statusText,
      tonight: tonightHoursStatus(venue, clock),
      schedule: sevenDaySchedule(venue, clock),
    }];
  });
  const visible = dance ? cards.filter((card) => card.dances.includes(dance)) : cards;

  return (
    <main className="wrap tonight">
      <p className="kicker">Tonight</p>
      <h1>Explore Latin Bars</h1>
      <p className="lede">Local opening hours and the next 7 days. Check the official page for changes.</p>
      {shown.status === "ready" && shown.row ? (
        <p className="count">
          Local time: {clock ? `${clock.label} · ${clock.time} (${clock.timeZone})` : "Not confirmed"}
        </p>
      ) : null}
      <label className="tonight-city">
        City
        <select value={cityId && selected ? cityId : ""} onChange={(event) => setCityId(event.target.value)}>
          {selected ? null : <option value="" disabled hidden />}
          {cities.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.city}
            </option>
          ))}
        </select>
      </label>
      <div className="pills dance-pills" role="group" aria-label="Dance">
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
      {shown.status === "error" ? (
        <p className="empty">{shown.error}</p>
      ) : shown.status !== "ready" ? (
        <p className="count">Loading tonight.</p>
      ) : !cityId ? (
        <p className="empty">Choose a city.</p>
      ) : !shown.row ? (
        <p className="empty">This capital is not in the directory.</p>
      ) : visible.length === 0 ? (
        <p className="empty">
          {cards.length
            ? `No ${DANCES.find((item) => item.id === dance)?.name} floor is listed in ${selected.city}.`
            : `No bar is listed in ${selected.city} yet.`}
        </p>
      ) : (
        <ul className="tonight-list">
          {visible.map((card) => (
            <li key={card.id}>
              <h2>{card.name}</h2>
              <p>{selected.country}</p>
              {card.statusText ? <p>{card.statusText}</p> : null}
              {card.tonight.badge ? (
                <p className={card.tonight.openNow ? "tonight-now" : "tonight-later"}>
                  {card.tonight.badge}{card.tonight.hoursLabel ? ` · ${card.tonight.hoursLabel}` : ""}
                </p>
              ) : card.tonight.statusText !== card.statusText ? (
                <p>Tonight: {card.tonight.statusText}</p>
              ) : null}
              <p>Music tonight: {card.tonight.danceText || "Not confirmed"}</p>
              {card.dances.length > 0 ? <p>Registered genres: {card.dances.map(danceName).join(" · ")}</p> : null}
              {card.schedule.length > 0 ? (
                <details>
                  <summary>7-day opening schedule</summary>
                  <dl>
                    {card.schedule.map((day) => (
                      <div key={day.date}>
                        <dt><time dateTime={day.date}>{day.label}</time></dt>
                        <dd>{day.hoursLabel}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>Hours are local; (+1 day) means closing after midnight. Recurring hours, not confirmed event dates.</p>
                </details>
              ) : null}
              {card.website ? <p><a href={card.website} target="_blank" rel="noreferrer">Website</a></p> : null}
              {card.instagram ? <p><a href={card.instagram} target="_blank" rel="noreferrer">Instagram</a></p> : null}
              <Link to={tonightBarPath(selected.id, card.id, dance)} state={{ from: `/tonight?${params}` }}>View bar</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function danceName(id) {
  return DANCES.find((dance) => dance.id === id)?.name ?? id;
}
