export default function CitySponsored({ ads }) {
  if (!ads?.length) return null;
  return (
    <div className="home-ads">
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
    </div>
  );
}
