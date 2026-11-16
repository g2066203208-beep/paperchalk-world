import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";
/* A real-source versus real-game screenshot gallery generated after
 * Chromium QA. Source images are hotlinked to their credited publisher;
 * commercial art is not copied into the game assets.
 * Original-reference card bounding boxes remain NOT_MEASURED until
 * precise raster coordinates are independently verified.
 */
const out="artifacts/snowbound-reference-comparison";
fs.mkdirSync(out,{recursive:true});
const sourceImages=[
 {name:"Steam official battle",url:"https://shared.steamstatic.com/store_item_assets/steam/apps/1811990/ss_d7ed2146d858a0abd02a8256befe264328595537.1920x1080.jpg?t=1730826839",page:"https://store.steampowered.com/app/1811990/Wildfrost/",credit:"Deadpan Games / Chucklefish"},
 {name:"Bahamut snow battle",url:"https://truth.bahamut.com.tw/s01/202405/forum/60599/7e5fe81b994c06696520b5d99b0e7583.JPG",page:"https://forum.gamer.com.tw/C.php?bsn=60599&snA=45715",credit:"Bahamut community / Wildfrost"},
 {name:"Bahamut mushrooms",url:"https://truth.bahamut.com.tw/s01/202405/forum/60599/7327e51066db63f29c17dfbb3e28f52e.JPG",page:"https://forum.gamer.com.tw/C.php?bsn=60599&snA=45715",credit:"Bahamut community / Wildfrost"}
];
const files=[
 ["desktop-1920","1920 x 1080 Desktop"],
 ["laptop-1366","1366 x 768 Laptop"],
 ["mobile-landscape-844","844 x 390 Landscape"],
 ["mobile-portrait-390","390 x 844 Portrait"],
 ["tablet-1024","1024 x 768 Tablet"],
 ["compact-android-360","360 x 740 Android"],
 ["large-iphone-430","430 x 932 Phone"]
];
let metrics=[];
try{metrics=JSON.parse(fs.readFileSync("artifacts/snowbound-pixel-audit/metrics.json","utf8"))}
catch(e){console.warn("No pixel metrics available: "+e.message)}
const records=files.map(([id,name])=>{
 const metric=metrics.find(x=>x.name===id);
 const screenshot="../snowbound-pixel-audit/"+id+"-real-battle.png";
 const exists=fs.existsSync(path.resolve(out,screenshot));
 return {id,name,screenshot,exists,metric};
});
const escape=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const blocks=sourceImages.map(ref=>
 "<section class='pair'><figure><img src='"+escape(ref.url)+"' alt='Wildfrost reference screenshot'><figcaption>"+escape(ref.name)+
 " · "+escape(ref.credit)+" · <a href='"+escape(ref.page)+"'>Original reference</a></figcaption></figure>"+
 "<figure><img src='../snowbound-pixel-audit/desktop-1920-real-battle.png' alt='Our actual 1920x1080 browser screenshot'>"+
 "<figcaption>Snowbound Journey · actual Chromium frame · 1920x1080</figcaption></figure></section>").join("\n");
const tableRows=records.map(r=>
 "<tr><td>"+escape(r.name)+"</td><td>"+(r.metric?String(r.metric.cardWidth)+" x "+r.metric.cardHeight:"NOT_MEASURED")+
 "</td><td>"+(r.metric?.cardRatio??"NOT_MEASURED")+"</td><td>"+(r.exists?"CAPTURED":"MISSING")+
 "</td><td>"+(r.metric?.passed?"PASS":"UNVERIFIED")+"</td></tr>").join("\n");
const additional=records.map(r=>
 "<details><summary>"+escape(r.name)+" · "+(r.metric?.cardRatio??"NOT_MEASURED")+
 "</summary><img src='"+escape(r.screenshot)+"' alt='Our browser screenshot'></details>").join("\n");
const html="<!DOCTYPE html><html lang='zh'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"+
 "<title>Wildfrost versus Snowbound / reference comparison</title><style>"+
 "*{box-sizing:border-box}body{font:15px/1.5 system-ui;background:#1d2b36;color:#f2f0e3;max-width:1600px;margin:auto;padding:20px}"+
 ".pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{min-width:0;margin:8px 0 35px;padding:12px;background:#304554;border:1px solid #5e8494;border-radius:12px}"+
 "figure img{display:block;width:100%;height:auto;object-fit:contain}figcaption{padding-top:9px;font-size:12px}a{color:#91e6ed}"+
 ".warning{padding:12px;border-left:4px solid #dfaa76;background:#463f3d}table{border-collapse:collapse;width:100%;margin:25px 0}th,td{padding:8px;border-bottom:1px solid #526e7e;text-align:left}"+
 "details{padding:10px;border:1px solid #526e7e}details img{width:100%;max-height:950px;object-fit:contain}"+
 "@media(max-width:720px){.pair{grid-template-columns:1fr}}"+
 "</style></head><body><h1>Wildfrost reference × Snowbound actual Chromium comparison</h1>"+
 "<p class='warning'><b>Reference card pixel bounds: NOT_MEASURED.</b> Current game frame dimensions: from real Chromium geometry JSON. "+
 "The 11:16 shape is taken from our original 704x1024 Hunter/Vampire character PNGs. It is NOT a measured Wildfrost frame ratio.</p>"+
 "<p>Compare card shape, x/y positions, column gaps, portrait versus text area, tabletop-to-arena ratio and HUD. Publisher graphics are external references and are never used as game textures.</p>"+
 "<h2>Measured current project frames</h2><table><tr><th>Viewport</th><th>Pixels</th><th>W/H</th><th>Screenshot</th><th>CI</th></tr>"+
 tableRows+"</table><h2>Side-by-side original source and our 1920x1080 battle</h2>"+blocks+
 "<h2>All-device game screenshots</h2>"+additional+
 "<p class='warning'>No exact-match claim is allowed until every official reference is inspected in its original pixel dimensions and manually measured card bounding boxes are stored with source and screenshot coordinates.</p></body></html>";
