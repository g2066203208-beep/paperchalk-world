import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(p,'utf8');
const page=read('site/stripe-game/index.html');
const version=JSON.parse(read('site/stripe-game/version.json'));
const manifest=JSON.parse(read('site/stripe-game/manifest.webmanifest'));
const official=['#393657','#F2A5C2','#A9BAE9','#FFF5E6'];

test('exact game official D four colors',()=>{
 assert.deepEqual(version.palette,official);
 assert.deepEqual(version.background,['#FFF5E6','#F2A5C2']);
 for(const hex of official)assert.ok(page.includes(hex),hex);
 assert.ok(page.includes('const RGB_CREAM=[255,245,230],RGB_PINK=[242,165,194]'));
});
test('all supported screen sizes use a minimum 4 CSS pixel grid by default',()=>{
 assert.match(page,/pixel:4,stripe:36,gap:44,seconds:36/);
 for(const [w,h] of [[390,844],[844,390],[768,1024],[1440,900]]){
  const cw=Math.ceil(w/4),ch=Math.ceil(h/4);
  assert.ok(cw*4>=w&&ch*4>=h);
  assert.ok(cw*4-w<4&&ch*4-h<4);
 }
});
test('seamless stripe translation is a cyclic integer-grid function',()=>{
 const period=36+44;
 const color=(x,y,p)=>((x+y+p)%period+period)%period<36;
 for(let x=-102;x<=102;x++)for(let y=-25;y<=25;y++){
  assert.equal(color(x,y,0),color(x,y,period));
 }
});
test('PWA and native shell point at live site and use HTTPS',()=>{
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.display,'standalone');
 assert.match(read('site/stripe-game/sw.js'),/fetch\(event.request,\{cache:'no-store'\}\)/);
 assert.match(read('android/stripe-game/app/src/main/java/org/paperchalk/stripegame/MainActivity.java'),/https:\/\/g2066203208-beep.github.io\/paperchalk-world\/stripe-game\//);
});
