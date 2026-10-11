import { Link } from "react-router-dom";
import { DANCES } from "../lib/filterCapitals.js";

export default function CapitalCard({ capital }) {
  return (
    <Link className="card" to={`/c/${capital.id}`}>
      <img src={capital.image} alt="" />
      <span className="card-shade" aria-hidden="true" />
      <span className="card-body">
        <span className="card-city">{capital.city}</span>
        <span className="card-country">{capital.country}</span>
        <span className="card-status">{statusLabel(capital)}</span>
      </span>
    </Link>
  );
}

function statusLabel(capital) {
  const venues = Array.isArray(capital.venues) && capital.venues.length > 0
    ? capital.venues
    : capital.venue
      ? [capital.venue]
      : [];
  if (venues.length === 0) return "Coming soon";
  if (venues.length === 1) return oneVenueStatus(venues[0]);
  return manyVenueStatus(venues);
}

function oneVenueStatus(venue) {
  if (venue.status === "permanently_closed") return "Permanently closed";
  if (venue.status === "planned") return "Opening soon";
  return venue.dances
    .map((id) => DANCES.find((dance) => dance.id === id)?.name ?? id)
    .join(" · ");
}

function manyVenueStatus(venues) {
  const listed = venues.filter((venue) => venue.status !== "permanently_closed" && venue.status !== "planned");
  if (listed.length > 0) return danceLabel(listed.flatMap((venue) => venue.dances ?? []));
  if (venues.some((venue) => venue.status === "planned")) return "Opening soon";
  return "Permanently closed";
}

function danceLabel(ids) {
  const rank = new Map(DANCES.map((dance, index) => [dance.id, index]));
  const unique = [];
  for (const id of ids) {
    if (!unique.includes(id)) unique.push(id);
  }
  unique.sort((a, b) => (rank.get(a) ?? 9) - (rank.get(b) ?? 9) || String(a).localeCompare(String(b)));
  return unique
    .map((id) => DANCES.find((dance) => dance.id === id)?.name ?? id)
    .join(" · ");
}
