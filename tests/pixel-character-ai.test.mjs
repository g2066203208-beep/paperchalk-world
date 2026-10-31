import test from 'node:test';
import assert from 'node:assert/strict';
import {W,H,INKS,POSES,HAIRS,OUTFITS,makeCharacter,audit,toRGBA,splitIdentity} from '../site/pixel-lab/character-ai/core.mjs';
test('deterministic seed and conditions',()=>assert.deepEqual(makeCharacter({seed:7,pose:'行走'}),makeCharacter({seed:7,pose:'行走'})));
test('native five-token strict palette, no anti-alias',()=>{
for(const pose of POSES)for(const hair of HAIRS)for(const outfit of OUTFITS){
const s=makeCharacter({seed:230,pose,hair,outfit}),m=audit(s);
assert.equal(s.length,W*H);assert.ok(m.opaquePixels>200);assert.ok([...s].every(x=>x>=0&&x<=4));
const rgba=toRGBA(s);assert.equal(rgba.length,W*H*4);for(let i=3;i<rgba.length;i+=4)assert.ok(rgba[i]===0||rgba[i]===255);
}});
test('different seeds produce different sprite bytes',()=>assert.notDeepEqual(makeCharacter({seed:1}),makeCharacter({seed:2})));
test('reject invalid indexes',()=>{const s=makeCharacter({seed:2});s[0]=7;assert.throws(()=>audit(s),/Off palette/)});
test('identity split stable',()=>{for(const id of ['a','b','char_01','同一个人物'])assert.equal(splitIdentity(id),splitIdentity(id));assert.throws(()=>splitIdentity(''))});
