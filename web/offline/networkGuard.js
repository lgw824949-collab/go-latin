export function installNetworkGuard(target) {
  const origin = target.location.origin;
  const allowed = value => {
    try {
      const url = new URL(typeof value === "string" || value instanceof URL ? value : value.url, origin);
      return url.origin === origin && ["http:", "https:"].includes(url.protocol);
    } catch { return false; }
  };
  const fetch = target.fetch.bind(target);
  target.fetch = (input, options) => {
    if (!allowed(input)) return Promise.reject(new Error("Offline preview blocked external fetch."));
    return fetch(input, options);
  };
  const open = target.XMLHttpRequest.prototype.open;
  target.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (!allowed(url)) throw new Error("Offline preview blocked external XHR.");
    return open.call(this, method, url, ...rest);
  };
  target.WebSocket = class { constructor() { throw new Error("Offline preview blocks WebSocket."); } };
  target.EventSource = class { constructor() { throw new Error("Offline preview blocks EventSource."); } };
  Object.defineProperty(target.navigator, "sendBeacon", { configurable: true, value: () => false });
  target.document.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (link && !allowed(link.href)) event.preventDefault();
  }, true);
}
