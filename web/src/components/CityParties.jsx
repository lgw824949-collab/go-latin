import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CitySponsored from "./CitySponsored.jsx";
import { loadCapitalCityAds, partiesWithoutAds } from "../lib/cityAds.js";
import { danceLabel, loadCapitalParties, partySchedule } from "../lib/partyPublic.js";

export default function CityParties({ capitalId }) {
  const [status, setStatus] = useState("loading");
  const [parties, setParties] = useState([]);
  const [ads, setAds] = useState([]);

  useEffect(() => {
    let live = true;
    setStatus("loading");
    Promise.all([
      loadCapitalParties(capitalId).catch(() => []),
      loadCapitalCityAds(capitalId).catch(() => []),
    ]).then(([rows, sponsored]) => {
      if (!live) return;
      setParties(rows);
      setAds(sponsored);
      setStatus("ready");
    });
    return () => {
      live = false;
    };
  }, [capitalId]);

  const listed = partiesWithoutAds(parties, ads);

  return (
    <section aria-label="Parties">
      <h2>Parties</h2>
      {status === "loading" ? <p className="count">Loading.</p> : null}
      {status === "ready" && listed.length === 0 && ads.length === 0 ? <p className="count">No parties listed.</p> : null}
      <CitySponsored ads={ads} />
      <PartyList parties={listed} />
    </section>
  );
}

export function PartyList({ parties }) {
  return parties.map((party) => {
    const when = partySchedule(party);
    return (
      <article className="venue" key={party.id}>
        <h2><Link to={`/parties/${party.id}`}>{party.name}</Link></h2>
        <p className="venue-address">{party.venueName}</p>
        <p className="count">{[when.date, when.time].filter(Boolean).join(", ")}</p>
        {danceLabel(party.dances) ? <p className="venue-dances">{danceLabel(party.dances)}</p> : null}
      </article>
    );
  });
}