fs.writeFileSync(path.join(out,"index.html"),html);
const report={sourceImages,referenceCardBounds:"NOT_MEASURED",sourceArtworkRatio:704/1024,targetRatio:704/1024,devices:records,
 allScreenshotsCaptured:records.every(x=>x.exists),
 allGameRatiosPass:records.every(x=>x.metric?.passed&&Math.abs(x.metric.cardRatio-704/1024)<=.006)};
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));

/*
 * Try to create a single actual 16:9 pixel-level side-by-side raster from
 * the source publisher image and the real unedited Chromium capture.
 * No graphics are installed into the game or committed to the repo.
 * If the publisher download is inaccessible, preserve an honest NOT_CAPTURED
 * report and clickable external source instead.
 */
try{
 const ownPath="artifacts/snowbound-pixel-audit/desktop-1920-real-battle.png";
 if(!fs.existsSync(ownPath))throw new Error("Current run did not produce real desktop screenshot");
 const response=await fetch(sourceImages[0].url,{
  headers:{"user-agent":"Mozilla/5.0 (compatible; Snowbound QA comparative screenshot review)"},
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new Error("Publisher image HTTP "+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<15000||bytes.length>12000000)throw new Error("Source image unexpected byte length");
 const own=fs.readFileSync(ownPath);
 const refData="data:image/jpeg;base64,"+bytes.toString("base64");
 const ownData="data:image/png;base64,"+own.toString("base64");
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:760},deviceScaleFactor:1});
  const board="<!doctype html><html><meta charset='utf-8'><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#203040;color:#f5eedd;font:20px system-ui}h1{font-size:25px;margin:0 0 15px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel{border:2px solid #8198a4;border-radius:8px;padding:9px;background:#354a55}.panel h2{font-size:21px;margin:0 0 7px}.panel img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#162935}.panel p{font-size:14px;margin:9px 0 3px}.warn{font-size:15px;margin-top:22px;color:#ffdcaf}</style><body><h1>Wildfrost REAL SOURCE vs Snowbound REAL CHROMIUM · 1920×1080</h1><div class='compare'><section class='panel'><h2>REFERENCE · Steam official game</h2><img id='reference' src='"+refData+"'><p>Credit: Deadpan Games / Chucklefish | Publisher image used for comparison only</p></section><section class='panel'><h2>OUR GAME · Chromium live screenshot</h2><img id='ours' src='"+ownData+"'><p>GitHub Actions browser QA | real first encounter, without synthetic cards</p></section></div><p class='warn'>Reference card bounding boxes NOT_MEASURED. 7:10 is provisional project geometry, not a claimed exact Wildfrost pixel clone. Compare grouping, card shape, art crop, skill block and hand/tabletop.</p></body></html>";
  await page.setContent(board,{waitUntil:"load"});
  const sizes=await page.evaluate(()=>["reference","ours"].map(id=>{
   const img=document.getElementById(id);return{id,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,loaded:img.complete&&img.naturalWidth>0};
  }));
  if(sizes.some(x=>!x.loaded))throw new Error("comparison source image could not decode");
  await page.screenshot({path:path.join(out,"official-steam-vs-snowbound-desktop.png"),fullPage:true});
  report.comparisonRaster={status:"CAPTURED",sizes,relativePath:"official-steam-vs-snowbound-desktop.png"};
  fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
  console.log("SOURCE RASTER AND OWN RASTER COMPARISON CREATED",JSON.stringify(sizes));
 }finally{await browser.close();}
}catch(err){
 report.comparisonRaster={status:"NOT_CAPTURED",reason:String(err.message)};
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
 console.warn("REFERENCE RASTER NOT CAPTURED; source remains externally linked:",err.message);
}

console.log("REFERENCE VERSUS OWN FRAME GALLERY",JSON.stringify({
 sources:sourceImages.length,devices:records.length,hasScreenshots:report.allScreenshotsCaptured,
 ratiosPass:report.allGameRatiosPass,referenceMeasure:"NOT_MEASURED"}));
