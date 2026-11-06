from pathlib import Path
from playwright.sync_api import sync_playwright
import re
base=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(base/'index.html').read_text()
 page.set_content(re.sub(r'<script[^>]*src=[^>]*></script>','',html).replace('<link rel="stylesheet" href="styles.css">',''))
 page.add_style_tag(content=(base/'styles.css').read_text())
 for f in ['engine.js','campaign.js','ui.js']:page.add_script_tag(content=(base/f).read_text())
 page.locator('#teamCheckbox').check();page.locator('#encounterSelect').select_option('surround')
 page.evaluate('window.__TIMEGRID_DEBUG__.newGame({seed:3351})')
 before=page.evaluate('''()=>{let g=window.__TIMEGRID_DEBUG__.getGame();return {actions:g.actors[0].actions.length,hero:g.actors[0].hp,hand:g.actors[0].hand.map(c=>c.key)}}''')
 threat=page.locator('.threat-chip').first
 target=threat.get_attribute('data-guard-target');tick=int(threat.get_attribute('data-guard-tick'))
 threat.click()
 after=page.evaluate('''()=>{let g=window.__TIMEGRID_DEBUG__.getGame();return {actions:g.actors[0].actions.map(a=>({card:a.card,target:a.target,start:a.start})),now:g.now,hand:g.actors[0].hand.map(c=>c.key),aiActionCount:g.actors.filter(a=>a.side==='ally'&&a.id!=='hero').reduce((n,a)=>n+a.actions.length,0)}}''')
 print('before',before,'target',target,'tick',tick,'after',after)
 assert any(a['target']==target and a['card'] in ['guard','brace','block','guard_axe','parry'] for a in after['actions']) or len(after['actions'])>before['actions'],'one click should arrange a defense'
 assert not errors,errors
 print('PASS browser tap-to-guard')
 browser.close()