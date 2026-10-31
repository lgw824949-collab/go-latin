import { adminClient } from "./admin.js";
import { homeAdConflict } from "./homeAds.js";
import { httpUrl } from "./sources.js";
import {
  isoToZonedLocal,
  loadPartyAdminWith,
  localStamp,
  placeLabel,
  zonedLocalToIso,
} from "./partyAdmin.js";

const RANK_LIMIT = { HOME: 5, CITY: 3 };

export function adLoadError(error) {
  const text = error?.message ?? "";
  if (/party_ads|party_places|parties|schema cache|does not exist|42P01|Could not find the table/i.test(text)) {
    return "광고 테이블이 이 데이터베이스에 아직 없습니다. 공개 화면은 그대로 사용할 수 있습니다.";
  }
  return text || "광고 목록을 불러오지 못했습니다.";
}

export function adWriteError(error) {
  const text = error?.message ?? "";
  if (text.includes("same rank")) return new Error("같은 순위의 광고 기간이 겹칩니다.");
  if (text.includes("same party")) return new Error("같은 행사의 광고 기간이 겹칩니다.");
  if (text.includes("home ad rank")) return new Error("HOME 순위는 1부터 5까지입니다.");
  if (text.includes("city ad rank")) return new Error("CITY 순위는 1부터 3까지입니다.");
  if (text.includes("does not store a place")) return new Error("HOME 광고에는 도시를 저장하지 않습니다.");
  if (text.includes("must match the party place")) return new Error("CITY 광고의 도시는 행사의 지역과 같아야 합니다.");
  if (text.includes("destination")) return new Error("이동 주소는 http 또는 https여야 합니다.");
  if (text.includes("ad interval")) return new Error("시작은 종료보다 빨라야 합니다.");
  if (text.includes("row-level security") || text.includes("permission denied")) {
    return new Error("관리자만 광고를 바꿀 수 있습니다.");
  }
  return new Error(text || "저장하지 못했습니다.");
}

export function adPeriod(ad) {
  if (!ad?.startsAt || !ad?.endsAt || !ad?.timezone) return "";
  try {
    return `${shown(ad.startsAt, ad.timezone)} – ${shown(ad.endsAt, ad.timezone)}`;
  } catch {
    return "";
  }
}

export function findAdConflict(form, ads) {
  const start = zonedLocalToIso(localStamp(form.startsDate, form.startsTime), form.timezone);
  const end = zonedLocalToIso(localStamp(form.endsDate, form.endsTime), form.timezone);
  if (Date.parse(start) >= Date.parse(end)) return "시작은 종료보다 빨라야 합니다.";
  const message = homeAdConflict({
    id: form.id,
    status: form.status || "active",
    placement: form.placement,
    partyId: form.partyId,
    rank: Number(form.rank),
    placeId: form.placement === "CITY" ? form.placeId : "",
    startsAt: start,
    endsAt: end,
  }, ads);
  if (message?.includes("same rank")) return "같은 순위의 광고 기간이 겹칩니다.";
  if (message?.includes("same party")) return "같은 행사의 광고 기간이 겹칩니다.";
  return message;
}

export async function loadAdAdmin() {
  return loadAdAdminWith(adminClient());
}

export async function loadAdAdminWith(supabase) {
  const directory = await loadPartyAdminWith(supabase);
  let ads = [];
  try {
    const rows = await read(supabase.from("party_ads").select(
      "id, party_id, advertiser, placement, place_id, rank, starts_at, ends_at, status, destination_url",
    ).order("starts_at"));
    ads = shapeAds(rows, directory.events, directory.places);
  } catch (error) {
    throw new Error(adLoadError(error));
  }
  return { ...directory, ads };
}

export async function saveAd(form, ads, events) {
  return saveAdWith(adminClient(), form, ads, events);
}

export async function saveAdWith(supabase, form, ads, events) {
  await requireAdmin(supabase);
  const errors = validateAd(form, events);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const conflict = findAdConflict(form, ads);
  if (conflict) throw new Error(conflict);
  const row = adRow(form);
  const result = form.id
    ? await supabase.from("party_ads").update(row).eq("id", form.id)
    : await supabase.from("party_ads").insert(row).select("id").single();
  if (result.error) throw adWriteError(result.error);
  return form.id ?? result.data.id;
}

export async function setAdStatus(ad, status, ads) {
  return setAdStatusWith(adminClient(), ad, status, ads);
}

export async function setAdStatusWith(supabase, ad, status, ads) {
  await requireAdmin(supabase);
  if (status !== "active" && status !== "paused") throw new Error("광고 상태를 확인하세요.");
  if (status === "active") {
    const message = homeAdConflict({ ...ad, status: "active" }, ads);
    if (message?.includes("same rank")) throw new Error("같은 순위의 광고 기간이 겹칩니다.");
    if (message?.includes("same party")) throw new Error("같은 행사의 광고 기간이 겹칩니다.");
    if (message) throw new Error(message);
  }
  const result = await supabase.from("party_ads").update({ status }).eq("id", ad.id);
  if (result.error) throw adWriteError(result.error);
}

function validateAd(form, events) {
  const errors = [];
  const limit = RANK_LIMIT[form.placement];
  const rank = Number(form.rank);
  if (!limit) errors.push("광고 구분을 선택하세요.");
  if (form.placement === "CITY" && !form.placeId) errors.push("도시를 선택하세요.");
  if (!form.partyId) errors.push("행사를 선택하세요.");
  const event = (events ?? []).find((item) => item.id === form.partyId);
  if (form.placement === "CITY" && event && event.placeId !== form.placeId) {
    errors.push("CITY 광고의 도시는 행사의 지역과 같아야 합니다.");
  }
  if (!form.advertiser?.trim()) errors.push("광고주 이름을 입력하세요.");
  if (!httpUrl(form.destinationUrl)) errors.push("이동 주소는 http 또는 https여야 합니다.");
  if (!form.startsDate || !form.startsTime || !form.endsDate || !form.endsTime) errors.push("시작·종료 시각을 입력하세요.");
  if (!Number.isInteger(rank) || rank < 1 || rank > limit) {
    errors.push(form.placement === "CITY" ? "CITY 순위는 1부터 3까지입니다." : "HOME 순위는 1부터 5까지입니다.");
  }
  return errors;
}

function adRow(form) {
  return {
    party_id: form.partyId,
    advertiser: form.advertiser.trim(),
    placement: form.placement,
    place_id: form.placement === "CITY" ? form.placeId : null,
    rank: Number(form.rank),
    starts_at: zonedLocalToIso(localStamp(form.startsDate, form.startsTime), form.timezone),
    ends_at: zonedLocalToIso(localStamp(form.endsDate, form.endsTime), form.timezone),
    status: form.status === "paused" ? "paused" : "active",
    destination_url: form.destinationUrl.trim(),
  };
}

function shapeAds(rows, events, places) {
  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const placeById = new Map((places ?? []).map((place) => [place.id, place]));
  return (rows ?? []).map((row) => {
    const event = eventById.get(row.party_id);
    const place = placeById.get(row.place_id || event?.placeId);
    return {
      id: row.id,
      partyId: row.party_id,
      advertiser: row.advertiser ?? "",
      placement: row.placement,
      placeId: row.place_id ?? "",
      rank: row.rank,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      destinationUrl: row.destination_url ?? "",
      partyName: event?.name ?? "",
      cityLabel: row.placement === "CITY" && place ? placeLabel(place) : "",
      timezone: place?.timezone ?? "",
    };
  });
}

function shown(iso, timeZone) {
  return isoToZonedLocal(iso, timeZone).replace("T", " ");
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
