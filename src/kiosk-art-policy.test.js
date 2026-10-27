import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialShop,join} from './kiosk-core.js';
import {render} from './kiosk-view.js';
import {cameraTarget} from './kiosk-shop-layout.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
function context(){return new Proxy({measureText:s=>({width:s.length*14})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
test('runtime uses independent flat fixtures and no obsolete scene crop atlas',()=>{
 const view=read('./kiosk-view.js');
 assert.doesNotMatch(view,/renderGeneratedShop|kiosk-gpt-scene|createLinearGradient/);
 const s=initialShop();join(s,'solo','店长');const g=context();
 const hits=render(g,s,{W:1280,H:1000},0,'solo',null,null,{camera:cameraTarget(1280,1000,'front')});
 assert.ok(hits.some(h=>h.cmd==='window'));
 assert.match(read('./kiosk-art-assets.js'),/shelf\//);
 assert.doesNotMatch(view,/flatShelfBase|flatCupboard|flatDrawer/);
 s.open.drawerL=true;
 const open=render(g,s,{W:390,H:844},0,'solo',null,null,{camera:cameraTarget(390,844,'drawerL')});
 assert.ok(open.some(h=>h.cmd==='toggle'&&h.key==='drawerL'));
});
