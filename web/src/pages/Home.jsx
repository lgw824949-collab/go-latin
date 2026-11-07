import { useMemo } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BrowseSteps from "../components/BrowseSteps.jsx";
import ContinentCards from "../components/ContinentCards.jsx";
import Hero from "../components/Hero.jsx";
import NearYou from "../components/NearYou.jsx";
import PopularCities from "../components/PopularCities.jsx";
import Filters from "../components/Filters.jsx";
import { DANCES, readFilters, writeFilters, venuesForDance, cityCardPath } from "../lib/filterCapitals.js";
import MobileAtlasHome from "../components/MobileAtlasHome.jsx";
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
  const requestedDesktopFilters = readFilters(params);
  const desktopFilters = { ...requestedDesktopFilters, continent: requestedDesktopFilters.continent === "asia" ? "asia" : null };
  const setDesktopFilter = (key, value) => {
    if (key === "continent" && value && value !== "asia") return;
    setParams(writeFilters(params, key, value));
  };

  function onSearch(event) {
    event.preventDefault();
    const target = countrySearchTarget(countries, query);
    if (target) navigate(target);
  }

  if (status !== "ready") {
    return (
      <main className="wrap home home-b">
      <Phase2Desktop capitals={capitals} status={status} error={error} query={query} setQuery={setQuery} onSearch={onSearch} found={found} filters={desktopFilters} setFilter={setDesktopFilter} />
        <Hero />
        <MobileAtlasHome capitals={[]} status={status} error={error} query={query} onQueryChange={setQuery} onSearch={onSearch} />
        <p className={status === "error" ? "empty" : "count"}>
          {status === "error" ? error : "Loading the directory."}
        </p>
      </main>
    );
  }

  return (
    <main className="wrap home home-b">
      <Phase2Desktop capitals={capitals} status={status} error={error} query={query} setQuery={setQuery} onSearch={onSearch} found={found} filters={desktopFilters} setFilter={setDesktopFilter} />
      <Hero />
      <MobileAtlasHome capitals={capitals} status={status} error={error} query={query} onQueryChange={setQuery} onSearch={onSearch} searchResults={searching ? <SearchResults query={query} found={found} /> : null} />
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

// User-approved continent PNGs; only Asia is active in the current MVP.
const PHASE2_CONTINENTS = [{"name":"ASIA","id":"asia","image":"/continents-approved/GO_LATIN_01_ASIA.png"},{"name":"EUROPE","id":"europe","image":"/continents-approved/GO_LATIN_02_EUROPE.png"},{"name":"AFRICA","id":"africa","image":"/continents-approved/GO_LATIN_03_AFRICA.png"},{"name":"NORTH AMERICA","id":"north_america","image":"/continents-approved/GO_LATIN_04_NORTH_AMERICA.png"},{"name":"SOUTH AMERICA","id":"south_america","image":"/continents-approved/GO_LATIN_05_SOUTH_AMERICA.png"},{"name":"OCEANIA","id":"oceania","image":"/continents-approved/GO_LATIN_06_OCEANIA.png"}];
const PHASE2_CITIES = ["seoul", "bangkok", "hanoi", "tokyo", "paris", "madrid"];
function Phase2Desktop({ capitals, status, error, query, setQuery, onSearch, found, filters, setFilter }) {
  const cities = PHASE2_CITIES.map(id => capitals.find(city => city.id === id));
  const scoped = cities.filter(city => (!filters.continent && !filters.dance) || (city && ["seoul", "bangkok", "hanoi"].includes(city.id) && (!filters.continent || city.continent === filters.continent) && (!filters.dance || venuesForDance(city.venues, filters.dance).length)));
  return <div className="phase2-desktop-home">
    <section className="p2-hero">
      <p className="p2-kicker">Bachata · Kizomba · Salsa</p>
      <h1><span className="p2-desktop-copy">GO LATIN</span><span className="p2-mobile-copy">Find the floor.</span></h1>
      <p className="p2-lede"><span className="p2-desktop-copy">Find the floor. Five oceans. Six continents. One night.</span><span className="p2-mobile-copy">Five oceans. Six continents. One night.</span></p>
      <form className="p2-finder" onSubmit={onSearch}><label><span>Country, city, or bar</span><input type="search" placeholder="South Korea, Seoul, or a bar" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} disabled={status !== "ready"} /></label></form>
      {query.trim() && status === "ready" ? <SearchResults query={query} found={found} /> : null}
    </section>
    <section className="p2-block" aria-labelledby="p2-continents-title">
      <h2 id="p2-continents-title">Continents</h2>
      <p className="p2-intro">Choose a continent, then a country, then a city.</p>
      <BrowseSteps current="Continent" />
      <ul className="p2-continent-grid">{PHASE2_CONTINENTS.map(item => {
        const active = item.id === "asia";
        const content = <><span className="p2-continent-media"><img src={item.image} alt="" loading="lazy" decoding="async" /></span><span className="p2-continent-status">{active ? "Active" : "Coming soon"}</span></>;
        const label = `${item.name}, ${active ? "Active" : "Coming soon"}`;
        return <li key={item.id}>{active
          ? <Link className="p2-continent-card" to="/country?continent=asia" aria-label={label}>{content}</Link>
          : <div className="p2-continent-card" role="group" aria-disabled="true" aria-label={label}>{content}</div>}
        </li>;
      })}</ul>
    </section>
    <section className="p2-block" aria-labelledby="p2-cities-title"><h2 id="p2-cities-title">Cities</h2>
      <Filters dance={filters.dance} continent={filters.continent} disabledContinents={PHASE2_CONTINENTS.filter(item => item.id !== "asia").map(item => item.id)} onDance={value => setFilter("dance", value)} onContinent={value => setFilter("continent", value)} />
      {status === "error" ? <p role="alert">{error}</p> : status !== "ready" ? <p>Loading the directory.</p> : <>
        <ul className="p2-city-grid">{scoped.map((city, index) => {
          if (!city) return <li key={`empty-${index}`}><div className="p2-city-card"><span className="p2-city-name">Coming soon</span></div></li>;
          if (!["seoul", "bangkok", "hanoi"].includes(city.id)) return <li key={city.id}><div className="p2-city-card" aria-disabled="true"><span className="p2-city-name">{city.city}</span><span className="p2-city-country">{city.country}</span><span className="p2-dances">Coming soon</span></div></li>;
          const genres = [...new Set((city.venues ?? []).flatMap(bar => bar.dances ?? []))];
          return <li key={city.id}><Link className="p2-city-card" to={cityCardPath(city.id, filters.dance)}><span className="p2-city-name">{city.city}{city.venues?.length ? <span className="p2-city-status">Active</span> : null}</span><span className="p2-city-country">{city.country}</span><span className="p2-dances">{city.venues?.length ? genres.map(id => DANCES.find(dance => dance.id === id)?.name ?? id).join(" · ") || "Not confirmed" : "Coming soon"}</span></Link></li>;
        })}</ul>{!scoped.length ? <p className="empty">No matching cities.</p> : null}
      </>}
    </section>


  </div>;
}