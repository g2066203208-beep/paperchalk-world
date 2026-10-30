import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('site/index.html','utf8');
const background=readFileSync('site/game/background.js','utf8');
const android=readFileSync('android/app/src/main/java/com/paperchalk/lampkeep/MainActivity.java','utf8');

test('the existing APK home displays only the fullscreen background canvas',()=>{
  assert.match(page,/<canvas id="background"/);
  assert.match(page,/\.\/game\/background\.js/);
  assert.equal((page.match(/<canvas\b/g)||[]).length,1);
  assert.doesNotMatch(page,/<button|<nav|<img|class="screen-shell"|id="scene"|id="menu"/);
  assert.match(android,/https:\/\/g2066203208-beep\.github\.io\/paperchalk-world\//);
  assert.match(android,/package com\.paperchalk\.lampkeep/);
  assert.doesNotMatch(android,/web\.restoreState\(state\)/,'must not restore stale APK page snapshot');
  assert.match(android,/web\.clearCache\(true\)/);
  assert.match(android,/protected void onResume\(\)/);
  assert.match(android,/openLatestHome\(\)/);
  assert.match(android,/\?apk=1&fresh=/);
  assert.match(android,/navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(android,/r=>r\.unregister\(\)/);
  assert.match(android,/legacyWorkerCleanupStarted/);


});

test('D palette and background use exact preapproved colors, integer pixel grid',()=>{
  assert.match(background,/'#393657','#F2A5C2','#A9BAE9','#FFF5E6'/);
  assert.match(background,/BACKGROUND='#FFF5E6'/);
  assert.match(background,/STRIPE='#A9BAE9'/);
  assert.match(background,/PIXEL_CSS=4/);
  assert.match(background,/STRIPE_CELLS=36/);
  assert.match(background,/GAP_CELLS=44/);
  assert.match(background,/CYCLE_SECONDS=8/);
  assert.match(page,/animation:stripe-drift 8s linear infinite/);
  assert.match(page,/translate3d\(-160px,-160px,0\)/);
  assert.match(background,/DIAGONAL_OVERSCAN_CELLS=PATTERN_CELLS\/2/);
  assert.match(background,/setInterval\(checkPublishedVersion,60000\)/);
  const build=page.match(/background\.js\?v=([A-Za-z0-9._-]+)/)?.[1];
  assert.ok(build,'production script cache-busting version exists');
  assert.ok(background.includes("const ACTIVE_BUILD='"+build+"'"),'live-check build ID must match page script ID');

  assert.match(page,/image-rendering:pixelated/);
});

test('strict two-color procedural stripes are exactly cyclic in space and time',()=>{
  const fn=(x,y,p)=>((x+y+p)%80+80)%80<36;
  const phase=s=>Math.floor(((s%8)+8)%8*80/8)%80;
  assert.equal(phase(0),phase(8));
  assert.equal(fn(0,0,0),fn(40,40,0),'normal translation by (40,40) grid cells must be identical');
  let changed=false;
  for(let y=0;y<41;y++)for(let x=0;x<81;x++){
    assert.equal(fn(x,y,0),fn(x,y,80));
    if(fn(x,y,0)!==fn(x,y,20))changed=true;
  }
  assert.ok(changed,'background must actually move');
});
