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

  return (
    <main className="wrap country-page">
      <p className="crumb"><Link to={continent ? "/country" : "/"}>{continent ? "Continents" : "Directory"}</Link></p>
      <BrowseSteps current={continent ? "Country" : "Continent"} />
      <h1 className="country-title">{continent ? continentName(continent) : "Continents"}</h1>
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
            <ul className="country-list">
              {countries.map((country) => (
                <li key={country.slug}>
                  <Link to={`/country/${country.slug}`}>
                    <span className="place-name">{country.name}</span>
                    <span>{placeLabel(country)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
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
