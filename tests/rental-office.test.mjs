import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officeLayout,drawOfficeBack,drawOfficeCounter} from '../site/game/rental-office.js';
const COL={ink:'#393657',pink:'#F2A5C2',blue:'#A9BAE9',paper:'#FFF5E6'};
const allowed=new Set(Object.values(COL));
for(const [name,W,H] of [['phone portrait',195,422],['phone landscape',422,195],['tablet portrait',384,512],['desktop landscape',720,450],['small portrait',160,275]]){
 test('rental office is complete and exact four-ink on '+name,()=>{
  const g=officeLayout(W,H),rects=[];
  const R=(x,y,w,h,c)=>{
   assert.ok([x,y,w,h].every(Number.isInteger),'shapes must align to logical integer pixels');
   assert.ok(w>=0&&h>=0,'cannot draw negative rectangles');
   assert.ok(allowed.has(c),'only four original inks: '+c);
   rects.push({x,y,w,h,c});
  };
  const world={R,COL};
  drawOfficeBack(world,W,H);
  const before=rects.length;drawOfficeCounter(world,W,H);
  assert.ok(before>25&&rects.length>before+10,'room and counter are both rendered');
  assert.ok(g.keys.x>=0&&g.keys.y>=0&&g.keys.x+g.keys.w<=W,'rack fully fits viewport');
  assert.ok(g.keys.y+g.keys.h<g.front,'rental keys are mounted behind front counter');
  assert.ok(g.doorway.x>=0&&g.doorway.x+g.doorway.w<=W,'door opening fits');
  assert.ok(g.floor>g.front,'front desk has physical height');
  assert.ok(rects.some(r=>r.c===COL.paper)&&rects.some(r=>r.c===COL.pink)&&rects.some(r=>r.c===COL.blue));
 });
}
test('rental interior has only one hostess sprite and correct foreground painter order',()=>{
 const src=readFileSync('site/game/intro.js','utf8');
 assert.match(src,/drawOfficeBack\(\{R,COL,text\},W,H\)/);
 assert.match(src,/ctx\.drawImage\(source,0,0,HOSTESS_WIDTH,HOSTESS_HEIGHT,px,py,sw,sh\);\s*\/\/ Correct occlusion:[\s\S]*?drawOfficeCounter\(\{R,COL\},W,H\)/);
 assert.equal((src.match(/new Image\(\)/g)||[]).length,1);
});
