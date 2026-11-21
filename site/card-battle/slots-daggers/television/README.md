# WORK · 3D 八角电视与实体木桌场景（2026-11-21 重制）

## 唯一线上场景
- [GitHub Pages](https://g2066203208-beep.github.io/paperchalk-world/card-battle/slots-daggers/television/index.html)
- 原老虎机主菜单保留；旧推币塔、物品研究室入口已改为跳转
- 场景：纯黑环境、单台低多边形金属电视、真实木桌、玻璃杯、盆栽花枝
- **不要新增无意义的装饰螺丝、假通风条、浮在空中的 UI 组件**
- 两个实物旋钮各有真实交互：电源（开关机显像管亮线）和频道切换；点击/拖动都可操作

## 取自原版 WORK 的准确素材与函数

全部代码均直接从当前 GitHub 文件引用，不是仿色或外部 AI 原画：

1. `../coin-art.js` 中 `metal(nx,ny,nz,rough,ambient,lamp)` **在 `television.js` 中逐字符原样复制**，保留反射向量、Fresnel、三种虚拟灯、指数量级的高光；原币源文件不改
2. `../cabinet-art.js` 原版 `CabinetArt.panel()` 用于生成材料纹理，按投影位置映射于电视实体外壳
3. `CabinetArt.wood(ctx,512,320)` 原函数渲染木板的接缝、纹理、木节、划痕、照明，透过两组三角形 **UV 映射到三维桌面几何**
4. `CabinetArt.glass(ctx,x,y,s)` 原杯子光线追踪/折射/吸收程序直接渲染杯子，可见玻璃和琥珀色反光
5. `CabinetArt.nearIvy(8)` 为原程序化枝叶素材，和八面花盆、三角叶与小花的实体低多边形模型结合
6. `../reel-art.js` 的 `ReelArt.face()` **原雕刻高度场、法线、压印和金属色的金币、匕首、星星**直接组成电视内频道广告
7. CRT 仍沿用独立帧内容/反射、加法暖辉光、磷光遮罩、显像管开机水平线动画

`CabinetArt` 新增公开 `wood,glass,nearIvy,texture` 四个现有函数导出，**没有重写函数内部的旧老虎机代码**。所有旧机台仍能调用原 API。

## 重新建模的几何与比例

- 电视 `contour()` 使用固定 **8 顶点切角轮廓**，不再使用弧线细分形成塑料圆边
- 外壳七道独立倒角圈层：机体后缘、外缘、前缘、金属镶边、暗槽
- CRT 与镶边共用八角轮廓，屏幕通过曲面顶点向外凸起；CRT 7 圈 x 8 顶点合计 **104 个曲面三角形**
- 两个旋钮是实体盘片，有浮雕刻度，可点击和拖动
- 桌面有真实木质上表面、侧厚、裙边、四条桌腿
- 两只电视脚分别跨接机体底部和桌面，防止电视浮空
- 八面花盆、泥土、茎杆、叶片、花瓣均采用真实三维面片（另外结合 Work 原程序化藤叶）

## 避免再次做错的约束

- 电视不是贴到方形画面上的平面屏幕，屏幕的轮廓必须和机壳开口、垫圈、倒角配套
- 建模先看整机剪影、厚度、主体比例和真实接地，再加金属浮雕
- 游戏自带的桌子/杯子/植物是高价值原生代码，不要另造一套质感不一致的假的
- 黑色背景留作空间感，不要加入多余的展示面板
- 不要把本机称为 WebGL / GPU PBR：它是 CPU 真实三维坐标+逐像素深度缓冲；镜头不动时缓存外壳遮挡和屏幕 UV
- 原版玻璃杯多次折射被完整直接调用；CRT 玻璃**仍是简化菲涅耳反射而不是完整的多次光线追踪**，两者不要混淆

## 专业学习与对比记录

- https://80.lv/articles/modeling-and-texturing-an-old-crt-tv-prop — 先 blockout 完整体积和比例，再 bevel/low-poly，消除无用拓扑
- https://gamesartist.co.uk/tv-ps1/ — 大形体、中形体、微小细节分阶段；low-poly 保留硬边、微倒角
- GitHub Actions Workflow: `.github/workflows/work-television-3d-qa.yml`
- GitHub Pages Workflow: `.github/workflows/work-television-pages.yml`（经过 Chromium 检查后才部署，和游戏其它 QA 的发布门闸分开）

### 必须每次浏览器实际验证

`node tests/work-television-3d-browser.mjs`

桌面1280×720、手机390×844及横屏844×390：检查真实木纹、真实玻璃杯、真实藤叶、3D桌腿、104三角形CRT、旋钮开关、频道轮换、原版金属着色函数逐字符相同、性能、前端零报错、旧 URL 跳转。保存截图和实机视频，然后人工审美评估，测试通过不等于美术最终满意。
