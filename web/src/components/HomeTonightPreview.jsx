import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCapital } from "../lib/directory.js";
import { homeTonightItems, loadHomeTonight } from "../lib/homeTonight.js";
import { useLocalNow } from "../lib/useLocalNow.js";
import { tonightBarPath } from "../lib/barAnchor.js";

export function MobileHomeOnly({ children }) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile ? children : null;
}

export default function HomeTonightPreview() {
  const now = useLocalNow();
  const [state, setState] = useState({ status: "loading", cities: [] });
  useEffect(() => {
    let live = true;
    loadHomeTonight(loadCapital).then(cities => {
      if (live) setState({ status: "ready", cities });
    }).catch(() => {
      if (live) setState({ status: "error", cities: [] });
    });
    return () => { live = false; };
  }, []);
  return <HomeTonightPreviewView state={state} now={now} />;
}

export function HomeTonightPreviewView({ state, now }) {
  const rows = state.status === "ready" ? homeTonightItems(state.cities, now) : [];
  return <section className="home-tonight-preview" aria-label="Tonight preview" aria-live="polite">
    {state.status === "error" ? <p role="alert">Tonight 정보를 불러오지 못했어요.</p>
      : state.status === "loading" ? <p>Tonight 정보를 불러오는 중이에요.</p>
        : !rows.length ? <p>오늘 등록된 곳이 아직 없어요</p>
          : <><ul>{rows.map(row => <li key={`${row.cityId}-${row.id}`}>
            <Link to={tonightBarPath(row.cityId, row.id)}><span>{row.city} / {row.name}</span><time>{row.start}</time></Link>
          </li>)}</ul><p className="home-tonight-note">시간은 각 도시의 현지 영업 시작 기준이에요.</p></>}
  </section>;
}
