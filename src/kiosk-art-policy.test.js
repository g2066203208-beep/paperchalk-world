import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// The agreed visual pipeline uses independently drawn, low-resolution pixels.
// Imported illustrations may be present in source control for reference, but
// they must not silently replace interactive art or be shipped as a full scene.
test("active kiosk renderer uses handmade pixel layers only",()=>{
 const view=readFileSync(new URL("./kiosk-view.js",import.meta.url),"utf8");
 const app=readFileSync(new URL("./kiosk-app.js",import.meta.url),"utf8");
 const pixel=readFileSync(new URL("./kiosk-pixel.js",import.meta.url),"utf8");
 const deploy=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");
 assert.match(view,/drawPixelCustomer/);
 assert.match(view,/drawPixelStreet/);
 assert.match(view,/drawPixelItem/);
 assert.doesNotMatch(view,/drawAnime|kiosk-anime-assets|assets\/anime/);
 assert.doesNotMatch(app,/drawAnime|kiosk-anime-assets|assets\/anime/);
 assert.match(pixel,/const palettes=\[/);
 assert.match(pixel,/function paintPerson\(/);
 assert.match(pixel,/function paintItem\(/);
 assert.match(deploy,/src\/kiosk-pixel\.js/);
 assert.doesNotMatch(deploy,/assets\/anime/);
});
