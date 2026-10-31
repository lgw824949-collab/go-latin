import { adminClient, requireAdmin } from "./admin.js";
import { isoToZonedLocal } from "./partyAdmin.js";
import {
  SIMPLE_PARTY_CITIES, shapeSimpleParty, simplePartyCity, simplePartyStartsAt,
  simplePartyWriteError, validateSimpleParty,
} from "./simpleParty.js";
import { httpUrl } from "./sources.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT = "id, capital_id, venue_id, venue_name, sns_url, poster_url, starts_at, genre";

export function emptySimplePartyForm() {
  return { id: "", capitalId: "seoul", venueId: "", venueName: "", snsUrl: "", genre: "",
    date: "", startTime: "", posterUrl: "", posterFile: null };
}

export function simplePartyEditForm(party) {
  const city = simplePartyCity(party.capitalId);
  if (!city || !UUID.test(party.id)) throw new Error("Invalid party.");
  const local = isoToZonedLocal(party.startsAt, city.timezone);
  return { ...emptySimplePartyForm(), ...party, date: local.slice(0, 10), startTime: local.slice(11, 16), posterFile: null };
}

export function loadSimplePartyAdmin() { return loadSimplePartyAdminWith(adminClient()); }
export async function loadSimplePartyAdminWith(client) {
  await requireAdmin(client);
  const { data, error } = await client.from("simple_parties").select(SELECT)
    .in("capital_id", SIMPLE_PARTY_CITIES.map(city => city.id)).order("starts_at", { ascending: false });
  if (error) throw simplePartyWriteError(error);
  if (!Array.isArray(data)) throw new Error("The party list could not be loaded.");
  // Admins must also be able to edit or remove past events.
  return data.map(shapeSimpleParty).filter(Boolean);
}

export function saveSimplePartyAdmin(form) { return saveSimplePartyAdminWith(adminClient(), form); }
export async function saveSimplePartyAdminWith(client, form) {
  await requireAdmin(client);
  if (form.id && !UUID.test(form.id)) throw new Error("Invalid party ID.");
  if (form.venueId && !UUID.test(form.venueId)) throw new Error("Invalid venue ID.");
  const errors = validateSimpleParty(form, { allowExistingPoster: true });
  if (String(form.venueName ?? "").trim().length > 200) errors.push("Venue name must be 200 characters or fewer.");
  if (String(form.snsUrl ?? "").trim().length > 2048 || String(form.posterUrl ?? "").trim().length > 2048) {
    errors.push("Links must be 2048 characters or fewer.");
  }
  if (errors.length) throw new Error(errors.join(" "));
  const startsAt = simplePartyStartsAt(form);
  let posterUrl = httpUrl(form.posterUrl);
  let uploadedPoster = null;
  try {
    if (form.posterFile) {
      const file = form.posterFile;
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${form.capitalId}/${crypto.randomUUID()}.${ext}`;
      const bucket = client.storage.from("simple-party-posters");
      const { error } = await bucket.upload(objectPath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw simplePartyWriteError(error);
      const { data } = bucket.getPublicUrl(objectPath);
      posterUrl = httpUrl(data?.publicUrl);
      uploadedPoster = { path: objectPath, url: posterUrl };
      if (!posterUrl) throw new Error("The poster URL could not be created.");
    }
    const payload = {
      capital_id: form.capitalId, venue_id: form.venueId || null,
      venue_name: String(form.venueName).trim(), sns_url: httpUrl(form.snsUrl),
      poster_url: posterUrl, starts_at: startsAt, genre: form.genre,
    };
    // Matches the un-applied SQL draft exactly. No direct table writes.
    const { data, error } = await client.rpc(form.id ? "update_simple_party" : "submit_simple_party",
      form.id ? { party_id: form.id, payload } : { payload });
    if (error) throw simplePartyWriteError(error);
    if (!data || !UUID.test(String(data))) throw new Error("Save result is unknown. Refresh the list before retrying.");
    return { id: String(data), posterUrl };
  } catch (cause) {
    const error = simplePartyWriteError(cause);
    // Preserve the old object under all outcomes. Keep a successful replacement
    // upload available for manual retry; never remove an object on an ambiguous RPC failure.
    if (uploadedPoster) error.uploadedPoster = uploadedPoster;
    throw error;
  }
}

export function deleteSimplePartyAdmin(id) { return deleteSimplePartyAdminWith(adminClient(), id); }
export async function deleteSimplePartyAdminWith(client, id) {
  await requireAdmin(client);
  if (!UUID.test(String(id ?? ""))) throw new Error("Invalid party ID.");
  const { data, error } = await client.rpc("delete_simple_party", { party_id: id });
  if (error) throw simplePartyWriteError(error);
  if (data !== id) throw new Error("Delete result is unknown. Refresh the list before retrying.");
  // SQL draft denies browser Storage DELETE. Keep poster files, including shared files.
  return id;
}
