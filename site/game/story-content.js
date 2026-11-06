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
  // The current BUILD begins here, directly after the future roguelike
  // cold-open death. The completed game will play the entire cold open first.
  // No pre-baked memory of an unseen fight or explicit fake death.
  const wakeup=freezeLines([
    {speaker:'旁白',text:'……'},
    {speaker:'旁白',text:'她猛地睁开眼睛。熟悉的天花板，安静的卧室。'},
    {speaker:'女主',text:'（……做梦了吗？）'},
    {speaker:'旁白',text:'窗外已经亮了。手机屏幕显示：早上七点。'},
    {speaker:'女主',text:'（奇怪。总觉得忘记了什么。）'},
    {speaker:'旁白',text:'厨房那边传来微弱的日常声响。今天似乎只是普通的一天。'}
  ]);
    const environment=Object.freeze({
    bedroom:freezeLines([
      {speaker:'???',text:'房间里很安静……窗外却好像有什么动静。'}
    ])
  });
  return Object.freeze({classroom,environment,wakeup});
});
