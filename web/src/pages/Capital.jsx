import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { barAnchor, barReturnPath, matchingBarAnchor } from "../lib/barAnchor.js";
import { imageCredit } from "../lib/capitalImageCredits.js";
import { applyCityHead } from "../lib/routeHead.js";
import { useCapital } from "../lib/directory.js";
import { CONTINENTS, DANCES, readFilters, venuesForDance } from "../lib/filterCapitals.js";
import { isSimplePartyCity } from "../lib/simpleParty.js";
import SimpleCityParties from "../components/SimpleCityParties.jsx";
import BarProfile from "../components/BarProfile.jsx";
import { releaseFeatureEnabled } from "../lib/releaseFeatures.js";

export default function Capital() {
  const { id } = useParams();
  const { hash, search, state } = useLocation();
  const [params] = useSearchParams();
  const dance = readFilters(params).dance;
  const { status, capital, error } = useCapital(id);
  const allVenues = useMemo(() => listedVenues(capital), [capital]);
  const venues = useMemo(() => venuesForDance(allVenues, dance), [allVenues, dance]);
  const venueKey = venues.map((venue) => venue.id ?? "").join("\n");
  const currentAnchor = matchingBarAnchor(hash, allVenues.map((venue) => venue.id));

  useEffect(() => {
    if (status !== "ready" || !capital) return undefined;
    applyCityHead(capital);
    return undefined;
  }, [status, capital]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    const anchor = matchingBarAnchor(hash, allVenues.map((venue) => venue.id));
    if (!anchor) return undefined;
    document.getElementById(anchor)?.scrollIntoView({ block: "start" });
    return undefined;
  }, [status, hash, venueKey, allVenues]);

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

  const selectedVenue = currentAnchor ? allVenues.find(venue => barAnchor(venue.id) === currentAnchor) : null;
  if (selectedVenue) return <BarProfile key={selectedVenue.id} venue={selectedVenue} capital={capital}
    venues={allVenues} search={search} from={state?.from} />;

  const continent = CONTINENTS.find((item) => item.id === capital.continent);

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
        <PhotoCredit id={capital.id} image={capital.image} />
        {venues.length > 0
          ? <div className="bar-card-grid">{venues.map((venue, index) => (
              <Venue
                key={venue.id ?? `${venue.name}-${index}`}
                venue={venue}
                current={currentAnchor !== "" && currentAnchor === barAnchor(venue.id)}
              />
            ))}</div>
          : allVenues.length > 0
            ? <p className="empty">No {DANCES.find((item) => item.id === dance)?.name} floor listed.</p>
            : <ComingSoon />}
        {releaseFeatureEnabled("quickParties") && isSimplePartyCity(capital.id)
          ? <SimpleCityParties capitalId={capital.id} /> : null}
      </div>
    </main>
  );
}

function Back() {
  const { state } = useLocation();
  const target = barReturnPath(state?.from);
  return (
    <Link className="back" to={target}>
      <ArrowLeft size={16} aria-hidden="true" />
      {target.startsWith("/tonight") ? "Tonight" : "Directory"}
    </Link>
  );
}

function listedVenues(capital) {
  const rows = Array.isArray(capital?.venues) && capital.venues.length > 0
    ? capital.venues
    : capital?.venue
      ? [capital.venue]
      : [];
  return rows.filter((venue) => venue?.status !== "permanently_closed");
}

function PhotoCredit({ id, image }) {
  const credit = imageCredit(id, image);
  if (!credit) return null;
  return (
    <p className="lede">
      {`Photo: ${credit.author}, `}
      <a href={credit.licenseUrl}>{credit.license}</a>
      {". "}
      <a href={credit.page}>Wikimedia Commons</a>
    </p>
  );
}

function ComingSoon() {
  return (
    <p className="soon">Coming soon. This capital is on the map. The bar is not listed yet.</p>
  );
}

function Venue({ venue, current = false }) {
  const location = useLocation();
  const dances = confirmedDanceNames(venue.dances).join(" · ");
  const anchor = barAnchor(venue.id);
  return (
    <section className={current ? "venue is-current" : "venue"} id={anchor || undefined}>
      <Link className="venue-row-link" to={`${location.pathname}${location.search}#${anchor}`} state={location.state}>
      <div className="bar-row-copy">
      <h2>{venue.name}</h2>
      {dances ? <p className="venue-dances">{dances}</p> : null}
      </div>
      <span className="bar-row-arrow" aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function confirmedDanceNames(ids) {
  return DANCES.filter((dance) => (ids ?? []).includes(dance.id)).map((dance) => dance.name);
}

