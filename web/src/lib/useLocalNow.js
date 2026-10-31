import { useEffect, useState } from "react";

export function watchLocalClock(target, update, readNow = () => new Date()) {
  const refresh = () => update(readNow());
  const timer = target.setInterval(refresh, 30000);
  target.addEventListener("focus", refresh);
  return () => {
    target.clearInterval(timer);
    target.removeEventListener("focus", refresh);
  };
}

export function useLocalNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => watchLocalClock(window, setNow), []);
  return now;
}
