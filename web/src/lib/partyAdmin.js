import { adminClient } from "./admin.js";
import { httpUrl } from "./sources.js";

export const PARTY_DANCES = [
  { id: "salsa", name: "Salsa" },
  { id: "bachata", name: "Bachata" },
  { id: "kizomba", name: "Kizomba" },
];

export const PARTY_VENUE_WARNING = "같은 이름의 행사가 동일 시간대에 다른 장소로 등록되어 있습니다. 장소 정보를 확인하세요.";

const DANCE_IDS = PARTY_DANCES.map((dance) => dance.id);

export function partyFold(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isIanaTimezone(value) {
  const name = String(value ?? "").trim();
  if (!name) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function clearPoster(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return httpUrl(text) || null;
}

export function placeLabel(place) {
  const area = place?.adminArea ? ` (${place.adminArea})` : "";
  return `${place?.city ?? ""}${area}, ${place?.country ?? ""}`;
}

export function shapePlaces(rows, capitals) {
  const byId = new Map((capitals ?? []).map((capital) => [capital.id, capital]));
  return (rows ?? [])
    .map((row) => {
      const capital = row.capital_id ? byId.get(row.capital_id) : null;
      return {
        id: row.id,
        kind: row.capital_id ? "capital" : "city",
        capitalId: row.capital_id ?? "",
        city: capital?.city ?? row.city ?? "",
        country: capital?.country ?? row.country ?? "",
        iso2: (capital?.iso2 ?? row.iso2 ?? "").trim(),
        timezone: capital?.timezone ?? row.timezone ?? "",
        adminArea: row.admin_area ?? "",
      };
    })
    .sort((a, b) => placeLabel(a).localeCompare(placeLabel(b)));
}

export function shapeEvents(rows) {
  return (rows ?? []).map((row) => ({
    id: row.id,
    placeId: row.place_id,
    name: row.name,
    venueName: row.venue_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    officialUrl: row.official_url,
    source: row.source,
    sourceChecked: String(row.source_checked ?? "").slice(0, 10),
    posterUrl: row.poster_url ?? "",
    dances: (row.party_dances ?? []).map((item) => item.dance),
  }));
}

export function placeConflict(form, places, capitals) {
  if (form.kind === "capital") {
    const taken = (places ?? []).some((place) => place.capitalId === form.capitalId && place.id !== form.id);
    return taken ? "이 수도는 이미 PARTY 지역으로 등록되어 있습니다." : null;
  }
  const iso = String(form.iso2 ?? "").trim().toUpperCase();
  const city = partyFold(form.city);
  const admin = partyFold(form.adminArea || "");
  const matchesCapital = (capitals ?? []).some(
    (capital) => String(capital.iso2 ?? "").trim().toUpperCase() === iso && partyFold(capital.city) === city,
  );
  if (matchesCapital) return "수도와 같은 도시는 수도 연결로 등록해야 합니다.";
  const matchesPlace = (places ?? []).some((place) => (
    place.kind === "city"
    && place.id !== form.id
    && String(place.iso2 ?? "").trim().toUpperCase() === iso
    && partyFold(place.city) === city
    && partyFold(place.adminArea || "") === admin
  ));
  return matchesPlace ? "같은 국가·도시·행정구역의 지역이 이미 있습니다." : null;
}

export function localStamp(date, time) {
  return `${date ?? ""}T${time ?? ""}`;
}

export function zonedLocalToIso(localValue, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(localValue ?? "").trim());
  if (!match) throw new Error("시작·종료 시각을 입력하세요.");
  if (!isIanaTimezone(timeZone)) throw new Error("시간대는 유효한 IANA 이름이어야 합니다.");
  const wall = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const utc = wallTimeToUtc(wall, timeZone.trim());
  const back = wallParts(utc, timeZone.trim());
  if (back.year !== wall.year || back.month !== wall.month || back.day !== wall.day || back.hour !== wall.hour || back.minute !== wall.minute) {
    throw new Error("선택한 시간대에 없는 시각입니다.");
  }
  return utc.toISOString();
}

export function isoToZonedLocal(iso, timeZone) {
  if (!isIanaTimezone(timeZone)) throw new Error("시간대는 유효한 IANA 이름이어야 합니다.");
  const wall = wallParts(new Date(iso), timeZone.trim());
  return `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

export function findPartyConflict(form, events) {
  const start = zonedLocalToIso(localStamp(form.startsDate, form.startsTime), form.timezone);
  const end = zonedLocalToIso(localStamp(form.endsDate, form.endsTime), form.timezone);
  if (Date.parse(start) >= Date.parse(end)) throw new Error("종료 시각은 시작 시각보다 뒤여야 합니다.");
  const name = partyFold(form.name);
  const venue = partyFold(form.venueName);
  const hit = (events ?? []).find((event) => (
    event.id !== form.id
    && event.placeId === form.placeId
    && partyFold(event.name) === name
    && partyFold(event.venueName) === venue
    && Date.parse(start) < Date.parse(event.endsAt)
    && Date.parse(event.startsAt) < Date.parse(end)
  ));
  return hit ? "같은 장소명과 시간이 겹칩니다." : null;
}

export function findPartyVenueWarning(form, events) {
  const range = eventRange(form);
  if (!range) return null;
  const name = partyFold(form.name);
  const venue = partyFold(form.venueName);
  if (!name || !venue) return null;
  const hit = (events ?? []).some((event) => (
    event.id !== form.id
    && event.placeId === form.placeId
    && partyFold(event.name) === name
    && partyFold(event.venueName) !== venue
    && Date.parse(range.start) < Date.parse(event.endsAt)
    && Date.parse(event.startsAt) < Date.parse(range.end)
  ));
  return hit ? PARTY_VENUE_WARNING : null;
}

function eventRange(form) {
  try {
    const start = zonedLocalToIso(localStamp(form.startsDate, form.startsTime), form.timezone);
    const end = zonedLocalToIso(localStamp(form.endsDate, form.endsTime), form.timezone);
    if (Date.parse(start) >= Date.parse(end)) return null;
    return { start, end };
  } catch {
    return null;
  }
}

export function danceChanges(previous, next) {
  const before = new Set(previous ?? []);
  const after = new Set(next ?? []);
  return {
    add: [...after].filter((dance) => !before.has(dance)),
    remove: [...before].filter((dance) => !after.has(dance)),
  };
}

export function partyLoadError(error) {
  const text = error?.message ?? "";
  if (/party_places|party_dances|schema cache|does not exist|42P01|Could not find the table/i.test(text)) {
    return "PARTY 테이블이 이 데이터베이스에 아직 없습니다. 공개 화면은 그대로 사용할 수 있습니다.";
  }
  return text || "PARTY 관리 정보를 불러오지 못했습니다.";
}

export function partyWriteError(error) {
  const text = error?.message ?? "";
  if (text.includes("city matches a capital")) return new Error("수도와 같은 도시는 수도 연결로 등록해야 합니다.");
  if (text.includes("party_places_capital_id_key")) return new Error("이 수도는 이미 PARTY 지역으로 등록되어 있습니다.");
  if (text.includes("party_places_free_city_key")) return new Error("같은 국가·도시·행정구역의 지역이 이미 있습니다.");
  if (text.includes("city matches a party place alias") || text.includes("alias matches an official place name")) {
    return new Error("도시명이 다른 지역의 이름 또는 별칭과 겹칩니다.");
  }
  if (text.includes("timezone must be an IANA")) return new Error("시간대는 유효한 IANA 이름이어야 합니다.");
  if (text.includes("same name and venue")) return new Error("같은 장소명과 시간이 겹칩니다.");
  if (text.includes("at least one dance")) return new Error("댄스를 하나 이상 선택해야 합니다.");
  if (text.includes("official url")) return new Error("공식 링크는 http 또는 https여야 합니다.");
  return new Error(text || "저장하지 못했습니다.");
}

export async function loadPartyAdmin() {
  return loadPartyAdminWith(adminClient());
}

export async function loadPartyAdminWith(supabase) {
  const capitals = await read(supabase.from("capitals").select("id, city, country, iso2, timezone").order("city"));
  const placeRows = await read(
    supabase.from("party_places").select("id, capital_id, city, admin_area, country, iso2, timezone"),
  );
  const eventRows = await read(
    supabase.from("parties").select(
      "id, place_id, name, venue_name, starts_at, ends_at, official_url, source, source_checked, poster_url, party_dances(dance)",
    ).order("starts_at"),
  );
  return {
    capitals: capitals ?? [],
    places: shapePlaces(placeRows, capitals ?? []),
    events: shapeEvents(eventRows),
  };
}

export async function savePartyPlace(form, places, capitals) {
  return savePartyPlaceWith(adminClient(), form, places, capitals);
}

export async function savePartyPlaceWith(supabase, form, places, capitals) {
  await requireAdmin(supabase);
  const errors = validatePlace(form);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const conflict = placeConflict(form, places, capitals);
  if (conflict) throw new Error(conflict);
  if (form.kind === "capital") {
    if (form.id) throw new Error("수도 지역의 도시 정보는 수정하지 않습니다.");
    const inserted = await supabase.from("party_places").insert({ capital_id: form.capitalId }).select("id").single();
    if (inserted.error) throw partyWriteError(inserted.error);
    return inserted.data.id;
  }
  const row = {
    city: form.city.trim(),
    admin_area: form.adminArea.trim() || null,
    country: form.country.trim(),
    iso2: form.iso2.trim().toUpperCase(),
    timezone: form.timezone.trim(),
  };
  const result = form.id
    ? await supabase.from("party_places").update(row).eq("id", form.id)
    : await supabase.from("party_places").insert(row).select("id").single();
  if (result.error) throw partyWriteError(result.error);
  return form.id ?? result.data.id;
}

export async function savePartyEvent(form, events) {
  return savePartyEventWith(adminClient(), form, events);
}

export async function savePartyEventWith(supabase, form, events) {
  await requireAdmin(supabase);
  const errors = validateEvent(form);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const conflict = findPartyConflict(form, events);
  if (conflict) throw new Error(conflict);
  const venueWarning = findPartyVenueWarning(form, events);
  const poster = clearPoster(form.posterUrl);
  const posterCleared = Boolean(String(form.posterUrl ?? "").trim()) && poster === null;
  const dances = DANCE_IDS.filter((dance) => form.dances.includes(dance));
  const row = {
    place_id: form.placeId,
    name: form.name.trim(),
    venue_name: form.venueName.trim(),
    starts_at: zonedLocalToIso(localStamp(form.startsDate, form.startsTime), form.timezone),
    ends_at: zonedLocalToIso(localStamp(form.endsDate, form.endsTime), form.timezone),
    official_url: form.officialUrl.trim(),
    source: form.source.trim(),
    source_checked: form.sourceChecked,
    poster_url: poster,
  };
  if (form.id) {
    const updated = await supabase.from("parties").update(row).eq("id", form.id);
    if (updated.error) throw partyWriteError(updated.error);
    const changes = danceChanges(form.originalDances, dances);
    if (changes.add.length > 0) {
      const added = await supabase.from("party_dances").insert(
        changes.add.map((dance) => ({ party_id: form.id, dance })),
      );
      if (added.error) throw partyWriteError(added.error);
    }
    if (changes.remove.length > 0) {
      const removed = await supabase.from("party_dances").delete().eq("party_id", form.id).in("dance", changes.remove);
      if (removed.error) throw partyWriteError(removed.error);
    }
    return { id: form.id, posterCleared, venueWarning: Boolean(venueWarning) };
  }
  const inserted = await supabase.from("parties").insert({
    ...row,
    party_dances: dances.map((dance) => ({ dance })),
  }).select("id").single();
  if (inserted.error) throw partyWriteError(inserted.error);
  return { id: inserted.data.id, posterCleared, venueWarning: Boolean(venueWarning) };
}

function validatePlace(form) {
  const errors = [];
  if (form.kind === "capital") {
    if (!form.capitalId) errors.push("수도를 선택하세요.");
    return errors;
  }
  if (!form.city?.trim()) errors.push("도시명을 입력하세요.");
  if (!form.country?.trim()) errors.push("국가를 입력하세요.");
  if (!/^[A-Za-z]{2}$/.test(form.iso2?.trim() ?? "")) errors.push("국가코드는 2자리여야 합니다.");
  if (!isIanaTimezone(form.timezone)) errors.push("시간대는 유효한 IANA 이름이어야 합니다.");
  return errors;
}

function validateEvent(form) {
  const errors = [];
  if (!form.placeId) errors.push("지역을 선택하세요.");
  if (!form.name?.trim()) errors.push("행사명을 입력하세요.");
  if (!form.venueName?.trim()) errors.push("장소명을 입력하세요.");
  if (!form.startsDate || !form.startsTime || !form.endsDate || !form.endsTime) errors.push("시작·종료 시각을 입력하세요.");
  if (!httpUrl(form.officialUrl)) errors.push("공식 링크는 http 또는 https여야 합니다.");
  if (!form.source?.trim()) errors.push("출처를 입력하세요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.sourceChecked ?? "")) errors.push("확인일을 입력하세요.");
  if (!form.dances?.some((dance) => DANCE_IDS.includes(dance))) errors.push("댄스를 하나 이상 선택해야 합니다.");
  return errors;
}

async function requireAdmin(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (data.session?.user?.app_metadata?.role !== "admin") throw new Error("Admin sign-in is required.");
}

async function read(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function wallTimeToUtc(wall, timeZone) {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, 0);
  const utc = guess - zoneOffset(guess, timeZone);
  return new Date(guess - zoneOffset(utc, timeZone));
}

function zoneOffset(utcMs, timeZone) {
  const shown = wallParts(new Date(utcMs), timeZone);
  const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
  return shownUtc - utcMs;
}

function wallParts(date, timeZone) {
  const list = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map = {};
  for (const part of list) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  let day = Number(map.day);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day,
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function pad(value, size = 2) {
  return String(value).padStart(size, "0");
}
