import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const root=new URL("../",import.meta.url);
test("approved generated anime sprites are active gameplay layers",()=>{
 const view=readFileSync(new URL("./kiosk-view.js",import.meta.url),"utf8");
 const app=readFileSync(new URL("./kiosk-app.js",import.meta.url),"utf8");
 const art=readFileSync(new URL("./kiosk-anime-assets.js",import.meta.url),"utf8");
 const deploy=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
 assert.match(view,/import \{drawAnime\}/);
 assert.match(view,/drawAnime\(g,s\.windowOpen\?"window-open":"window-closed"/);
 assert.match(view,/cabinetL|cabinetR/);
 assert.match(view,/windowFrame/);
 assert.match(view,/hit\(hits,.*"slot"/);
 assert.doesNotMatch(view,/drawPixelCustomer|drawPixelStreet|drawPixelItem/);
 assert.match(art,/assets\/anime\//);
 assert.match(deploy,/cp assets\/anime\/\*\.webp/);
 assert.match(app,/untitled-kiosk-save-v1/);
 for(const file of ["scene-window-open.webp","scene-window-closed.webp","scene-cabinet-left-open.webp","scene-cabinet-left-closed.webp","scene-drawer-open.webp","scene-drawer-closed.webp","scene-countertop.webp","scene-shelf-tower.webp","customers-girl.webp","goods-bread.webp"]){
   assert.ok(existsSync(new URL("../assets/anime/"+file,import.meta.url)),file);
 }
});
