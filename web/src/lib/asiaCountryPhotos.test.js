import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ASIA_COUNTRY_PHOTOS} from './asiaCountryPhotos.js';
test('43 locally served existing country photos have source and license records',()=>{
 assert.equal(Object.keys(ASIA_COUNTRY_PHOTOS).length,43);
 for(const [id,p] of Object.entries(ASIA_COUNTRY_PHOTOS)){
  assert.ok(p.author);assert.ok(p.source.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.match(p.license,/^CC/);assert.ok(existsSync(new URL('../../public'+p.src,import.meta.url)),id);
  const b=readFileSync(new URL('../../public'+p.src,import.meta.url));
  assert.ok(b[0]===255&&b[1]===216||b.subarray(0,8).toString('hex')==='89504e470d0a1a0a');
 }
 for(const id of ['jakarta','naypyidaw','vientiane'])assert.equal(ASIA_COUNTRY_PHOTOS[id],undefined);
});
