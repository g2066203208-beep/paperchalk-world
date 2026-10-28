/** Diegetic dialogue content: authored characters with local, contextual choices.
 * Decisions are recorded by the standalone dialogueSystem; no DOM or routes live here.
 */
export const LOCAL_DIALOGUES={
 kai:{speaker:'阿凯',opening:'总算有间自己的屋子了。窗户漏风，桌子也要拿木箱垫。昨天码头那事传得比我们走得还快。',
  options:[
   {id:'rumor',label:'外头怎么传我们？',reply:'有人说是十几个蒙面人，有人说是工会干的。没人提到我们的名字。这样最好。',effect:'intel'},
   {id:'promise',label:'这间屋子以后要做什么？',reply:'让街坊有个能敲门说话的地方。咱俩先把这里收拾好，再看看谁愿意真心帮忙。',effect:'trust'},
   {id:'work',label:'手头还剩多少钱？',reply:'买完房剩一百九十。下个月不一定好过，所以先找稳妥的活，不要学那些欺负人的。',effect:'none'}
  ]},
 neighbor:{speaker:'楼下婶婶',opening:'巷口那几个混混又来了。警察连街灯都不修，倒是收了我们一堆乱七八糟的费用。',
  options:[
   {id:'help',label:'我们去看看',reply:'你们两个年轻人先别莽撞。街坊一起出面，总比有人单独挨打强。',effect:'trust'},
   {id:'rumor',label:'蒙面人的事谁在传？',reply:'我也听说了。有人讲那晚有人替码头工友讨回工钱。不过谁知道真假呢。',effect:'intel'}]},
 runner:{speaker:'街头少年',opening:'你们听说了吗？有人说蒙面人躲在塔楼，有人说是外地来的。谁都没见过脸！',
  options:[{id:'rumor',label:'你亲眼看见过吗？',reply:'没有！我朋友的哥哥说他在场……也可能只是吹牛。',effect:'intel'},
   {id:'work',label:'最近街上有什么事？',reply:'市场那头有卖菜的大娘吵起来了，我听见有人说她摊子被砸了。',effect:'none'}]},
 vendor:{speaker:'摊主林姨',opening:'今天的菜还没卖出去一半，他们又来收什么“摊位照顾费”。谁敢和他们讲理？',
  options:[{id:'help',label:'先帮你修好摊位',reply:'钱我会记着。不是每个人都肯为邻居花自己的钱。',effect:'trust'},
   {id:'work',label:'集市还缺帮手吗？',reply:'缺的是能按时做事的人。旧厂介绍所有不少大人找工作，你们可以去听听。',effect:'intel'}]},
 guard:{speaker:'路口巡查员',opening:'区里把巡查人手减了，路口每天都有事。可我也没权利随便抓人。',
  options:[{id:'work',label:'能不能先处理商户报案？',reply:'留下具体地址和时间，我会登记。别只让我听道听途说。',effect:'trust'},
   {id:'rumor',label:'最近查的都是什么？',reply:'欠薪、占道和收钱的人。其他情况我不能跟你说。',effect:'none'}]},
 worker:{speaker:'失业工人',opening:'厂关了三个月。家里老人吃药，小孩上学，我只想找份按时发工资的工。',
  options:[{id:'work',label:'你会做什么？',reply:'搬运、开箱、记货。谁有活，我都愿意凭本事干。',effect:'intel'},
   {id:'help',label:'先去街坊互助点看看',reply:'谢谢。至少有人肯认真听我把话说完。',effect:'trust'}]},
 clerk:{speaker:'就业所职员',opening:'厂里缩员，登记册上全是成年人。岗位却只有那么几份。',
  options:[{id:'work',label:'可以查看公开岗位吗？',reply:'可以。按技能面谈，签正式合同；不能强迫别人替你干活。',effect:'intel'},
   {id:'help',label:'有没有救助申请渠道？',reply:'区里有名额，但发得慢。街坊互助组织也在帮忙登记。',effect:'trust'}]},
 docker:{speaker:'码头工友',opening:'那晚之后马顺的人不敢来了，可银帆联合的人已经盯上原来的装卸合同。',
  options:[{id:'rumor',label:'他们知道蒙面人是谁吗？',reply:'不知道。越有人吹得夸张，越没有人知道那两个人究竟是谁。',effect:'intel'},
   {id:'work',label:'有干净的运输订单吗？',reply:'有，先准备好车和仓库。别跟那些乱收钱的混在一起。',effect:'trust'}]},
 unionist:{speaker:'老工会成员',opening:'那两位蒙面人没有拿走工友的钱，这是最难得的。可一场胜利解决不了整个社区。',
  options:[{id:'help',label:'我们想让邻居一起管理社区',reply:'那就从讲信用、公开账本和帮助弱者开始。别当下一个地头蛇。',effect:'trust'},
   {id:'rumor',label:'能帮我们认清这里的势力吗？',reply:'先分清做生意的人、欺压人的人，以及只想安稳生活的人。',effect:'intel'}]}
};
export function sceneConversation(id,person){
 if(id==='citizen'||id.startsWith('cit-')){
  return {speaker:person?.name||'街坊',opening:'这城里不缺发号施令的人。先听我把话说完，好吗？',
   options:[
    {id:'work',label:'最近生活怎么样？',reply:'每天要奔波工作，路过的街区也不一样。希望有人肯把正常日子还给我们。',effect:'none'},
    {id:'help',label:'需要街坊帮忙吗？',reply:'你肯听就已经不容易了。也许我们真能一起改变一点。',effect:'trust'}]};
 }
 return LOCAL_DIALOGUES[id]||null;
}
