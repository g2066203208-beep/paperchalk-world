import {PALETTES,analyzePixelData,convertToFourColors,originalExample} from './four-colour-core.mjs';
const $=id=>document.getElementById(id),before=$('source'),after=$('output'),bc=before.getContext('2d',{willReadFrequently:true}),ac=after.getContext('2d',{willReadFrequently:true});
let paletteKey='fogsakura',source=originalExample(),result=null,wasUploaded=false;
const state=()=>({paletteKey,sourceSize:[source.width,source.height],outputSize:result?[result.width,result.height]:null,report:result?analyzePixelData(result):null,uploaded:wasUploaded});
const feedback=(text,bad=false)=>{$('feedback').textContent=text;$('feedback').style.color=bad?'#f1abbe':'#b8eac7'};
function paint(c,ctx,img){c.width=img.width;c.height=img.height;const d=ctx.createImageData(img.width,img.height);d.data.set(img.data);ctx.putImageData(d,0,0)}
function swatch(){const el=$('swatches');el.replaceChildren();for(const hex of PALETTES[paletteKey].colors){const wrap=document.createElement('div'),box=document.createElement('span'),label=document.createElement('small');box.style.background=hex;label.textContent=hex;wrap.append(box,label);el.append(wrap)}}
function redraw(){swatch();paint(before,bc,source);if(result){paint(after,ac,result);const r=analyzePixelData(result),p=PALETTES[paletteKey].colors;
 $('metrics').textContent='逻辑尺寸：'+r.size[0]+' × '+r.size[1]+'\n不透明RGB颜色：'+r.colors+'/4\n颜色预算：'+(r.colorBudgetPass?'PASS':'FAIL')+'\n半透明格：'+r.semi+'\n透明格：'+r.transparent+'\n可见区域总数：'+r.connectedVisibleRegions+'\n≤2格的可见孤岛：'+r.tinyVisibleRegions+'\n相同颜色计数：\n'+r.colorList.map(x=>x.hex+' : '+x.count).join('\n')+'\n\n人工美术验收：未完成\nAI原生绘制真实性：未核实';}else $('metrics').textContent='当前没有输出结果';}
function convert(){try{const [w,h]=$('resolution').value.split('x').map(Number);result=convertToFourColors({rgba:source.data,width:source.width,height:source.height,outWidth:w,outHeight:h,palette:PALETTES[paletteKey].colors});redraw();feedback('已在浏览器完成真正的'+w+'×'+h+'四色RGBA转换；请人工检查脸部像素。')}catch(e){feedback(e.message,true)}}
$('palette').addEventListener('change',e=>{paletteKey=e.target.value;convert()});
$('resolution').addEventListener('change',convert);
$('convert').addEventListener('click',convert);
$('example').addEventListener('click',()=>{source=originalExample(PALETTES[paletteKey].colors);wasUploaded=false;convert();feedback('已恢复工作室原创的练习头像，不是TofuPxl原画。')});
$('image-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{
 if(file.size>15_000_000||!['image/png','image/webp','image/jpeg'].includes(file.type))throw Error('只支持不超过15MB的PNG/JPEG/WebP');
 const bmp=await createImageBitmap(file);try{
  if(bmp.width>4096||bmp.height>4096)throw Error('图像边长不超过4096');
  const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bmp,0,0);const d=g.getImageData(0,0,c.width,c.height);
  source={width:c.width,height:c.height,data:d.data};wasUploaded=true;convert();
 }finally{bmp.close()}
 }catch(err){feedback(err.message,true)}});
after.addEventListener('pointerdown',e=>{if(!result)return;const r=after.getBoundingClientRect(),x=Math.max(0,Math.min(result.width-1,Math.floor((e.clientX-r.left)*result.width/r.width))),y=Math.max(0,Math.min(result.height-1,Math.floor((e.clientY-r.top)*result.height/r.height))),i=(y*result.width+x)*4;
 $('position').textContent='x='+x+' y='+y+' / '+(result.data[i+3]===0?'透明':('#'+[result.data[i],result.data[i+1],result.data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('')))});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);feedback('已导出 '+name)}
$('export-png').addEventListener('click',()=>{if(!result)return;after.toBlob(b=>b?download(b,'pixelatelier-four-colour-'+result.width+'x'+result.height+'.png'):feedback('无法编码PNG',true),'image/png')});
$('export-json').addEventListener('click',()=>{if(!result)return;download(new Blob([JSON.stringify({schema:1,study_artist:'TofuPxl',originalWorkUsedAsTrainingData:false,paletteOrigin:'Pixel Atelier original',palette:PALETTES[paletteKey],sourceType:wasUploaded?'user-upload':'original-exercise',method:result.method,audit:analyzePixelData(result)},null,2)],{type:'application/json'}),'four-colour-study-audit.json')});
async function research(){try{const response=await fetch('./style-study-artists.json',{cache:'no-cache'});if(!response.ok)throw Error('无法载入画师资料');const json=await response.json(),s=json.artists.find(x=>x.artist.id==='tofupxl');if(!s)throw Error('未登记TofuPxl');
$('artist-summary').textContent=s.artist.name+' / '+s.artist.country+'；作品链接'+s.works.length+'项。4色约束仅在首个作品被来源证实。';
const root=$('works');root.replaceChildren();for(const w of s.works){const div=document.createElement('article');div.className='work';const link=document.createElement('a');link.href=w.url;link.textContent=w.title;link.target='_blank';link.rel='noopener noreferrer';
const tag=document.createElement('small');tag.className='tag';tag.textContent=w.palette_colors_verified?('确认'+w.palette_colors_verified+'色'):'色数未核实';const p=document.createElement('p');p.textContent=w.source_evidence;div.append(link,document.createTextNode(' '),tag,p);root.append(div)}
const tech=$('technique');tech.replaceChildren();for(const t of s.style_hypotheses){const p=document.createElement('p');p.textContent='• '+t;tech.append(p)}
}catch(e){$('artist-summary').textContent='读取失败：'+e.message;feedback(e.message,true)}}
convert();research();
window.__FOUR_COLOR_STUDY__={state:()=>state(),testConvert:convert};
