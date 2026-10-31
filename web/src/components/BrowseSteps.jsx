const STEPS = ["Continent", "Country", "City", "Bars"];

export default function BrowseSteps({ current }) {
  return (
    <ol className="steps" aria-label="Browse">
      {STEPS.map((step) => (
        <li
          key={step}
          className={step === current ? "is-current" : undefined}
          aria-current={step === current ? "step" : undefined}
        >
          {step}
        </li>
      ))}
    </ol>
  );
}
