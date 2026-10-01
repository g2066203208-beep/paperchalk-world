import test from 'node:test';
import assert from 'node:assert/strict';
import {wantsGamePresentation,PauseReasons} from '../studio/ui/GamePresentation.mjs';
import {defaultOrbitDistance} from '../studio/rendering/orbit-camera.js';

test('native shell always uses game presentation, even with a stale desktop override',()=>{
  assert.equal(wantsGamePresentation({userAgent:'Android PaperchalkShell/5',search:'?play=0',width:1920,height:1080}),true);
});
test('handheld and small coarse touch devices receive full screen gameplay',()=>{
  for(const userAgent of ['Android 15','iPhone','iPad'])assert.equal(wantsGamePresentation({userAgent}),true);
  assert.equal(wantsGamePresentation({coarse:true,width:844,height:390}),true);
});
test('desktop keeps studio presentation unless game preview is requested',()=>{
  assert.equal(wantsGamePresentation({width:1440,height:900}),false);
  assert.equal(wantsGamePresentation({search:'?play=1',width:1440,height:900}),true);
  assert.equal(wantsGamePresentation({search:'?play=0',coarse:true,width:844,height:390}),false);
});
test('closing a temporary menu preserves a preexisting pause',()=>{
  const pause=new PauseReasons();
  pause.toggleUser();pause.openMenu();pause.closeMenu();
  assert.equal(pause.active,true);
  pause.resume();assert.equal(pause.active,false);
});
test('opening and closing a menu during gameplay resumes without a stuck pause',()=>{
  const pause=new PauseReasons();
  pause.openMenu();pause.openMenu();assert.equal(pause.active,true);
  pause.closeMenu();assert.equal(pause.active,false);
  pause.openMenu();pause.resume();assert.equal(pause.menu,false);assert.equal(pause.active,false);
});
test('landscape gameplay frames the character closer while desktop keeps its established view',()=>{
  assert.equal(defaultOrbitDistance({width:1440,height:900}),19.2);
  assert.ok(defaultOrbitDistance({width:915,height:412,gameplay:true})<19.2);
  assert.ok(defaultOrbitDistance({width:844,height:320,gameplay:true})>=6.4);
  assert.equal(defaultOrbitDistance({width:390,height:844,gameplay:true}),19.2);
});
