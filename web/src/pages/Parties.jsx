import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DANCES } from "../lib/filterCapitals.js";
import {
  applyPartyHead,
  danceLabel,
  filterParties,
  loadPublicParties,
  partySchedule,
} from "../lib/partyPublic.js";

export default function Parties() {
  const [status, setStatus] = useState("loading");
  const [parties, setParties] = useState([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [dance, setDance] = useState("");

  useEffect(() => {
    applyPartyHead();
    let live = true;
    loadPublicParties()
      .then((rows) => {
        if (!live) return;
        setParties(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (!live) return;
        setParties([]);
        setStatus("ready");
      });
    return () => {
      live = false;
    };
  }, []);

  const visible = filterParties(parties, { city, country, dance });

  return (
    <main className="wrap">
      <h1>Parties</h1>
      <p className="lede">Upcoming Latin parties.</p>
      <label className="city-search">
        City
        <input value={city} onChange={(event) => setCity(event.target.value)} />
      </label>
      <label className="city-search">
        Country
        <input value={country} onChange={(event) => setCountry(event.target.value)} />
      </label>
      <div className="filters">
        <fieldset className="filter">
          <legend>Dance</legend>
          <div className="pills dance-pills">
            <button type="button" aria-pressed={dance === ""} onClick={() => setDance("")}>All</button>
            {DANCES.map((item) => (
              <button key={item.id} type="button" aria-pressed={dance === item.id} onClick={() => setDance(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {status === "loading" ? <p className="count">Loading.</p> : null}
      {status === "ready" && visible.length === 0 ? <p className="count">No parties to show.</p> : null}
      {visible.map((party) => {
        const when = partySchedule(party);
        return (
          <article className="venue" key={party.id}>
            <h2><Link to={`/parties/${party.id}`}>{party.name}</Link></h2>
            <p className="venue-address">{party.venueName}</p>
            <p className="count">{[party.city, party.country].filter(Boolean).join(", ")}</p>
            <p className="count">{[when.date, when.time].filter(Boolean).join(", ")}</p>
            {danceLabel(party.dances) ? <p className="venue-dances">{danceLabel(party.dances)}</p> : null}
          </article>
        );
      })}
    </main>
  );
}
