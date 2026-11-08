import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASIA_CAPITAL_IDS, asiaCapital} from './asiaCapitals.js';
import {listCountries} from './countries.js';
test('Asia capital presentation selects exactly one existing capital for each of 46 countries',()=>{
 const rows=JSON.parse(readFileSync(new URL('../../../data/capitals.json',import.meta.url),'utf8')).filter(c=>c.continent==='asia');
 const countries=listCountries(rows);assert.equal(countries.length,46);assert.equal(Object.keys(ASIA_CAPITAL_IDS).length,46);
 for(const country of countries){const selected=asiaCapital(country);assert.equal(selected.id,ASIA_CAPITAL_IDS[country.slug]);
  assert.equal(asiaCapital({...country,cities:[{id:'a_non_capital',city:'Not a capital'},...country.cities]}).id,selected.id);
 }
 assert.equal(asiaCapital({slug:'vietnam',cities:[{id:'ho-chi-minh-city'}]}),null);
});
