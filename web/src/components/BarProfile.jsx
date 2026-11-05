import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocalNow } from "../lib/useLocalNow.js";
import { profileModel } from "../lib/barProfile.js";
import { BAR_COPY, profileHoursLabel, useBarLanguage } from "../lib/barLanguage.js";
import { barAnchor, tonightBarPath, tonightPathForRoute } from "../lib/barAnchor.js";
import { DANCES } from "../lib/filterCapitals.js";
import { httpUrl } from "../lib/sources.js";

export default function BarProfile({ venue, capital, venues = [], search = "", from, now }) {
  const liveNow = useLocalNow();
  const model = profileModel(venue, capital, now ?? liveNow);
  const [language, setLanguage] = useBarLanguage();
  const t = BAR_COPY[language];
  const [reportOpen, setReportOpen] = useState(false);
  const others = venues.filter(other => other.id !== venue.id && other.status !== "permanently_closed");
  const cityPath = `/c/${capital.id}${search}`;
  const dance = new URLSearchParams(search).get("dance");
  const website = httpUrl(venue.website);
  const sources = (venue.sources ?? []).map(source => ({ ...source, url: httpUrl(source.url) }));
  const mainSource = httpUrl(venue.sourceUrl);
  if (mainSource && !sources.some(source => source.url === mainSource)) sources.push({ kind: venue.source, url: mainSource, checkedAt: venue.sourceChecked });
  const sourceName = kind => ({ website: t.website, instagram: t.instagram, google_maps: language === "ko" ? "지도" : "Maps", local: language === "ko" ? "현지 출처" : "Local source" }[kind] || t.source);

  return (
    <main className="bar-profile" lang={language} id={barAnchor(venue.id)} key={venue.id}>
      <header className="bar-profile-heading">
        <div className="bar-profile-toolbar">
          <Link className="bar-profile-back" to={cityPath} state={from ? { from } : null}>← {t.back(capital.city)}</Link>
          <div className="bar-profile-language" role="group" aria-label={t.language}>
            <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
            <span aria-hidden="true">|</span>
            <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
          </div>
        </div>
        <p className="bar-profile-breadcrumb">{capital.country || t.unknown} · {capital.city || t.unknown}</p>
        <h1>{venue.name || t.unknown}</h1>
        <p>{t.native} · {t.unknown}</p>
        <p>{DANCES.filter(d => (venue.dances ?? []).includes(d.id)).map(d => d.name).join(" · ") || t.unknown}</p>
      </header>
      <section className="bar-profile-tonight" aria-labelledby="bar-tonight-title">
        <p className="bar-profile-eyebrow">{model.today ? t.weekdays[model.today.weekday] : t.unknown} · {t.localTime} {model.clock?.time ?? t.unknown}</p>
        <h2 id="bar-tonight-title">{t.tonight}</h2>
        <p className="bar-profile-music">{model.today?.closed ? t.closedTonight : model.today?.dances.length ? model.today.dances.join(" · ") : t.unknown}</p>
        <p className="bar-profile-muted bar-profile-start-note" id="bar-start-note">{t.startMissing}</p>
        <p className="bar-profile-muted">{model.clock?.timeZone ?? t.unknown} · {t.recurring}</p>
      </section>
      <div className="bar-profile-actions">
        <Action href={model.mapsUrl} primary t={t}>{t.directions}</Action>
        <Action href={model.instagram} t={t}>{t.instagram}</Action>
      </div>
      <section className="bar-profile-section" aria-labelledby="bar-week-title">
        <h2 id="bar-week-title">{t.week}</h2>
        <dl className="bar-profile-week">{model.week.map(day => <div key={day.weekday} className={day.today ? "is-today" : ""} aria-current={day.today ? "date" : undefined}>
          <dt>{t.weekdays[day.weekday]}{day.today ? <span>{t.today}</span> : null}</dt>
          <dd>{day.closed ? t.closed : day.dances.length ? day.dances.join(" · ") : t.unknown}</dd>
        </div>)}</dl>
      </section>
      <section className="bar-profile-section" aria-labelledby="bar-facts-title">
        <h2 id="bar-facts-title">{t.facts}</h2>
        <dl className="bar-profile-facts">
          <div><dt>{t.fee}</dt><dd>{t.unknown}</dd></div>
          <div><dt>{t.lessons}</dt><dd>{t.unknown}</dd></div>
          <div><dt>{t.english}</dt><dd>{t.unknown}</dd></div>
          <div><dt>{t.address}</dt><dd>{venue.address || t.unknown}</dd></div>
        </dl>
        <p>{t.phone} · {venue.phone || t.unknown}</p>
        <p>{t.website} · {website ? <a href={website} target="_blank" rel="noreferrer" aria-label={`${t.website} · ${t.newTab}`}>{website}</a> : t.unknown}</p>
      </section>
      <section className="bar-profile-section" aria-labelledby="bar-photos-title">
        <h2 id="bar-photos-title">{t.photos}</h2>
        <div className="bar-profile-photos">{[t.entrance, t.interior].map((label, index) => <figure key={index}><div role="img" aria-label={`${label} · ${t.noPhoto}`}>{t.noPhoto}</div><figcaption>{label}</figcaption></figure>)}</div>
      </section>
      <section className={`bar-profile-section bar-profile-check${model.age > 30 ? " is-stale" : ""}`} aria-labelledby="bar-check-title">
        <h2 id="bar-check-title">{t.verified}</h2>
        <p>{model.age == null ? t.unknown : <><time dateTime={venue.sourceChecked}>{venue.sourceChecked}</time> · {model.age === 0 ? t.today : t.ago(model.age)}</>}</p>
        <p className="bar-profile-muted">{t.verificationNote}</p>
        {model.age > 30 && <>
          <button type="button" className="bar-profile-button" aria-expanded={reportOpen} aria-controls="bar-report" onClick={() => setReportOpen(!reportOpen)}>{t.suggest}</button>
          {reportOpen && <div id="bar-report" className="bar-profile-report">
            <fieldset><legend>{t.reportQuestion}</legend>{t.reportOptions.map((text, index) => <label key={index}><input type="checkbox" />{text}</label>)}</fieldset>
            <p id="bar-report-note" role="status">{t.reportNote}</p>
            <button type="button" className="bar-profile-button" disabled aria-describedby="bar-report-note">{t.send}</button>
          </div>}
        </>}
        <details className="bar-profile-existing"><summary>{t.sourcesToggle}</summary>
          <h3>{t.hours}</h3><dl className="bar-profile-facts">{model.week.map(day => <div key={day.weekday}><dt>{t.weekdays[day.weekday]}</dt><dd>{profileHoursLabel(day.hours, language)}</dd></div>)}</dl>
          <p>{t.overnight}</p>
          <ul>{sources.map((source, index) => <li key={index}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" aria-label={`${sourceName(source.kind)} · ${t.newTab}`}>{sourceName(source.kind)}</a> : t.sourceMissing} · {source.checkedAt || t.unknown}</li>)}</ul>
          {!sources.length && <p>{t.sourceMissing}</p>}
          {venue.sourceNote ? <p>{venue.sourceNote}</p> : null}
          <Link to={tonightPathForRoute(`/c/${capital.id}`, search)}>{t.tonightLink}</Link>
        </details>
      </section>
      <section className="bar-profile-section bar-profile-other" aria-labelledby="bar-other-title">
        <h2 id="bar-other-title">{t.others(capital.city)}</h2>
        {others.length ? <div className="bar-profile-cards">{others.map(other => <Link key={other.id} to={tonightBarPath(capital.id, other.id, dance)} state={from ? { from } : null}>
          <h3>{other.name || t.unknown}</h3>
          <p>{DANCES.filter(d => (other.dances ?? []).includes(d.id)).map(d => d.name).join(" · ") || t.unknown}</p><span>{t.details} →</span>
        </Link>)}</div> : <p>{t.noOthers}</p>}
      </section>
    </main>
  );
}
function Action({ href, primary = false, children, t }) {
  const className = `bar-profile-button${primary ? " is-primary" : ""}`;
  return href ? <a className={className} href={href} target="_blank" rel="noreferrer" aria-label={`${children} · ${t.newTab}`}>{children} ↗</a>
    : <button className={className} type="button" disabled>{children}<span>{t.unknown}</span></button>;
}
