import { searchText } from "./filterCapitals.js";

const LOOKUP_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

export function createLookupGate() {
  return { busy: false };
}

const lookupGate = createLookupGate();

export function readGeocode(body) {
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const iso2 = typeof body?.countryCode === "string" ? body.countryCode.trim().toUpperCase() : "";
  if (!city || !/^[A-Z]{2}$/.test(iso2)) return null;
  return { city, iso2 };
}

export function matchRegisteredPlace(capitals, place) {
  const iso2 = String(place?.iso2 ?? "").trim().toUpperCase();
  const needle = searchText(place?.city).trim();
  if (!/^[A-Z]{2}$/.test(iso2) || !needle) return { kind: "unknown" };
  const rows = (capitals ?? []).filter((row) => (
    row?.id && String(row.iso2 ?? "").trim().toUpperCase() === iso2
  ));
  if (rows.length === 0) return { kind: "unknown" };
  const exact = rows.filter((row) => searchText(row.city).trim() === needle);
  if (exact.length === 1) return { kind: "city", city: exact[0] };
  if (exact.length > 1) return { kind: "unknown" };
  if (rows.length === 1) {
    return { kind: "capital", city: rows[0], queriedCity: String(place.city).trim() };
  }
  return { kind: "unknown" };
}

export function requestCoordinates(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation?.getCurrentPosition) {
    return Promise.reject(Object.assign(new Error("unsupported"), { code: 2 }));
  }
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const lat = position?.coords?.latitude;
        const lng = position?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          reject(Object.assign(new Error("unavailable"), { code: 2 }));
          return;
        }
        resolve({ lat, lng });
      },
      (error) => reject(error?.code ? error : Object.assign(new Error("denied"), { code: 1 })),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  });
}

export async function reverseGeocode(lat, lng, { fetchImpl = fetch, gate = lookupGate } = {}) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return null;
  }
  if (gate.busy) return null;
  gate.busy = true;
  try {
    const url = new URL(LOOKUP_URL);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("localityLanguage", "en");
    const response = await fetchImpl(url);
    if (!response?.ok) return null;
    return readGeocode(await response.json());
  } catch {
    return null;
  } finally {
    gate.busy = false;
  }
}
