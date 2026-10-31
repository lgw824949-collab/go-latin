import { useLocalNow } from "../lib/useLocalNow.js";
import { DANCES } from "../lib/filterCapitals.js";
import { httpUrl, sourceCheckedLabel } from "../lib/sources.js";
import { sevenDaySchedule, tonightLocalTime } from "../lib/tonight.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SOURCE_NAMES = { google_maps: "Google Maps", website: "Website", instagram: "Instagram" };

export default function BarDetails({ venue, capital, now }) {
  const liveNow = useLocalNow();
  const clock = tonightLocalTime(capital, now ?? liveNow);
  const schedule = sevenDaySchedule(venue, clock);
  const sources = (venue.sources ?? []).map(row => ({
    ...row, url: httpUrl(row.url),
  }));
  const sourceUrl = httpUrl(venue.sourceUrl);
  if (sourceUrl && !sources.some(row => row.url === sourceUrl)) {
    sources.push({ kind: venue.source, url: sourceUrl, checkedAt: venue.sourceChecked });
  }

  return (
    <div>
      <h3>7-day opening hours</h3>
      <p>Local time zone: {clock?.timeZone ?? "Not confirmed"}. (+1 day) means closing the following day.</p>
      {schedule.length ? <dl>{schedule.map(day => (
        <div key={day.date}>
          <dt><time dateTime={day.date}>{day.label}</time></dt>
          <dd>{day.hoursLabel}</dd>
        </div>
      ))}</dl> : <p>Not confirmed</p>}
      <p>Recurring hours; changes and stale or missing information are not confirmed.</p>

      <h3>Recorded weekly dance schedule</h3>
      <p>Stored recurring information, not confirmation of a specific event. Check the source before visiting.</p>
      <dl>{DAYS.map((day, weekday) => {
        const names = DANCES.filter(dance => (venue.nightDances ?? [])
          .some(row => row.weekday === weekday && row.dance === dance.id)).map(dance => dance.name);
        return <div key={day}><dt>{day}</dt><dd>{names.length
          ? `${names.join(" · ")} — Start time: Not confirmed; end time: Not confirmed`
          : "Not confirmed"}</dd></div>;
      })}</dl>

      <h3>Sources</h3>
      <p>Recorded check date: {sourceCheckedLabel(venue.sourceChecked) || "Not recorded"}. This does not confirm every field or day.</p>
      {sources.length ? <ul>{sources.map((source, index) => (
        <li key={`${source.kind}-${index}`}>
          {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{SOURCE_NAMES[source.kind] ?? source.kind ?? "Source"}</a>
            : `${SOURCE_NAMES[source.kind] ?? source.kind ?? "Source"}: link not recorded`}
          {` — Recorded check date: ${sourceCheckedLabel(source.checkedAt) || "Not recorded"}`}
        </li>
      ))}</ul> : <p>Source link: Not recorded</p>}
      {venue.sourceNote ? <p>{venue.sourceNote}</p> : null}
    </div>
  );
}
