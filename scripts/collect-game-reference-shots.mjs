/* Fetch only screenshot URLs from developer/publisher's official Steam store.
 * NEVER generate an image, NEVER infer screenshots by numbering URLs, NEVER
 * label a banner/title logo as gameplay. Screenshot binaries are not vendored.
 *
 * node scripts/collect-game-reference-shots.mjs
 * node scripts/collect-game-reference-shots.mjs --offline  (seed-only tests)
 */
import {readFile,writeFile} from 'node:fs/promises';
import {GAMES} from '../site/learning-library/games.js';
const base=new URL('../site/learning-library/',import.meta.url);
const seed=JSON.parse(await readFile(new URL('seed-screenshots.json',base),'utf8'));
const offline=process.argv.includes('--offline');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hostAllowed=u=>{
 try{
  const parsed=new URL(u);
  return parsed.protocol==='https:' &&
   /(^|\.)steamstatic\.com$/.test(parsed.hostname) &&
   /\/(?:store_item_assets\/steam\/apps|steam\/apps)\/\d+\//.test(parsed.pathname) &&
   /\/ss_[0-9a-f]{30,}\./i.test(parsed.pathname);
 }catch{return false}
};
async function fromSteam(g){
 if(offline)return [];
 const url='https://store.steampowered.com/api/appdetails?appids='+g.id+'&cc=us&l=english&filters=screenshots';
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 PAPERWORLD-Reference-Library/1.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json(),screens=json?.[g.id]?.data?.screenshots||[];
   const out=screens.slice(0,12).filter(s=>s&&hostAllowed(s.path_full)).map((shot,i)=>({
    url:shot.path_full,
    thumb:hostAllowed(shot.path_thumbnail)?shot.path_thumbnail:shot.path_full,
    label:'Steam 官方游戏截图 '+String(i+1).padStart(2,'0'),
    source:'https://store.steampowered.com/app/'+g.id+'/',
    sourceKind:'official-steam-store'
   }));
   if(out.length)return out;
   throw Error('Steam store returned no verified screenshots');
  }catch(e){
   if(attempt===1)console.log('SOURCE_UNAVAILABLE',g.id,g.title,String(e.message||e));
   else await sleep(500);
  }
 }
 return [];
}
const collection={schema:'paperworld-real-game-screenshots-v1',
 generatedAt:new Date().toISOString(),
 notes:'真实游戏截图索引；图片均为原来源网站托管，不把他人游戏素材收入本项目训练集或重新发行。',
 games:{},unavailable:[]};
let idx=0;
async function worker(){
 while(idx<GAMES.length){
  const game=GAMES[idx++];
  const pulled=await fromSteam(game);
  const hand=seed.games[String(game.id)]||[];
  const seen=new Set(),images=[];
  for(const photo of [...pulled,...hand]){
   // An URL must be backed either by a Steam API screenshot record or by our
   // per-image verified provenance list. Never invent additional numbers.
   if(typeof photo.url!=='string'||!photo.url.startsWith('https://')||seen.has(photo.url))continue;
   seen.add(photo.url);images.push(photo);
  }
  collection.games[String(game.id)]=images;
  if(!images.length)collection.unavailable.push(game.id);
  console.log('REFERENCE_GAME',game.id,game.title,'official='+pulled.length,'curated='+hand.length,'total='+images.length);
 }
}
await Promise.all(Array.from({length:offline?1:3},()=>worker()));
const count=Object.values(collection.games).reduce((n,a)=>n+a.length,0);
collection.totalGames=GAMES.length;collection.totalScreenshots=count;
await writeFile(new URL('screenshots.json',base),JSON.stringify(collection,null,2)+'\n');
console.log('REFERENCE_SUMMARY games='+GAMES.length+' screenshots='+count+' unavailable='+collection.unavailable.length);
