import { useSearchParams } from "react-router-dom";
import CapitalGrid from "../components/CapitalGrid.jsx";
import Filters from "../components/Filters.jsx";
import Hero from "../components/Hero.jsx";
import { useCapitals } from "../lib/directory.js";
import { CONTINENTS, DANCES, filterCapitals, readFilters, writeFilters } from "../lib/filterCapitals.js";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const { status, capitals, error } = useCapitals();
  const filters = readFilters(params);
  const visible = filterCapitals(capitals, filters);
  const danceName = DANCES.find((item) => item.id === filters.dance)?.name;
  const continentName = CONTINENTS.find((item) => item.id === filters.continent)?.name;

  function setDance(value) {
    setParams(writeFilters(params, "dance", value));
  }

  function setContinent(value) {
    setParams(writeFilters(params, "continent", value));
  }

  if (status !== "ready") {
    return (
      <main className="wrap">
        <Hero />
        <p className={status === "error" ? "empty" : "count"}>
          {status === "error" ? error : "Loading the directory."}
        </p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Hero />
      <Filters
        dance={filters.dance}
        continent={filters.continent}
        onDance={setDance}
        onContinent={setContinent}
      />
      <p className="count">{resultLabel(visible.length, danceName, continentName)}</p>
      {visible.length === 0 ? (
        <p className="empty">
          No {danceName} floor listed{continentName ? ` in ${continentName}` : ""}. A capital
          shows up here after the bar is confirmed.
        </p>
      ) : (
        <CapitalGrid capitals={visible} />
      )}
    </main>
  );
}

function resultLabel(count, danceName, continentName) {
  const noun = danceName
    ? count === 1
      ? "floor"
      : "floors"
    : count === 1
      ? "capital"
      : "capitals";
  const what = danceName ? `${danceName} ${noun}` : noun;
  const where = continentName ? `in ${continentName}` : "across six continents";
  return `${count} ${what} ${where}`;
}
