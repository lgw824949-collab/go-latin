import assert from "node:assert/strict";
import test from "node:test";
import { cityCanonical, cityHead, cityRobots, headAction, pageDescription } from "./routeHead.js";

const SEOUL = "https://go-latin.vercel.app/c/seoul";

test("the current city keeps its own canonical", () => {
  assert.equal(headAction("/c/seoul", SEOUL), "keep");
  assert.equal(headAction("/c/seoul/", `${SEOUL}/`), "keep");
});

test("another route clears the previous city canonical", () => {
  assert.equal(headAction("/c/hanoi", SEOUL), "clear");
  assert.equal(headAction("/", SEOUL), "clear");
  assert.equal(headAction("/tonight", SEOUL), "clear");
  assert.equal(headAction("/admin", SEOUL), "clear");
});

test("a city without a listed bar is noindex and a closed-only city stays out", () => {
  assert.equal(cityRobots([]), "noindex");
  assert.equal(cityRobots([{ name: "Old Bar", status: "permanently_closed" }]), "noindex");
  assert.equal(cityRobots([{ name: "Top Salsa Bar", status: "operating" }]), "");
});

test("a dance query or bar hash stays off the city canonical", () => {
  const head = cityHead({
    id: "seoul",
    city: "Seoul",
    country: "South Korea",
    venues: [
      { id: "top", name: "Top Salsa Bar", address: "616-2 Sinsa-dong", phone: "010-6719-9001", status: "operating", dances: ["salsa"] },
      { id: "gangnam", name: "강남 라틴", address: "9 Teheran-ro", phone: "", status: "operating", dances: [] },
      { id: "closed", name: "Closed Floor", address: "Nowhere", phone: "0", status: "permanently_closed", dances: ["kizomba"] },
    ],
  });
  assert.equal(head.title, "Seoul Latin bars | Go Latin");
  assert.equal(head.canonical, cityCanonical("seoul"));
  assert.equal(head.canonical.includes("dance="), false);
  assert.equal(head.canonical.includes("#"), false);
  assert.equal(head.robots, "");
  assert.equal(head.description.includes("Closed Floor"), false);
  assert.equal(head.description.includes("Kizomba"), false);
  assert.match(head.description, /^Latin bars in Seoul, South Korea: 강남 라틴, Top Salsa Bar\. Confirmed: Salsa\.$/);
  assert.equal(head.jsonLd.itemListElement[0].item.additionalProperty, undefined);
  assert.equal(head.jsonLd.itemListElement[1].item.additionalProperty[0].value, "Salsa");
  assert.deepEqual(head.jsonLd.itemListElement.map((entry) => entry.item.name), ["강남 라틴", "Top Salsa Bar"]);
  assert.equal(head.jsonLd.itemListElement.every((entry) => Object.hasOwn(entry.item, "url")), false);
  assert.equal(headAction("/c/seoul", `${head.canonical}?dance=salsa#bar-top`), "keep");
});

test("a city where every listed bar has a dance keeps that dance sentence", () => {
  assert.equal(
    pageDescription("Hanoi", "Vietnam", [{ name: "La Habanera", dances: ["Bachata"] }]),
    "Bachata bars in Hanoi, Vietnam: La Habanera.",
  );
});

test("a city without a listed bar keeps noindex and drops the previous city document", () => {
  const empty = cityHead({ id: "ankara", city: "Ankara", country: "Turkey", venues: [] });
  const closed = cityHead({
    id: "canberra",
    city: "Canberra",
    country: "Australia",
    venues: [{ id: "old", name: "Old Bar", status: "permanently_closed", dances: ["salsa"] }],
  });
  assert.deepEqual(empty, { title: "Go Latin", description: "", canonical: "", robots: "noindex", jsonLd: null });
  assert.equal(closed.robots, "noindex");
  assert.equal(closed.jsonLd, null);
  assert.equal(closed.description, "");
});

test("parsed bar json-ld keeps the city page off the bar url", () => {
  const head = cityHead({
    id: "hanoi",
    city: "Hanoi",
    country: "Vietnam",
    venues: [{
      id: "habanera",
      name: "La Habanera",
      address: "26 Hàng Bông",
      phone: "",
      status: "operating",
      dances: ["bachata"],
      website: "notaurl",
      instagram: "https://www.instagram.com/lahabanera/",
      hours: [{ weekday: 4, text: "8 PM–1 AM", opens: null, closes: null, closed: false }],
    }],
  });
  const data = JSON.parse(JSON.stringify(head.jsonLd));
  assert.equal(data["@type"], "ItemList");
  assert.equal(data.itemListElement[0].item.sameAs, "https://www.instagram.com/lahabanera/");
  assert.equal(Object.hasOwn(data.itemListElement[0].item, "url"), false);
  assert.equal(Object.hasOwn(data.itemListElement[0].item, "openingHoursSpecification"), false);
  assert.equal(data.itemListElement[0].item.address, "26 Hàng Bông");
  assert.equal(data.itemListElement[0].item.additionalProperty[0].value, "Bachata");
  assert.equal(JSON.stringify(data).includes("/c/hanoi"), false);
});

test("a city without a matching canonical does not keep another page's tags", () => {
  assert.equal(headAction("/c/seoul", ""), "clear");
  assert.equal(headAction("/c/hanoi", "https://go-latin.vercel.app/"), "clear");
});
