/* Reference gallery source integrity + real visual browser smoke.
 * No copying third-party images or video; checks own manifest and gallery UI.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const source=JSON.parse(fs.readFileSync("site/card-battle/reference-media-manifest.json","utf8"));
const docs=JSON.parse(fs.readFileSync("docs/game/visual-reference-library/reference-media-manifest.json","utf8"));
assert.deepEqual(source,docs,"hosted media catalog and GitHub docs must stay identical");
assert.equal(source.games.length,7,"seven core visual references including Dungeonborne and GrimKeep");
const list=source.games.flatMap(game=>game.media.map(media=>({game:game.id,media})));
assert.equal(list.length,97,"all 97 references must remain catalogued");
assert.equal(list.filter(x=>x.media[0]==="gif").length,6,"all publisher GIF references still recorded");
for(const {game,media} of list){
 assert.equal(media.length,6,"every asset must have source type, title, URL, purpose, provider, verification status");
 assert(media.every((v)=>typeof v==="string"&&v.trim()),"no blank media metadata: "+game);
 const u=new URL(media[2]);assert.equal(u.protocol,"https:","external reference must be https: "+media[2]);
 assert(fs.existsSync("docs/game/visual-reference-library/"+game+".md"),"game-specific reference analysis missing: "+game);
}
fs.mkdirSync("artifacts/game-reference-library",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
for(const v of [{id:"desktop-1440",w:1440,h:900},{id:"phone-390",w:390,h:844}]){
 const context=await browser.newContext({viewport:{width:v.w,height:v.h},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/reference-library.html",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>window.document.querySelectorAll("#grid article.tile").length===list.length,null,{timeout:15000});
  const total=await page.locator("#grid article.tile").count();assert.equal(total,list.length);
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-01-all-sources.png"});
  await page.getByRole("button",{name:"Forgive Me Father 2",exact:true}).click();
  assert.equal(await page.locator("#grid article.tile").count(),19,"FMF2 individual media sources");
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-02-fmf2.png"});
  await page.getByRole("button",{name:"全部游戏",exact:true}).click();
  await page.getByRole("button",{name:"GIF",exact:true}).click();
  assert.equal(await page.locator("#grid article.tile").count(),6,"six GIF URL sources");
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-03-gifs.png"});
  await page.getByRole("button",{name:"全部类型",exact:true}).click();
  await page.locator("#search").fill("金币");
  const filtered=await page.locator("#grid article.tile").count();
  assert(filtered>0&&filtered<list.length,"search must filter targets by gold keyword");
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-04-coin-query.png"});
  await page.locator("#search").fill("");
  await page.getByRole("button",{name:"Dungeonborne",exact:true}).click();
  assert.equal(await page.locator("#grid article.tile").count(),17,"Dungeonborne must contain 17 source-linked entries");
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-05-dungeonborne.png"});
  await page.getByRole("button",{name:/格林堡 \/ GrimKeep/}).click();
  assert.equal(await page.locator("#grid article.tile").count(),23,"GrimKeep must contain 23 source-linked entries");
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-06-grimkeep.png"});
  await page.locator("#search").fill("");
  await page.getByRole("button",{name:/幻象游园剧/}).click();
  assert.equal(await page.locator("#grid article.tile").count(),9,"Illusion Carnival creator PV + screenshots");
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-05-illusion-carnival.png"});
  const links=await page.locator("#grid a").evaluateAll(nodes=>nodes.map(n=>({href:n.href,rel:n.rel,target:n.target})));
  assert(links.every(x=>x.href.startsWith("https://")&&x.rel.includes("noopener")&&x.target==="_blank"));
  assert.deepEqual(errors,[],"browser reference gallery runtime errors");
  results.push({viewport:v.id,pass:true,all:total,gifs:6,goldSearch:filtered,illusion:9});
  console.log("PASS",v.id,"97 original media links, GIF filter, game filter, search and source links");
 }catch(err){
  results.push({viewport:v.id,pass:false,error:String(err.stack||err),errors});
  console.error("FAIL",v.id,err);
  await page.screenshot({path:"artifacts/game-reference-library/"+v.id+"-ERROR.png"}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync("artifacts/game-reference-library/results.json",JSON.stringify(results,null,2));
assert(results.every(x=>x.pass),"Game reference library visual QA failed");
