import { assessDoor, assessVenue, cityClock, filterTonight } from "../src/lib/tonight.js";

const hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: "18:00:00",
  closes: "02:00:00",
  closed: false,
}));

function clockAt(iso) {
  return cityClock("Asia/Ho_Chi_Minh", new Date(iso));
}

function venue(extra = {}) {
  return {
    status: "operating",
    sourceChecked: "2026-10-02",
    hours,
    nightDances: [],
    ...extra,
  };
}

const cases = [];
function check(name, cond) {
  cases.push({ name, pass: Boolean(cond) });
  if (!cond) console.log("FAIL", name);
}

const at2000 = clockAt("2026-10-02T13:00:00Z");
check("20:00 OPEN NOW", assessVenue(venue(), at2000).badge === "OPEN NOW");

const at1500 = clockAt("2026-10-02T08:00:00Z");
const r1500 = assessVenue(venue(), at1500);
check("15:00 OPEN TONIGHT", r1500.badge === "OPEN TONIGHT" && r1500.openNow === false);

const at0300 = clockAt("2026-10-01T20:00:00Z");
const r0300 = assessVenue(venue(), at0300);
check("03:00 not open now", r0300.openNow === false && r0300.badge === "OPEN TONIGHT");

const at1800 = clockAt("2026-10-02T11:00:00Z");
check("18:00 OPEN NOW", assessVenue(venue(), at1800).badge === "OPEN NOW");

const at1759 = clockAt("2026-10-02T10:59:00Z");
const r1759 = assessVenue(venue(), at1759);
check("17:59 not open now", r1759.openNow === false && r1759.badge === "OPEN TONIGHT");

const at0159 = clockAt("2026-10-02T18:59:00Z");
check("01:59 OPEN NOW", assessVenue(venue(), at0159).badge === "OPEN NOW");

const at0200 = clockAt("2026-10-02T19:00:00Z");
check("02:00 not open now", assessVenue(venue(), at0200).openNow === false && assessVenue(venue(), at0200).badge === "OPEN TONIGHT");

const wed2000 = clockAt("2026-09-30T13:00:00Z");
const confirmed = assessVenue(
  venue({ nightDances: [{ weekday: 3, dance: "bachata" }], sourceChecked: "2026-09-30" }),
  wed2000,
);
check("confirmed Bachata Tonight", confirmed.danceText === "Bachata Tonight" && confirmed.danceConfirmed && confirmed.badge === "OPEN NOW");

const typeOnly = assessVenue(venue({ sourceChecked: "2026-09-30" }), wed2000);
check("dance type does not fill tonight", typeOnly.danceText === "Dance schedule not confirmed" && typeOnly.dances.length === 0);

check("dance filter hides unconfirmed", filterTonight([typeOnly], "bachata").length === 0);
check("dance filter keeps confirmed", filterTonight([confirmed], "bachata").length === 1);

check("closed stays closed", assessVenue(venue({ status: "permanently_closed" }), at2000).badge === null);
check("temporary stays closed", assessVenue(venue({ status: "temporarily_closed" }), at2000).statusText === "Temporarily closed");
check("unknown stays unconfirmed", assessVenue(venue({ status: "unknown" }), at2000).statusText === "Venue status not confirmed");
check("stale hours stay unconfirmed", assessVenue(venue({ sourceChecked: "2020-01-01" }), at2000).statusText === "Opening hours not confirmed");

const late = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens: "22:00:00", closes: "03:00:00", closed: false }));
check("02:30 inside 22:00-03:00", assessDoor(late, at0300.weekday, 2 * 60 + 30).kind === "open");
check("03:00 ends 22:00-03:00", assessDoor(late, 5, 3 * 60).kind !== "open");

const untilOne = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens: "20:00", closes: "01:00", closed: false }));
check("00:30 inside 20:00-01:00", assessDoor(untilOne, 5, 30).kind === "open");

const spill = assessVenue(venue({ nightDances: [{ weekday: 5, dance: "salsa" }] }), at0159);
check("after midnight uses the night that opened", spill.badge === "OPEN NOW" && spill.danceText === "Salsa Tonight");

check("Hanoi 20:00 is Friday", at2000.weekday === 5 && at2000.minutes === 20 * 60);
const seoul = cityClock("Asia/Seoul", new Date("2026-10-02T13:00:00Z"));
check("Seoul clock is not Hanoi", seoul.minutes === 22 * 60);

const failed = cases.filter((item) => !item.pass);
console.log(`${cases.length - failed.length}/${cases.length}`);
if (failed.length) {
  console.log(failed.map((item) => item.name).join("\n"));
  process.exit(1);
}
