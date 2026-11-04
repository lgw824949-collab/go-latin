import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPITAL_IMAGE_CREDITS, imageCredit, imageCreditHtml } from "./capitalImageCredits.js";

const CREDITS = [
  {
    id: "ouagadougou",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Cathedrale_Ouagadougou.jpg",
    author: "Sputniktilt",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:Cathedrale_Ouagadougou.jpg",
    previous: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Ouagadougou_Skyline.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  },
  {
    id: "bangui",
    image: "https://upload.wikimedia.org/wikipedia/commons/5/58/Bangui_City_Centre.jpg",
    author: "Alllexxxis",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    page: "https://commons.wikimedia.org/wiki/File:Bangui_City_Centre.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Bangui_collage.png/960px-Bangui_collage.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  },
  {
    id: "beirut",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Beirut_skyline%2C_Beirut%2C_Lebanon.jpg",
    author: "Vyacheslav Argenberg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    page: "https://commons.wikimedia.org/wiki/File:Beirut_skyline,_Beirut,_Lebanon.jpg",
    previous: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Beyrouth_vue_a%C3%A9rienne.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  },
  {
    id: "warsaw",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg",
    author: "A.Savin",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:Warsaw_07-13_img30_View_from_Palace_of_Culture_and_Science.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Pa%C5%82ac_Kultury_i_Nauki_2019.jpg/960px-Pa%C5%82ac_Kultury_i_Nauki_2019.jpg",
  },
  {
    id: "lome",
    image: "https://upload.wikimedia.org/wikipedia/commons/7/72/Lome_Togo_Beach_Road.jpg",
    author: "Philip Nalangan",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    page: "https://commons.wikimedia.org/wiki/File:Lome_Togo_Beach_Road.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/C%E2%80%99est_Lom%C3%A9.jpg/960px-C%E2%80%99est_Lom%C3%A9.jpg",
  },
  {
    id: "tegucigalpa",
    image: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Skyline_of_the_Great_Tegucigalpa%2C_Honduras.jpg",
    author: "I Love Honduras",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    page: "https://commons.wikimedia.org/wiki/File:Skyline_of_the_Great_Tegucigalpa,_Honduras.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Tegucigalpa_downtown_panoramic_2026.jpg/960px-Tegucigalpa_downtown_panoramic_2026.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  },
  {
    id: "kingston",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/19/Kingston_Harbour_%28cmakin%29_2004-09-19.png",
    author: "Carey Akin",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    page: "https://commons.wikimedia.org/wiki/File:Kingston_Harbour_(cmakin)_2004-09-19.png",
    previous: "https://upload.wikimedia.org/wikipedia/commons/9/99/PortofKingston.jpg",
  },
  {
    id: "yaounde",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Hillside_Yaounde_View.jpg",
    author: "Heather Powell",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    page: "https://commons.wikimedia.org/wiki/File:Hillside_Yaounde_View.jpg",
    previous: "https://upload.wikimedia.org/wikipedia/commons/1/10/Yaound%C3%A9_1.jpg",
  },
  {
    id: "paramaribo",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Onafhankelijkheidsplein_%2815357070803%29.jpg",
    author: "Maarten van der Bent",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    page: "https://commons.wikimedia.org/wiki/File:Onafhankelijkheidsplein_(15357070803).jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Paramaribo_city_collage.png/960px-Paramaribo_city_collage.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  },
  {
    id: "asmara",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/05/2006-11-01_Asmara_02.jpg",
    author: "Hansueli Krapf",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:2006-11-01_Asmara_02.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Asmara_Montage.png/960px-Asmara_Montage.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  },
  {
    id: "kuala_lumpur",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Kuala_lumpur_malaysia-petronastowers-smoggyskyline-2004.jpg",
    author: "Nesnad",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:Kuala_lumpur_malaysia-petronastowers-smoggyskyline-2004.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Petronas_Panorama_II.jpg/960px-Petronas_Panorama_II.jpg",
  },
  {
    id: "bridgetown",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Barbados%2C_Karibik_-_Panoramic_view_of_Bridgetown_from_Gun_Hill_Signal_Station_-_panoramio.jpg",
    author: "giggel",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:Barbados,_Karibik_-_Panoramic_view_of_Bridgetown_from_Gun_Hill_Signal_Station_-_panoramio.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Bridgetown_aerial.JPG/960px-Bridgetown_aerial.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  },
  {
    id: "dodoma",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Makulu_ward%2C_Dodoma_City.jpg",
    author: "Mangapwani",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    page: "https://commons.wikimedia.org/wiki/File:Makulu_ward,_Dodoma_City.jpg",
    previous: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Gaddafi_mosque_Dodoma.jpg/960px-Gaddafi_mosque_Dodoma.jpg",
  },
];

test("a photo credit is registered for the replacement images only", () => {
  assert.deepEqual(Object.keys(CAPITAL_IMAGE_CREDITS).sort(), CREDITS.map((credit) => credit.id).sort());
});

test("the current image url shows no photo credit", () => {
  for (const credit of CREDITS) {
    assert.equal(imageCredit(credit.id, credit.previous), null);
    assert.equal(imageCreditHtml(credit.id, credit.previous), "");
  }
});

test("the replacement image url shows the author, license page, and Commons file page", () => {
  for (const credit of CREDITS) {
    assert.deepEqual(imageCredit(credit.id, credit.image), {
      author: credit.author,
      license: credit.license,
      licenseUrl: credit.licenseUrl,
      page: credit.page,
    });
    assert.equal(
      imageCreditHtml(credit.id, credit.image),
      `<p class="lede">Photo: ${credit.author}, <a href="${credit.licenseUrl}">${credit.license}</a>. <a href="${credit.page}">Wikimedia Commons</a></p>`,
    );
  }
});

test("a matching image url on another city shows no photo credit", () => {
  assert.equal(imageCredit("seoul", CREDITS[3].image), null);
  assert.equal(imageCredit("warsaw", CREDITS[0].image), null);
  assert.equal(imageCreditHtml("beirut", `${CREDITS[2].image}?size=large`), "");
});

test("Preview seed preserves stored images including Beirut and never attaches unrelated replacement credits", () => {
  const path = join(dirname(fileURLToPath(import.meta.url)), "../../../data/capitals.json");
  const capitals = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(capitals.length, 195);
  const credited = capitals.filter((capital) => CAPITAL_IMAGE_CREDITS[capital.id]);
  assert.deepEqual(credited.map((capital) => capital.id).sort(), CREDITS.map((credit) => credit.id).sort());
  for (const capital of credited) {
    const expected = CREDITS.find(credit => credit.id === capital.id);
    assert.equal(capital.image, expected.previous);
    assert.equal(imageCredit(capital.id, capital.image), null);
    assert.equal(imageCreditHtml(capital.id, capital.image), "");
  }
  const others = capitals.filter((capital) => !CAPITAL_IMAGE_CREDITS[capital.id]);
  assert.equal(others.length, 182);
  for (const capital of others) {
    assert.equal(imageCredit(capital.id, capital.image), null);
    assert.equal(CREDITS.some((credit) => credit.image === capital.image), false);
  }
});
