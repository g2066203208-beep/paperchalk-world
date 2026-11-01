import test from 'node:test';
import assert from 'node:assert/strict';
import {WIDTH,HEIGHT,ASSETS,CHARACTER_BIBLE,defaultScene,validateScene,hitTest,addObject,pixelAudit,makeAnimaPrompt,checkTrainingManifest} from '../site/pixel-lab/game-asset-core.mjs';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../ml/anima-asset-pipeline/character-lora-manifest.example.json',import.meta.url),'utf8'));
test('scene has modules, editable independent objects and immutable dimensions',()=>{
 const s=defaultScene();assert.equal(WIDTH,384);assert.equal(HEIGHT,216);assert.ok(Object.keys(ASSETS).length>=10);assert.ok(s.objects.some(x=>x.type==='counter'));assert.ok(s.objects.some(x=>x.type==='door'));
 validateScene(s);const before=s.objects.length,uid=addObject(s,'plant',4,13);assert.equal(s.objects.length,before+1);
 assert.equal(hitTest(s,8,20),uid);assert.equal(s.objects.find(x=>x.id===uid).type,'plant');
 assert.throws(()=>validateScene({...s,width:440}));assert.throws(()=>validateScene({...s,objects:[{id:'foo',type:'unknown',x:0,y:0,z:0}]}));
});
test('full-body character bible is explicit and not misrepresented as a trained weight',()=>{
 assert.equal(CHARACTER_BIBLE.nativeReference.height,256);assert.equal(CHARACTER_BIBLE.lora,'NOT_TRAINED');
 assert.equal(CHARACTER_BIBLE.train_ready,false);assert.ok(CHARACTER_BIBLE.invariant.length>=6);
});
test('pixel gate objectively checks native RGBA without claiming artistic approval',()=>{
 const rgba=new Uint8ClampedArray(4*4*4);for(let i=0;i<rgba.length;i+=4){rgba[i]=2;rgba[i+1]=1;rgba[i+2]=3;rgba[i+3]=255}
 let result=pixelAudit({width:4,height:4,data:rgba});assert.equal(result.uniqueColors,1);assert.equal(result.translucentPixels,0);assert.equal(result.nativeGridSourceVerified,false);
 rgba[7]=99;result=pixelAudit({width:4,height:4,data:rgba});assert.equal(result.translucentPixels,1);assert.equal(result.strictRGBA,false);
});
test('Anima prompts keep correct tag shape and validate artist prefixes',()=>{
 for(const kind of ['character','environment','prop','ui']){const s=makeAnimaPrompt({kind,artist:'@motocross saito'});assert.match(s,/^masterpiece, best quality, safe, /);assert.ok(s.includes('@motocross saito'))}
 assert.throws(()=>makeAnimaPrompt({artist:'artist without at sign'}));
 assert.match(makeAnimaPrompt({kind:'character'}),/full body/);
});
test('unverified and disallowed datasets cannot claim training success',()=>{
 const r=checkTrainingManifest(manifest);assert.equal(r.ready,false);assert.equal(r.eligible,0);assert.equal(r.loraWeightsCreated,false);
 const forbidden={...manifest,fixedCharacterBible:true,images:[{identity:manifest.characterId,approved:true,aiTrainingRights:'prohibited',source:'original-pixel-art',pose:'standing',view:'front',expression:'calm'}]};
 const f=checkTrainingManifest(forbidden);assert.equal(f.ready,false);assert.equal(f.checks.find(x=>x.id==='source').ok,false);
});
test('valid synthetic metadata passes readiness schema only, not proof of real training',()=>{
 const poses=['standing','sitting','walking','leaning'],views=['front','side','three-quarter'],expressions=['neutral','smile','sad','angry'];
 const images=Array.from({length:24},(_,i)=>({identity:'fictional-id',approved:true,aiTrainingRights:'granted',source:'original-pixel-art',pose:poses[i%4],view:views[i%3],expression:expressions[i%4]}));
 const r=checkTrainingManifest({schema:1,characterId:'fictional-id',fixedCharacterBible:true,images});assert.equal(r.metadataReady,true);assert.equal(r.ready,false);assert.equal(r.assetFilesVerified,false);assert.equal(r.loraWeightsCreated,false);
});
