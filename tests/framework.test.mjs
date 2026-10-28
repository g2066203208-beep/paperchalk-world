import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createGame,restoreGame,perform,allCleared,currentEnemies,effectiveDistance,LANE_COUNT,LOCATIONS} from '../site/rules.js';
import {projectCard,lanePoint} from '../site/board.js';
const go=(state,action)=>{
 const r=perform(state,action);assert.equal(r.ok,true,r.message);return r.state;
};
test('v2 standing-card site and APK routing still exist',()=>{
 const html=readFileSync('site/index.html','utf8');
 const css=readFileSync('site/style.css','utf8');
 const app=readFileSync('site/app.js','utf8');
 assert.match(html,/board-grid/);
 assert.match(html,/id="lane-selector"/);
 assert.match(html,/id="player-marker"/);
 assert.match(css,/stand-card/);
 assert.match(css,/stand-shadow/);
 assert.match(html,/class="scene-grain"/);
 assert.match(html,/class="bell-icon"/);
 assert.match(css,/radial-gradient/);
 assert.ok(existsSync('site/environment.js'));
 assert.match(css,/orientation:portrait/);
 assert.match(app,/ResizeObserver/);
 assert.match(app,/localStorage/);
 assert.equal(LANE_COUNT,5);
 assert.ok(existsSync('.github/workflows/apk.yml'));
 assert.ok(readFileSync('android/app/src/main/java/com/paperchalk/lampkeep/MainActivity.java','utf8')
   .includes('https://g2066203208-beep.github.io/paperchalk-world/'));
});
test('five real lanes, front and rear monsters, stacking on same lane',()=>{
 const s=createGame();
 assert.equal(s.version,2);
 assert.ok(s.enemies.church.length>=8);
 assert.equal(new Set(s.enemies.church.map(e=>e.lane)).size,5);
 assert.ok(s.enemies.church.some(e=>e.side==='rear'));
 assert.ok(s.enemies.church.filter(e=>e.side==='front'&&e.lane===0).length>=2);
 assert.ok(LOCATIONS.every(l=>s.enemies[l.id].some(e=>e.side==='rear')));
 assert.equal(currentEnemies(s).length,s.enemies.church.length);
});
test('pure perspective projection shrinks far cards and sorts front occlusion',()=>{
 const enemies=createGame().enemies.church;
 const far=projectCard(enemies.find(e=>e.id==='h1'),880,500,0);
 const near=projectCard(enemies.find(e=>e.id==='h2'),880,500,0);
 assert.equal(far.lane,near.lane);
 assert.ok(near.cardWidth>far.cardWidth);
 assert.ok(near.cardHeight>far.cardHeight);
 assert.ok(near.yPercent>far.yPercent);
 assert.ok(near.zIndex>far.zIndex);
 assert.equal(far.effective,6);
 assert.ok(lanePoint(0,0).x>0);
 assert.ok(lanePoint(4,1).x<100);
 // On a small portrait phone each of five lanes stays within viewport.
 for(const e of enemies){
   const p=projectCard(e,345,280,0);
   assert.ok(p.xPercent>=8&&p.xPercent<=92);
   assert.ok(p.cardWidth<=80);
 }
});
test('shooting requires same lane and the nearest monster obstructs farther cards',()=>{
 let s=createGame();
 s=go(s,{type:'lane',lane:0});
 s=go(s,{type:'select',id:'h1'});
 assert.match(perform(s,{type:'shoot'}).message,/挡住/);
 assert.equal(perform(s,{type:'shoot'}).state.mag,s.mag);
 s=go(s,{type:'select',id:'h2'});
 s=go(s,{type:'shoot'});
 assert.ok(!s.enemies.church.some(e=>e.id==='h2'));
 assert.equal(s.mag,5);
 s=go(s,{type:'end'});
 s=go(s,{type:'select',id:'h1'});
 s=go(s,{type:'shoot'});
 assert.ok(!s.enemies.church.some(e=>e.id==='h1'));
});
test('player can transfer lanes, advance and retreat (front/rear pincer distance)',()=>{
 let s=createGame();
 const front=s.enemies.church.find(e=>e.id==='h4');
 const rear=s.enemies.church.find(e=>e.id==='h8');
 const f0=effectiveDistance(s,front),r0=effectiveDistance(s,rear);
 s=go(s,{type:'advance'});
 assert.equal(effectiveDistance(s,front),f0-1);
 assert.equal(effectiveDistance(s,rear),r0+1);
 s=go(s,{type:'advance'});
 assert.equal(s.advance,2);
 assert.equal(perform(s,{type:'advance'}).ok,false);
 s=go(s,{type:'retreat'});
 assert.equal(s.advance,1);
 assert.equal(s.ap,0);
 assert.equal(perform(s,{type:'lane',lane:0}).ok,false);
});
test('real enemy advance and backward repulsion, damage from both attack sides',()=>{
 let s=createGame();
 const prior=s.enemies.church.find(e=>e.id==='h8').depth;
 s=go(s,{type:'lane',lane:1});
 s=go(s,{type:'flare'});
 assert.equal(s.enemies.church.find(e=>e.id==='h8').depth,Math.min(6,prior+2));
 assert.equal(s.enemies.church.find(e=>e.id==='h3').depth,6);
 s=go(s,{type:'end'});
 assert.ok(s.enemies.church.find(e=>e.id==='h3').depth<=5);
 assert.equal(s.turn,2);
 // Two close attackers from opposite sides strike at the same defense line.
 const custom=structuredClone(s);
 custom.enemies.church=[
  {id:'f',type:'walker',lane:1,side:'front',depth:1,hp:2},
  {id:'r',type:'brute',lane:4,side:'rear',depth:1,hp:4}
 ];
 custom.advance=0;custom.hp=16;custom.status='playing';
 const after=go(custom,{type:'end'});
 assert.equal(after.hp,13);
 assert.match(after.log[0],/正面/);
 assert.match(after.log[0],/背后/);
});
test('separate location fields persist with five-lane data and safe save validation',()=>{
 let s=createGame();
 s=go(s,{type:'move',to:'cemetery'});
 assert.equal(s.current,'cemetery');assert.equal(s.ap,2);
 assert.equal(s.lane,2);assert.equal(s.advance,0);
 assert.equal(s.enemies.church.length,8);
 assert.equal(perform(s,{type:'move',to:'alley'}).ok,false);
 assert.deepEqual(restoreGame(JSON.stringify(s)),s);
 const bad=structuredClone(s);bad.enemies.church[0].lane=5;
 assert.deepEqual(restoreGame(bad),createGame());
 assert.deepEqual(restoreGame('bad json'),createGame());
 assert.deepEqual(restoreGame(JSON.stringify({version:1})),createGame());
});
test('no fake victory: clearing all genuine board enemies triggers win',()=>{
 const s=createGame();
 // This targeted state verifies the final kill transition, not a claimed full playthrough.
 for(const loc of LOCATIONS)s.enemies[loc.id]=[];
 s.enemies.church=[{id:'last',type:'walker',lane:2,side:'front',depth:1,hp:2}];
 s.selected='last';
 const won=go(s,{type:'shoot'});
 assert.equal(won.status,'won');
 assert.equal(allCleared(won),true);
 assert.equal(perform(won,{type:'shoot'}).ok,false);
});
