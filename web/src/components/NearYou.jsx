import { useState } from "react";
import { Link } from "react-router-dom";
import { tonightBarPath } from "../lib/barAnchor.js";
import { cityCardPath } from "../lib/filterCapitals.js";
import { matchRegisteredPlace, requestCoordinates, reverseGeocode } from "../lib/location.js";

export default function NearYou({ capitals }) {
  const [phase, setPhase] = useState("idle");
  const [place, setPlace] = useState(null);
  const match = phase === "ready" ? matchRegisteredPlace(capitals, place) : null;

  async function onLocate() {
    setPhase("pending");
    setPlace(null);
    let coords;
    try {
      coords = await requestCoordinates();
    } catch (error) {
      setPhase(error?.code === 1 ? "denied" : "failed");
      return;
    }
    const found = await reverseGeocode(coords.lat, coords.lng);
    if (!found) {
      setPhase("failed");
      return;
    }
    setPlace(found);
    setPhase("ready");
  }

  return (
    <section className="locate" aria-label="Use my location">
      <button type="button" className="locate-btn" onClick={onLocate} disabled={phase === "pending"}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
        </svg>
        {phase === "pending" ? "Checking location" : "Use My Location"}
      </button>
      <p className="hint"><span className="location-note-original">The browser asks only after this click. The city lookup is not saved.</span><span className="home-mobile-location-note">버튼을 누르면 위치 권한을 물어봐요. 위치는 저장되지 않아요.</span></p>
      {phase === "denied" ? <p className="empty">Location wasn't allowed. Search by city or bar.</p> : null}
      {phase === "failed" ? <p className="empty">Location couldn't be used. Search by city or bar.</p> : null}
      {match ? <LocationResult match={match} /> : null}
    </section>
  );
}

function LocationResult({ match }) {
  const listed = match.city;
  const bars = (listed?.venues ?? []).filter((venue) => venue?.id && String(venue.name ?? "").trim() !== "");
  if (match.kind === "city" && bars.length > 0) {
    return (
      <div className="locate-result">
        <p>Listed bars in {listed.city}.</p>
        <BarLinks city={listed} bars={bars} />
      </div>
    );
  }
  if (match.kind === "city") {
    return <p className="empty">No bar is listed in {listed.city}. Search by city or bar.</p>;
  }
  if (match.kind === "capital" && bars.length > 0) {
    return (
      <div className="locate-result">
        <p>
          {match.queriedCity} is not listed. The registered capital is {listed.city}. These are {listed.city}'s listed bars, not bars at your current location.
        </p>
        <BarLinks city={listed} bars={bars} />
      </div>
    );
  }
  if (match.kind === "capital") {
    return (
      <p className="empty">
        {match.queriedCity} is not listed. The registered capital is {listed.city}, and no bar is listed there. Search by city or bar.
      </p>
    );
  }
  return <p className="empty">That place is not in the directory. Search by city or bar.</p>;
}

function BarLinks({ city, bars }) {
  return (
    <>
      <p>
        <Link to={cityCardPath(city.id)}>{city.city}</Link>
      </p>
      <ul className="country-list">
        {bars.map((venue) => (
          <li key={venue.id}>
            <Link to={tonightBarPath(city.id, venue.id)}>
              <span className="place-name">{venue.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
