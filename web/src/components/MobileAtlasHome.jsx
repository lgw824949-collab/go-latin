import { Link } from "react-router-dom";
import { cityCardPath } from "../lib/filterCapitals.js";

const CITY_ARTWORK = [
  ["seoul", "/mobile-atlas/GO_LATIN_CITY_Seoul.png"],
  ["bangkok", "/mobile-atlas/GO_LATIN_CITY_Bangkok.png"],
  ["hanoi", "/mobile-atlas/GO_LATIN_CITY_Hanoi.png"],
];

export default function MobileAtlasHome({ capitals, status, error, query, onQueryChange, onSearch, searchResults }) {
  const cities = CITY_ARTWORK.map(([id, image]) => {
    const city = capitals.find(row => row.id === id);
    return city ? { ...city, image } : null;
  }).filter(Boolean);
  return <section className="atlas-mobile-home" aria-label="Global Latin bar directory">
    <h1><span>Find Latin Dance</span><span>Bars Worldwide</span></h1>
    <form className="atlas-search" onSubmit={onSearch}>
      <label>
        <span className="visually-hidden">Country, city, or bar</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg>
        <input type="search" placeholder="Search city or bar" autoComplete="off" value={query} onChange={event => onQueryChange(event.target.value)} disabled={status !== "ready"} />
      </label>
    </form>
    {searchResults ? <div className="atlas-search-results">{searchResults}</div> : null}
    <Link className="atlas-tonight" to="/tonight">Tonight <span aria-hidden="true">→</span></Link>
    <img className="atlas-world-map" src="/mobile-atlas/world-map-a.png" width="366" height="218" loading="lazy" decoding="async" alt="Natural Earth world map showing Seoul, Bangkok and Hanoi as the active cities" />
    <section className="atlas-active" aria-labelledby="atlas-active-title">
      <h2 id="atlas-active-title">ACTIVE CITIES</h2>
      {status === "error" ? <p className="atlas-status" role="alert">{error}</p>
        : status !== "ready" ? <p className="atlas-status">Loading the directory.</p>
          : !cities.length ? <p className="atlas-status">No registered cities are available.</p>
            : <ul className="atlas-city-grid">{cities.map(city => <li key={city.id}>
              <Link to={cityCardPath(city.id)} aria-label={`${city.city}, ${city.country}`}>
                <span className="atlas-city-photo"><img src={city.image} alt="" loading="lazy" decoding="async" /></span>
                <span className="atlas-city-info"><strong>{city.city}</strong><span>{city.venues.length === 1 ? "1 bar" : `${city.venues.length} bars`}</span></span>
              </Link>
            </li>)}</ul>}
    </section>
  </section>;
}
