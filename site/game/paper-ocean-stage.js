/* Flat 2D paper-theatre scene. No perspective, no mesh or 3D camera. */
(function(root){
'use strict';
function create({stage,view}={}){
  if(!stage||!view)throw Error('paper-ocean requires stage and view');
  const board=document.createElement('div');
  board.id='paper-ocean-stage'; board.hidden=true;
  board.setAttribute('aria-label','全平面纸板海上舞台：前景海浪和中景大章鱼');
  const sky=document.createElement('div'); sky.className='paper-ocean-sky';board.appendChild(sky);
  const haze=document.createElement('div'); haze.className='paper-ocean-haze';board.appendChild(haze);
  const moon=document.createElement('div'); moon.className='paper-ocean-moon';board.appendChild(moon);
  function layer(name,src,alt){
    const img=document.createElement('img');img.className='paper-ocean-'+name;
    img.src=src;img.alt=alt;img.draggable=false;img.decoding='async';
    board.appendChild(img);return img;
  }
  const boss=layer('boss','./assets/paper-ocean/octopus-boss.svg','正面纸板大章鱼 Boss');
  const wave=layer('wave','./assets/paper-ocean/ocean-wave.svg','独立前景剪纸海浪');
  const source=stage.querySelector('#source');
  if(source)source.insertAdjacentElement('afterend',board);else stage.appendChild(board);
  let active=false;
  function setActive(v){active=!!v;board.hidden=!active;view.classList.toggle('paper-ocean-active',active);}
  function inspect(){return {active,renderer:'flat-2d-paper-stage',perspective:false,
    layers:['sky','haze','moon','boss','wave'],
    assets:[{name:'boss',complete:boss.complete,naturalWidth:boss.naturalWidth},
            {name:'wave',complete:wave.complete,naturalWidth:wave.naturalWidth}],
    imagesLoaded:boss.complete&&boss.naturalWidth>0&&wave.complete&&wave.naturalWidth>0};}
  return Object.freeze({setActive,inspect,get element(){return board;}});
}
root.PaperWorldPaperOcean=Object.freeze({create});
})(window);