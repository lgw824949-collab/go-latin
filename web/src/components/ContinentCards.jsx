import { Link } from "react-router-dom";
import { BROWSE_CONTINENTS, continentName, countriesInContinent, listCountries } from "../lib/countries.js";

export default function ContinentCards({ capitals }) {
  const countries = listCountries(capitals);
  return (
    <ul className="continent-grid">
      {BROWSE_CONTINENTS.map((id) => {
        const count = countriesInContinent(countries, id).length;
        return (
          <li key={id}>
            <Link className="continent-card" to={`/country?continent=${id}`}>
              <span className="place-name">{continentName(id)}</span>
              <span>{count === 1 ? "1 country" : `${count} countries`}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
