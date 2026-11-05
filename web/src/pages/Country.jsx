import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import BrowseSteps from "../components/BrowseSteps.jsx";
import { useCapitals } from "../lib/directory.js";
import { listCountries, matchingCities } from "../lib/countries.js";
import { BAR_COPY, useBarLanguage } from "../lib/barLanguage.js";
import { tonightBarPath } from "../lib/barAnchor.js";
import { DANCES } from "../lib/filterCapitals.js";

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
          {slug === "vietnam" ? <VietnamCities country={country} /> : <>
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
          </>}
        </>
      ) : null}
    </main>
  );
}

const VIETNAM_CITIES = [
  { id: "hanoi", name: "Hanoi", aliases: ["hanoi"] },
  { id: "ho-chi-minh-city", name: "Ho Chi Minh City", aliases: ["hochiminhcity", "hochiminh", "hcmc"] },
  { id: "da-nang", name: "Da Nang", aliases: ["danang"] },
];
function cityKey(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
}
function VietnamCities({ country }) {
  const [params, setParams] = useSearchParams();
  const { pathname, search } = useLocation();
  const [language, setLanguage] = useBarLanguage();
  const t = BAR_COPY[language];
  const selected = VIETNAM_CITIES.find(city => city.id === params.get("city"));
  const registered = selected ? country.cities.find(city => selected.aliases.includes(cityKey(city.id)) || selected.aliases.includes(cityKey(city.city))) : null;
  const bars = (registered?.venues ?? []).filter(bar => bar.status !== "permanently_closed");
  function choose(id) {
    const next = new URLSearchParams(params);
    next.set("city", id);
    setParams(next);
  }
  return <section className="vietnam-cities" lang={language}>
    <div className="bar-profile-toolbar">
      <p>{language === "ko" ? "도시를 선택해 BAR 목록을 확인하세요." : "Choose a city to see its bars."}</p>
      <div className="bar-profile-language" role="group" aria-label={t.language}>
        <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <span aria-hidden="true">|</span>
        <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
      </div>
    </div>
    <div className="vietnam-city-options" role="group" aria-label={language === "ko" ? "도시 선택" : "Choose a city"}>
      {VIETNAM_CITIES.map(city => <button key={city.id} type="button" aria-pressed={selected?.id === city.id} onClick={() => choose(city.id)}>{city.name}</button>)}
    </div>
    {!selected ? <p>{language === "ko" ? "아직 도시를 선택하지 않았어요." : "Select a city above."}</p> : <>
      <h2>{selected.name}</h2>
      {!bars.length ? <p role="status">{language === "ko" ? "준비 중 · Coming soon" : "Coming soon"}</p> : <ul className="vietnam-bar-list">
        {bars.map(bar => <li key={bar.id}><Link to={tonightBarPath(registered.id, bar.id)} state={{ from: `${pathname}${search}` }}>
          <strong>{bar.name}</strong>
          <span>{DANCES.filter(dance => (bar.dances ?? []).includes(dance.id)).map(dance => dance.name).join(" · ") || t.unknown}</span>
          <span>{t.details} →</span>
        </Link></li>)}
      </ul>}
    </>}
  </section>;
}

function barCount(count) {
  if (count === 0) return "No bar listed";
  if (count === 1) return "1 bar";
  return `${count} bars`;
}
