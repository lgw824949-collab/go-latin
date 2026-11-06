import { Link } from "react-router-dom";
import { popularListedCities } from "../lib/countries.js";
import { cityCardPath } from "../lib/filterCapitals.js";

export default function PopularCities({ capitals }) {
  const cities = popularListedCities(capitals, 6);
  if (cities.length === 0) return null;
  return (
    <>
    <section className="popular-cities desktop-popular-cities" aria-labelledby="popular-cities-title">
      <div className="section-head">
        <h2 id="popular-cities-title">Cities with listed bars</h2>
      </div>
      <ul className="popular-grid">
        {cities.map((city) => (
          <li key={city.id}>
            <Link className="popular-card popular-card--no-image" to={cityCardPath(city.id)}>
              <span className="popular-thumb" aria-hidden="true" />
              <span className="popular-name">{city.city}</span>
              <span className="popular-meta">{city.country}</span>
              <span className="popular-bars">{city.bars === 1 ? "1 bar" : `${city.bars} bars`}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
    <MobileCityCards capitals={capitals} />
    </>
  );
}

const MOBILE_CITY_IMAGES = {
  seoul: "/cities/go-latin-017-seoul.png",
  bangkok: "/cities/go-latin-017-bangkok.png",
  hanoi: "/cities/go-latin-017-hanoi.png",
};

function MobileCityCards({ capitals }) {
  const cities = Object.keys(MOBILE_CITY_IMAGES).map(id => capitals.find(city => city.id === id)).filter(Boolean);
  if (!cities.length) return null;
  return <section className="home-mobile-cities" aria-labelledby="mobile-cities-title">
    <div className="section-head"><h2 id="mobile-cities-title">Explore Cities</h2></div>
    <ul className="mobile-city-grid">
      {cities.map(city => <li key={city.id}>
        <Link to={cityCardPath(city.id)} aria-label={`${city.city}, ${city.country}`}>
          <span className="mobile-city-artwork" aria-hidden="true"><img src={MOBILE_CITY_IMAGES[city.id]} alt="" width="724" height="724" loading="lazy" decoding="async" /></span>
          <span className="mobile-city-copy"><strong>{city.city}</strong><span>{city.country}</span><span>{city.venues.length === 1 ? "1 bar" : `${city.venues.length} bars`}</span></span>
        </Link>
      </li>)}
    </ul>
  </section>;
}
