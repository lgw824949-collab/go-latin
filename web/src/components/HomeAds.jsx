import { useEffect, useState } from "react";
import { loadHomeAds } from "../lib/homeAds.js";

export default function HomeAds() {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    let live = true;
    loadHomeAds()
      .then((rows) => {
        if (live) setAds(rows);
      })
      .catch(() => {
        if (live) setAds([]);
      });
    return () => {
      live = false;
    };
  }, []);

  if (ads.length === 0) return null;

  return (
    <section className="home-ads" aria-label="Sponsored parties">
      <ul>
        {ads.map((ad) => (
          <li key={ad.id}>
            <a href={ad.destinationUrl} rel="noreferrer">
              <p className="kicker">Sponsored</p>
              <h2>{ad.name}</h2>
              {ad.venueName ? <p>{ad.venueName}</p> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
