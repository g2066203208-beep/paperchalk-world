/* Urban horror overworld: horizontal city street scene with independently animated traffic.
 * MVP art is replaceable per-layer. No baked cars, not a 3D tunnel or a new game.
 */
(function(root){
'use strict';
function create({stage,view}={}){
  if(!stage||!view)throw Error('City street requires existing stage and view');
  const board=document.createElement('div');
  board.id='city-street-stage';
  board.setAttribute('aria-label','横向城市双向马路：对街店铺、双向车流、前景人行道');
  board.hidden=true;
  const backdrop=document.createElement('img');
  backdrop.className='city-street-backdrop';
  backdrop.src='./assets/city-street/streetscape.svg';
  backdrop.alt='横向城市街道，两侧人行道与商业建筑';
  backdrop.draggable=false;
  backdrop.decoding='async';
  board.appendChild(backdrop);
  const traffic=[
    {id:'bus-far',file:'traffic-bus.svg',lane:'far',direction:'right',duration:23,delay:-8},
    {id:'car-far',file:'traffic-coral.svg',lane:'far',direction:'right',duration:16,delay:-1},
    {id:'car-near',file:'traffic-cream.svg',lane:'near',direction:'left',duration:14,delay:-4},
    {id:'car-near-two',file:'traffic-coral.svg',lane:'near',direction:'left',duration:19,delay:-12},
  ];
  const images=[backdrop];
  for(const item of traffic){
    const wrapper=document.createElement('div');
    wrapper.className='city-street-vehicle lane-'+item.lane+' dir-'+item.direction+' vehicle-'+item.id;
    wrapper.style.setProperty('--drive-duration',item.duration+'s');
    wrapper.style.setProperty('--drive-delay',item.delay+'s');
    wrapper.dataset.vehicle=item.id;
    const img=document.createElement('img');
    img.src='./assets/city-street/'+item.file;
    img.alt='';img.draggable=false;img.decoding='async';
    wrapper.appendChild(img);board.appendChild(wrapper);images.push(img);
  }
  const source=stage.querySelector('#source');
  if(source)source.insertAdjacentElement('afterend',board);else stage.appendChild(board);
  let active=false;
  function setActive(flag){
    active=Boolean(flag);board.hidden=!active;
    view.classList.toggle('city-street-active',active);
  }
  function inspect(){
    return {active,renderer:'horizontal-layered-2d-street',direction:'side-on',perspective:false,
      road:'bidirectional',layers:['painted-streetscape','far-lane-traffic','near-lane-traffic'],
      vehicleCount:traffic.length,traffic:traffic.map(x=>({id:x.id,lane:x.lane,direction:x.direction})),
      imagesLoaded:images.every(img=>img.complete&&img.naturalWidth>0),
      assets:images.map(img=>({src:img.getAttribute('src'),ready:img.complete&&img.naturalWidth>0}))};
  }
  return Object.freeze({setActive,inspect,get element(){return board;}});
}
root.PaperWorldCityStreet=Object.freeze({create});
})(window);
