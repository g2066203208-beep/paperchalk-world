#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const html=fs.readFileSync("galgame/index.html","utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,"Inline game script exists");
new vm.Script(script[1],{filename:"galgame-inline.js"});
for(const id of ["scene","story","speaker","text","choices","next","saveBtn","loadBtn","autoBtn","audioBtn","historyBtn"]){
  assert.ok(html.includes('id="'+id+'"'),"Required interactive UI: "+id);
}
assert.ok(html.includes('width="640" height="360"'),"Pixel canvas is 640x360");
assert.ok(html.includes("image-rendering:pixelated"),"Pixel art uses nearest-neighbor scaling");
const nodeBody=script[1].match(/var nodes=\{([\s\S]*?)\};\s*var current=/);
assert.ok(nodeBody,"Story graph exists");
const ids=[...nodeBody[1].matchAll(/"([^"]+)":\{speaker:/g)].map(m=>m[1]);
assert.ok(ids.includes("start")&&ids.includes("ending"),"Beginning and ending nodes exist");
const keys=new Set(ids);
for(const m of nodeBody[1].matchAll(/next:"([^"]+)"/g)){
  assert.ok(keys.has(m[1]),"No dangling story link: "+m[1]);
}
assert.ok(ids.length>=15,"First chapter contains at least 15 dialogue nodes");
assert.ok(html.includes('localStorage.setItem("nightlamp-save1"'),"Save game exists");
console.log("PASS: inline JS parses; UI ready; story graph valid ("+ids.length+" nodes); pixel scaling; save and load.");
