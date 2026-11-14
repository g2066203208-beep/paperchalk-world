'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
for(const name of ['engine/card-registry.js','data/card-packs.js',
 'engine/profession-decks.js','engine/farmer-facilities.js','engine/bandit-roster.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../site/card-battle/',name),'utf8'),ctx,{filename:name});
}
const {PaperchalkCardRegistry:R,PaperchalkCardCatalog:C,
 PaperchalkFarmerFacilities:F,PaperchalkBanditRoster:B,
 PaperchalkProfessionDecks:D}=ctx.window;
assert.equal(C.snapshot.cards,35,'one registered definition per actual card');
assert.equal(C.cardsFor({profession:'warrior'}).length,4,
 'profession skills do not leak a different hero signature card');
assert.equal(C.cardsFor({profession:'warrior',
 characterId:'farmer-warrior-loli-lumberjack'}).length,5);
assert.equal(C.cardsFor({profession:'engineer'}).length,0,
 'unowned farmer skills are NOT generic engineer cards');
assert.equal(C.cardsFor({profession:'engineer',
 characterId:'farmer-engineer-farmer'}).length,5);
assert.equal(C.cardsFor({profession:'ranger',faction:'farmer'}).length,10);
assert.equal(C.cardsFor({profession:'ranger',faction:'knight'}).length,5);
assert.equal(C.forArchetype('captain').length,5);
assert.equal(B.PROFILES.captain.cards.length,5);
assert.equal(F.DEFINITIONS['farm-field'].hp,C.get('farm-field').facilityHp);
assert.deepEqual([...F.DEFINITIONS.windmill.footprint],[2,2]);
const deck=D.create({ownedCharacters:[
 {id:'woodcutter',profession:'warrior',characterId:'farmer-warrior-loli-lumberjack'},
 {id:'farmer',profession:'engineer',characterId:'farmer-engineer-farmer'}
]});
assert.equal(deck.snapshot().roster[0].deckCount,10);
assert.equal(deck.snapshot().roster[1].deckCount,10);
const r=R.create();
r.registerPack({id:'test-warrior',scope:'profession',profession:'warrior',
 cards:[{id:'test-slash',name:'测试斩击',type:'attack',power:1}]});
assert.equal(r.cardsFor({profession:'warrior'}).length,1);
assert.throws(()=>r.registerPack({id:'duplicate-pack',scope:'profession',profession:'warrior',
 cards:[{id:'test-slash',name:'重复',type:'attack',power:1}]}),/duplicate|Invalid/i);
assert.throws(()=>r.registerPack({id:'bad-facility',scope:'character',
 profession:'engineer',characterId:'test',cards:[
 {id:'bad-barn',name:'错误设施',type:'facility',footprint:[0,4],facilityHp:3,
  facilityRole:'production'}
 ]}),/footprint/i);
assert.throws(()=>r.registerPack({id:'bad-character',scope:'character',
 profession:'warrior',cards:[{id:'test-missing',name:'缺少人物',type:'attack',power:2}]
}),/owner/i);
console.log('CARD_REGISTRY_PASS',JSON.stringify(C.snapshot));
