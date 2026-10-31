const LICENSE_URL = {
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};

export const CAPITAL_IMAGE_CREDITS = {
  ouagadougou: {
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Cathedrale_Ouagadougou.jpg",
    author: "Sputniktilt",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Cathedrale_Ouagadougou.jpg",
  },
  bangui: {
    image: "https://upload.wikimedia.org/wikipedia/commons/5/58/Bangui_City_Centre.jpg",
    author: "Alllexxxis",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Bangui_City_Centre.jpg",
  },
  beirut: {
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Beirut_skyline%2C_Beirut%2C_Lebanon.jpg",
    author: "Vyacheslav Argenberg",
    license: "CC BY 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Beirut_skyline,_Beirut,_Lebanon.jpg",
  },
  warsaw: {
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg",
    author: "A.Savin",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg",
  },
  lome: {
    image: "https://upload.wikimedia.org/wikipedia/commons/7/72/Lome_Togo_Beach_Road.jpg",
    author: "Philip Nalangan",
    license: "CC BY 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Lome_Togo_Beach_Road.jpg",
  },
  tegucigalpa: {
    image: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Skyline_of_the_Great_Tegucigalpa%2C_Honduras.jpg",
    author: "I Love Honduras",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Skyline_of_the_Great_Tegucigalpa,_Honduras.jpg",
  },
  kingston: {
    image: "https://upload.wikimedia.org/wikipedia/commons/1/19/Kingston_Harbour_%28cmakin%29_2004-09-19.png",
    author: "Carey Akin",
    license: "CC BY-SA 2.0",
    page: "https://commons.wikimedia.org/wiki/File:Kingston_Harbour_(cmakin)_2004-09-19.png",
  },
  yaounde: {
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Hillside_Yaounde_View.jpg",
    author: "Heather Powell",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Hillside_Yaounde_View.jpg",
  },
  paramaribo: {
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Onafhankelijkheidsplein_%2815357070803%29.jpg",
    author: "Maarten van der Bent",
    license: "CC BY-SA 2.0",
    page: "https://commons.wikimedia.org/wiki/File:Onafhankelijkheidsplein_(15357070803).jpg",
  },
  asmara: {
    image: "https://upload.wikimedia.org/wikipedia/commons/0/05/2006-11-01_Asmara_02.jpg",
    author: "Hansueli Krapf",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:2006-11-01_Asmara_02.jpg",
  },
  kuala_lumpur: {
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Kuala_lumpur_malaysia-petronastowers-smoggyskyline-2004.jpg",
    author: "Nesnad",
    license: "CC BY 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Kuala_lumpur_malaysia-petronastowers-smoggyskyline-2004.jpg",
  },
  bridgetown: {
    image: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Barbados%2C_Karibik_-_Panoramic_view_of_Bridgetown_from_Gun_Hill_Signal_Station_-_panoramio.jpg",
    author: "giggel",
    license: "CC BY 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Barbados,_Karibik_-_Panoramic_view_of_Bridgetown_from_Gun_Hill_Signal_Station_-_panoramio.jpg",
  },
  dodoma: {
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Makulu_ward%2C_Dodoma_City.jpg",
    author: "Mangapwani",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Makulu_ward,_Dodoma_City.jpg",
  },
};

for (const [id, credit] of Object.entries(CAPITAL_IMAGE_CREDITS)) {
  if (!LICENSE_URL[credit.license]) throw new Error(`${id} has no license page`);
}

export function imageCredit(id, image) {
  if (typeof id !== "string" || typeof image !== "string") return null;
  const credit = CAPITAL_IMAGE_CREDITS[id];
  if (!credit || credit.image !== image) return null;
  return {
    author: credit.author,
    license: credit.license,
    licenseUrl: LICENSE_URL[credit.license],
    page: credit.page,
  };
}

export function imageCreditHtml(id, image) {
  const credit = imageCredit(id, image);
  if (!credit) return "";
  return `<p class="lede">Photo: ${escapeHtml(credit.author)}, <a href="${escapeHtml(credit.licenseUrl)}">${escapeHtml(credit.license)}</a>. <a href="${escapeHtml(credit.page)}">Wikimedia Commons</a></p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
