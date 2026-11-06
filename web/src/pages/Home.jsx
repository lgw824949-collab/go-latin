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
  const desktopFilters = readFilters(params);
  const setDesktopFilter = (key, value) => setParams(writeFilters(params, key, value));

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

// Original main-phase2 continent artwork and attribution, not venue data.
const PHASE2_CONTINENTS = [{"frame":"frame-beirut","image":"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Beirut_skyline%2C_Beirut%2C_Lebanon.jpg/960px-Beirut_skyline%2C_Beirut%2C_Lebanon.jpg","id":"asia","full":"https://upload.wikimedia.org/wikipedia/commons/e/e8/Beirut_skyline%2C_Beirut%2C_Lebanon.jpg","name":"Asia"},{"frame":"","image":"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg/960px-Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg","id":"europe","full":"https://upload.wikimedia.org/wikipedia/commons/2/2b/Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg","name":"Europe"},{"frame":"","image":"https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Skyline_of_the_Great_Tegucigalpa%2C_Honduras.jpg/960px-Skyline_of_the_Great_Tegucigalpa%2C_Honduras.jpg","id":"north_america","full":"https://upload.wikimedia.org/wikipedia/commons/c/ce/Skyline_of_the_Great_Tegucigalpa%2C_Honduras.jpg","name":"North America"},{"frame":"","image":"https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Onafhankelijkheidsplein_%2815357070803%29.jpg/960px-Onafhankelijkheidsplein_%2815357070803%29.jpg","id":"south_america","full":"https://upload.wikimedia.org/wikipedia/commons/a/ae/Onafhankelijkheidsplein_%2815357070803%29.jpg","name":"South America"},{"frame":"frame-yaounde","image":"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Hillside_Yaounde_View.jpg/960px-Hillside_Yaounde_View.jpg","id":"africa","full":"https://upload.wikimedia.org/wikipedia/commons/3/3a/Hillside_Yaounde_View.jpg","name":"Africa"},{"frame":"","image":"","id":"oceania","full":"","name":"Oceania"}];
const PHASE2_CITIES = ["seoul", "bangkok", "hanoi", "tokyo", "paris", "madrid"];
function Phase2Desktop({ capitals, status, error, query, setQuery, onSearch, found, filters, setFilter }) {
  const countries = listCountries(capitals);
  const cities = PHASE2_CITIES.map(id => capitals.find(city => city.id === id));
  const scoped = cities.filter(city => (!filters.continent && !filters.dance) || (city && ["seoul", "bangkok", "hanoi"].includes(city.id) && (!filters.continent || city.continent === filters.continent) && (!filters.dance || venuesForDance(city.venues, filters.dance).length)));
  return <div className="phase2-desktop-home">
    <section className="p2-hero">
      <p className="p2-kicker">Bachata · Kizomba · Salsa</p>
      <h1>GO LATIN</h1>
      <p className="p2-lede">Find the floor. Five oceans. Six continents. One night.</p>
      <form className="p2-finder" onSubmit={onSearch}><label><span>Country, city, or bar</span><input type="search" placeholder="South Korea, Seoul, or a bar" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} disabled={status !== "ready"} /></label></form>
      {query.trim() && status === "ready" ? <SearchResults query={query} found={found} /> : null}
    </section>
    <section className="p2-block" aria-labelledby="p2-continents-title">
      <h2 id="p2-continents-title">Continents</h2>
      <p className="p2-intro">Choose a continent, then a country, then a city.</p>
      <BrowseSteps current="Continent" />
      <ul className="p2-continent-grid">{PHASE2_CONTINENTS.map(item => {
        const count = countries.filter(country => country.cities.some(city => city.continent === item.id)).length;
        return <li key={item.id}><Link className={`p2-continent-card${item.image ? "" : " p2-is-graphic"}`} to={`/country?continent=${item.id}`}>
          {item.image ? <img className={item.frame} src={item.image} alt="" loading="lazy" decoding="async" onError={event => { const image = event.currentTarget; if (!image.dataset.tried) { image.dataset.tried = "1"; image.src = item.full; } else { image.style.visibility = "hidden"; } }} /> : null}
          <span className="p2-shade" aria-hidden="true" /><span className="p2-copy"><span className="p2-place">{item.name}</span><span className="p2-meta">{status === "ready" ? `${count} ${count === 1 ? "country" : "countries"}` : "Not confirmed"}</span></span>
        </Link></li>;
      })}</ul>
    </section>
    <section className="p2-block" aria-labelledby="p2-cities-title"><h2 id="p2-cities-title">Cities</h2>
      <Filters dance={filters.dance} continent={filters.continent} onDance={value => setFilter("dance", value)} onContinent={value => setFilter("continent", value)} />
      {status === "error" ? <p role="alert">{error}</p> : status !== "ready" ? <p>Loading the directory.</p> : <>
        <ul className="p2-city-grid">{scoped.map((city, index) => {
          if (!city) return <li key={`empty-${index}`}><div className="p2-city-card"><span className="p2-city-name">Coming soon</span></div></li>;
          if (!["seoul", "bangkok", "hanoi"].includes(city.id)) return <li key={city.id}><div className="p2-city-card" aria-disabled="true"><span className="p2-city-name">{city.city}</span><span className="p2-city-country">{city.country}</span><span className="p2-dances">Coming soon</span></div></li>;
          const genres = [...new Set((city.venues ?? []).flatMap(bar => bar.dances ?? []))];
          return <li key={city.id}><Link className="p2-city-card" to={cityCardPath(city.id, filters.dance)}><span className="p2-city-name">{city.city}</span><span className="p2-city-country">{city.country}</span><span className="p2-dances">{city.venues?.length ? genres.map(id => DANCES.find(dance => dance.id === id)?.name ?? id).join(" · ") || "Not confirmed" : "Coming soon"}</span></Link></li>;
        })}</ul>{!scoped.length ? <p className="empty">No matching cities.</p> : null}
      </>}
    </section>
    <section className="p2-credits" aria-labelledby="p2-credits-title"><h2 id="p2-credits-title">Photographs</h2><ul>
            <li id="credit-asia">Asia, Beirut. Photo by Vyacheslav Argenberg, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Beirut_skyline,_Beirut,_Lebanon.jpg">Beirut skyline on Wikimedia Commons</a>.</li>
            <li id="credit-europe">Europe, Warsaw. Photo by A.Savin, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg">Warsaw view on Wikimedia Commons</a>.</li>
            <li id="credit-north-america">North America, Tegucigalpa. Photo by I Love Honduras, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Skyline_of_the_Great_Tegucigalpa,_Honduras.jpg">Tegucigalpa skyline on Wikimedia Commons</a>.</li>
            <li id="credit-south-america">South America, Paramaribo. Photo by Maarten van der Bent, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Onafhankelijkheidsplein_(15357070803).jpg">Paramaribo square on Wikimedia Commons</a>.</li>
            <li id="credit-africa">Africa, Yaoundé. Photo by Heather Powell, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Hillside_Yaounde_View.jpg">Yaoundé hillside on Wikimedia Commons</a>.</li>
          </ul></section>

  </div>;
}