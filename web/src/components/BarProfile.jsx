import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocalNow } from "../lib/useLocalNow.js";
import { profileModel, UNKNOWN } from "../lib/barProfile.js";
import { barAnchor, tonightBarPath, tonightPathForRoute } from "../lib/barAnchor.js";
import { DANCES } from "../lib/filterCapitals.js";
import { httpUrl, sourceCheckedLabel } from "../lib/sources.js";

const REPORT_OPTIONS = ["영업시간 또는 음악 일정이 달라요", "주소 또는 위치가 달라요", "입장료 또는 레슨 정보가 달라요", "폐업했거나 기타 정보가 틀려요"];

export default function BarProfile({ venue, capital, venues = [], search = "", from, now }) {
  const liveNow = useLocalNow();
  const model = profileModel(venue, capital, now ?? liveNow);
  const [reportOpen, setReportOpen] = useState(false);
  const others = venues.filter(other => other.id !== venue.id && other.status !== "permanently_closed");
  const cityPath = `/c/${capital.id}${search}`;
  const dance = new URLSearchParams(search).get("dance");
  const website = httpUrl(venue.website);
  const sources = (venue.sources ?? []).map(source => ({ ...source, url: httpUrl(source.url) }));
  const mainSource = httpUrl(venue.sourceUrl);
  if (mainSource && !sources.some(source => source.url === mainSource)) {
    sources.push({ kind: venue.source || "출처", url: mainSource, checkedAt: venue.sourceChecked });
  }

  return (
    <main className="bar-profile" id={barAnchor(venue.id)} key={venue.id}>
      <header className="bar-profile-heading">
        <Link className="bar-profile-back" to={cityPath} state={from ? { from } : null}>← {capital.city}으로 돌아가기</Link>
        <p className="bar-profile-breadcrumb">{capital.country || UNKNOWN} · {capital.city || UNKNOWN}</p>
        <h1>{venue.name || UNKNOWN}</h1>
        <p>현지어 이름 · {UNKNOWN}</p>
        <p>{DANCES.filter(dance => (venue.dances ?? []).includes(dance.id)).map(dance => dance.name).join(" · ") || UNKNOWN}</p>
      </header>

      <section className="bar-profile-tonight" aria-labelledby="bar-tonight-title">
        <p className="bar-profile-eyebrow">{model.today?.name ?? UNKNOWN} · 현지 시간 {model.clock?.time ?? UNKNOWN}</p>
        <h2 id="bar-tonight-title">오늘 밤</h2>
        <p className="bar-profile-music">{model.today?.closed ? "오늘은 쉬어요" : model.today?.dances.length ? model.today.dances.join(" · ") : UNKNOWN}</p>
        {!model.today?.closed && <p>시작 시간 · {UNKNOWN}</p>}
        <p className="bar-profile-muted">{model.clock?.timeZone ?? UNKNOWN} · 등록된 반복 일정이며 당일 개최는 확정되지 않았어요.</p>
      </section>

      <div className="bar-profile-actions">
        <Action href={model.mapsUrl} primary>길찾기</Action>
        <Action href={model.instagram}>인스타그램</Action>
      </div>

      <section className="bar-profile-section" aria-labelledby="bar-week-title">
        <h2 id="bar-week-title">이번 주 음악</h2>
        <p className="bar-profile-muted">등록된 요일별 반복 일정이에요. 음악 시작·종료 시각은 영업시간과 다르며, 확인되지 않은 시각은 표시하지 않아요.</p>
        <dl className="bar-profile-week">{model.week.map(day => <div key={day.weekday} className={day.today ? "is-today" : ""} aria-current={day.today ? "date" : undefined}>
          <dt>{day.name}{day.today ? <span>오늘</span> : null}</dt>
          <dd>{day.closed ? "쉬어요" : <>{day.dances.length ? day.dances.join(" · ") : UNKNOWN}<span>시작 시간 · {UNKNOWN}</span></>}</dd>
        </div>)}</dl>
      </section>

      <section className="bar-profile-section" aria-labelledby="bar-facts-title">
        <h2 id="bar-facts-title">알아두면 좋은 것</h2>
        <dl className="bar-profile-facts">
          <div><dt>입장료</dt><dd>{UNKNOWN}</dd></div>
          <div><dt>초보 레슨</dt><dd>{UNKNOWN}</dd></div>
          <div><dt>영어 소통</dt><dd>{UNKNOWN}</dd></div>
          <div><dt>주소</dt><dd>{venue.address || UNKNOWN}</dd></div>
        </dl>
        <p>전화 · {venue.phone || UNKNOWN}</p>
        <p>홈페이지 · {website ? <a href={website} target="_blank" rel="noreferrer">{website}</a> : UNKNOWN}</p>
      </section>

      <section className="bar-profile-section" aria-labelledby="bar-photos-title">
        <h2 id="bar-photos-title">BAR 사진</h2>
        <div className="bar-profile-photos">{["입구", "내부"].map(label => <figure key={label}><div role="img" aria-label={`${label} 사진 없음`}>사진 없음</div><figcaption>{label}</figcaption></figure>)}</div>
      </section>

      <section className={`bar-profile-section bar-profile-check${model.age > 30 ? " is-stale" : ""}`} aria-labelledby="bar-check-title">
        <h2 id="bar-check-title">마지막 정보 확인</h2>
        <p>{model.age == null ? UNKNOWN : <><time dateTime={venue.sourceChecked}>{venue.sourceChecked}</time> · {model.age === 0 ? "오늘" : `${model.age}일 전`}</>}</p>
        <p className="bar-profile-muted">출처에 저장된 확인일이며, 모든 항목의 정확성을 보증하지 않아요.</p>
        {model.age > 30 && <>
          <button type="button" className="bar-profile-button" aria-expanded={reportOpen} aria-controls="bar-report" onClick={() => setReportOpen(!reportOpen)}>정보가 틀려요</button>
          {reportOpen && <div id="bar-report" className="bar-profile-report">
            <fieldset><legend>어떤 정보가 다른가요?</legend>{REPORT_OPTIONS.map(text => <label key={text}><input type="checkbox" />{text}</label>)}</fieldset>
            <p id="bar-report-note" role="status">아직 제보 전송이 연결되지 않았어요. 선택한 내용은 저장되거나 전송되지 않아요.</p>
            <button type="button" className="bar-profile-button" disabled aria-describedby="bar-report-note">알려주기 · 준비 중</button>
          </div>}
        </>}
        <details className="bar-profile-existing"><summary>기존 영업시간 · 출처 보기</summary>
          <h3>등록된 운영시간</h3><dl className="bar-profile-facts">{model.week.map(day => <div key={day.weekday}><dt>{day.name}</dt><dd>{day.hours}</dd></div>)}</dl>
          <p>(+1 day)는 다음 날 종료를 뜻해요. 오래되거나 상충하는 운영정보는 Not confirmed로 표시돼요.</p>
          <ul>{sources.map((source, index) => <li key={index}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.kind || "출처"}</a> : "출처 링크: 아직 정보가 없어요"} · {sourceCheckedLabel(source.checkedAt) || UNKNOWN}</li>)}</ul>
          {!sources.length && <p>출처 링크 · {UNKNOWN}</p>}
          {venue.sourceNote ? <p>{venue.sourceNote}</p> : null}
          <Link to={tonightPathForRoute(`/c/${capital.id}`, search)}>Tonight에서 확인하기</Link>
        </details>
      </section>

      <section className="bar-profile-section bar-profile-other" aria-labelledby="bar-other-title">
        <h2 id="bar-other-title">{capital.city}의 다른 BAR</h2>
        {others.length ? <div className="bar-profile-cards">{others.map(other => <Link key={other.id} to={tonightBarPath(capital.id, other.id, dance)} state={from ? { from } : null}>
          <h3>{other.name || UNKNOWN}</h3>
          <p>{DANCES.filter(d => (other.dances ?? []).includes(d.id)).map(d => d.name).join(" · ") || UNKNOWN}</p><span>상세보기 →</span>
        </Link>)}</div> : <p>아직 등록된 다른 BAR가 없어요</p>}
      </section>
    </main>
  );
}

function Action({ href, primary = false, children }) {
  const className = `bar-profile-button${primary ? " is-primary" : ""}`;
  return href ? <a className={className} href={href} target="_blank" rel="noreferrer">{children} ↗</a>
    : <button className={className} type="button" disabled>{children}<span>{UNKNOWN}</span></button>;
}
