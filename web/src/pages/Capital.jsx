import { ArrowLeft, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useCapitals } from "../lib/directory.js";
import { hoursAreCurrent } from "../lib/hoursFreshness.js";
import { CONTINENTS, DANCES } from "../lib/filterCapitals.js";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Capital() {
  const { id } = useParams();
  const { status, capitals, error } = useCapitals();
  const capital = capitals.find((item) => item.id === id);

  if (status === "loading") {
    return (
      <main className="wrap detail">
        <Back />
        <p className="count">Loading the directory.</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="wrap detail">
        <Back />
        <h1>Directory unavailable</h1>
        <p className="lede">{error}</p>
      </main>
    );
  }

  if (!capital) {
    return (
      <main className="wrap detail">
        <Back />
        <h1>Not on the list</h1>
        <p className="lede">This capital is not in the directory.</p>
      </main>
    );
  }

  const continent = CONTINENTS.find((item) => item.id === capital.continent);
  const venues = Array.isArray(capital.venues) && capital.venues.length > 0
    ? capital.venues
    : capital.venue
      ? [capital.venue]
      : [];

  return (
    <main className="detail">
      <div className="wrap detail-top">
        <Back />
      </div>
      <section className="detail-hero">
        <img src={capital.image} alt="" />
        <span className="card-shade" aria-hidden="true" />
        <div className="wrap detail-hero-copy">
          <p className="kicker">{continent?.name}</p>
          <h1>{capital.city}</h1>
          <p>{capital.country}</p>
        </div>
      </section>
      <div className="wrap">
        {venues.length > 0
          ? venues.map((venue, index) => (
              <Venue key={venue.id ?? `${venue.name}-${index}`} venue={venue} />
            ))
          : <ComingSoon />}
      </div>
    </main>
  );
}

function Back() {
  return (
    <Link className="back" to="/">
      <ArrowLeft size={16} aria-hidden="true" />
      Directory
    </Link>
  );
}

function ComingSoon() {
  return (
    <p className="soon">Coming soon. This capital is on the map. The bar is not listed yet.</p>
  );
}

const HOUR_ORDER = [1, 2, 3, 4, 5, 6, 0];

function Venue({ venue }) {
  const dances = venue.dances.map(danceName).join(" · ");
  const hours = venue.hours ?? [];
  const byDay = new Map(hours.map((row) => [row.weekday, row.text]));
  const hoursCurrent = hoursAreCurrent(venue.sourceChecked);

  return (
    <section className="venue">
      <p className="kicker">{statusText(venue.status)}</p>
      <h2>{venue.name}</h2>
      <p className="venue-dances">{dances}</p>
      {danceMention(venue) ? <p className="venue-note">{danceMention(venue)}</p> : null}
      {venue.address ? <p className="venue-address">{venue.address}</p> : null}
      {venue.phone ? <p className="venue-address">{venue.phone}</p> : null}
      {venue.website ? (
        <p>
          <a href={venue.website}>{venue.website.replace(/^https:\/\//, "")}</a>
        </p>
      ) : null}
      {venue.instagram ? (
        <p>
          <a href={venue.instagram}>{venue.instagram.replace(/^https:\/\//, "")}</a>
        </p>
      ) : null}
      {venue.mapsUrl ? (
        <a className="map-link" href={venue.mapsUrl} target="_blank" rel="noreferrer">
          <MapPin size={16} aria-hidden="true" />
          Open in Google Maps
        </a>
      ) : null}
      {hours.length > 0 ? (
        hoursCurrent ? (
          <>
            <h3>Door hours</h3>
            <ul className="nights">
              {HOUR_ORDER.map((weekday) => (
                <li key={weekday}>
                  <span>{WEEKDAYS[weekday]}</span>
                  <span>{hourLabel(byDay.get(weekday))}</span>
                </li>
              ))}
            </ul>
            <p className="venue-note">
              {sourceLabel(venue)}. Last checked: {checkedLabel(venue.sourceChecked)}.{venue.status === "operating" ? " The place is operating." : ""} “Closed that day” means the door stays shut that weekday. It does not mean the business
              has shut down.
              {hoursCaveat(venue.sourceNote)}
            </p>
            <DanceSchedule nightDances={venue.nightDances} />
          </>
        ) : (
          <>
            <h3>Door hours</h3>
            <p className="venue-note">{staleHoursNote(venue)}</p>
          </>
        )
      ) : null}
    </section>
  );
}

function DanceSchedule({ nightDances }) {
  const rows = nightDances ?? [];
  return (
    <>
      <h3>Dance schedule</h3>
      <ul className="nights">
        {HOUR_ORDER.map((weekday) => {
          const names = rows
            .filter((row) => row.weekday === weekday)
            .map((row) => danceName(row.dance));
          return (
            <li key={weekday}>
              <span>{WEEKDAYS[weekday]}</span>
              <span>{names.length > 0 ? names.join(" · ") : "Not confirmed"}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function staleHoursNote(venue) {
  const recorded = sourceLabel(venue);
  if (recorded === "Source: not recorded") {
    return "No source is recorded, so these door hours are not listed as tonight’s schedule.";
  }
  const name = recorded.replace(/^Source: /, "");
  return `${name}, checked ${checkedLabel(venue.sourceChecked)}. That check is old, so these door hours are not listed as tonight’s schedule.`;
}

function danceMention(venue) {
  const recorded =
    (venue.sources ?? []).some((source) => source.kind === "google_maps") ||
    venue.source === "google_maps";
  if (!recorded) return "";
  const names = (venue.dances ?? []).map(danceName);
  if (names.length === 0) return "";
  if (names.length === 1) {
    return `${names[0]} is mentioned in Google reviews, but a day-by-day dance schedule could not be confirmed.`;
  }
  const list =
    names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  return `${list} are mentioned in Google reviews, but a day-by-day dance schedule could not be confirmed.`;
}

function sourceLabel(venue) {
  const kinds = (venue.sources ?? []).map((source) => source.kind);
  const labels = [
    kinds.includes("google_maps") || venue.source === "google_maps" ? "Google Maps" : null,
    kinds.includes("website") || venue.website ? "Website" : null,
    kinds.includes("instagram") || venue.instagram ? "Instagram" : null,
  ].filter(Boolean);
  return labels.length > 0 ? `Source: ${labels.join(" · ")}` : "Source: not recorded";
}

function hoursCaveat(note) {
  if (!note) return "";
  const match = note.match(
    /((?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)[^.]*Google says (?:those )?hours might differ)\./,
  );
  return match ? ` ${match[1]}.` : "";
}

function checkedLabel(iso) {
  if (!iso) return "the listed date";
  const [year, month, day] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function hourLabel(text) {
  if (!text) return "—";
  if (text === "Closed") return "Closed that day";
  return text;
}

function danceName(id) {
  return DANCES.find((dance) => dance.id === id)?.name ?? id;
}

function statusText(status) {
  if (status === "operating") return "Operating";
  if (status === "planned") return "Opening soon";
  if (status === "temporarily_closed") return "Temporarily closed";
  if (status === "unknown") return "Not confirmed";
  return "Permanently closed";
}
