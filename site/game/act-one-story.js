/* Paperchalk World — Act I: 几分钟的爱情.
 * Authored fiction and optional investigation, deliberately separate from UI.
 * Calendar events advance without the player; discovery never gates progression.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldActOne=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const KEY='paperchalk-act-one-v1',VERSION=1;
  const L=(speaker,text,effect)=>({speaker,text,...(effect?{effect}:{})});
  const SCENES=Object.freeze({
    confession:[
      L('旁白','上午的教室。有人赶着抄作业，有人隔着两排座位扔橡皮。'),
      L('女二','喂，把你作业借我看看。不是抄，我就看一眼！'),
      L('同学','诶，等等，等一下！你们看那边！'),
      L('旁白','平时总是被人围着聊天的女生，停在了小胖的课桌前。'),
      L('女神','我有话想跟你说。'),
      L('小胖','啊？找、找我？'),
      L('女神','我喜欢你。'),
      L('同学','……哈？！'),
      L('女神','我说，我喜欢你呀。'),
      L('旁白','她弯下腰，轻轻抱住小胖，在他脸颊上亲了一下。', 'kiss'),
      L('同学','我靠！不是吧？！真在一起了？！'),
      L('女二','等一下等一下！你俩什么时候的事啊？！'),
      L('小胖','咳……也、也没什么吧。'),
      L('同学','你脸都红了！还说没什么！'),
      L('旁白','有人吹口哨，窗边传来夸张的掌声。小胖笑得合不拢嘴。'),
      L('男主','挺有本事啊。'),
      L('男二','……'),
      L('女主','（几分钟而已。也亏他舍得。）'),
      L('旁白','铃声响了。女生怔了一下，像刚从一段过于清晰的梦里醒来。'),
      L('女神','……咦？你们怎么都看着我？'),
      L('同学','别装啦！刚刚那一下我们可都看见了！'),
      L('女神','刚刚……？'),
      L('旁白','她的笑容慢慢淡下去。周围却还在闹哄哄地庆祝。')
    ],
    afterConfession:[
      L('同学','那个场面我能笑到毕业。'),
      L('小胖','不是……你们别老说这个了。也没那么夸张。'),
      L('旁白','他说着，忍不住又把手机屏幕点亮。'),
      L('女二','你不觉得她刚才有一点奇怪吗？'),
      L('女主','（别人愿意信什么，就会看到什么。）')
    ],
    absence:[
      L('旁白','第二天。前排有人正在传阅昨天的偷拍视频。'),
      L('同学','她今天没来啊？我还想问问他们到底怎么认识的。'),
      L('女二','听说请假了。别再转那个视频了。'),
      L('小胖','……只是没来上课而已。'),
      L('旁白','他把手机反扣在桌上，过了一会儿，又忍不住翻回来。')
    ],
    beforeFall:[
      L('老师','把书翻到这一页。靠窗的同学，帮忙把窗帘拉一点。'),
      L('旁白','粉笔在黑板上写下一行公式。走廊里有脚步声。'),
      L('同学','老师，昨天的题是不是少写了一个条件？'),
      L('老师','没有，你再看看题干。'),
      L('旁白','一切都和往常一样。'),
      L('旁白','一道穿着校服的人影，突然从左侧窗外急速坠下。','fall'),
      L('老师','……？！'),
      L('同学','刚才……窗外是不是有人？！'),
      L('旁白','教室突然安静。几秒后，外面传来尖叫和慌乱的脚步声。'),
      L('女二','你、你刚才看见了吗？'),
      L('女主','……看见了。'),
      L('旁白','老师匆忙走出教室。楼下的声音越来越混乱。'),
      L('同学','那个校服……不会吧。'),
      L('旁白','随后传来的消息，让所有人的话都停住了。坠落的人，是那天告白的女生。'),
      L('女二','……怎么会是她？'),
      L('旁白','小胖始终没抬头。刚才还攥在手里的手机，滑到了地上。'),
      L('女主','（不对劲。可是……现在说什么都晚了。）')
    ],
    heardFall:[
      L('旁白','你再次走进教室时，里面的声音比记忆里轻了很多。'),
      L('同学','你没听说吗？前几天……有人从教学楼坠下去了。'),
      L('女二','是她。那天跟小胖告白的那个女生。'),
      L('旁白','事情发生在一节普通的课上。有人亲眼看见她的身影从窗外落下。'),
      L('女主','……'),
      L('女二','我也不知道该跟你说什么。')
    ],
    aftermath:[
      L('旁白','教室的窗户关着。有人把她桌上的课本叠得很整齐。'),
      L('同学','那天还好好的……为什么会这样？'),
      L('女二','别说“还好好的”了。我们谁也不知道她这几天怎么过的。'),
      L('旁白','小胖坐在座位上，连有人叫他都没有反应。'),
      L('男主','……学校已经找过相关同学了。不要到处传那些视频。'),
      L('男二','有些事情，不一定会跟着那几分钟一起结束。'),
      L('女主','你知道什么？'),
      L('男二','现在还不能确定。'),
      L('旁白','老师走进来，照常点名。念到那个名字时，停顿了一下。')
    ],
    boyLast:[
      L('旁白','放学前，小胖坐在靠窗的座位上，脸色很差。'),
      L('同学','你几天没睡了？'),
      L('小胖','……我没事。'),
      L('女二','你这样真的不行。要不要去找老师，或者让家里人来接？'),
      L('小胖','我只是……我想问一个问题。'),
      L('女主','说。'),
      L('小胖','要是有一件事已经结束了……还能再买回来吗？'),
      L('旁白','他像是后悔问出了这句话，迅速抓起书包离开。'),
      L('女主','（……他到底还想做什么？）')
    ],
    boyDeath:[
      L('旁白','小胖没有来学校。有人说联系不上他。'),
      L('女二','班主任刚刚通知了。小胖……被发现死在家里了。'),
      L('女主','……什么？'),
      L('女二','他这几天一直很不对劲。我还以为有人陪着他。'),
      L('旁白','同一个教室，短短几天里，少了两个人。'),
      L('男主','这件事先别到处猜。有人会查。'),
      L('男二','……两个人，顺序太巧了。'),
      L('女主','（那天还在笑的那些人，现在谁也笑不出来了。）')
    ],
    emptySeats:[
      L('旁白','新的一周，黑板上的日期换了。课程表也换了。'),
      L('老师','上课。'),
      L('旁白','有人翻书，有人打哈欠。空下来的两张课桌，却没有再被原来的主人碰过。'),
      L('女二','……下课要不要去买点东西？'),
      L('女主','好。'),
      L('旁白','窗外传来其他班级的笑声。生活仍在继续。')
    ],
    boyEarly:[
      L('小胖','你们还在提那个啊？'),
      L('同学','那当然！教教兄弟怎么追人呗！'),
      L('小胖','咳，那种事……说了你也不懂。'),
      L('旁白','他故作镇定地摆摆手，又把手机拿出来看了看。')
    ],
    boyAfter:[
      L('女主','你最近有好好睡觉吗？'),
      L('小胖','睡不睡有什么区别。'),
      L('女主','那天的事，你到底买了多久？'),
      L('小胖','……你知道？'),
      L('女主','你想让所有人都知道吗？'),
      L('小胖','别说出去。拜托。'),
      L('小胖','我以为只要她真的喜欢过我一次，后面就有可能是真的。'),
      L('小胖','可是她后来连看我一眼都不愿意。'),
      L('女主','她原本就有权不喜欢你。'),
      L('小胖','我知道！……我现在知道了。'),
      L('旁白','他捂住脸，很久没有再说话。')
    ],
    classmatesEarly:[
      L('同学','真的假的？小胖以前跟她根本没怎么说过话吧！'),
      L('同学','还有人说他们在背地里早就交往了呢。'),
      L('旁白','一段普通的校园八卦，开始长出十几种说法。')
    ],
    classmatesLate:[
      L('同学','有些人把那段告白剪成了段子。后来又偷偷删了。'),
      L('同学','学校让大家别乱传。我现在也不太想看了。'),
      L('旁白','手机屏幕熄灭。谁都没有接着开玩笑。')
    ],
    girlTalk:[
      L('女主','你没事吧？'),
      L('女神','……我应该没事。'),
      L('女神','我记得自己说了那些话。可我想不通，为什么当时觉得非说不可。'),
      L('女主','那你现在想怎么做？'),
      L('女神','我想安静一点。暂时别告诉别人我们聊过。'),
      L('旁白','她把手机握在胸前，迟疑了一会儿，轻轻点头。')
    ],
    girlDesk:[
      L('旁白','桌上压着一本课本。页角夹着一张没写完的便签。'),
      L('便签','“不是他做了什么，是我突然变得不像我自己。”'),
      L('便签','“我明明还记得那几分钟。可那种感觉……不是我的。”'),
      L('旁白','纸张没有写明日期。也没有留下能直接解释死亡的答案。')
    ],
    male2:[
      L('男二','你在查他们两个的事情？'),
      L('女主','你知道些什么？'),
      L('男二','别先认定是爱情，也别先认定只是某个人后悔了。'),
      L('男二','有些交易，履行完以后，顾客的生活才刚开始变得糟糕。'),
      L('女主','你查天使很久了？'),
      L('男二','……还不够久。')
    ],
    male1:[
      L('男主','有些事查起来挺脏的。'),
      L('女主','你不是一向懒得管别人？'),
      L('男主','我只是不喜欢有人把人当商品。'),
      L('旁白','他说得很随意，随后又趴回了桌上。')
    ],
    homeArrival:[
      L('旁白','门口贴着一张物业的普通通知。走廊里的感应灯一亮一灭。'),
      L('旁白','小胖已经不在了。门被封着，不能随意进入。'),
      L('旁白','附近的邻居说，最后几天总听见他的手机在响。'),
      L('旁白','你没有看见怪物，也没有听见鬼叫。只看见门边有个再普通不过的名字。')
    ],
    homeRecords:[
      L('旁白','获准查阅的遗物清单里，有一张来自手机的自动备份打印件。'),
      L('交易记录','「指定对象感情调整：服务已完成。时长已结算。」'),
      L('交易记录','「额外体验：偶遇与关注度优化。赠送服务无需另行支付。」'),
      L('交易记录','「延长体验申请：余额不足。」'),
      L('交易记录','「账户状态：已终止；剩余资产根据原合同处理。」'),
      L('女主','（……赠送？他到底知不知道有人还在替他安排后面的事？）'),
      L('旁白','打印件无法证明每一件悲剧具体由谁造成，却证明这笔生意远没有在告白那天结束。')
    ],
    conclusion:[
      L('旁白','一个人花光金币，买来了几分钟不属于他的爱情。'),
      L('旁白','另一个人被迫经历那几分钟，此后连自己的感受都难以信任。'),
      L('旁白','那家商店兑现了商品，也给过“免费的好意”。'),
      L('女主','（至少有一点可以确定：它们知道自己在卖什么。）'),
      L('旁白','铃声响起。教室又迎来了下一节课。')
    ]
  });
  const MEMO=Object.freeze({
    confession:'那天的告白',
    absence:'请假的女生',
    beforeFall:'窗外的身影',
    heardFall:'窗外的身影',
    aftermath:'课桌',
    boyLast:'最后的一句话',
    boyDeath:'家中的死讯',
    emptySeats:'两张空桌'
  });
  function create({storage=null}={}){
    let data={version:VERSION,seen:[],clues:[]};
    try{
      const saved=JSON.parse(storage?.getItem(KEY)||'null');
      if(saved?.version===VERSION){
        data={version:VERSION,
          seen:Array.isArray(saved.seen)?saved.seen.filter(x=>typeof x==='string').slice(0,64):[],
          clues:Array.isArray(saved.clues)?saved.clues.filter(x=>typeof x==='string').slice(0,32):[]};
      }
    }catch(_){}
    const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(data))}catch(_){}};
    const seen=id=>data.seen.includes(id);
    const knew=id=>data.clues.includes(id);
    function claim(id){
      if(!SCENES[id])return null;
      if(!seen(id)){data.seen.push(id);persist()}
      return {id,lines:SCENES[id],title:MEMO[id]||null};
    }
    function clue(id,scene){
      if(!knew(id)){data.clues.push(id);persist()}
      return {id:scene,lines:SCENES[scene],clue:id};
    }
    function enter(s){
      if(s?.location!=='school')return null;
      const d=s.day;
      // Skipped days have real consequences. Never replay a living girl's
      // confession after the accident, nor fake a witnessed fall on day 4.
      if(d>=6&&!seen('boyDeath'))return claim('boyDeath');
      if(d>=4&&!seen('beforeFall')&&!seen('heardFall'))return claim('heardFall');
      if(d<3&&!seen('confession'))return claim('confession');
      if(d===2&&!seen('absence'))return claim('absence');
      if(d>=4&&!seen('aftermath'))return claim('aftermath');
      if(d===5&&!seen('boyLast'))return claim('boyLast');
      if(d>=8&&seen('boyDeath')&&!seen('emptySeats'))return claim('emptySeats');
      return null;
    }
    function study(s){
      if(s?.location!=='school')return null;
      if(s.day===3&&!seen('beforeFall')){
        if(!seen('heardFall'))return claim('beforeFall');
        return null;
      }
      if(s.day>=4&&!seen('aftermath'))return claim('aftermath');
      if(s.day===5&&!seen('boyLast'))return claim('boyLast');
      return null;
    }
    function talk(s,who){
      if(s?.location!=='school')return null;
      if(who==='boy'){
        if(s.day>=6)return {id:'boyGone',lines:[L('旁白','小胖的座位空着。桌角还有以前被他磨得发亮的一块漆。')]};
        if(s.day>=3)return clue('boy-told','boyAfter');
        return {id:'boyEarly',lines:SCENES.boyEarly};
      }
      if(who==='girl'){
        if(s.day>=3)return {id:'girlGone',lines:[L('旁白','那张课桌还在，人却没有回来。')]};
        if(s.day===2)return {id:'girlAbsent',lines:[L('女二','她今天请假了。你要找她？')]};
        return clue('girl-voice','girlTalk');
      }
      if(who==='classmates')return {id:'classmates',lines:s.day<3?SCENES.classmatesEarly:SCENES.classmatesLate};
      if(who==='girl-desk'&&s.day>=3)return clue('desk-note','girlDesk');
      if(who==='male2'&&s.day>=3)return clue('male2','male2');
      if(who==='male1'&&s.day>=3)return clue('male1','male1');
      if(who==='conclusion'&&s.day>=6&&knew('home-records')&&knew('desk-note'))return clue('understood','conclusion');
      return null;
    }
    function home(s,kind){
      if(s?.location!=='classmate-home'||s.day<6)return null;
      if(kind==='records')return clue('home-records','homeRecords');
      if(!seen('homeArrival'))return claim('homeArrival');
      return {id:'homeQuiet',lines:[
        L('旁白','门仍然关着。走廊尽头响起电梯到站的提示音。'),
        L('旁白','每天都会有人从这里经过，但不再有人来叫他的名字。')
      ]};
    }
    function snapshot(){return {
      version:VERSION,seen:[...data.seen],clues:[...data.clues],
      girlDead:seen('beforeFall')||seen('heardFall'),
      boyDead:seen('boyDeath')
    }}
    function reset(){data={version:VERSION,seen:[],clues:[]};persist();return snapshot()}
    return Object.freeze({snapshot,enter,study,talk,home,claim,reset,seen,knew});
  }
  return Object.freeze({VERSION,KEY,SCENES,create});
});
