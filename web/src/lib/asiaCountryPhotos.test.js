import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ASIA_COUNTRY_PHOTOS} from './asiaCountryPhotos.js';
test('42 retained country existing country photos have source and license records',()=>{
 assert.equal(Object.keys(ASIA_COUNTRY_PHOTOS).length,42);
 for(const [id,p] of Object.entries(ASIA_COUNTRY_PHOTOS)){
  assert.ok(p.author);assert.ok(p.source.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.match(p.license,/^CC/);assert.ok(existsSync(new URL('../../public'+p.src,import.meta.url)),id);
  const b=readFileSync(new URL('../../public'+p.src,import.meta.url));
  assert.ok(b[0]===255&&b[1]===216||b.subarray(0,8).toString('hex')==='89504e470d0a1a0a');
 }
 for(const id of ['baku','jakarta','naypyidaw','vientiane'])assert.equal(ASIA_COUNTRY_PHOTOS[id],undefined);
});

test('accuracy audit covers every Asia country and excludes all pending photographs',()=>{
 const audit=JSON.parse(readFileSync(new URL('../../../docs/asia-image-accuracy-review.json',import.meta.url),'utf8'));
 assert.equal(audit.rows.length,46);assert.equal(new Set(audit.rows.map(r=>r.country)).size,46);
 for(const row of audit.rows){
   if(row.displayedFile){assert.equal(ASIA_COUNTRY_PHOTOS[row.id]?.src,row.displayedFile);assert.ok(row.visualEvidence);assert.ok(row.sourceDescription||row.latitude);}
   else assert.equal(ASIA_COUNTRY_PHOTOS[row.id],undefined);
   if(row.distanceFromDirectoryCityKm!==null)assert.ok(row.distanceFromDirectoryCityKm<10,row.id);
 }
 for(const city of audit.representativeCities)assert.equal(city.byteIdenticalToApprovedDownload,true);
});
