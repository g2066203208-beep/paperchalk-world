import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';

function assert(c,m){if(!c)throw new Error(m)}
fs.mkdirSync('artifacts',{recursive:true});
const errors=[];
const browser=await chromium.launch({
 executablePath:process.env.CHROME_PATH,
 headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try{
 const page=await browser.newPage({viewport:{width:1365,height:768}});
 page.on('pageerror',e=>errors.push('PAGE '+String(e)));
 page.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('/favicon.ico'))errors.push('HTTP '+res.status()+' '+res.url())});
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push('CONSOLE '+m.text())});
 await page.goto('http://127.0.0.1:8080/',{waitUntil:'networkidle'});
 await page.waitForSelector('canvas',{timeout:10000});
 await page.waitForTimeout(1800);
 const state=await page.evaluate(()=>({
   title:document.title,
   heading:document.querySelector('.panel h1')?.textContent||'',
   canvases:document.querySelectorAll('canvas').length,
   width:document.querySelector('canvas')?.width||0,
   height:document.querySelector('canvas')?.height||0,
   buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim()),
   materialPanel:!!document.querySelector('.materialPanel'),
   sunPanel:!!document.querySelector('.sunPanel')
 }));
 assert(state.title.includes('Paperchalk 纸艺世界视觉 Demo'),'demo title missing '+JSON.stringify(state));
 assert(state.heading.includes('v12.32'),'demo version heading missing '+JSON.stringify(state));
 assert(state.canvases>=1&&state.width>500&&state.height>300,'Three.js render canvas missing '+JSON.stringify(state));
 assert(state.materialPanel&&state.sunPanel,'demo control panels missing');
 for(const label of ['目标效果','程序天空','标准立方体','动态纸雾','Paper003','受光体积雾'])assert(state.buttons.includes(label),'demo control missing '+label);
 await page.screenshot({path:'artifacts/new-main-visual-demo.png'});
 assert(fs.statSync('artifacts/new-main-visual-demo.png').size>10000,'render screenshot too small');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('DEMO_MAIN_BROWSER_OK');
}finally{
 await browser.close();
}
