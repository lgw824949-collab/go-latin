import { useRef } from "react";

export default function Hero() {
  const clicks = useRef(0);
  const timer = useRef(0);

  function onFloorClick() {
    window.clearTimeout(timer.current);
    clicks.current += 1;
    if (clicks.current >= 3) {
      clicks.current = 0;
      window.location.assign("/admin");
      return;
    }
    timer.current = window.setTimeout(() => {
      clicks.current = 0;
    }, 3000);
  }

  return (
    <section className="hero-b" aria-label="Latin dance night">
      <div className="hero-b-media">
        <img src="/hero-latin.png" alt="" />
      </div>
      <div className="hero-b-shade" aria-hidden="true" />
      <div className="hero-b-copy">
        <h1>Latin Dance Bars Around the World</h1>
        <p className="lede">
          Find the best Latin dance bars in cities around the world. Find the{" "}
          <button type="button" className="floor-entry" onClick={onFloorClick}>floor</button>
          .
        </p>
      </div>
    </section>
  );
}
