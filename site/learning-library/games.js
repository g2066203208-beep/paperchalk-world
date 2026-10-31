/* PAPERWORLD STUDY LIBRARY
 * Curated reference GAMES only. Every screenshot is fetched from the
 * corresponding official Steam app, and remains owned by its game publisher.
 * No screenshots are used as training sets or copied into PAPERWORLD game art.
 */
export const GAMES=Object.freeze([
 {id:914800,title:'Coffee Talk',cn:'咖啡心语',core:true,tags:['角色','柜台','对话','操作台'],focus:'观察人物与柜台的上下遮挡、台面高度、近景对话框，以及调饮料时切换到操作台的方式。'},
 {id:1663220,title:'Coffee Talk Episode 2: Hibiscus & Butterfly',cn:'咖啡心语 2',core:true,tags:['柜台','桌面','角色','对话','操作台','交互','UI'],focus:'重点观察：老板娘正面人物与吧台后缘遮挡；台面和顾客镜头的构图；对话场景到饮品操作面板的切换；三栏配方、制作进度、拉花触控和回到人物对话的反馈；道具抽屉如何影响后续叙事。'},
 {id:2470300,title:'Hookah Haze',cn:'水烟水雾',core:true,tags:['角色','柜台','对话','操作台','UI'],focus:'研究人物镜头、操作窗口与对话框如何在同一个固定场景里切换。'},
 {id:239030,title:'Papers, Please',cn:'请出示证件',core:true,tags:['文件','签字','桌面','交互'],focus:'研究文书、抽屉、盖章、审查、拖放与桌面层级；租房登记直接借鉴实体操作逻辑。'},
 {id:1451940,title:'NEEDY STREAMER OVERLOAD',cn:'主播女孩重度依赖',core:true,tags:['UI','窗口','角色','交互'],focus:'学习多个窗口的颜色与层级、像素边框、状态提示、窗口焦点及密集信息的可读性。'},
 {id:447530,title:'VA-11 Hall-A: Cyberpunk Bartender Action',cn:'赛博朋克酒保行动',core:true,tags:['角色','柜台','对话','操作台'],focus:'学习完整的顾客对话、柜台服务与配方操作之间的分屏和过场结构。'},
 {id:2409360,title:'Pixel Cafe',cn:'像素咖啡馆',tags:['柜台','桌面','操作台','经营'],focus:'研究真正可见的台面深度、顾客需求信息与操作空间的分层。'},
 {id:589780,title:'The Red Strings Club',cn:'红弦俱乐部',tags:['柜台','对话','操作台','角色'],focus:'研究横向吧台、人物位置、局部互动道具以及叙事分镜。'},

 {id:1574580,title:'Strange Horticulture',cn:'奇异园艺',tags:['桌面','文件','交互','经营'],focus:'研究场景内的真实可操作文件、柜台抽屉和物品定位。'},
 {id:1340480,title:'The Cosmic Wheel Sisterhood',cn:'宇宙之轮姐妹会',tags:['角色','UI','文件','交互'],focus:'研究手工制作卡片的独立素材层、拖放与预览方式。'},
 {id:330820,title:'2064: Read Only Memories',cn:'2064：只读记忆',tags:['角色','对话','UI'],focus:'研究第一人称对话窗口、像素肖像及剧情反馈。'},
 {id:1210320,title:'Potion Craft: Alchemist Simulator',cn:'药剂工艺',tags:['桌面','交互','经营','操作台'],focus:'研究物品真实占据工作台的空间、交互道具和操作反馈（非纯像素画风参考）。'},
 {id:1135690,title:'Unpacking',cn:'整理房间',tags:['桌面','交互','房屋','像素'],focus:'研究室内空间的物体层级、拾取放置和整洁的像素物件。'},
 {id:1166290,title:'Death and Taxes',cn:'死亡与税赋',tags:['文件','签字','桌面','交互'],focus:'研究批阅式桌面工作流、文件移动、审核选择和后果提示。'},
 {id:658850,title:'Do Not Feed the Monkeys',cn:'不要喂猴子',tags:['UI','窗口','文件','交互'],focus:'研究多窗口日程与信息流管理、快捷切换和同时观察多个事件。'},
 {id:1201270,title:'A Space for the Unbound',cn:'无垠之心',tags:['角色','像素','房屋','对话'],focus:'研究像素角色表情、环境层次与生活氛围。'},
 {id:977880,title:'Eastward',cn:'风来之国',tags:['像素','房屋','角色','场景'],focus:'研究像素室内构成、建筑材质、家具尺度和灯光分层。'},
 {id:1389550,title:'Mind Scanners',cn:'心灵扫描仪',tags:['文件','UI','操作台','交互'],focus:'研究带反馈的设备操作、状态面板和专业感视觉布局。'},
 {id:1147550,title:'Not For Broadcast',cn:'不予播出',tags:['UI','窗口','操作台','交互'],focus:'研究多显示器控制台、输入反馈和紧凑高密度功能 UI（非像素风参考）。'},
 {id:206440,title:'To the Moon',cn:'去月球',tags:['像素','角色','对话','房屋'],focus:'研究人物故事演出与室内像素叙事空间。'},
 {id:420530,title:'OneShot',cn:'一次机会',tags:['像素','角色','UI','交互'],focus:'研究场景与桌面窗口相结合的叙事交互。'},
 {id:1337760,title:'Potion Permit',cn:'杏林物语',tags:['像素','角色','经营','房屋'],focus:'研究村镇室内装修、玩家工作台与 NPC 日常生活。'},
 {id:435530,title:'The Final Station',cn:'最后一站',tags:['像素','角色','场景','UI'],focus:'研究简洁分层的像素室内、物件轮廓和操作界面。'}
]);
export const CATEGORIES=['全部','柜台','桌面','角色','对话','文件','签字','UI','窗口','操作台','交互','经营','房屋','像素','场景'];
export const storeLink=id=>'https://store.steampowered.com/app/'+id+'/';
export const galleryLink=id=>'https://steamcommunity.com/app/'+id+'/screenshots/';
