from pathlib import Path
from playwright.sync_api import sync_playwright
import re
BASE=Path(__file__).resolve().parents[1]
html=(BASE/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<script[^>]+src=[^>]+></script>','',html)
html=re.sub(r'<link[^>]+stylesheet[^>]+>','',html)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w in (390,1440):
  page=b.new_page(viewport={'width':w,'height':844 if w<500 else 900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=(BASE/'styles.css').read_text(encoding='utf-8'))
  for filename in ('engine.js','campaign.js','ui.js'):page.add_script_tag(content=(BASE/filename).read_text(encoding='utf-8'))
  page.evaluate('''()=>{
   const g=window.__TIMEGRID_DEBUG__.getGame(),G=window.Timegrid;
   const hero=g.actors[0],enemy=g.actors.find(a=>a.side==='enemy');
   g.actors.forEach(a=>a.actions=[]);hero.actions=[];enemy.actions=[];
   enemy.hp=enemy.maxHp=150;enemy.poise=0;enemy.poiseMax=20;
   G.CARD.qa_hit={name:'测试硬直',type:'attack',w:0,a:1,r:0,damage:5,poisePower:9,speed:15};
   G.CARD.qa_enemy={name:'预定攻击',type:'attack',w:0,a:1,r:0,damage:9,speed:7};
   const add=(a,card,start,tgt,id)=>a.actions.push({id,card,start,target:tgt.id,source:'test',locked:true,guardLeft:0,canceled:false,started:false});
   add(hero,'qa_hit',0,enemy,'hero1');add(hero,'qa_hit',1,enemy,'hero2');
   add(enemy,'qa_enemy',2,hero,'enemy_canceled');add(enemy,'qa_enemy',8,hero,'enemy_kept');
   window.__TIMEGRID_DEBUG__.render();
  }''')
  assert page.locator('.dual-small.predicted-canceled').count()>=1,'expected canceled action marker'
  assert page.locator('.dual-small.predicted-recovering').count()>=1,'expected recovery overlay'
  assert page.locator('.poise-row').count()==2
  assert page.evaluate('''()=>window.__TIMEGRID_DEBUG__.getGame().actors.find(a=>a.side==='enemy').actions.some(a=>a.id==='enemy_kept'&&!a.canceled)''')
  assert not errors,errors
  page.screenshot(path=str(BASE.parent/f'forecast_cancel_{w}.png'),full_page=True)
  print('PASS forecast cancel/recover',w)
  page.close()
 b.close()