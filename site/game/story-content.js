/* Dialogue is game content, not renderer logic.
 * A scene module may supply lines without modifying any L2D/fog/UI layer.
 * New story arcs should be registered here and backed by save migrations.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldStoryContent=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  function freezeLines(lines){
    return Object.freeze(lines.map(line=>Object.freeze({...line})));
  }
  const classroom=freezeLines([
    {speaker:'???',text:'这间教室……和我记忆里的，不太一样。'},
    {speaker:'???',text:'明明已经放学了，为什么还有声音？'},
    {speaker:'???',text:'有人……在看着这里吗？'}
  ]);
  const environment=Object.freeze({
    bedroom:freezeLines([
      {speaker:'???',text:'房间里很安静……窗外却好像有什么动静。'}
    ])
  });
  return Object.freeze({classroom,environment});
});
