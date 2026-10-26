import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {runInNewContext} from "node:vm";

const root=resolve(import.meta.dirname,"..");
const worker=readFileSync(resolve(root,"sw.js"),"utf8");
const deploy=readFileSync(resolve(root,".github/workflows/deploy.yml"),"utf8");
const {CACHE,CORE}=runInNewContext(worker+"\n;({CACHE,CORE})",{
 self:{addEventListener(){}}
});

test("offline precache includes deployed GPTIMG sprite and independent game modules",()=>{
 assert.match(CACHE,/^untitled-kiosk-offline-v/);
 assert.equal(new Set(CORE).size,CORE.length,"duplicate cache entries");
 assert.ok(CORE.includes("./index.html"));
 assert.ok(CORE.includes("./src/kiosk-pixel.js"));
 assert.ok(CORE.includes("./src/kiosk-gptimg.js"));
 assert.ok(CORE.includes("./assets/gptimg/customer-uncle.webp"));
 assert.ok(!CORE.some(x=>x.includes("assets/anime")||x.includes("full-scene")));
 const staged=deploy.match(/cp (src\/[^\n]+) _site\/src\//)?.[1]
   .split(/\s+/).filter(x=>x.startsWith("src/"))||[];
 assert.ok(staged.length>=9,"cannot find deployed ES module manifest");
 assert.deepEqual(
   Array.from(CORE).filter(x=>x.startsWith("./src/")).map(x=>x.slice(2)).sort(),
   staged.sort(),
   "precache and published modules must stay in sync"
 );
 for(const item of CORE){
  if(item==="./")continue;
  assert.ok(existsSync(resolve(root,item)),item+" does not exist");
 }
});

test("service worker has a real offline navigation fallback without obsolete art bundle",()=>{
 assert.match(worker,/request\.mode==="navigate"/);
 assert.match(worker,/catch\(\(\)=>caches\.match\("\.\/index\.html"\)\)/);
 assert.doesNotMatch(worker,/kiosk-anime-assets|assets\/anime/);
 assert.match(worker,/self\.clients\.claim\(\)/);
});
