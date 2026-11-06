import { CONTINENTS, DANCES } from "../lib/filterCapitals.js";

export default function Filters({ dance, continent, onDance, onContinent, disabledContinents = [] }) {
  return (
    <div className="filters">
      <FilterGroup label="Dance" value={dance} options={DANCES} onChange={onDance} pillsClass="dance-pills" />
      <FilterGroup
        label="Continent"
        value={continent}
        options={CONTINENTS}
        disabledOptions={disabledContinents}
        onChange={onContinent}
      />
    </div>
  );
}

function FilterGroup({ label, value, options, onChange, pillsClass = "", disabledOptions = [] }) {
  return (
    <fieldset className="filter">
      <legend>{label}</legend>
      <div className={pillsClass ? `pills ${pillsClass}` : "pills"}>
        <button type="button" aria-pressed={value == null} onClick={() => onChange(null)}>
          All
        </button>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            disabled={disabledOptions.includes(option.id)}
            title={disabledOptions.includes(option.id) ? "Coming soon" : undefined}
            onClick={() => { if (!disabledOptions.includes(option.id)) onChange(option.id); }}
          >
            {option.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
