const assert=require('node:assert/strict');const G=require('../engine.js');let n=0;
function test(name,fn){try{fn();n++;console.log('✓',name)}catch(e){console.error('✗',name,e.stack);process.exitCode=1;}}
function base(opts={}){let g=G.create({classId:'axe',styleId:'strike',encounterId:'corridor',demoEnergy:100,seed:77,...opts});for(const en of g.actors.filter(a=>a.side==='enemy'))en.actions=[];return g}
function hand(g,list){g.actors[0].hand=list.map((card,i)=>({uid:'T'+i,key:card}));}
function enemyAction(g,key,relative,target='hero'){const en=g.actors.find(x=>x.side==='enemy');en.actions.push({id:'manual_'+relative,card:key,start:g.now+relative-1,target,guardLeft:G.CARD[key].guard||0,canceled:false,locked:true,source:'enemy'});return en}
test('a preceding marked target unlocks a later finisher in planning without advancing the turn',()=>{const g=base(),en=G.actorsOf(g,'enemy')[0];hand(g,['focus']);G.place(g,'T0',1,en.id);assert.equal(en.marked,0);const f=G.placeFinisher(g,3,en.id);assert.equal(f.start,2);assert.equal(g.round,0);assert.equal(g.actors[0].energy,100);const pred=G.simulateRound(g,{preview:true});assert.ok(pred.events.some(x=>x.kind==='finish'));});
test('a mark after the finisher time cannot unlock it retroactively',()=>{const g=base(),en=G.actorsOf(g,'enemy')[0];hand(g,['focus']);G.place(g,'T0',5,en.id);assert.throws(()=>G.placeFinisher(g,1,en.id),/启动条件/);});
test('higher speed attack defeats slower enemy before the slower one deals its same-tick damage',()=>{const g=base(),en=G.actorsOf(g,'enemy')[0];en.hp=9;hand(g,['shot']);G.place(g,'T0',2,en.id);enemyAction(g,'e_claw',1,'hero');const pre=g.actors[0].hp;const r=G.simulateRound(g,{preview:true});assert.equal(r.actors[0].hp,pre);assert.equal(r.actors.find(a=>a.id===en.id).hp,0);});
test('moving a placed card to another target lane and time retains card uid and checks collisions',()=>{const g=base({encounterId:'twins'}),E=G.actorsOf(g,'enemy');hand(g,['cut','heavy']);const a=G.place(g,'T0',1,E[0].id);G.place(g,'T1',6,E[0].id);G.moveAction(g,a.id,3,E[1].id);assert.equal(a.start,2);assert.equal(a.target,E[1].id);assert.throws(()=>G.moveAction(g,a.id,6,E[1].id),/占用/);});
test('support card dropped on ally lane heals the ally not the caster',()=>{const g=base({team:true}),friend=g.actors.find(a=>a.id==='ai-gun');friend.hp-=8;hand(g,['remedy']);G.place(g,'T0',1,friend.id);const r=G.simulateRound(g,{preview:true});assert.ok(r.actors.find(a=>a.id===friend.id).hp>friend.hp);});
test('guard on ally lane protects teammate and is not shown as owner target change',()=>{const g=base({team:true}),friend=g.actors.find(a=>a.id==='ai-gun');hand(g,['stance']);G.place(g,'T0',2,friend.id);enemyAction(g,'e_claw',1,friend.id);const result=G.simulateRound(g,{preview:true});const ally=result.actors.find(a=>a.id===friend.id);assert.equal(ally.hp,friend.hp);});
test('preview trace and actual execution have the same HP/mark effects',()=>{const g=base(),en=G.actorsOf(g,'enemy')[0];hand(g,['focus']);G.place(g,'T0',1,en.id);const preview=G.simulateRound(g,{preview:true,collectTrace:true});assert.equal(preview.trace.length,10);const result=G.simulateRound(g);for(const a of result.actors)assert.equal(a.hp,preview.actors.find(x=>x.id===a.id).hp);});
console.log('PASS '+n+' speed/track tests');
test('support on a teammate who is already acting never reserves teammate time',()=>{
 const g=base({team:true});const hero=g.actors[0],ally=g.actors.find(x=>x.id==='ai-gun'),foe=G.actorsOf(g,'enemy')[0];
 ally.actions=[{id:'teammate-busy',card:'shot',start:g.now+1,target:foe.id,canceled:false,locked:true}];
 const original=JSON.stringify(ally.actions);
 hand(g,['stance']);const aid=G.place(g,'T0',2,ally.id);
 assert.equal(aid.target,ally.id);assert.ok(hero.actions.includes(aid));
 assert.equal(JSON.stringify(ally.actions),original);
 assert.equal(aid.start,ally.actions[0].start);
});
test('caster cannot reserve the same time twice even across different target lanes',()=>{
 const g=base({team:true});const ally=g.actors.find(x=>x.id==='ai-gun'),foe=G.actorsOf(g,'enemy')[0];
 hand(g,['stance','cut']);G.place(g,'T0',2,ally.id);
 assert.throws(()=>G.place(g,'T1',2,foe.id),/占用/);
});
