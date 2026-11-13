'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{},Map,Set,Object,Error});
const base=path.join(__dirname,'../site/card-battle/');
for(const file of ['engine/character-registry.js','data/characters.generated.js']){
 vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ctx,{filename:file});
}
const r=ctx.window.PaperchalkCharacterRegistry;
assert.equal(r.size,3,'warrior, engineer, ranger registered automatically');
for(const [id,profession] of [['farmer-warrior-loli-lumberjack','warrior'],
 ['farmer-engineer-farmer','engineer'],['farmer-ranger-huntress','ranger']]){
 const item=r.get(id);
 assert.ok(item,'Missing '+id);
 assert.equal(item.profession,profession);
 assert.equal(item.width,704);
 assert.equal(item.height,1024);
 const img=path.join(__dirname,'../site/card-battle/',item.portrait);
 assert.ok(fs.existsSync(img),'Approved original PNG missing: '+img);
}
console.log('CHARACTER_REGISTRY_OK farmer 3 characters original PNGs auto-registered');
