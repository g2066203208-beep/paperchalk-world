from pathlib import Path
from playwright.sync_api import sync_playwright
import re
BASE=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(360,780),(390,844),(430,932),(768,900),(1440,900)]:
  pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  html=(BASE/'index.html').read_text(encoding='utf-8')
  html=re.sub(r'<script[^>]+src=[^>]+></script>','',html)
  html=re.sub(r'<link[^>]+stylesheet[^>]+>','',html)
  pg.set_content(html,wait_until='domcontentloaded')
  pg.add_style_tag(content=(BASE/'styles.css').read_text(encoding='utf-8'))
  for file in ('engine.js','campaign.js','ui.js'):
   pg.add_script_tag(content=(BASE/file).read_text(encoding='utf-8'))
  pg.locator('#setupToggle').click()
  pg.locator('#teamCheckbox').check()
  pg.locator('#encounterSelect').select_option('surround')
  pg.locator('#createButton').click()
  assert pg.locator('.dual-row').count()==8,(w,'missing 8 actors')
  assert pg.locator('.poise-row').count()==8,(w,'missing 8 poise bars')
  assert pg.locator('.dual-tick').count()==80,(w,'missing time cells')
  assert pg.locator('.dual-hour').count()==10,(w,'missing header ticks')
  if w<=700:
   assert pg.locator('.dual-hour:visible').count()==5,(w,'mobile not showing 5 ticks')
   assert pg.locator('.dual-tick:visible').count()==40,(w,'mobile not showing 5 per actor')
   pg.locator('[data-half="1"]').click()
   assert pg.locator('.dual-hour:visible').count()==5
   assert pg.locator('.dual-hour[data-time="10"]').is_visible()
   assert not pg.locator('.dual-hour[data-time="1"]').is_visible()
   pg.locator('[data-half="0"]').click()
  else:
   assert pg.locator('.dual-hour:visible').count()==10
  # Select the first attack available and place on enemy row. Caster clock owns the time.
  uid=pg.evaluate('''()=>{const g=window.__TIMEGRID_DEBUG__.getGame();return g.actors[0].hand.find(x=>window.Timegrid.CARD[x.key].type==='attack')?.uid}''')
  if uid:
   pg.locator(f'[data-uid="{uid}"]').click()
   pg.locator('.dual-big[data-actor^="enemy-"][data-time="1"]').first.click()
   assert pg.evaluate('''()=>window.__TIMEGRID_DEBUG__.getGame().actors[0].actions.some(x=>x.source==='hand')'''),(w,'cannot place attack')
  over=pg.evaluate('document.documentElement.scrollWidth > innerWidth+3')
  assert not over,(w,'horizontal page overflow')
  assert not errors,(w,errors)
  pg.screenshot(path=str(Path(__file__).parents[2]/f'mobile_{w}.png'),full_page=True)
  print('PASS',w,'px: 8 dual lanes, poise bars, visible ticks, placement and width')
  pg.close()
 b.close()