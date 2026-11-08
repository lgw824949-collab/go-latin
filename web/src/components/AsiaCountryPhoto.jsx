import { useState } from "react";
export default function AsiaCountryPhoto({ photo, city }) {
 const [failed, setFailed] = useState(false);
 return photo?.src && !failed ? <img className="asia-country-photo" src={photo.src} alt={city ?? ""} width="640" height="800" loading="lazy" onError={() => setFailed(true)} /> : <span className="asia-country-photo asia-country-photo-empty">{failed ? "Photo unavailable" : "Photo pending review"}</span>;
}
