# 清道夫表情美术研究（2026-11-25）
用户指定核心美术参考：えすけび（Esukevi）的低多边形马娘，Q版、棱角分明、有清晰的像素五官。V07 人物造型冻结。表情 V01 不合格；V02 在用户叫停前已经提交，未做视觉验收，不视作批准版本。
## 参考
- 作者：https://x.com/esukevi/media 。2024年11月4日原帖可从转载文章 https://umamusume-pakamusu.blog.jp/archives/27316690.html 追溯。
- 近景动画转载：https://tenor.com/view/esukevi-umamusume-manhattan-cafe-agnes-tachyon-umamusume-pretty-derby-esukevi-gif-14152756986251812271 （2.2秒，498x498），媒体 https://media1.tenor.com/m/xGixfpX3na8AAAAd/esukevi-umamusume-manhattan-cafe.gif 。
- 其他动画转载：https://tenor.com/view/esukevi-agnes-tachyon-umamusume-manhattan-cafe-gif-5052062124777181763 （8.3秒）；https://tenor.com/view/manhattan-cafe-agnes-tachyon-esukevi-umamusume-uma-musume-gif-4270981561856042316 （7.7秒）。
- Autodesk AREA 高部《第6回 表情の作成》 https://area.autodesk.jp/column/tutorial/maya-lowpoly/06-facial/ ：实际阅读正文101–140行。眼口网格独立、左右UV独立、图集差分、UV偏移关键帧、各差分对齐、关节蒙皮。作者实例512x512八区，不是必须照用的分辨率。
- https://booth.pm/en/items/5525358 ：免费256面ソラハ，页面确认256x256贴图、眨眼、口型、7种表情、FBX与PSD；未下载，须遵守原模型许可。
## 视觉与技术验收
- 不用程序缩放写实眼球或椭圆口腔；先确定清道夫原画的闭眼困倦默认表情，设计角度明确的像素眼睑、暖棕色眼线、简洁虹膜和少量腮红；保持固定五官锚点。
- 独立制作眼睛的闭/半闭/睁眼/眨眼过渡、视线差分；嘴巴独立制作静止、微笑、小口、圆口、哈欠等差分，适当保留角度明确的像素块，避免连续椭圆缩放。
- 图集格子、最近邻采样、不模糊、不加全屏像素滤镜代替美术；像素密度以真实模型预览评审。测试同一相机角度、尺度下静态脸，再做表情切换与头部动作，不改变V07几何。
- 实际作者贴图、源模型、UV与精确帧序列未取得；不宣称知道Esukevi使用了UV切换或已逐帧复刻。此次只核验公开资料及视觉参考，不新增模型修改。
