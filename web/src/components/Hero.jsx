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
    <section className="hero">
      <p className="kicker">Bachata · Kizomba · Salsa</p>
      <h1>
        Find the{" "}
        <button type="button" className="floor-entry" onClick={onFloorClick}>floor</button>.
      </h1>
      <p className="lede">Five oceans. Six continents. One night.</p>
    </section>
  );
}
