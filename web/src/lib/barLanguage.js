import { useSyncExternalStore } from "react";

export const BAR_LANGUAGE_KEY = "go-latin.bar-language";
const EVENT = "go-latin:bar-language";
let volatileLanguage = "en";
export function readBarLanguage(storage) {
  try { return storage?.getItem(BAR_LANGUAGE_KEY) === "ko" ? "ko" : "en"; }
  catch { return volatileLanguage; }
}
export function writeBarLanguage(language, storage) {
  if (language !== "en" && language !== "ko") return false;
  volatileLanguage = language;
  try { storage?.setItem(BAR_LANGUAGE_KEY, language); } catch { /* Session-only selection when storage is blocked. */ }
  return true;
}
function snapshot() {
  try { return globalThis.localStorage ? readBarLanguage(globalThis.localStorage) : volatileLanguage; } catch { return volatileLanguage; }
}
function subscribe(callback) {
  if (!globalThis.addEventListener) return () => {};
  globalThis.addEventListener(EVENT, callback);
  globalThis.addEventListener("storage", callback);
  return () => { globalThis.removeEventListener(EVENT, callback); globalThis.removeEventListener("storage", callback); };
}
export function useBarLanguage() {
  const language = useSyncExternalStore(subscribe, snapshot, () => "en");
  return [language, next => {
    try { writeBarLanguage(next, globalThis.localStorage); } catch { writeBarLanguage(next); }
    if (globalThis.dispatchEvent) globalThis.dispatchEvent(new Event(EVENT));
  }];
}

export const BAR_COPY = {
  en: {
    unknown: "Not available yet", back: city => `Back to ${city}`, native: "Local name", tonight: "Tonight", localTime: "Local time", closedTonight: "Closed tonight", closed: "Closed",
    recurring: "Recorded weekly schedule · Check with the venue before visiting.", startMissing: "Music start times have not been confirmed.", directions: "Directions", instagram: "Instagram", week: "This Week",
    facts: "Good to Know", fee: "Entry fee", lessons: "Beginner lessons", english: "English spoken", address: "Address", phone: "Phone", website: "Website", photos: "Photos", entrance: "Entrance", interior: "Interior", noPhoto: "No photo available",
    verified: "Last Verified", today: "Today", ago: days => `${days} days ago`, verificationNote: "Source check date; individual details may still need confirmation.", suggest: "Suggest an Update", reportQuestion: "What needs updating?",
    reportOptions: ["Opening hours or music schedule", "Address or location", "Entry fee or lesson information", "Closed venue or other incorrect information"], reportNote: "Sending is not connected yet. Your selections are not saved or sent.", send: "Send · Coming soon",
    sourcesToggle: "Opening hours & sources", hours: "Recorded opening hours", overnight: "(+1 day) means closing the following day. Old or conflicting hours are not confirmed.", source: "Source", sourceMissing: "Source link not available yet", tonightLink: "View in Tonight", others: city => `More Bars in ${city}`, noOthers: "No other bars listed in this city yet.", details: "View details", menuBars: "Capital bars", language: "Display language", newTab: "Opens in a new tab",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
  ko: {
    unknown: "아직 정보가 없어요", back: city => `${city}으로 돌아가기`, native: "현지어 이름", tonight: "오늘 밤", localTime: "현지 시간", closedTonight: "오늘은 쉬어요", closed: "쉬어요",
    recurring: "등록된 반복 일정 · 방문 전 업소에 확인해 주세요.", startMissing: "음악 시작 시간은 아직 확인되지 않았어요.", directions: "길찾기", instagram: "인스타그램", week: "이번 주 음악",
    facts: "알아두면 좋은 것", fee: "입장료", lessons: "초보 레슨", english: "영어 소통", address: "주소", phone: "전화", website: "홈페이지", photos: "BAR 사진", entrance: "입구", interior: "내부", noPhoto: "사진 없음",
    verified: "마지막 정보 확인", today: "오늘", ago: days => `${days}일 전`, verificationNote: "출처에 저장된 확인일이며, 항목별 재확인이 필요할 수 있어요.", suggest: "정보가 틀려요", reportQuestion: "어떤 정보가 다른가요?",
    reportOptions: ["영업시간 또는 음악 일정이 달라요", "주소 또는 위치가 달라요", "입장료 또는 레슨 정보가 달라요", "폐업했거나 기타 정보가 틀려요"], reportNote: "아직 제보 전송이 연결되지 않았어요. 선택한 내용은 저장되거나 전송되지 않아요.", send: "알려주기 · 준비 중",
    sourcesToggle: "기존 영업시간 · 출처 보기", hours: "등록된 운영시간", overnight: "(+1 day)는 다음 날 종료예요. 오래되거나 상충하는 운영정보는 미확인이에요.", source: "출처", sourceMissing: "출처 링크: 아직 정보가 없어요", tonightLink: "Tonight에서 확인하기", others: city => `${city}의 다른 BAR`, noOthers: "아직 등록된 다른 BAR가 없어요", details: "상세보기", menuBars: "도시별 BAR", language: "표시 언어", newTab: "새 탭에서 열림",
    weekdays: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
  },
};

export function profileHoursLabel(value, language) {
  const t = BAR_COPY[language] ?? BAR_COPY.en;
  if (value === "Closed") return t.closed;
  if (value === "Not confirmed") return t.unknown;
  return value;
}
