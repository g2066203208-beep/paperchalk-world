/* Standalone spherical labyrinth structural tests.
 * node tests/test_sphere_maze.js
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const code=read('site/sphere-maze/maze-core.js');
new Function(code);
const world={};
vm.runInNewContext(code,{window:world});
const maze=world.SphericalMazeCore;
assert.equal(maze.LEVELS,3);
assert.equal(maze.DEPTH,2);
assert.equal(maze.RADII.length,3);
const angles1=maze.dailyAngles(1),angles2=maze.dailyAngles(2);
assert.deepEqual([...angles1],[0,0,0]);
assert.ok(angles2[0]>0&&angles2[1]<0&&angles2[2]>0,
 'every layer rotates, neighboring shells may counter-rotate');
const oldLayers=[],newLayers=[];
for(let layer=0;layer<3;layer++){
 const old=maze.generateLayer({day:1,layer});
 const newer=maze.generateLayer({day:2,layer});
 oldLayers.push(old);newLayers.push(newer);
 assert.equal(old.cells.length,320);
 assert.equal(old.edges.length,480);
 assert.equal(old.edges.filter(x=>x.open).length,353);
 assert.equal(old.wallCount,127);
 assert.equal(old.passageCount,353);
 assert.equal(newer.wallCount,127);
 assert.equal(newer.passageCount,353);
 assert.ok(old.edges.every(e=>e.left!==e.right&&
   old.cells[e.left].neighborEdges.includes(e.id)&&
   old.cells[e.right].neighborEdges.includes(e.id)));
 assert.ok(maze.reachable(old,0,319));
 assert.ok(maze.reachable(newer,1,222));
 assert.ok(old.cells.length===newer.cells.length&&old.edges.length===newer.edges.length);
 const oldWalls=old.edges.map(x=>x.open?1:0).join('');
 const newWalls=newer.edges.map(x=>x.open?1:0).join('');
 assert.notEqual(oldWalls,newWalls,'the corridor network must change every day');
 assert.notEqual(old.districts.join(','),newer.districts.join(','),
  'same-shell district permutation changes every day');
 const replay=maze.generateLayer({day:1,layer});
 assert.equal(replay.edges.map(x=>x.open?1:0).join(''),oldWalls,
  'the same seed and day must reconstruct exactly the same world');
}
for(let day=1;day<=24;day++){
 for(let layer=0;layer<3;layer++){
  const data=maze.generateLayer({day,layer,seed:90837});
  assert.equal(data.cells.length,320);
  assert.ok(maze.reachable(data,0,173));
  assert.ok(maze.reachable(data,116,247));
  assert.equal(data.wallCount+data.passageCount,data.edges.length);
  assert.equal(new Set(data.cells.map(x=>x.zone)).size,20);
 }
}
const html=read('site/sphere-maze/index.html');
const viewer=read('site/sphere-maze/viewer.js');
const css=read('site/sphere-maze/style.css');
const orbit=read('site/sphere-maze/vendor/OrbitControls.js');
const three=read('site/sphere-maze/vendor/three.module.js');
assert.match(html,/script type="importmap"/);
assert.match(html,/vendor\/three.module\.js/);
assert.match(html,/vendor\/OrbitControls\.js|three\/addons\//);
assert.match(html,/maze-core\.js/);
assert.match(html,/viewer\.js/);
assert.match(html,/id="next-day"/);
assert.match(html,/id="cutaway"/);
assert.match(html,/id="separation"/);
assert.match(viewer,/new THREE\.WebGLRenderer/);
assert.match(viewer,/new THREE\.InstancedMesh/,'walls must exist as true 3D instances');
assert.match(viewer,/pathBetween/,'paths must be graph-connected');
assert.match(viewer,/qFor/,'three distinct rotational axes');
assert.match(viewer,/function updateBridges/,'physical alignment of inter-shell gates');
assert.doesNotMatch(viewer,/localStorage\.setItem|indexedDB\.open/,
 'standalone model must never change game saves or character art');
assert.ok(three.length>500000,'vendor the REAL Three.js library locally');
assert.ok(orbit.length>20000,'vendor real OrbitControls locally');
new Function(viewer.replace(/^import .*;$/gm,''));
assert.match(css,/#control-panel/);
assert.match(css,/#stage canvas/);
console.log('PASS spherical labyrinth: 3 real shells x 320 connected rooms, 24 days, daily walls/district changes, original Three.js and standalone controls');
