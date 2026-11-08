import { useState } from "react";
export default function AsiaCountryPhoto({ photo, city, position, pilot = false }) {
 const [failed, setFailed] = useState(false);
 return photo?.src && !failed ? <img className={pilot ? "asia-country-photo asia-country-pilot-photo" : "asia-country-photo"} style={position ? { objectPosition: position } : undefined} src={photo.src} alt={city ?? ""} width="640" height="800" loading="lazy" onError={() => setFailed(true)} /> : <span className="asia-country-photo asia-country-photo-empty">{failed ? "Photo unavailable" : "Photo pending review"}</span>;
}
