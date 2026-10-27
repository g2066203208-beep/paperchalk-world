// Real, optional accessibility camera control lives in pause settings, never on the workbench.
export async function selectView(page,key){
 const select=page.locator('#viewSelect');
 if(await select.inputValue()!==key){
  await page.locator('#menu').click();
  await page.locator('#settings').click();
  await select.selectOption(key);
  await page.waitForFunction(()=>document.getElementById('lobby').hidden&&!document.getElementById('game').inert);
 }
 let last;
 for(let i=0;i<30;i++){
  const c=await page.evaluate(()=>window.__KIOSK_TEST__.getCamera());
  if(last&&Math.abs(c.x-last.x)+Math.abs(c.y-last.y)+Math.abs(c.z-last.z)*100<.1)break;
  last=c;await page.waitForTimeout(25);
 }
}
