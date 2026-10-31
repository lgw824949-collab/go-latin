import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  adLoadError,
  adPeriod,
  findAdConflict,
  loadAdAdmin,
  saveAd,
  setAdStatus,
} from "../lib/adAdmin.js";
import { signOutAdmin, watchAdminSession } from "../lib/admin.js";
import { isoToZonedLocal, placeLabel } from "../lib/partyAdmin.js";

const EMPTY = {
  id: null,
  placement: "HOME",
  placeId: "",
  partyId: "",
  advertiser: "",
  destinationUrl: "",
  startsDate: "",
  startsTime: "",
  endsDate: "",
  endsTime: "",
  rank: "1",
  status: "active",
  timezone: "",
};

export default function AdManage() {
  const [access, setAccess] = useState("checking");

  useEffect(() => watchAdminSession(setAccess), []);

  if (access === "checking") {
    return (
      <main className="wrap admin">
        <p className="count">Checking sign-in.</p>
      </main>
    );
  }

  if (access !== "admin") return <Navigate to="/admin" replace />;
  return <AdEditor />;
}

function AdEditor() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState(null);

  async function reload() {
    const loaded = await loadAdAdmin();
    setPlaces(loaded.places);
    setEvents(loaded.events);
    setAds(loaded.ads);
    setStatus("ready");
    return loaded;
  }

  useEffect(() => {
    let live = true;
    loadAdAdmin()
      .then((loaded) => {
        if (!live) return;
        setPlaces(loaded.places);
        setEvents(loaded.events);
        setAds(loaded.ads);
        setStatus("ready");
      })
      .catch((error) => {
        if (!live) return;
        setStatus("error");
        setMessage(adLoadError(error));
      });
    return () => {
      live = false;
    };
  }, []);

  const conflict = form ? safeConflict(form, ads) : null;
  const choices = form?.placement === "CITY"
    ? events.filter((event) => event.placeId === form.placeId)
    : events;
  const selectedEvent = events.find((event) => event.id === form?.partyId);
  const clock = places.find((place) => place.id === (form?.placement === "CITY" ? form.placeId : selectedEvent?.placeId));

  function update(next) {
    const event = events.find((item) => item.id === next.partyId);
    const place = places.find((item) => item.id === (next.placement === "CITY" ? next.placeId : event?.placeId));
    const limit = next.placement === "CITY" ? 3 : 5;
    const rank = Math.min(Number(next.rank) || 1, limit);
    setForm({ ...next, rank: String(rank), timezone: place?.timezone ?? "" });
  }

  async function onSave(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      await saveAd({ ...form, timezone: clock?.timezone ?? "" }, ads, events);
      setForm(null);
      setMessage("광고를 저장했습니다.");
      await reload();
    } catch (error) {
      setStatus("ready");
      setMessage(error.message);
    }
  }

  async function changeStatus(ad, next) {
    setMessage("");
    try {
      await setAdStatus(ad, next, ads);
      setMessage(next === "paused" ? "광고를 일시정지했습니다." : "광고를 다시 켰습니다.");
      await reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="wrap admin">
      <h1>GO LATIN 광고 관리</h1>
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
          <ul className="bar-list">
            {ads.map((ad) => (
              <li key={ad.id}>
                <button type="button" onClick={() => setForm(formFromAd(ad))}>
                  {ad.placement}{ad.cityLabel ? ` · ${ad.cityLabel}` : ""}
                </button>
                <p className="count">{ad.partyName} · 순위 {ad.rank} · {ad.status === "paused" ? "일시정지" : "활성"}</p>
                <p className="count">{adPeriod(ad)}</p>
                <p className="count">{ad.advertiser}</p>
                <p><a href={ad.destinationUrl} rel="noreferrer">{ad.destinationUrl}</a></p>
                <button type="button" className="save" onClick={() => changeStatus(ad, ad.status === "paused" ? "active" : "paused")}>
                  {ad.status === "paused" ? "재개" : "일시정지"}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="save" onClick={() => update({ ...EMPTY })}>광고 추가</button>
          {form ? (
            <form onSubmit={onSave}>
              {conflict ? <p className="venue-note">{conflict}</p> : null}
              <label>
                구분
                <select value={form.placement} onChange={(event) => update({ ...form, placement: event.target.value, placeId: "", partyId: "" })}>
                  <option value="HOME">HOME</option>
                  <option value="CITY">CITY</option>
                </select>
              </label>
              {form.placement === "CITY" ? (
                <label>
                  도시
                  <select value={form.placeId} onChange={(event) => update({ ...form, placeId: event.target.value, partyId: "" })}>
                    <option value="">선택</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>{placeLabel(place)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                행사
                <select value={form.partyId} onChange={(event) => update({ ...form, partyId: event.target.value })}>
                  <option value="">선택</option>
                  {choices.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <Field label="광고주" value={form.advertiser} onChange={(advertiser) => update({ ...form, advertiser })} />
              <Field label="이동 주소" type="url" value={form.destinationUrl} onChange={(destinationUrl) => update({ ...form, destinationUrl })} />
              <Field label="시작일" type="date" value={form.startsDate} onChange={(startsDate) => update({ ...form, startsDate })} />
              <Field label="시작 시각" type="time" value={form.startsTime} onChange={(startsTime) => update({ ...form, startsTime })} />
              <Field label="종료일" type="date" value={form.endsDate} onChange={(endsDate) => update({ ...form, endsDate })} />
              <Field label="종료 시각" type="time" value={form.endsTime} onChange={(endsTime) => update({ ...form, endsTime })} />
              {clock?.timezone ? <p className="count">시각은 {clock.timezone} 기준입니다.</p> : null}
              <label>
                순위
                <select value={form.rank} onChange={(event) => update({ ...form, rank: event.target.value })}>
                  {ranks(form.placement).map((rank) => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </label>
              <button className="save" type="submit" disabled={status === "saving"}>저장</button>
              <button className="save" type="button" onClick={() => setForm(null)}>취소</button>
            </form>
          ) : null}
        </>
      )}
    </main>
  );
}

function ranks(placement) {
  return placement === "CITY" ? [1, 2, 3] : [1, 2, 3, 4, 5];
}

function formFromAd(ad) {
  const start = splitLocal(ad.startsAt, ad.timezone);
  const end = splitLocal(ad.endsAt, ad.timezone);
  return {
    ...EMPTY,
    id: ad.id,
    placement: ad.placement,
    placeId: ad.placeId,
    partyId: ad.partyId,
    advertiser: ad.advertiser,
    destinationUrl: ad.destinationUrl,
    startsDate: start.date,
    startsTime: start.time,
    endsDate: end.date,
    endsTime: end.time,
    rank: String(ad.rank),
    status: ad.status,
    timezone: ad.timezone,
  };
}

function splitLocal(iso, timeZone) {
  try {
    const [date, time] = isoToZonedLocal(iso, timeZone).split("T");
    return { date, time };
  } catch {
    return { date: "", time: "" };
  }
}

function safeConflict(form, ads) {
  if (!form.startsDate || !form.startsTime || !form.endsDate || !form.endsTime || !form.timezone) return null;
  try {
    return findAdConflict(form, ads);
  } catch {
    return null;
  }
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
