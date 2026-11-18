import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const scene=readFileSync(new URL('../site/card-battle/engine/anima-courtyard-scene.js',import.meta.url),'utf8');
assert(scene.includes('createCastleCourtyard'));
for(const required of ['THREE.InstancedMesh','courtyard-cobbles','courtyard.visible=false','THREE.PointLight','THREE.DirectionalLight','new THREE.CylinderGeometry','new THREE.BoxGeometry','scene.add(courtyard)','return {root:courtyard'])assert(scene.includes(required),required);
console.log('PASS: courtyard geometry and scene ownership contract');