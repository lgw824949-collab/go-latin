import { Link } from "react-router-dom";
import { popularListedCities } from "../lib/countries.js";
import { cityCardPath } from "../lib/filterCapitals.js";

export default function PopularCities({ capitals }) {
  const cities = popularListedCities(capitals, 6);
  if (cities.length === 0) return null;
  return (
    <section className="popular-cities" aria-labelledby="popular-cities-title">
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
  );
}
