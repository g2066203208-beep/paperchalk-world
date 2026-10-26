import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GPTIMG_CUSTOMER,generatedCustomerEligible,gptimgAssetState} from "./kiosk-gptimg.js";
test("first GPTIMG customer is an independent transparent WebP sprite",()=>{
 const buf=readFileSync(new URL("../"+GPTIMG_CUSTOMER.path,import.meta.url));
 assert.equal(buf.toString("ascii",0,4),"RIFF");
 assert.equal(buf.toString("ascii",8,12),"WEBP");
 const p=buf.indexOf(Buffer.from("VP8X"));
 assert.ok(p>=0,"extended WebP required for transparency");
 assert.ok(buf[p+8]&0x10,"alpha channel required");
 assert.equal(buf.readUIntLE(p+12,3)+1,96);
 assert.equal(buf.readUIntLE(p+15,3)+1,113);
 assert.ok(buf.length<30000,"mobile sprite must be compact");
});
test("generated portrait never replaces required handoff/refusal/talking poses",()=>{
 assert.equal(generatedCustomerEligible({tone:0}),true);
 for(const mood of ["talking","receiving","refusing"])assert.equal(generatedCustomerEligible({tone:0,[mood]:true}),false);
 assert.equal(generatedCustomerEligible({tone:1}),false);
 assert.equal(gptimgAssetState().loaded,false,"asset must load in browser, not fake Node");
});
