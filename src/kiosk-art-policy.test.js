import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const view=readFileSync(new URL("./kiosk-view.js",import.meta.url),"utf8");
const deploy=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
test("generated art is a separate sprite layer, never a flattened fake game screenshot",()=>{
 assert.match(view,/drawGeneratedCustomer\(g,portrait\)/);
 assert.match(view,/drawPixelCustomer\(g,portrait\)/);
 assert.match(view,/drawPixelStreet/);
 assert.match(view,/hit\(hits,mat\.x,mat\.y,mat\.w,mat\.h,"counter"\)/);
 assert.match(view,/hit\(hits,x,y,w,h,"slot",key\)/);
 assert.match(deploy,/assets\/gptimg\/\*\.webp/);
 assert.doesNotMatch(view,/drawImage\([^\n]*fullScene|assets\/anime/);
});
