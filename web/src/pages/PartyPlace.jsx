import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PartyList } from "../components/CityParties.jsx";
import CitySponsored from "../components/CitySponsored.jsx";
import { loadCityAds, partiesWithoutAds } from "../lib/cityAds.js";
import { applyPartyHead, loadPlaceParties, partyHead } from "../lib/partyPublic.js";

export default function PartyPlace() {
  const { id } = useParams();
  const [status, setStatus] = useState("loading");
  const [place, setPlace] = useState(null);
  const [parties, setParties] = useState([]);
  const [ads, setAds] = useState([]);

  useEffect(() => {
    applyPartyHead();
    let live = true;
    setStatus("loading");
    Promise.all([
      loadPlaceParties(id).catch(() => ({ place: null, parties: [] })),
      loadCityAds(id).catch(() => []),
    ]).then(([result, sponsored]) => {
      if (!live) return;
      setPlace(result.place);
      setParties(result.parties);
      setAds(result.place ? sponsored : []);
      setStatus("ready");
      if (result.place?.city) applyPartyHead(partyHead(`${result.place.city} parties | Go Latin`).title);
    });
    return () => {
      live = false;
    };
  }, [id]);

  const where = [place?.city, place?.adminArea, place?.country].filter(Boolean).join(", ");
  const listed = partiesWithoutAds(parties, ads);

  return (
    <main className="wrap">
      <p><Link to="/parties">Parties</Link></p>
      {status === "loading" ? <p className="count">Loading.</p> : null}
      {status === "ready" && !place ? <p className="count">This city is not listed.</p> : null}
      {place ? (
        <>
          <h1>{place.city}</h1>
          {where ? <p className="lede">{where}</p> : null}
          {status === "ready" && listed.length === 0 && ads.length === 0 ? <p className="count">No parties listed.</p> : null}
          <CitySponsored ads={ads} />
          <PartyList parties={listed} />
        </>
      ) : null}
    </main>
  );
}
