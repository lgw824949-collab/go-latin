import { useEffect, useState } from "react";
import { httpUrl } from "../lib/sources.js";
import {
  genreLabel,
  isSimplePartyCity,
  simplePartySchedule,
} from "../lib/simpleParty.js";
import { watchSimpleParties } from "../lib/simplePartyRefresh.js";

export default function SimpleCityParties({ capitalId }) {
  // Route changes can reuse this component: reset the old city's rows/errors
  // before the new city's first effect runs, not one render later.
  return <CityPartyList key={capitalId} capitalId={capitalId} />;
}

function CityPartyList({ capitalId }) {
  const [status, setStatus] = useState("loading");
  const [parties, setParties] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSimplePartyCity(capitalId)) return undefined;
    return watchSimpleParties(capitalId, window, state => {
      setStatus(state.status);
      setParties(state.parties);
      setError(state.error);
    });
  }, [capitalId]);

  if (!isSimplePartyCity(capitalId)) return null;

  return (
    <section className="city-board" aria-labelledby="simple-parties-title">
      <h2 id="simple-parties-title">Parties</h2>
      {status === "error" ? <p role="alert">{error}</p> : null}
      {status === "loading" ? <p className="count">Loading.</p> : null}
      {status === "ready" && parties.length === 0 ? (
        <p className="count">No upcoming parties listed.</p>
      ) : null}
      {parties.map((party) => {
        const when = simplePartySchedule(party);
        const sns = httpUrl(party.snsUrl);
        return (
          <article className="venue" key={party.id}>
            {party.posterUrl ? <PartyPoster key={party.posterUrl} party={party} /> : null}
            <p className="count">{[when.date, when.time].filter(Boolean).join(", ")}</p>
            {genreLabel(party.genre) ? <p className="venue-dances">{genreLabel(party.genre)}</p> : null}
            <h2>{party.venueName}</h2>
            {sns ? (
              <p>
                <a href={sns} rel="noreferrer">{sns.replace(/^https:\/\//, "")}</a>
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

export function PartyPoster({ party }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status">Poster unavailable. Please check the party SNS link.</p>
    : <p><img src={party.posterUrl} alt={`${party.venueName} poster`} width="320"
      style={{ maxWidth: "100%", height: "auto" }} onError={() => setFailed(true)} /></p>;
}
