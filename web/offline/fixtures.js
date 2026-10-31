export const previewOrigin = globalThis.location?.origin ?? "http://localhost:4188";
export const poster = `${previewOrigin}/offline-poster.svg`;
const today = new Date().toISOString().slice(0, 10);
const image = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="800" height="480" fill="#263345"/><text x="40" y="240" fill="white" font-size="48">OFFLINE MOCK CITY</text></svg>');

export function createFixtures() {
  const capitals = [
    ["seoul", "Seoul", "South Korea", "KR", "Asia/Seoul", "Top Salsa Bar (MOCK)"],
    ["bangkok", "Bangkok", "Thailand", "TH", "Asia/Bangkok", "Havana Social (MOCK)"],
    ["hanoi", "Hanoi", "Vietnam", "VN", "Asia/Ho_Chi_Minh", "La Habanera (MOCK)"],
  ].map(([id, city, country, iso2, timezone, name], index) => {
    const dances = id === "hanoi" ? ["bachata", "salsa", "kizomba"] : ["salsa"];
    const venue = {
      id: `11111111-1111-4111-8111-11111111111${index}`, capital_id: id, name,
      address: `${city} — mock address only. ${"Long address for mobile layout verification. ".repeat(4)}`,
      phone: "MOCK — do not call", website: `${previewOrigin}/preview-links/website`,
      instagram_url: `${previewOrigin}/preview-links/instagram`, maps_url: `${previewOrigin}/preview-links/map`,
      source: "local", source_url: `${previewOrigin}/preview-links/source`, source_checked: today,
      source_note: "Synthetic browser fixture, not verified business information. Monday in Hanoi is Not confirmed.",
      status: "operating", confidence: "unconfirmed",
      venue_dances: dances.map(dance => ({ dance })),
      venue_hours: Array.from({ length: 7 }, (_, weekday) => ({ weekday,
        hours_text: id === "hanoi" && weekday === 1 ? "Not confirmed" : weekday === 2 ? "Closed" : "6 PM–2 AM",
        opens: id === "hanoi" && weekday === 1 || weekday === 2 ? null : "18:00",
        closes: id === "hanoi" && weekday === 1 || weekday === 2 ? null : "02:00",
        is_closed: weekday === 2,
      })),
      venue_night_dances: dances.map(dance => ({ weekday: id === "bangkok" ? 0 : 3, dance })),
      venue_sources: [{ kind: "local", url: `${previewOrigin}/preview-links/source`, checked_at: today }],
    };
    return { id, city, country, iso2, timezone, continent: "asia", image, venues: [venue] };
  });
  const simple_parties = capitals.flatMap((city, index) => [1, -2].map((days, event) => ({
    id: `22222222-2222-4222-8222-2222222222${index}${event}`, capital_id: city.id,
    venue_id: null, venue_name: `${city.city} Mock Party ${event ? "Past" : "Upcoming"}`,
    sns_url: `${previewOrigin}/preview-links/party`, poster_url: `${poster}?city=${city.id}`,
    starts_at: new Date(Date.now() + days * 86400000).toISOString(), genre: "bachata",
  })));
  return { capitals, simple_parties, venues: capitals.flatMap(city => city.venues.map(venue => ({
    ...venue, capitals: { id: city.id, city: city.city, country: city.country },
  }))), parties: [], party_places: [], party_ads: [], home_ads: [] };
}
