// Curated from the official US Roku Channel catalog; not a live inventory feed.
export const ROKU_CHECKED_ON = "2026-10-12";
export const ROKU_TITLES = [
  {
    title: "Hotel Transylvania",
    year: 2012,
    image: "/src/assets/roku/hotel-transylvania.jpg",
    url: "https://therokuchannel.roku.com/details/54a5400d80b2586fbe590e6a204d90a8/hotel-transylvania",
    imageSource:
      "https://images.sr.roku.com/idType/roku-trc/context/trc/id/54a5400d80b2586fbe590e6a204d90a8/rokuFeed/assets/a8dfcaefcbb65960819d6b931f6f6a39.jpg/magic/fit-in/440x480",
  },
  {
    title: "Madagascar",
    year: 2005,
    image: "/src/assets/roku/madagascar.jpg",
    url: "https://therokuchannel.roku.com/details/edc1ae5ef12d5b79ad4b2863c25cd236/madagascar",
    imageSource:
      "https://images.sr.roku.com/idType/roku-trc/context/trc/id/edc1ae5ef12d5b79ad4b2863c25cd236/images/gracenote/assets/p87313_v_h8_aa.jpg/magic/fit-in/440x480",
  },
  {
    title: "Hotel Transylvania 2",
    year: 2015,
    image: "/src/assets/roku/hotel-transylvania-2.jpg",
    url: "https://therokuchannel.roku.com/details/f47f0ab53e365699b5bd9fafa9657f6c/hotel-transylvania-2",
    imageSource:
      "https://images.sr.roku.com/idType/roku-trc/context/trc/id/f47f0ab53e365699b5bd9fafa9657f6c/rokuFeed/assets/d7dba64351215e5ba7990a9ad87bb428.jpg/magic/fit-in/440x480",
  },
];
export function billboardFrame(
  seconds,
  offset = 0,
  count = ROKU_TITLES.length,
) {
  return count > 0
    ? (Math.floor(Math.max(0, seconds) / 12) + offset) % count
    : 0;
}
export function lineupHeadline(now = Date.now()) {
  const age = now - Date.parse(ROKU_CHECKED_ON + "T00:00:00Z");
  return age >= 0 && age < 7 * 86400000 ? "NOW STREAMING" : "FEATURED PICKS";
}
