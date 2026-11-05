export function barAnchor(venueId) {
  if (typeof venueId !== "string") return "";
  const id = venueId.trim();
  if (id === "" || id.includes("#") || /\s/.test(id)) return "";
  return `bar-${id}`;
}

export function tonightBarPath(capitalId, venueId, dance) {
  if (typeof capitalId !== "string" || capitalId.trim() === "") return "/";
  const filter = ["salsa", "bachata", "kizomba"].includes(dance) ? `?dance=${dance}` : "";
  const city = `/c/${capitalId.trim()}${filter}`;
  const anchor = barAnchor(venueId);
  return anchor ? `${city}#${anchor}` : city;
}

export function tonightPathForRoute(pathname, search = "") {
  if (pathname === "/tonight") return `${pathname}${search}`;
  const id = /^\/c\/(seoul|bangkok|hanoi)$/.exec(pathname)?.[1];
  if (!id) return "/tonight";
  const params = new URLSearchParams({ city: id });
  const dance = new URLSearchParams(search).get("dance");
  if (["salsa", "bachata", "kizomba"].includes(dance)) params.set("dance", dance);
  return `/tonight?${params}`;
}

export function barReturnPath(from) {
  return typeof from === "string" && !from.includes("\\")
    && /^\/(?:\?|$|tonight(?:\?|$)|country(?:\/[a-z-]+)?(?:\?|$))/.test(from) ? from : "/";
}

export function profileCityReturnPath(capital, search, from) {
  const safe = barReturnPath(from);
  const [path, query = ""] = safe.split("?");
  const selected = new URLSearchParams(query).get("city");
  if (capital.country === "Vietnam" && path === "/country/vietnam"
    && ["hanoi", "ho-chi-minh-city", "da-nang"].includes(selected)) return safe;
  return `/c/${capital.id}${search}`;
}

export function barAnchorFromHash(hash) {
  if (typeof hash !== "string" || !hash.startsWith("#bar-")) return "";
  return barAnchor(hash.slice("#bar-".length));
}

export function matchingBarAnchor(hash, venueIds) {
  const anchor = barAnchorFromHash(hash);
  if (!anchor) return "";
  return (venueIds ?? []).some((id) => barAnchor(id) === anchor) ? anchor : "";
}
