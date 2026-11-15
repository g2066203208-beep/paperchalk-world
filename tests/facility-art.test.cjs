'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
for(const file of ['engine/card-registry.js','data/card-packs.js',
 'data/facility-art.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../site/card-battle/',file),'utf8'),ctx,{filename:file});
}
const catalog=ctx.window.PaperchalkCardCatalog;
const art=ctx.window.PaperchalkFacilityArt;
assert.equal(art.ids.length,5);
const seen=new Set();
for(const id of art.ids){
 const card=catalog.get(id),image=art.get(id);
 assert.ok(card,'facility has authoritative gameplay card '+id);
 assert.equal(card.type,'facility');
 assert.ok(image.src.startsWith('../assets/card-battle/farmer/'));
 assert.ok(image.src.endsWith(id+'.png'),'art paths stable by card ID');
 assert.ok(image.alpha,'Anima scene sprites must preserve transparent edges');
 assert.equal(image.size[0],image.size[1],'square art canvas avoids facility distortion');
 assert.ok(image.size[0]>=1024);
 assert.ok(!seen.has(image.src));seen.add(image.src);
}
assert.equal(art.get('nonexistent'),null);
assert.equal(art.get('windmill').size[0],1536);
console.log('FACILITY_ART_REGISTRY_PASS 5_filenames_auto_loading_independent_of_rules');
