import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generatedArtStatus} from "./kiosk-gpt-scene.js";
test("approved image is original full-size source, not a flattened click target",()=>{
 const b=readFileSync(new URL("../assets/gptimg/winter-kiosk-source.png",import.meta.url));
 assert.equal(b.toString("hex",0,8),"89504e470d0a1a0a");
 assert.equal(b.readUInt32BE(16),941);
 assert.equal(b.readUInt32BE(20),1672);
 const mod=readFileSync(new URL("./kiosk-gpt-scene.js",import.meta.url),"utf8");
 for(const cmd of ["slot","toggle","window","talk","counter"]){
  assert.ok(mod.includes('"'+cmd+'"'),"missing playable object command: "+cmd);
 }
 assert.ok(mod.includes("s.slots[key]"),"inventory remains authoritative");
 assert.ok(!/drawImage\(img\s*,\s*0\s*,\s*0\s*,\s*941\s*,\s*1672/.test(mod),"full-screen collage prohibited");
 assert.equal(generatedArtStatus(),"idle","Node should not claim a browser image loaded");
});
