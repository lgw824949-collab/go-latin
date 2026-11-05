import { useMemo } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BrowseSteps from "../components/BrowseSteps.jsx";
import ContinentCards from "../components/ContinentCards.jsx";
import Hero from "../components/Hero.jsx";
import NearYou from "../components/NearYou.jsx";
import PopularCities from "../components/PopularCities.jsx";
import { countrySearchTarget, listCountries, searchDirectory } from "../lib/countries.js";
import { useCapitals } from "../lib/directory.js";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  function setQuery(value) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    setParams(next, { replace: true });
  }
  const navigate = useNavigate();
  const { status, capitals, error } = useCapitals();
  const countries = useMemo(() => listCountries(capitals), [capitals]);
  const found = useMemo(
    () => searchDirectory(capitals, query),
    [capitals, query],
  );
  const searching = query.trim() !== "";

  function onSearch(event) {
    event.preventDefault();
    const target = countrySearchTarget(countries, query);
    if (target) navigate(target);
  }

  if (status !== "ready") {
    return (
      <main className="wrap home home-b">
        <Hero />
        <p className={status === "error" ? "empty" : "count"}>
          {status === "error" ? error : "Loading the directory."}
        </p>
      </main>
    );
  }

  return (
    <main className="wrap home home-b">
      <Hero />
      <div className="home-core">
        <nav className="mvp-country-links" aria-label="Choose a country">
          {[["hanoi", "Vietnam"], ["bangkok", "Thailand"], ["seoul", "Korea"]].map(([id, label]) => {
            const country = countries.find(item => item.cities.some(city => city.id === id));
            return country ? <Link key={id} to={`/country/${country.slug}`}>{label}</Link> : null;
          })}
        </nav>
        <NearYou capitals={capitals} />
        <form className="home-search" onSubmit={onSearch}>
          <label className="city-search finder">
            <span className="visually-hidden">Country, city, or bar</span>
            <input
              type="search"
              value={query}
              placeholder="Search country, city or bar..."
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </form>
        {searching ? (
          <SearchResults query={query} found={found} />
        ) : null}
        <Link className="home-mobile-tonight" to="/tonight">Tonight <span aria-hidden="true">→</span></Link>
      </div>
      <section className="browse" aria-labelledby="browse-title">
        <div className="section-head">
          <h2 id="browse-title">Explore by Continent</h2>
          <Link to="/country">View All &gt;</Link>
        </div>
        <BrowseSteps current="Continent" />
        <ContinentCards capitals={capitals} />
      </section>
      <PopularCities capitals={capitals} />
      <Link className="home-mobile-all-countries" to="/country">Explore All Countries</Link>
    </main>
  );
}

function SearchResults({ query, found }) {
  const { pathname, search } = useLocation();
  const state = { from: `${pathname}${search}` };
  const hits = found.countries.length + found.cities.length + found.bars.length;
  if (hits === 0) {
    return <p className="empty">No match for "{query.trim()}".</p>;
  }
  return (
    <section className="search-results" aria-label="Search results">
      <SearchGroup title="BAR" items={found.bars.map((bar) => (
        <li key={`${bar.cityId}-${bar.id}`}>
          <Link to={bar.href} state={state}>
            <span className="place-name">{bar.name}</span>
            <span>{bar.city}, {bar.country}</span>
          </Link>
        </li>
      ))} />
      <SearchGroup title="City" items={found.cities.map((city) => (
        <li key={city.id}>
          <Link to={`/c/${city.id}`} state={state}>
            <span className="place-name">{city.city}</span>
            {city.showCountry ? <span>{city.country}</span> : null}
          </Link>
        </li>
      ))} />
      <SearchGroup title="Country" items={found.countries.map((country) => (
        <li key={country.slug}>
          <Link to={`/country/${country.slug}`}>
            <span className="place-name">{country.name}</span>
          </Link>
        </li>
      ))} />
    </section>
  );
}

function SearchGroup({ title, items }) {
  if (!items.length) return null;
  return (
    <>
      <h2 className="search-kind">{title}</h2>
      <ul className="country-list">{items}</ul>
    </>
  );
}
