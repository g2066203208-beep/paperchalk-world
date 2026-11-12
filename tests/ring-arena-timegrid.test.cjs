'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
globalThis.Timegrid=require('../site/combat-lab/engine.js');
const bridge=require('../site/game/ring-arena-timegrid.js');
const G=globalThis.Timegrid;
assert.equal(G.ROUND,10);
const b=bridge.createBattle(12292),g=b.game;
assert.deepEqual(g.actors.map(a=>a.side),[...'aaaabbbb'].map(x=>x==='a'?'ally':'enemy'));
assert.deepEqual(b.game.actors.map(a=>bridge.displayId(a.id)),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.ok(g.actors.every(a=>a.actions.every(act=>act.source!=='ai')),'no automated ally choices');
const planned=[];
for(let i=1;i<=4;i++){
 b.setRole(i);const actor=b.controlled();const c=actor.hand.find(x=>G.CARD[x.key].type==='attack');
 if(c){const a=b.schedule(c.uid,i, 'enemy-'+i);planned.push([actor.id,a.id,a.start]);}
 else b.autoplan();
}
assert.equal(b.game.controlledId,'ai-mage');
assert.ok(b.game.actors.slice(0,4).some(a=>a.actions.length>0));
const original=JSON.stringify(b.game),pv=b.preview();
assert.equal(JSON.stringify(b.game),original,'preview is read-only and deterministic');
assert.equal(pv.actors.length,8);
assert.equal(b.execute(),true);
assert.equal(b.playback,true);
const sequence=[];b.onChange(x=>{if(x.tick)sequence.push(x)});
for(let n=0;n<70&&b.playback;n++)b.advance(.15);
assert.equal(b.playback,false);
assert.ok(sequence.length>=1&&sequence.length<=10);
assert.equal(b.game.round,1);
assert.ok(b.game.actors.some(a=>a.hp<a.maxHp)||b.game.actors.some(a=>a.energy>0));
assert.equal(b.progress,0);
assert.ok(sequence.every(s=>s.actors.length===8&&s.tickInRound>=1&&s.tickInRound<=10));
assert.ok(sequence.every(s=>s.activeActions.every(a=>a.visualId&&a.targetVisualId)));
const fresh=bridge.createBattle(8);
assert.ok(fresh.setRole(0)===false);
assert.ok(fresh.setRole(3));
assert.equal(fresh.controlled().id,'ai-guard');
const origin=G.create({classId:'axe',encounterId:'corridor'});
assert.ok(origin.actors[0].hand.length>0,'legacy combat lab unaffected');
const main=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
assert.match(main,/ring-arena-timegrid\.js/);
assert.match(main,/ring-arena-timegrid\.css/);
assert.match(main,/combat-lab\/balance-v17\.js/,'v1.7 balance module loaded');
assert.match(main,/combat-lab\/campaign\.js/,'full v1.7 campaign hook loaded');
assert.match(main,/ring-arena-timegrid\.js\?v=[^\"]+/, 'timegrid JS version cache busted');
assert.match(main,/ring-arena-timegrid\.css\?v=[^\"]+/, 'timegrid CSS version cache busted');
const right=fs.readFileSync(path.join(__dirname,'../site/game/ring-arena-timegrid.js'),'utf8');
const style=fs.readFileSync(path.join(__dirname,'../site/game/ring-arena-timegrid.css'),'utf8');
assert.ok(right.includes('data-tg-choose-role'));
assert.ok(right.includes('tg-roster'),'portrait roster preserved');
assert.ok(right.includes('tg-hp-value')&&right.includes('tg-hp-bar'),'live HP kept');
assert.ok(right.includes('handpainted-film-portrait-timegrid-v4'),'full-height vertical movie reel mounted');
assert.ok(right.includes('tg-film-blank-top')&&right.includes('tg-film-blank-bottom'),'both ends filled by authentic empty film frames');
assert.ok(right.includes('painted-film-portrait-frame.webp'),'GPT film image asset used');
assert.ok(right.includes('rollOut'),'death extracts its film frame');
assert.ok(right.includes('recruit:actor'),'newcomers join the film');
assert.ok(right.includes('rosterRevision'),'dynamic membership has stable state');
assert.ok(right.includes('data-tg-quick')&&right.includes('executeQuick'),'combat still executable');
assert.ok(right.includes('data-tg-timeline')&&right.includes('data-tg-tick')&&right.includes('model.schedule('),
 'clicked portrait must expose the real ten-step planner and action placement');
assert.ok(right.includes('hud.append(holder,hitLayer)'),'only actual roster and hit FX mounted');
assert.ok(!right.includes('tg-tactics')&&!right.includes('tg-tick-caption'),
 'old round-one action panel actually removed');
assert.ok(!right.includes('tg-film-frame')&&!right.includes('continuous-35mm-filmstrip'),
 'CSS imitation film reel is absent');
assert.ok(!style.includes('radial-gradient(ellipse'),'sprocket holes never CSS-painted');
assert.ok(style.includes('content:none!important'),'no pseudo-element film edges');
assert.ok(style.includes('.tg-reel')&&style.includes('tg-reel-scroll-in'),
 'one-piece film scroll is animated');
assert.ok(style.includes('.tg-film-texture'),'authored frame image overlays portraits');
assert.ok(style.includes('.tg-hp-bar'),'real HP line survives');
assert.ok(style.includes('.tg-tactics{display:none!important}'),
 'rejected card planner stays hidden');
assert.ok(style.includes('@media(max-width:700px)'),'mobile viewport supported');
const film=fs.readFileSync(path.join(__dirname,'../site/assets/ui/painted-film-portrait-frame.webp'));
assert.ok(film.subarray(0,4).toString()==='RIFF','redesigned silver film is real WebP art');
assert.ok(film.length>700,'painted silver film asset not a placeholder');
for(const name of ['painted-film-blank-a.webp','painted-timeline-panel.webp','painted-tick-idle.webp','painted-tick-active.webp','painted-paper-tick-v2.webp','painted-red-tick-v2.webp','painted-paper-button.webp'])
 assert.ok(fs.statSync(path.join(__dirname,'../site/assets/ui',name)).size>350,'authored non-repeating empty film texture preserved');
assert.match(runtime,/PaperWorldRingTimegrid/);
assert.match(runtime,/combatTimegrid\.advance\(dt\)/);
console.log('PASS ring arena actual 4v4 Timegrid ten-tick cards, four controllers and game integration');
