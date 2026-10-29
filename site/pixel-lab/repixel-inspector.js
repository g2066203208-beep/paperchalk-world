/* Native pixel inspector for REPIXEL. Renders a grid overlay only:
   source sprite pixels are never modified by pan, zoom, or grid controls. */
(function () {
  'use strict';
  function mount(options) {
    const source = options.source;
    const W = source.width, H = source.height;
    const view = document.getElementById('inspectCanvas');
    const mini = document.getElementById('inspectMini');
    const vctx = view.getContext('2d', {alpha: false});
    const mctx = mini.getContext('2d', {alpha: false});
    const zoomSelect = document.getElementById('pixelZoom');
    const gridToggle = document.getElementById('gridToggle');
    const coordLabel = document.getElementById('pixelCoord');
    const colorLabel = document.getElementById('pixelColor');
    const swatch = document.getElementById('pixelSampleSwatch');
    const zoomLabel = document.getElementById('pixelScale');
    const pixelCount = document.getElementById('pixelCount');
    const legend = document.getElementById('gridLegend');
    const miniScaleX = mini.width / W, miniScaleY = mini.height / H;
    const palette = options.palette || [];
    const levels = ['fit', 2, 4, 8, 12, 16, 24, 32];
    let scale = 8, offX = 0, offY = 0;
    let logicalW = 640, logicalH = 500;
    let selected = null;
    let dragging = false;
    let from = null;
    let ready = false;
    let grid = true;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const hex = c => '#' + c.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    function sourceColor(x, y) {
      const d = source.getContext('2d', {willReadFrequently:true}).getImageData(x, y, 1, 1).data;
      return {r:d[0], g:d[1], b:d[2], a:d[3]};
    }
    function sample(x, y) {
      x = Math.floor(clamp(x, 0, W - 1));
      y = Math.floor(clamp(y, 0, H - 1));
      selected = {x,y};
      const c = sourceColor(x,y);
      const rgba = [c.r,c.g,c.b];
      coordLabel.textContent = '(' + x + ', ' + y + ')';
      const paletteIndex = palette.findIndex(p => p[0] === c.r && p[1] === c.g && p[2] === c.b);
      colorLabel.textContent = hex(rgba) + (paletteIndex >= 0 ? ' · 色板 ' + (paletteIndex+1) + '/4' : ' · 非法颜色');
      swatch.style.backgroundColor = hex(rgba);
      draw();
      return {x, y, hex:hex(rgba),paletteIndex,alpha:c.a};
    }
    function fitScale() { return Math.min(logicalW / W, logicalH / H); }
    function boundPan() {
      const imgW = W * scale, imgH = H * scale;
      offX = imgW <= logicalW ? (logicalW - imgW)/2 : clamp(offX,logicalW-imgW,0);
      offY = imgH <= logicalH ? (logicalH - imgH)/2 : clamp(offY,logicalH-imgH,0);
    }
    function centerAt(x,y) {
      offX = logicalW/2 - x*scale;
      offY = logicalH/2 - y*scale;
      boundPan(); draw();
    }
    function zoomTo(value, anchorX=logicalW/2,anchorY=logicalH/2) {
      const oldScale = scale;
      const cx = (anchorX-offX)/oldScale, cy=(anchorY-offY)/oldScale;
      scale = value === 'fit' ? fitScale() : Number(value);
      if (!Number.isFinite(scale)||scale<=0) throw Error('Invalid pixel zoom');
      offX = anchorX - cx*scale;offY = anchorY - cy*scale;
      boundPan();
      zoomSelect.value = value === 'fit' ? 'fit':String(value);
      zoomLabel.textContent = value === 'fit' ? '适应画布' : scale+'× / 每个原生像素 '+scale+' CSS px';
      legend.textContent = scale >= 4 ? '每一个方格 = PNG 中一个真实像素；网格仅为覆盖显示，不写入导出的图。' : '全图或低倍率模式；放大到 4× 以上可显示逐像素细网格。';
      draw();
    }
    function drawGrid() {
      if(!grid||scale<4) return;
      const x0 = Math.max(0,Math.ceil(-offX/scale));
      const x1 = Math.min(W,Math.floor((logicalW-offX)/scale));
      const y0 = Math.max(0,Math.ceil(-offY/scale));
      const y1 = Math.min(H,Math.floor((logicalH-offY)/scale));
      if(x1<x0||y1<y0) return;
      vctx.save();
      vctx.beginPath();
      vctx.rect(Math.max(0,offX),Math.max(0,offY),Math.min(logicalW,W*scale),Math.min(logicalH,H*scale));
      vctx.clip();
      vctx.lineWidth=1;
      vctx.strokeStyle='rgba(253,253,255,.42)';
      vctx.beginPath();
      for(let x=x0;x<=x1;x++){
        const s=Math.round(offX+x*scale)+.5;
        vctx.moveTo(s,Math.max(0,offY));
        vctx.lineTo(s,Math.min(logicalH,offY+H*scale));
      }
      for(let y=y0;y<=y1;y++){
        const s=Math.round(offY+y*scale)+.5;
        vctx.moveTo(Math.max(0,offX),s);
        vctx.lineTo(Math.min(logicalW,offX+W*scale),s);
      }
      vctx.stroke();
      // Every eighth cell is a heavier guide for coordinate reading.
      vctx.strokeStyle='rgba(255,255,255,.65)';
      vctx.lineWidth=1.45;
      vctx.beginPath();
      for(let x=Math.ceil(x0/8)*8;x<=x1;x+=8){
        const s=Math.round(offX+x*scale)+.5;
        vctx.moveTo(s,Math.max(0,offY));vctx.lineTo(s,Math.min(logicalH,offY+H*scale));
      }
      for(let y=Math.ceil(y0/8)*8;y<=y1;y+=8){
        const s=Math.round(offY+y*scale)+.5;
        vctx.moveTo(Math.max(0,offX),s);vctx.lineTo(Math.min(logicalW,offX+W*scale),s);
      }
      vctx.stroke();
      vctx.restore();
    }
    function drawMini() {
      const mw=mini.width,mh=mini.height;
      mctx.setTransform(1,0,0,1,0,0);
      mctx.clearRect(0,0,mw,mh);
      mctx.imageSmoothingEnabled=false;
      if(ready)mctx.drawImage(source,0,0,mw,mh);
      const left=clamp(-offX/scale,0,W),top=clamp(-offY/scale,0,H);
      const right=clamp((logicalW-offX)/scale,0,W);
      const bottom=clamp((logicalH-offY)/scale,0,H);
      mctx.strokeStyle='#FAFAFF';mctx.lineWidth=2.5;
      mctx.strokeRect(left*miniScaleX+1,top*miniScaleY+1,Math.max(0,(right-left)*miniScaleX-2),Math.max(0,(bottom-top)*miniScaleY-2));
      if(selected){
        mctx.fillStyle='#FFFFFF';
        mctx.fillRect(Math.round(selected.x*miniScaleX)-2,Math.round(selected.y*miniScaleY)-2,5,5);
      }
    }
    function draw() {
      const dpr=window.devicePixelRatio||1;
      vctx.setTransform(dpr,0,0,dpr,0,0);
      vctx.imageSmoothingEnabled=false;
      vctx.fillStyle='#111831';
      vctx.fillRect(0,0,logicalW,logicalH);
      if(!ready){drawMini();return}
      vctx.drawImage(source,offX,offY,W*scale,H*scale);
      drawGrid();
      if(selected && scale>=4) {
        const px=offX+selected.x*scale,py=offY+selected.y*scale;
        vctx.save();
        vctx.strokeStyle='#FFFFFF';vctx.lineWidth=2.5;
        vctx.strokeRect(Math.round(px)+1,Math.round(py)+1,scale-2,scale-2);
        vctx.restore();
      }
      drawMini();
    }
    function resize() {
      const bounds=view.getBoundingClientRect();
      const lastCx=(logicalW/2-offX)/scale,lastCy=(logicalH/2-offY)/scale;
      logicalW=Math.max(100,bounds.width);logicalH=Math.max(100,bounds.height);
      const dpr=window.devicePixelRatio||1;
      view.width=Math.round(logicalW*dpr);view.height=Math.round(logicalH*dpr);
      if(zoomSelect.value==='fit')scale=fitScale();
      centerAt(lastCx,lastCy);
    }
    function pointerCoords(ev){
      const r=view.getBoundingClientRect();
      return {screenX:ev.clientX-r.left,screenY:ev.clientY-r.top};
    }
    function pointerToPixel(screenX,screenY){
      const x=Math.floor((screenX-offX)/scale);
      const y=Math.floor((screenY-offY)/scale);
      return x>=0 && x<W && y>=0 && y<H?{x,y}:null;
    }
    zoomSelect.addEventListener('change',()=>zoomTo(zoomSelect.value));
    gridToggle.addEventListener('change',()=>{grid=gridToggle.checked;draw()});
    document.getElementById('inspectCenter').addEventListener('click',()=>centerAt(W/2,H/2));
    document.getElementById('inspectFace').addEventListener('click',()=>{zoomTo(16);centerAt(161,105)});
    document.getElementById('inspectHand').addEventListener('click',()=>{zoomTo(16);centerAt(341,230)});
    document.getElementById('inspectShoe').addEventListener('click',()=>{zoomTo(16);centerAt(192,465)});
    view.addEventListener('wheel',e=>{
      e.preventDefault();
      const {screenX,screenY}=pointerCoords(e);
      const currentIndex=levels.reduce((i,level,j)=> Math.abs((level==='fit'?fitScale():level)-scale)<Math.abs((levels[i]==='fit'?fitScale():levels[i])-scale)?j:i,0);
      const next=clamp(currentIndex+(e.deltaY>0?-1:1),0,levels.length-1);
      zoomTo(levels[next],screenX,screenY);
    },{passive:false});
    view.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      const {screenX,screenY}=pointerCoords(ev);
      view.setPointerCapture(ev.pointerId);
      from={x:screenX,y:screenY,lastX:screenX,lastY:screenY,moved:false};
      dragging=true;view.classList.add('dragging');
    });
    view.addEventListener('pointermove',ev=>{
      if(!dragging||!from)return;
      const {screenX,screenY}=pointerCoords(ev);
      const dx=screenX-from.lastX,dy=screenY-from.lastY;
      if(Math.abs(screenX-from.x)+Math.abs(screenY-from.y)>4)from.moved=true;
      if(from.moved){offX+=dx;offY+=dy;boundPan();draw();}
      from.lastX=screenX;from.lastY=screenY;
    });
    view.addEventListener('pointerup',ev=>{
      if(!dragging)return;
      const {screenX,screenY}=pointerCoords(ev);
      if(from&&!from.moved){const p=pointerToPixel(screenX,screenY);if(p)sample(p.x,p.y);}
      dragging=false;from=null;view.classList.remove('dragging');
    });
    view.addEventListener('pointercancel',()=>{dragging=false;from=null;view.classList.remove('dragging')});
    mini.addEventListener('click',ev=>{
      const r=mini.getBoundingClientRect();
      const x=(ev.clientX-r.left)/r.width*W;
      const y=(ev.clientY-r.top)/r.height*H;
      centerAt(x,y);
    });
    // Make the full-image preview clickable as a navigation surface too.
    const originalView=source;
    originalView.addEventListener('click',ev=>{
      const r=originalView.getBoundingClientRect();
      const x=(ev.clientX-r.left)/r.width*W,y=(ev.clientY-r.top)/r.height*H;
      centerAt(x,y);
    });
    document.getElementById('pixelCopy').addEventListener('click',()=>{
      if(!selected)return;
      const c=sourceColor(selected.x,selected.y);
      const output='像素 ('+selected.x+', '+selected.y+') = '+hex([c.r,c.g,c.b]);
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(output).then(()=>{pixelCount.textContent='已复制：'+output}).catch(()=>{pixelCount.textContent=output});
      }else pixelCount.textContent=output;
    });
    if(window.ResizeObserver)new ResizeObserver(resize).observe(view);
    else window.addEventListener('resize',resize);

    ready=true;
    resize();
    // 8× view defaults to face area where pixels are easiest to inspect.
    zoomTo(8);centerAt(165,110);
    sample(165,110);
    const api = {
      refresh() {ready=true;sample(selected?.x??165,selected?.y??110);draw();},
      sample,
      focusAt: centerAt,
      zoomTo,
      inspect() {return {grid,scale,width:W,height:H,selected: selected?{...selected}:null,visiblePixelGrid:grid&&scale>=4};},
      measureChecksum() {return source.toDataURL('image/png');}
    };
    window.REPIXEL_INSPECTOR=api;
    return api;
  }
  window.createPixelInspector=mount;
})();