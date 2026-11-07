import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCities, publicCityOverview} from './publicCities.js';
for(const count of [3,6,7,20]) test('publication scenario '+count,()=>{
 const ids=Array.from({length:count},(_,i)=>'city-'+i);
 const rows=[...ids].reverse().map(id=>({id,venues:[]}));rows.push({id:'private',venues:[{status:'operating'}]});
 const result=publicCityOverview(rows,ids);
 assert.deepEqual(result.all.map(c=>c.id),ids);
 assert.equal(result.featured.length,Math.min(count,6));assert.equal(result.showAll,count>6);
 assert.ok(!result.all.some(c=>c.id==='private'));
});
test('initial publication order, missing IDs and deduplication',()=>{
 const rows=['hanoi','tokyo','bangkok','seoul'].map(id=>({id}));
 assert.deepEqual(publicCities(rows).map(c=>c.id),['seoul','bangkok','hanoi']);
 assert.deepEqual(publicCities(rows,['hanoi','missing','hanoi']).map(c=>c.id),['hanoi']);
});
