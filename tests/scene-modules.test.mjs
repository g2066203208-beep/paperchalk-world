import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneHost} from '../site/scenes/core/scene-host.js';
import {nationalStreetScene} from '../site/scenes/modules/national-street.js';
import {nationalInteriorScene} from '../site/scenes/modules/national-interior.js';
import {renderNationalMap,ZOOM_STEPS} from '../site/scenes/modules/national-map.js';
import {renderNationalTransport} from '../site/scenes/modules/national-transport.js';
import {REGIONS} from '../site/world/national-atlas.js';
import {streetBuildingsAt} from '../site/world/walkable-street.js';

test('scene modules register, replace and independently unmount without stale state',()=>{
 const calls=[];
 const host=createSceneHost([{
  id:'street',render:({name})=>'<p>'+name+'</p>',
  mount:()=>({destroy(){calls.push('street destroyed')}})
 },{
  id:'interior',render:({name})=>'<p>'+name+'</p>',
  mount:()=>({destroy(){calls.push('interior destroyed')}})
 }]);
 assert.deepEqual(host.list(),['street','interior']);
 assert.match(host.render('street',{name:'main'}),/main/);
 host.mount({});
 assert.equal(host.current().id,'street');
 assert.throws(()=>host.mount({}),/already mounted/);
 assert.match(host.render('interior',{name:'inside'}),/inside/);
 assert.deepEqual(calls,['street destroyed']);
 host.mount({});
 host.unmount();
 assert.deepEqual(calls,['street destroyed','interior destroyed']);
 assert.equal(host.unregister('interior'),true);
 assert.deepEqual(host.list(),['street']);
 assert.throws(()=>host.render('interior',{}),/Unknown scene/);
 assert.throws(()=>host.register({id:'street',render(){return 'again';}}),/duplicate/);
});
test('separately owned scene views render the same persistent building id',()=>{
 const at={x:125,y:112,readWorld:()=>({slices:{estates:{parcels:[]}}}),
  tileNames:{urban:'城市',forest:'森林',fields:'农田',grass:'野地',lake:'湖泊',mountain:'山岳',sea:'海',river:'河'}};
 const host=createSceneHost([nationalStreetScene,nationalInteriorScene]);
 const outdoors=host.render('national-street',at);
 const b=streetBuildingsAt(at.x,at.y)[0];
 assert.ok(outdoors.includes(b.id),'street must display the real building identity');
 assert.match(outdoors,/national-walk-canvas/);
 assert.match(outdoors,/data-walk-move="w"/);
 const indoors=host.render('national-interior',{...at,inside:b});
 assert.ok(indoors.includes(b.id),'interior scene keeps exactly the same identity');
 assert.match(indoors,/national-floorplan/);
 assert.match(indoors,/data-atlas-inspect/);
});
test('map and transport are independent modules, not hardwired to interior scene',()=>{
 const viewport=renderNationalMap({x:125,y:112,tileNames:{urban:'城市',sea:'海',forest:'森林',grass:'草原',fields:'农田',river:'河',mountain:'山',lake:'湖'}});
 assert.equal(viewport.match(/data-atlas-cell=/g).length,117);
 assert.match(viewport,/country-map-canvas/);
 assert.match(viewport,/data-map-action="overview"/);
 assert.match(viewport,/data-map-layer="rail"/);
 assert.deepEqual(ZOOM_STEPS,[1,2,4,8,16,32]);
 const travel=renderNationalTransport({region:REGIONS[0],station:REGIONS[3],mode:'road',selected:REGIONS[3].id});
 assert.match(travel,/data-atlas-travel/);
 assert.match(travel,/北部农垦区/);
});

test('new industry/region scene plugins can override, disable and revert safely',()=>{
 const host=createSceneHost([nationalStreetScene,nationalInteriorScene]);
 const fallback={inside:{id:'building-125-112-0-0',name:'诊所'}};
 assert.equal(host.resolve(fallback,'national-interior'),'national-interior');
 const plugin={
  id:'clinic-room-3d',
  match:({inside})=>inside?.name==='诊所',
  render:()=>'<div class="clinic-scene">custom clinic</div>',
  mount:()=>({destroy(){}})
 };
 host.register(plugin);
 assert.equal(host.resolve(fallback,'national-interior'),'clinic-room-3d');
 assert.match(host.render(host.resolve(fallback,'national-interior'),fallback),/custom clinic/);
 host.mount({});
 assert.equal(host.unregister('clinic-room-3d'),true);
 assert.equal(host.current(),null,'unregistered active scene must unmount');
 assert.equal(host.resolve(fallback,'national-interior'),'national-interior');
});
