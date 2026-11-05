import assert from "node:assert/strict";
import test from "node:test";
import { barAnchorFromHash, barReturnPath, matchingBarAnchor, profileCityReturnPath, tonightBarPath, tonightPathForRoute } from "./barAnchor.js";

const seoulBar = "8d6c2e3a-6e2b-4d4a-9c1e-1a2b3c4d5e6f";
const otherBar = "11111111-2222-4333-8444-555555555555";

test("Vietnam profile return keeps the selected category while rejecting external or unrelated origins", () => {
  const capital = { id: "hanoi", country: "Vietnam" };
  assert.equal(profileCityReturnPath(capital, "", "/country/vietnam?city=hanoi"), "/country/vietnam?city=hanoi");
  for (const from of ["https://example.com/country/vietnam?city=hanoi", "//example.com/country/vietnam?city=hanoi", "/country/vietnam?city=unknown", "/country/thailand?city=hanoi", "/country/vietnam?q=Hanoi"]) {
    assert.equal(profileCityReturnPath(capital, "?dance=salsa", from), "/c/hanoi?dance=salsa");
  }
  assert.equal(profileCityReturnPath({ id: "seoul", country: "South Korea" }, "", "/country/vietnam?city=hanoi"), "/c/seoul");
});

test("a tonight bar link keeps the city path and adds that bar anchor", () => {
  assert.equal(tonightBarPath("seoul", seoulBar), `/c/seoul#bar-${seoulBar}`);
});

test("a missing bar id stays on the city path", () => {
  assert.equal(tonightBarPath("seoul", ""), "/c/seoul");
  assert.equal(tonightBarPath("seoul", null), "/c/seoul");
  assert.equal(tonightBarPath("  seoul  ", "   "), "/c/seoul");
});

test("a listed bar id is the element to show", () => {
  assert.equal(matchingBarAnchor(`#bar-${seoulBar}`, [otherBar, seoulBar]), `bar-${seoulBar}`);
});

test("a missing or invalid bar id does not select another bar", () => {
  const listed = [seoulBar, otherBar];
  assert.equal(matchingBarAnchor("#bar-not-a-real-bar", listed), "");
  assert.equal(matchingBarAnchor("#bar-", listed), "");
  assert.equal(matchingBarAnchor("#seoul", listed), "");
  assert.equal(matchingBarAnchor("", listed), "");
  assert.equal(barAnchorFromHash("#bar-not-a-real-bar"), "bar-not-a-real-bar");
  assert.doesNotThrow(() => matchingBarAnchor("#bar-not-a-real-bar", listed));
});

test("MVP detail-to-Tonight navigation retains city and valid dance without inventing a selection", () => {
  for (const id of ["seoul", "bangkok", "hanoi"]) {
    assert.equal(tonightPathForRoute(`/c/${id}`, "?dance=salsa"), `/tonight?city=${id}&dance=salsa`);
    assert.equal(tonightPathForRoute(`/c/${id}`, "?dance=invalid"), `/tonight?city=${id}`);
  }
  assert.equal(tonightPathForRoute("/", "?q=Seoul"), "/tonight");
  assert.equal(tonightPathForRoute("/tonight", "?city=hanoi&dance=bachata"), "/tonight?city=hanoi&dance=bachata");
});

test("Tonight detail links retain genre before the BAR hash", () => {
  assert.equal(tonightBarPath("bangkok", seoulBar, "salsa"), `/c/bangkok?dance=salsa#bar-${seoulBar}`);
  assert.equal(tonightBarPath("hanoi", "", "bachata"), "/c/hanoi?dance=bachata");
  assert.equal(tonightBarPath("hanoi", "", "invalid"), "/c/hanoi");
});

test("explicit return links preserve known directory routes and reject unrelated or external destinations", () => {
  for (const from of ["/?q=Hanoi", "/country/thailand?q=Bangkok", "/country?continent=asia&q=Vietnam", "/tonight?city=seoul&dance=salsa"]) {
    assert.equal(barReturnPath(from), from);
  }
  for (const from of [null, "https://example.com", "//example.com", "/admin", "/\\example.com"]) assert.equal(barReturnPath(from), "/");
});


test("profile returns to the matching registered city in any country without accepting a cross-country origin", () => {
  for (const [id, country, slug] of [["seoul", "South Korea", "south-korea"], ["bangkok", "Thailand", "thailand"], ["abuja", "Nigeria", "nigeria"], ["sao_tome", "São Tomé and Príncipe", "sao-tome-and-principe"]]) {
    const target = `/country/${slug}?q=city&city=${id}`;
    assert.equal(profileCityReturnPath({ id, country }, "", target), target);
    assert.equal(profileCityReturnPath({ id, country }, "", `/country/other?city=${id}`), `/c/${id}`);
    assert.equal(profileCityReturnPath({ id, country }, "", `/country/${slug}?city=another-city`), `/c/${id}`);
  }
});
