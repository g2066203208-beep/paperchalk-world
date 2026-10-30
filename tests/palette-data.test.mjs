import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../site/pixel-lab/palette-choices.json',import.meta.url),'utf8'));
const ids=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'AA','AB','AC','AD'];
const categories=['复古年代','未来幻想','童话奇想','自然风物','暗黑奇谭','极端实验'];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const distance=(a,b)=>Math.hypot(...rgb(a).map((x,i)=>x-rgb(b)[i]));
test('thirty original candidate worlds, six art directions and complete metadata',()=>{
 assert.equal(data.length,30);
 assert.deepEqual(data.map(p=>p.id),ids);
 for(const category of categories)assert.ok(data.filter(p=>p.category===category).length>=4,category);
 for(const p of data){
  for(const key of ['name','en','description','scene','shape','ui','motto','category'])assert.ok(typeof p[key]==='string'&&p[key].trim().length>2,p.id+' '+key);
  assert.ok(categories.includes(p.category),p.id);
  assert.equal(p.colors.length,4,p.id);
  assert.equal(new Set(p.colors).size,4,p.id);
  for(const color of p.colors)assert.match(color,/^#[0-9A-F]{6}$/);
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(distance(p.colors[i],p.colors[j])>=48,p.id+' two colors too similar');
  assert.ok(distance(p.colors[0],p.colors[3])>150,p.id+' silhouette must contrast with highlight');
 }
 assert.equal(new Set(data.map(p=>p.scene)).size,30,'Each palette needs its own scene title');
 assert.equal(new Set(data.map(p=>p.shape)).size,30,'Each palette needs its own shape language');
});
