# NPC-G001 地铁喜悦 / 惊讶双情绪比较（2026-11-08）

## 两套图片
- **喜悦**：用户2026-11-07批准的三位固定女学生共同嬉笑母版，**不改变原图**。
- **惊讶**：用户2026-11-08上传的 `StableDiffusion-txt2img-70y486s0r047-1-tmp6a6qlsw2.png`，目前待批准。
- 身份相同：一组NPC-G001；两套表情演出仅为同一群演员的互斥动作变体，实际游戏中不能同时刷新。
- 这张惊讶图三位出现了明显的从上往下观察的头部透视、倾斜过度，实装前需在同一车厢视角下检验与定稿喜悦的一致性。

## 实际游戏入口
- GitHub Pages: https://g2066203208-beep.github.io/paperchalk-world/?npcCompare=1
- `?npcCompare=1` **开发预览入口**：调用原有 `PaperWorldMetroCabin` / `PaperWorldGameRingArena.enterTransit()`，使用既有真实车厢、平台灯、场景相机和地板几何，不另造新地图。
- 开发预览对话框包含「喜悦 / 惊讶 / 并排」、比例滑块，以及两个原始图片文件输入。选中图片后用 Canvas 在**浏览器内**去掉**与四边相连的白底**（不损害封闭在衣服内的白衬衫），显示两套头身比例/空间摆放差异。文件不上传到服务器，不修改原作品。
- **自动预览资源已提交：** `site/assets/characters/npc-g001/emotion-joy-surprise-preview.avif`。它是192×192每种情绪的低码率快速预览二联图（整图384×192），由用户批准的喜悦原图与最新惊讶候选图缩放生成，只用于网页上自动可见，**不是高清正式NPC素材**。原始1024px两张PNG仍未作为二进制入库；需要高清时可在预览入口分别上传两张PNG替换低分辨率预览。npcCompare=1` 才会进入两情绪开发对比，正常模式不能出现两个 NPC-G001。
- 对比的 NPC 贴图当前作为屏幕空间QA图层，背景才是真实地铁WebGL；**这不是最终人物的WebGL 3D落脚和实时光照**。正式接入下一步应将透明组图作为一位 3D billboard actor 注册，绑定地面坐标/真正3D灯光。不得宣称已经全部完成。
- 测试图还可用本轮聊天生成的本地离线自带图页面 `npc-g001-subway-comparison.html` 做快速布局调节，但那一页是**模拟车厢对比，不是实际游戏截图**。

## 严格验收
- 两套图使用同一个基准缩放、地面接触线与镜头，能比较头身比；
- 喜悦/惊讶的三人**不交换身份**，切换不会额外产生两个正式NPC；
- 惊讶头顶高机位感比喜悦偏强，需要在3D地铁车厢观察是否突兀；
- 三人的眼睛全部保留；A黑袜/B灰袜/C黑袜，统一暗酒红长领带，哑光深纽扣；
- 不允许在头或鞋子被裁掉的情况下宣布美术最终合格；原图无损，开发预览中的蒙版只用于展示；
- 不额外添加一套假地铁背景，不能破坏旧地铁的原几何、摄像机、灯光及夜间戏。

## 相关文件
- [Metro Cabin QA mode](../site/game/metro-cabin.js)
- [Metro Cabin QA styles](../site/game/metro-cabin.css)
- [QA URL boot](../site/game/overworld-runtime.js)
- [Existing 3D metro camera and lights](../site/game/scene-environments.js)
- [User-approved joy metadata](characters/NPC-G001_JOY_APPROVED_20261107.json)

## 2026-11-08 空白预览修复
- 用户上传实际地铁截图后发现三人完全未显示。根因：首次只提交了切换UI而没有上传任何图片，所以两张 `<img>` 始终没有 `src`；这不是人物被主角遮挡或没有到达车站。
- 已创建并校验 GitHub AVIF 预览图的 Blob SHA：`f0b6e3f5fc1c55ffeb1609b302d84c0c62b3a6b7`；文件路径：`site/assets/characters/npc-g001/emotion-joy-surprise-preview.avif`。
- `metro-cabin.js` 预览入口先自动加载 AVIF 双联图，切分左右画面后只对边缘相连的白底做透明处理，然后显示在游戏地铁图层。无需再次选择本地图片。
- `site/index.html` 更新JS版本号防止缓存旧页面。可继续在 QA 控件用文件输入覆盖为原始高清PNG。
- GitHub Pages 部署任务和浏览器实景截图需要分别验收；不能把 JS 语法检查当作真实画面通过。
