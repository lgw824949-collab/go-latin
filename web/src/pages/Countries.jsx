import { CITY_ARTWORK as ASIA_CITY_ART } from "../lib/cityArtwork.js";
import { ASIA_COUNTRY_PHOTOS } from "../lib/asiaCountryPhotos.js";
import AsiaCountryPhoto from "../components/AsiaCountryPhoto.jsx";
import { httpUrl } from "../lib/sources.js";
import { publicCities } from "../lib/publicCities.js";
import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrowseSteps from "../components/BrowseSteps.jsx";
import ContinentCards from "../components/ContinentCards.jsx";
import { useCapitals } from "../lib/directory.js";
import {
  BROWSE_CONTINENTS,
  continentName,
  countriesInContinent,
  countryPlaceCounts,
  countrySearchTarget,
  listCountries,
  matchingCountries,
} from "../lib/countries.js";

export default function Countries() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  function setQuery(value) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    setParams(next, { replace: true });
  }
  const navigate = useNavigate();
  const { status, capitals, error } = useCapitals();
  const requested = params.get("continent") ?? "";
  const continent = BROWSE_CONTINENTS.includes(requested) ? requested : "";
  const countries = useMemo(() => {
    const listed = listCountries(capitals);
    const scoped = continent ? countriesInContinent(listed, continent) : listed;
    return query.trim() ? matchingCountries(scoped, query) : scoped;
  }, [capitals, continent, query]);

  // This opt-in mode leaves the existing directory unchanged.
  if (params.get("published") === "1") {
    const cities = publicCities(capitals).filter(city => !query.trim() || (city.city + " " + city.country).toLowerCase().includes(query.trim().toLowerCase()));
    return <main className="wrap country-page">
      <p className="crumb"><Link to="/">Directory</Link></p>
      <h1 className="country-title">Cities</h1>
      <form onSubmit={event => event.preventDefault()}><label className="city-search finder">Country or city<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label></form>
      {status === "loading" ? <p className="count">Loading the directory.</p> : status === "error" ? <p role="alert">{error}</p> : <>
        <ul className="country-list">{cities.map(city => <li key={city.id}><Link to={"/c/" + city.id} state={{ from: "/country?" + params.toString() }}><span className="place-name">{city.city}</span><span>{city.country}</span></Link></li>)}</ul>
        {!cities.length ? <p className="empty">{query.trim() ? 'No match for "' + query.trim() + '".' : "No public cities available."}</p> : null}
      </>}
    </main>;
  }

  return (
    <main className={`wrap country-page${continent === "asia" ? " asia-country-page" : ""}`}>
      <p className="crumb"><Link to={continent ? "/country" : "/"}>{continent ? "Continents" : "Directory"}</Link></p>
      <BrowseSteps current={continent ? "Country" : "Continent"} />
      <h1 className="country-title">{continent ? continentName(continent) : "Continents"}</h1>
      {continent === "asia" && !query.trim() ? <AsiaCityCards cities={publicCities(capitals).filter(city => city.continent === "asia")} status={status} error={error} params={params} /> : null}
      {continent === "asia" ? <h2 className="asia-country-heading" id="asia-countries">Browse countries</h2> : null}
      <p className="lede">
        {continent ? "Choose a country. Each one opens its cities." : "Choose a continent, then a country."}
      </p>
      <form onSubmit={(event) => {
        event.preventDefault();
        const target = countrySearchTarget(countries, query);
        if (target) navigate(target);
      }}>
        <label className="city-search finder">
          Country or city
          <input
            type="search"
            value={query}
            placeholder="South Korea or Seoul"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </form>
      {status === "loading" ? <p className="count">Loading the directory.</p> : null}
      {status === "error" ? <p className="empty">{error}</p> : null}
      {status === "ready" && !continent && !query.trim() ? <ContinentCards capitals={capitals} /> : null}
      {status === "ready" && (continent || query.trim()) ? (
        <>
          <p className="count">{countries.length} {countries.length === 1 ? "country" : "countries"}</p>
          {countries.length === 0 ? (
            <p className="empty">No match for "{query.trim()}".</p>
          ) : (
            <ul className={`country-list${continent === "asia" ? " asia-country-grid" : ""}`}>
              {countries.map((country) => (
                <li key={country.slug}>
                  <Link to={`/country/${country.slug}`} className={continent === "asia" ? "asia-country-card" : undefined}>
                    {continent === "asia" ? <AsiaCountryPhoto photo={ASIA_COUNTRY_PHOTOS[country.cities[0]?.id]} city={country.cities[0]?.city} /> : null}
                    <span className="place-name">{country.name}</span>
                    <span className="country-place-count">{placeLabel(country)}</span>
                    {continent === "asia" && countryPlaceCounts(country).bars === 0 ? <span className="asia-country-coming-soon">Coming soon</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {continent === "asia" ? <details className="asia-country-photo-credits"><summary>Photo credits</summary><p>Existing Wikimedia photographs, displayed with a 4:5 crop. Licenses apply to the photos.</p><ul>{countries.map(country => {
            const photo = ASIA_COUNTRY_PHOTOS[country.cities[0]?.id];
            return photo?.src ? <li key={country.slug}>{country.name}: <a href={photo.source} target="_blank" rel="noreferrer">{photo.author}</a> · <a href={photo.licenseUrl || photo.source} target="_blank" rel="noreferrer">{photo.license}</a></li> : null;
          })}</ul></details> : null}
        </>
      ) : null}
    </main>
  );
}

function placeLabel(country) {
  const { cities, bars } = countryPlaceCounts(country);
  const cityText = cities === 1 ? "1 city" : `${cities} cities`;
  const barText = bars === 0 ? "No bar listed" : bars === 1 ? "1 bar" : `${bars} bars`;
  return `${cityText} · ${barText}`;
}

function AsiaCityCards({ cities, status, error, params }) {
  const pages = Math.max(1, Math.ceil(cities.length / 18));
  const requested = Number(params.get("cityPage") ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  const pageLink = value => {
    const next = new URLSearchParams(params);
    next.set("cityPage", String(value));
    return "/country?" + next.toString();
  };
  return <section className="asia-public-cities" aria-labelledby="asia-cities-title">
    <div className="asia-city-heading"><h2 id="asia-cities-title">Public cities</h2><a href="#asia-countries">Browse countries ↓</a></div>
    {status === "loading" ? <p role="status">Loading cities.</p> : status === "error" ? <p role="alert">{error}</p> : <>
      <ul className="asia-city-grid">{cities.slice((page - 1) * 18, page * 18).map(city => {
        const art = ASIA_CITY_ART[city.id];
        const image = art?.src || httpUrl(city.image);
        return <li key={city.id}><Link className="asia-city-card" to={"/c/" + city.id} state={{ from: "/country?" + params.toString() }}>
          {image ? <img className="asia-city-photo" src={image} alt={city.city} style={{ objectPosition: art?.position ?? "center" }} /> : <span className="asia-city-photo asia-photo-empty">No photo available</span>}
          <span className="asia-city-name">{city.city}</span><span className="asia-city-country">{city.country}</span>
        </Link></li>;
      })}</ul>
      {!cities.length ? <p>No public cities available.</p> : null}
      {pages > 1 ? <nav className="asia-city-pages" aria-label="City pages">
        {page > 1 ? <Link to={pageLink(page - 1)}>Previous</Link> : null}<span>Page {page} of {pages}</span>{page < pages ? <Link to={pageLink(page + 1)}>Next cities →</Link> : null}
      </nav> : null}
    </>}
  </section>;
}
