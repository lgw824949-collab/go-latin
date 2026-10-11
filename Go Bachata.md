# Go Latin

수도의 라틴 바를 찾아가는 디렉터리. 바차타, 키좀바, 살사.
화면 문구는 영어. 히어로 한 줄은 `Five oceans. Six continents. One night.`

5대양은 장식 문구다. 탐색 축은 춤, 그다음 6대주, 그다음 수도 카드다.

## 손님이 보는 순서

1. Dance — All, Bachata, Kizomba, Salsa
2. Continent — Asia, Europe, Africa, North America, South America, Oceania
3. Capital card — 도시, 나라, 오늘 밤 춤, 주소
4. Detail — 지도 링크, 요일별 밤

댄스 필터는 그 춤을 하는 바가 있는 수도만 보여 준다. 바가 아직 없는 수도는 All에서만 보이고, 카드는 Coming soon이다.

아메리카는 남북을 나눈다. 바다, 날씨, 도시 점수, 실시간 인원은 화면 축이 아니다.

## 데이터 계약

단일 원본은 `data/capitals.json`. 프론트와 이후 Supabase 시드가 이 파일을 읽는다.

수도:

- `id` 슬러그. 예: `mexico_city`
- `city`, `country`, `iso2`
- `continent` — `asia` `europe` `africa` `north_america` `south_america` `oceania`
- `lat`, `lng`, `timezone`
- `image` — 그 수도를 알아보는 스카이라인이나 랜드마크 사진. 깃발, 지도, 아무 거리 사진은 쓰지 않음
- `venue` — 없으면 `null`

베뉴 (수도당 하나, v1):

- `name`, `address`, `mapsUrl`
- `status` — `operating` 영업 중, `permanently_closed` 폐업, `planned` 아직 우리 바
- `hours[]` — 구글 지도 요일 문 여는 시간. `Closed`는 그날 문 닫음이고 폐업이 아님
- `source`, `sourceChecked` — 확인한 곳과 날짜
- `dances` — `bachata` `kizomba` `salsa` 중 하나 이상. 지도가 요일별 춤을 안 적으면 밤 프로그램으로 쓰지 않음

검증: `node data/check.js`

시드는 독립국 수도 195개다. 아시아 46, 유럽 46, 아프리카 54, 북미 23, 남미 12, 오세아니아 14. 바는 서울 Top Salsa Bar, 마드리드 The Host Club, 리스본 Barrio Latino만 채워 둔다. 나머지 베뉴는 비워 둔다. 바 이름과 주소는 확인된 것만 채운다.

## 프론트 (`web/`, P1에서 생성)

Vite + React. 스타일은 CSS. 아이콘은 lucide-react. 상태 라이브러리 없음. 필터는 쿼리로 둔다. `?dance=bachata&continent=europe`

```
web/src/
  main.jsx
  App.jsx
  styles/global.css
  lib/filterCapitals.js    data/contract.js 의 필터를 그대로 사용
  components/Hero.jsx
  components/Filters.jsx
  components/CapitalGrid.jsx
  components/CapitalCard.jsx
  pages/Home.jsx
  pages/Capital.jsx
```

라우트: `/` 목록, `/c/:id` 상세.

## 백엔드 (Supabase, P3에서 연결)

스키마는 `supabase/migrations/001_directory.sql`. 시드는 `supabase/seed.sql`. `npm run check`가 JSON에서 시드를 다시 만든다. 프로젝트에는 독립국 수도 195곳이 들어가 있다. 바는 서울, 마드리드, 리스본, 도쿄, 파리다. 파리는 `006_paris_agua.sql`을 실행해야 표에 들어간다. 화면은 `web/.env.local`의 Project URL과 anon 키로 이 표를 읽는다. service role 키는 쓰지 않는다. JSON은 계약과 시드 생성용으로 남긴다.

- `capitals` — 수도, 도시 사진
- `venues` — `capital_id` unique. 수도당 플래그십 하나. `operating`은 영업 중, `permanently_closed`는 폐업
- `venue_dances`
- `venue_hours` — 구글 지도에 적힌 문 여는 시간
- `crowd_reports` — 테이블만 있다. P4 전에는 쓰지 않는다

읽기는 public select. 쓰기는 P4 전까지 정책 없음.

실시간 인원은 실제로 영업 중인 바가 숫자를 넣을 때부터다. 그 전에 숫자를 보여 주지 않는다.

## 백엔드 순서

화면 코드는 이 순서가 끝나기 전에 열지 않는다.

1. 표 구조 — 완료. `capitals`, `venues`, `venue_dances`, `venue_hours`. `crowd_reports`는 칸만 있다.
2. 수도 — 완료. 독립국 195곳.
3. 확인된 바 — 진행. 수도 하나당 바 하나. 구글 지도에서 이름, 주소, 영업 중인지, 문 여는 시간, 춤을 확인한다. 확인은 수도마다 하되, SQL Editor는 수도마다 열지 않는다. 008과 009는 실행했다. 표에는 서울, 마드리드, 리스본, 도쿄, 파리, 다카르, 멕시코시티, 워싱턴, 보고타, 부에노스아이레스, 리마, 런던, 로마, 베를린, 암스테르담이 있다. 카이로, 나이로비, 아바나, 방콕은 비워 둔다. 남은 수도는 나누지 않고, 확인이 끝나면 파일 하나를 한 번 실행한다.
4. 사진 주소 — 바를 넣는 일이 끝난 뒤. `004_landmark_images.sql`은 실행하지 않는다.
5. 인원 — 실제 바가 숫자를 넣기 전에는 열지 않는다.

## 우선순위

- [x] P0 계약 — 이 문서, `data/capitals.json`, `data/contract.js`, SQL 스키마
- [x] P1 프론트 셸 — `web/`. 히어로, 춤·대륙 필터, 18개 카드. 쿼리 `?dance=&continent=`. 개발 서버 `npm run dev`
- [x] P2 수도 상세 — 주소, 지도, 요일 밤. 마드리드 The Host Club. 베뉴가 없으면 Coming soon
- [x] P3 Supabase — 스키마와 시드 적용. 목록과 상세는 `web/.env.local`의 URL과 anon 키로 읽음
- [ ] P4 인원 — `open` 베뉴만. 신고 주체와 갱신 시각을 같이 보여 줌
- [ ] P5 수도 확장 — 독립국 수도 195곳은 목록에 있다. 바는 확인된 것만. 빈 수도를 가짜 바로 채우지 않음

## 하지 않는 것

- 대양으로 거르기
- 날씨, 안전 점수, 물가 점수
- 확인되지 않은 바 이름, 주소, 인원
- 로그인, 결제, 다국어
