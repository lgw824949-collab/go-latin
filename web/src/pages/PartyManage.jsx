import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { signOutAdmin, watchAdminSession } from "../lib/admin.js";
import {
  PARTY_DANCES,
  isoToZonedLocal,
  findPartyVenueWarning,
  loadPartyAdmin,
  PARTY_VENUE_WARNING,
  partyLoadError,
  placeLabel,
  savePartyEvent,
  savePartyPlace,
} from "../lib/partyAdmin.js";

const EMPTY_CITY = {
  id: null,
  kind: "city",
  capitalId: "",
  city: "",
  adminArea: "",
  country: "",
  iso2: "",
  timezone: "",
};

const EMPTY_EVENT = {
  id: null,
  name: "",
  venueName: "",
  startsDate: "",
  startsTime: "",
  endsDate: "",
  endsTime: "",
  officialUrl: "",
  source: "",
  sourceChecked: "",
  posterUrl: "",
  dances: [],
  originalDances: [],
};

export default function PartyManage() {
  const [access, setAccess] = useState("checking");

  useEffect(() => watchAdminSession(setAccess), []);

  if (access === "checking") {
    return (
      <main className="wrap admin">
        <p className="count">Checking sign-in.</p>
      </main>
    );
  }

  if (access !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <PartyEditor />;
}

function PartyEditor() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [capitals, setCapitals] = useState([]);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [placeId, setPlaceId] = useState("");
  const [placeForm, setPlaceForm] = useState(null);
  const [eventForm, setEventForm] = useState(null);

  async function reload() {
    const loaded = await loadPartyAdmin();
    setCapitals(loaded.capitals);
    setPlaces(loaded.places);
    setEvents(loaded.events);
    setStatus("ready");
    return loaded;
  }

  useEffect(() => {
    let live = true;
    loadPartyAdmin()
      .then((loaded) => {
        if (!live) return;
        setCapitals(loaded.capitals);
        setPlaces(loaded.places);
        setEvents(loaded.events);
        setStatus("ready");
      })
      .catch((error) => {
        if (!live) return;
        setStatus("error");
        setMessage(partyLoadError(error));
      });
    return () => {
      live = false;
    };
  }, []);

  const selected = places.find((place) => place.id === placeId) ?? null;
  const visibleEvents = selected ? events.filter((event) => event.placeId === selected.id) : events;
  const venueWarning = eventForm && selected
    ? findPartyVenueWarning({ ...eventForm, placeId: selected.id, timezone: selected.timezone }, events)
    : null;
  const openCapitals = capitals.filter((capital) => !places.some((place) => place.capitalId === capital.id));

  async function onSavePlace(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const savedId = await savePartyPlace(placeForm, places, capitals);
      await reload().catch((error) => {
        throw new Error(partyLoadError(error));
      });
      setPlaceId(savedId);
      setPlaceForm(null);
      setMessage("지역을 저장했습니다.");
    } catch (error) {
      setStatus("ready");
      setMessage(error.message);
    }
  }

  async function onSaveEvent(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const saved = await savePartyEvent({
        ...eventForm,
        placeId: selected.id,
        timezone: selected.timezone,
      }, events);
      await reload().catch((error) => {
        throw new Error(partyLoadError(error));
      });
      setEventForm(null);
      const notes = [];
      if (saved.venueWarning) notes.push(PARTY_VENUE_WARNING);
      if (saved.posterCleared) notes.push("포스터 주소가 올바르지 않아 비우고 행사를 저장했습니다.");
      if (notes.length === 0) notes.push("행사를 저장했습니다.");
      setMessage(notes.join(" "));
    } catch (error) {
      setStatus("ready");
      setMessage(error.message);
    }
  }

  return (
    <main className="wrap admin">
      <h1>GO LATIN PARTY 관리자</h1>
      <p>
        <Link className="save" to="/admin">BAR 관리</Link>
      </p>
      <button type="button" className="save" onClick={() => signOutAdmin().catch((error) => setMessage(error.message))}>
        Log out
      </button>
      {message ? <p className="venue-note">{message}</p> : null}
      {status === "loading" ? <p className="count">Loading.</p> : null}
      {status === "error" ? null : (
        <>
          <h2>지역</h2>
          <label>
            지역 선택
            <select value={placeId} onChange={(event) => {
              setPlaceId(event.target.value);
              setPlaceForm(null);
              setEventForm(null);
            }}>
              <option value="">전체 행사</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>{placeLabel(place)}</option>
              ))}
            </select>
          </label>
          <p>
            <button type="button" className="save" onClick={() => setPlaceForm({ ...EMPTY_CITY, kind: "capital", capitalId: openCapitals[0]?.id ?? "" })}>
              수도 연결
            </button>
            <button type="button" className="save" onClick={() => setPlaceForm({ ...EMPTY_CITY })}>
              일반 도시 추가
            </button>
            {selected?.kind === "city" ? (
              <button type="button" className="save" onClick={() => setPlaceForm({ ...selected })}>
                일반 도시 수정
              </button>
            ) : null}
          </p>
          {placeForm ? (
            <form onSubmit={onSavePlace}>
              {placeForm.kind === "capital" ? (
                <label>
                  수도
                  <select value={placeForm.capitalId} onChange={(event) => setPlaceForm({ ...placeForm, capitalId: event.target.value })}>
                    <option value="">선택</option>
                    {openCapitals.map((capital) => (
                      <option key={capital.id} value={capital.id}>{capital.city}, {capital.country}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <Field label="도시명" value={placeForm.city} onChange={(city) => setPlaceForm({ ...placeForm, city })} />
                  <Field label="행정구역" value={placeForm.adminArea} onChange={(adminArea) => setPlaceForm({ ...placeForm, adminArea })} />
                  <Field label="국가" value={placeForm.country} onChange={(country) => setPlaceForm({ ...placeForm, country })} />
                  <Field label="국가코드" value={placeForm.iso2} onChange={(iso2) => setPlaceForm({ ...placeForm, iso2 })} />
                  <Field label="시간대" value={placeForm.timezone} onChange={(timezone) => setPlaceForm({ ...placeForm, timezone })} />
                </>
              )}
              <button className="save" type="submit" disabled={status === "saving"}>저장</button>
              <button className="save" type="button" onClick={() => setPlaceForm(null)}>취소</button>
            </form>
          ) : null}

          <h2>행사</h2>
          {selected ? <p className="count">{placeLabel(selected)} · {selected.timezone}</p> : <p className="count">전체 {events.length}건</p>}
          <ul className="bar-list">
            {visibleEvents.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openEvent(item)}>
                  {item.name} · {item.venueName}
                </button>
                <p className="count">{eventWhen(item, places)}</p>
              </li>
            ))}
          </ul>
          {selected ? (
            <button type="button" className="save" onClick={() => setEventForm({ ...EMPTY_EVENT })}>
              행사 추가
            </button>
          ) : <p className="count">행사를 등록하려면 지역을 선택하세요.</p>}
          {eventForm && selected ? (
            <form onSubmit={onSaveEvent}>
              {venueWarning ? <p className="venue-note">{venueWarning}</p> : null}
              <Field label="행사명" value={eventForm.name} onChange={(name) => setEventForm({ ...eventForm, name })} />
              <Field label="장소명" value={eventForm.venueName} onChange={(venueName) => setEventForm({ ...eventForm, venueName })} />
              <Field label="시작일" type="date" value={eventForm.startsDate} onChange={(startsDate) => setEventForm({ ...eventForm, startsDate })} />
              <Field label="시작 시각" type="time" value={eventForm.startsTime} onChange={(startsTime) => setEventForm({ ...eventForm, startsTime })} />
              <Field label="종료일" type="date" value={eventForm.endsDate} onChange={(endsDate) => setEventForm({ ...eventForm, endsDate })} />
              <Field label="종료 시각" type="time" value={eventForm.endsTime} onChange={(endsTime) => setEventForm({ ...eventForm, endsTime })} />
              <Field label="공식 링크" type="url" value={eventForm.officialUrl} onChange={(officialUrl) => setEventForm({ ...eventForm, officialUrl })} />
              <Field label="출처" value={eventForm.source} onChange={(source) => setEventForm({ ...eventForm, source })} />
              <Field label="확인일" type="date" value={eventForm.sourceChecked} onChange={(sourceChecked) => setEventForm({ ...eventForm, sourceChecked })} />
              <Field label="포스터 URL" type="url" value={eventForm.posterUrl} onChange={(posterUrl) => setEventForm({ ...eventForm, posterUrl })} />
              <fieldset>
                <legend>댄스</legend>
                {PARTY_DANCES.map((dance) => (
                  <label key={dance.id} className="check">
                    <input
                      type="checkbox"
                      checked={eventForm.dances.includes(dance.id)}
                      onChange={() => setEventForm({
                        ...eventForm,
                        dances: eventForm.dances.includes(dance.id)
                          ? eventForm.dances.filter((id) => id !== dance.id)
                          : [...eventForm.dances, dance.id],
                      })}
                    />
                    {dance.name}
                  </label>
                ))}
              </fieldset>
              <button className="save" type="submit" disabled={status === "saving"}>저장</button>
              <button className="save" type="button" onClick={() => setEventForm(null)}>취소</button>
            </form>
          ) : null}
        </>
      )}
    </main>
  );

  function openEvent(item) {
    const place = places.find((entry) => entry.id === item.placeId);
    if (!place?.timezone) {
      setMessage("이 지역에는 시간대가 없습니다.");
      return;
    }
    const start = isoToZonedLocal(item.startsAt, place.timezone);
    const end = isoToZonedLocal(item.endsAt, place.timezone);
    setPlaceId(place.id);
    setEventForm({
      id: item.id,
      name: item.name,
      venueName: item.venueName,
      startsDate: start.slice(0, 10),
      startsTime: start.slice(11, 16),
      endsDate: end.slice(0, 10),
      endsTime: end.slice(11, 16),
      officialUrl: item.officialUrl,
      source: item.source,
      sourceChecked: item.sourceChecked,
      posterUrl: item.posterUrl,
      dances: item.dances,
      originalDances: item.dances,
    });
  }
}

function eventWhen(item, places) {
  const place = places.find((entry) => entry.id === item.placeId);
  if (!place?.timezone) return item.venueName;
  const start = isoToZonedLocal(item.startsAt, place.timezone).replace("T", " ");
  const end = isoToZonedLocal(item.endsAt, place.timezone).replace("T", " ");
  return `${start} – ${end}`;
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
