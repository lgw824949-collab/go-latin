import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  applyPartyHead,
  danceLabel,
  isUpcoming,
  loadPublicParty,
  partyHead,
  partySchedule,
} from "../lib/partyPublic.js";

export default function PartyDetail() {
  const { id } = useParams();
  const [status, setStatus] = useState("loading");
  const [party, setParty] = useState(null);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    applyPartyHead();
    let live = true;
    setStatus("loading");
    setPosterFailed(false);
    loadPublicParty(id)
      .then((row) => {
        if (!live) return;
        setParty(row);
        setStatus("ready");
        if (row?.name) applyPartyHead(partyHead(`${row.name} | Go Latin`).title);
      })
      .catch(() => {
        if (!live) return;
        setParty(null);
        setStatus("ready");
      });
    return () => {
      live = false;
    };
  }, [id]);

  const when = party ? partySchedule(party) : null;
  const poster = party?.posterUrl && !posterFailed ? party.posterUrl : "";

  return (
    <main className="wrap">
      <p><Link to="/parties">Parties</Link></p>
      {status === "loading" ? <p className="count">Loading.</p> : null}
      {status === "ready" && !party ? <p className="count">This party is not listed.</p> : null}
      {party ? (
        <article className="venue">
          <h1>{party.name}</h1>
          {!isUpcoming(party) ? <p className="venue-note">This party has ended.</p> : null}
          {poster ? (
            <img
              src={poster}
              alt=""
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
              onError={() => setPosterFailed(true)}
            />
          ) : null}
          <p className="venue-address">{party.venueName}</p>
          <p className="count">{[party.city, party.country].filter(Boolean).join(", ")}</p>
          <p className="count">{[when.date, when.time].filter(Boolean).join(", ")}</p>
          {danceLabel(party.dances) ? <p className="venue-dances">{danceLabel(party.dances)}</p> : null}
          {party.officialUrl ? (
            <p><a href={party.officialUrl} rel="noreferrer">Official source</a></p>
          ) : null}
        </article>
      ) : null}
    </main>
  );
}
