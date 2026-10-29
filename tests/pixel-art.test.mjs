import test from 'node:test';
import assert from 'node:assert/strict';
import {PIXEL_PALETTE,PIXEL_VIEW,drawPixelPerson,createPixelStreetRenderer} from '../site/scenes/pixel/pixel-city-art.js';
import {paintPixelInterior} from '../site/scenes/pixel/pixel-room-art.js';
import {interiorFor} from '../site/world/interiors.js';
import {streetBuildingsAt} from '../site/world/walkable-street.js';

test('pixel art exports a fixed native 480x300 visual grid, not smooth CSS vector sprites',()=>{
 assert.deepEqual(PIXEL_VIEW,{width:480,height:300,worldWidth:960,worldHeight:600});
 assert.ok(Object.keys(PIXEL_PALETTE).length>=18);
 assert.equal(PIXEL_PALETTE.ink,'#243544');
 assert.equal(typeof createPixelStreetRenderer,'function');
 assert.equal(typeof drawPixelPerson,'function');
});
test('building interior art paints all four distinct furnished rooms at native pixel resolution',()=>{
 const calls=[];const context={fillStyle:'#000',fillRect(...args){calls.push([...args,this.fillStyle]);}};
 const canvas={width:0,height:0,getContext(mode,options){assert.equal(mode,'2d');return context;}};
 const b=streetBuildingsAt(125,112)[0],info=interiorFor(b);
 const result=paintPixelInterior(canvas,info,1);
 assert.deepEqual([canvas.width,canvas.height],[480,300]);
 assert.ok(calls.length>300,'room must draw actual details not four plain squares');
 assert.equal(result.room,info.room);
 assert.ok(new Set(calls.map(c=>c.at(-1))).size>=15,'interior uses a meaningful multi-tone color palette');
});
