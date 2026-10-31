import { listedSimpleParties, loadSimpleParties, partyDateKey, simplePartyCity } from "./simpleParty.js";

export function watchSimpleParties(capitalId, target, update, load = loadSimpleParties, readNow = () => new Date()) {
  const zone = simplePartyCity(capitalId)?.timezone;
  let day = partyDateKey(readNow(), zone);
  let live = true;
  let revision = 0;
  async function refresh() {
    const request = ++revision;
    const now = readNow();
    day = partyDateKey(now, zone);
    update({ status: "loading", parties: [], error: "" });
    try {
      const rows = await load(capitalId, now);
      if (!live || request !== revision) return;
      update({ status: "ready", parties: listedSimpleParties(rows, readNow()), error: "" });
    } catch (err) {
      if (!live || request !== revision) return;
      update({ status: "error", parties: [], error: err?.message || "The party list could not be loaded." });
    }
  }
  const checkDate = () => {
    if (partyDateKey(readNow(), zone) !== day) void refresh();
  };
  const onFocus = () => { void refresh(); };
  const timer = target.setInterval(checkDate, 30000);
  target.addEventListener("focus", onFocus);
  void refresh();
  return () => {
    live = false;
    target.clearInterval(timer);
    target.removeEventListener("focus", onFocus);
  };
}
