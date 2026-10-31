import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import BrowseSteps from "../components/BrowseSteps.jsx";
import { useCapitals } from "../lib/directory.js";
import { listCountries, matchingCities } from "../lib/countries.js";

export default function Country() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { pathname, search } = useLocation();
  const query = params.get("q") ?? "";
  function setQuery(value) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    setParams(next, { replace: true });
  }
  const { status, capitals, error } = useCapitals();
  const country = useMemo(
    () => listCountries(capitals).find((item) => item.slug === slug) ?? null,
    [capitals, slug],
  );
  const cities = useMemo(
    () => matchingCities(country?.cities ?? [], query),
    [country, query],
  );

  useEffect(() => {
    if (status !== "ready") return undefined;
    document.title = country ? `${country.name} | Go Latin` : "Go Latin";
    return undefined;
  }, [status, country]);

  return (
    <main className="wrap country-page">
      <p className="crumb"><Link to="/country">Countries</Link></p>
      {status === "loading" ? <p className="count">Loading the directory.</p> : null}
      {status === "error" ? <p className="empty">{error}</p> : null}
      {status === "ready" && !country ? (
        <>
          <h1 className="country-title">Not on the list</h1>
          <p className="lede">This country is not in the directory.</p>
        </>
      ) : null}
      {status === "ready" && country ? (
        <>
          <BrowseSteps current="City" />
          <h1 className="country-title">{country.name}</h1>
          <p className="lede">Choose a city to see its bars.</p>
          <label className="city-search finder">
            City
            <input
              type="search"
              value={query}
              placeholder="City"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="count">{cities.length} {cities.length === 1 ? "city" : "cities"}</p>
          {cities.length === 0 ? (
            <p className="empty">No match for "{query.trim()}".</p>
          ) : (
            <ul className="country-list">
              {cities.map((city) => (
                <li key={city.id}>
                  <Link to={`/c/${city.id}`} state={{ from: `${pathname}${search}` }}>
                    <span className="place-name">{city.city}</span>
                    <span>{barCount(city.venues?.length ?? 0)}</span>
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

function barCount(count) {
  if (count === 0) return "No bar listed";
  if (count === 1) return "1 bar";
  return `${count} bars`;
}
