import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const errs=[];page.on('pageerror',e=>errs.push(String(e)));
 await page.goto(pathToFileURL(resolve('site/pixel-lab/flat4.html')).href);
 await page.waitForFunction(()=>Boolean(window.FLAT4_API));
 if(errs.length)throw Error(errs.join('; '));
 const source=await page.evaluate(()=>{
  const a=window.FLAT4_API;
  return {format:'flat4-original-source-v1',width:a.width,height:a.height,palette:a.getPalette(),tokens:a.getTokens(),provenance:'First-party hand-authored character. Not scraped from artists.'};
 });
 if(source.tokens.length!==64*96)throw Error('Wrong pixel count');
 if(new Set(source.tokens.filter(n=>n)).size!==4)throw Error('Source is not exactly four colors');
 mkdirSync('ml/flat4',{recursive:true});
 writeFileSync('ml/flat4/source.json',JSON.stringify(source));
 writeFileSync('site/pixel-lab/flat4-source.json',JSON.stringify(source));
 console.log('SOURCE EXPORTED',64,96,'unique tokens',new Set(source.tokens));
}finally{await browser.close();}
