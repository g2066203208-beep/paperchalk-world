from pathlib import Path
NAMES=["wall_main","wall_side","wall_rear","roof_strip","parapet","floor_band","window_blue","window_warm","window_open","window_tall","door_double","door_side","column","sign_school","ac_unit","pipe","gate_pillar","gate_panel","fence","tree_round","tree_tall","bush","street_lamp","notice_board","bike_shed","fg_branch","planter","stair"]
COLS,ROWS,CELL=7,4,256
W,H=COLS*CELL,ROWS*CELL
def rect(x,y,w,h,c,s='#665545',sw=3):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}" stroke="{s}" stroke-width="{sw}"/>'
def line(x1,y1,x2,y2,c='#55514b',sw=4):return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{sw}" stroke-linecap="round"/>'
def ell(cx,cy,rx,ry,c,s='none',sw=0):return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{c}" stroke="{s}" stroke-width="{sw}"/>'
def art(n):
 p=[]
 if n.startswith('wall'):p=[rect(18,38,220,182,{'wall_main':'#d9ccb6','wall_side':'#cbbca5','wall_rear':'#bfb098'}[n])]+[line(x,42,x,216,'#876f5c',2) for x in (72,128,184)]+[line(22,y,234,y,'#876f5c',2) for y in (96,154)]
 elif n in ('roof_strip','parapet','floor_band'):p=[rect(18,92,220,72,{'roof_strip':'#71665e','parapet':'#c6b59b','floor_band':'#ad9a82'}[n])]
 elif n.startswith('window'):p=[rect(38,34,180,188,'#625c55'),rect(54,50,148,156,'#e0ad5a' if n=='window_warm' else '#5f91a9','#d8c9ad',3),line(128,52,128,204,'#e7dbc5',5),line(56,128,200,128,'#e7dbc5',4)]
 elif n.startswith('door'):p=[rect(48,22,160,214,'#5d5954'),rect(62,38,132,184,'#527d8d','#d9cbb1',3),line(128,40,128,220,'#e1d2b8',6)]
 elif n=='column':p=[rect(92,18,72,220,'#d0c1a8')]
 elif n=='sign_school':p=[rect(18,78,220,94,'#ded1b7')]+[rect(x-14,98,28,42,'none','#594b40',4)+line(x-14,119,x+14,119,'#594b40',3) for x in (48,88,128,168,208)]
 elif n=='ac_unit':p=[rect(46,62,164,132,'#c9c8c0'),ell(128,128,54,54,'none','#74736e',8)]
 elif n=='pipe':p=[line(128,22,128,228,'#6c6d69',18)]
 elif n=='gate_pillar':p=[rect(86,18,84,220,'#a89074'),rect(76,18,104,30,'#8f785f')]
 elif n in ('gate_panel','fence'):p=[line(x,42 if n=='gate_panel' else 56,x,218,'#515353',7) for x in range(28,235,30)]+[line(18,88,238,88,'#515353',8),line(18,182,238,182,'#515353',8)]
 elif n.startswith('tree'):p=[rect(116,104,26,130,'#6c513a','none',0),ell(128,92,76,60,'#607f50'),ell(82,122,52,42,'#476b43'),ell(176,122,52,42,'#81935c')]
 elif n=='bush':p=[ell(x,156-(i%2)*18,48,34,('#607f50','#476b43','#81935c')[i%3]) for i,x in enumerate((42,78,114,150,186,222))]
 elif n=='street_lamp':p=[line(128,66,128,236,'#3f3d3a',15),line(128,74,174,46,'#3f3d3a',10),rect(160,42,40,42,'#e8c16e')]
 elif n=='notice_board':p=[rect(38,48,180,142,'#967758'),rect(52,62,152,112,'#e6d8bd'),line(72,190,72,238,'#705b48',10),line(184,190,184,238,'#705b48',10)]
 elif n=='bike_shed':p=[rect(40,38,176,28,'#91a2a6'),line(58,62,58,230,'#515353',8),line(198,62,198,230,'#515353',8)]+[ell(x,196,18,18,'none','#515353',5) for x in (62,104,112,154,162,204)]
 elif n=='fg_branch':p=[line(18,222,224,54,'#5c4836',20)]+[ell(x,y,28,20,('#476b43','#607f50','#81935c')[i%3]) for i,(x,y) in enumerate(((54,188),(84,164),(112,142),(142,118),(174,96),(202,76)))]
 elif n=='planter':p=[rect(52,164,152,60,'#956b4e')]+[ell(x,120,30,42,('#607f50','#476b43','#81935c')[i%3]) for i,x in enumerate((72,104,136,168,200))]
 elif n=='stair':p=[rect(34+i*20,202-i*28,188-i*20,24,'#b7a78f') for i in range(5)]
 return ''.join(p)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="none"/>']
for i,n in enumerate(NAMES):svg.append(f'<g transform="translate({i%COLS*CELL},{i//COLS*CELL})">{art(n)}</g>')
svg.append('</svg>')
out=Path(__file__).resolve().parents[1]/'assets/prologue/generated-school/school-paper-atlas.svg'
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(''.join(svg),encoding='utf-8')
print(out)
