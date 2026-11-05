import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import BrowseSteps from "../components/BrowseSteps.jsx";
import { useCapitals } from "../lib/directory.js";
import { countryCategorySelection, countryCityCategories, listCountries, matchingCities } from "../lib/countries.js";
import { BAR_COPY, useBarLanguage } from "../lib/barLanguage.js";
import { tonightBarPath } from "../lib/barAnchor.js";
import { DANCES } from "../lib/filterCapitals.js";

export default function Country() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  function setQuery(value) {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    next.delete("city");
    setParams(next, { replace: true });
  }
  const { status, capitals, error } = useCapitals();
  const country = useMemo(
    () => listCountries(capitals).find((item) => item.slug === slug) ?? null,
    [capitals, slug],
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
          <CountryCities country={country} query={query} setQuery={setQuery} />
        </>
      ) : null}
    </main>
  );
}

function CountryCities({ country, query, setQuery }) {
  const [params, setParams] = useSearchParams();
  const { pathname, search } = useLocation();
  const [language, setLanguage] = useBarLanguage();
  const t = BAR_COPY[language];
  const categories = countryCityCategories(country);
  const visible = matchingCities(categories.map(city => ({ ...city, city: `${city.name} ${city.koName ?? ""}` })), query);
  const candidate = countryCategorySelection(country, params.get("city"));
  const selected = candidate && matchingCities([{ city: `${candidate.name} ${candidate.koName ?? ""}` }], query).length ? candidate : undefined;
  const registered = selected?.registered;
  const bars = (registered?.venues ?? []).filter(bar => bar.status !== "permanently_closed");
  const label = category => language === "ko" ? category.koName || category.name : category.name;
  const korea = country.slug === "south-korea";
  function choose(id) {
    const next = new URLSearchParams(params);
    next.set("city", id);
    setParams(next);
  }
  return <section className="country-cities" lang={language}>
    <div className="bar-profile-toolbar">
      <p>{language === "ko" ? "지역을 선택해 BAR 목록을 확인하세요." : "Choose a location to see its bars."}</p>
      <div className="bar-profile-language" role="group" aria-label={t.language}>
        <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <span aria-hidden="true">|</span>
        <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
      </div>
    </div>
    <label className="city-search finder">{language === "ko" ? "지역 검색" : "Location"}
      <input type="search" value={query} placeholder={language === "ko" ? "지역" : "Location"} autoComplete="off" onChange={event => setQuery(event.target.value)} />
    </label>
    {!visible.length ? <p>{language === "ko" ? "검색 결과가 없어요." : `No match for "${query.trim()}".`}</p> : null}
    <div className="country-city-options" role="group" aria-label={language === "ko" ? "지역 선택" : "Choose a location"}>
      {visible.map(city => <button key={city.id} type="button" aria-pressed={selected?.id === city.id} onClick={() => choose(city.id)}>{label(city)}</button>)}
    </div>
    {korea ? <div className="country-area-note">
      <p>{language === "ko" ? "홍대·강남은 서울 내 지역이며, 부산은 별도 도시예요. 주소에서 확인된 지역만 분류했어요." : "Hongdae and Gangnam are areas of Seoul; Busan is a separate city. Areas are matched only when explicitly recorded in the address."}</p>
      {country.cities.some(city => city.id === "seoul") ? <button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete("q"); next.set("city", "seoul"); setParams(next); }}>{language === "ko" ? "서울 전체 BAR 보기 · 지역 미확인 포함" : "View all Seoul bars · includes unclassified areas"}</button> : null}
    </div> : null}
    {!selected ? <p>{language === "ko" ? "아직 지역을 선택하지 않았어요." : "Select a location above."}</p> : <>
      <h2>{label(selected)}</h2>
      {!bars.length ? <p role="status">{language === "ko" ? "준비 중 · Coming soon" : "Coming soon"}</p> : <ul className="country-bar-list">
        {bars.map(bar => <li key={bar.id}><Link to={tonightBarPath(registered.id, bar.id)} state={{ from: `${pathname}${search}` }}>
          <strong>{bar.name}</strong>
          <span>{DANCES.filter(dance => (bar.dances ?? []).includes(dance.id)).map(dance => dance.name).join(" · ") || t.unknown}</span>
          <span>{t.details} →</span>
        </Link></li>)}
      </ul>}
    </>}
  </section>;
}

