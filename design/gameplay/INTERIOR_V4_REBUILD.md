# 第一间小店室内重做 · v4

## 本次纠正

用户否定 v3 室内。先前的测试通过只说明程序能运行，不代表美术质量或玩法形式验收通过。

这次保留已确定的橙、深蓝、奶白扁平美术方向，重做室内的统一透视和构图，不直接复制 Persona 或 Animal Crossing 的角色、界面或三维风格。借鉴其视觉层级、可信物件尺度、清楚的空间关系和细致互动反馈。

默认营业视角是固定工作台：面前顾客、左右货品、手边交接托盘/进货簿/收银机。主画面移除常驻取景下拉框；辅助取景保留在暂停设置中，供细看货物或取用角落储物使用。正常拿货、交付和收款不再自动切镜头。

## 正式素材与拆分

所有新增正式图像使用内置 GPT 图片生成制作；Python 只做裁切、透明蒙版和侧翼接缝坐标校准，没有程序绘制替代家具。

- `assets/interior-v4/production-master.webp`：空店原始生产母图，保留作来源，不作为运行时一张整体背景加载。
- `room-shell.webp`：墙、梁、布帘、窗口框和固定柜体。服务窗、货架、台面、移动门板区域挖空。
- `shelf-{left,right}-back.webp`：完整货架背板。
- `shelf-{left,right}-structure.webp`：固定立柱、支架和层板。
- `shelf-{left,right}-rail-{0,1,2}.webp`：独立前挡边，位于商品前面。
- `countertop.webp`：从服务窗沿到玩家前沿的连续台面，无中间缺口。
- `cabinet-{left,right}-door.webp`、`drawer-{left,right}-face.webp`：独立门板和抽屉脸，开合时有背板，不把门板拖走后露出空洞。
- `street.webp`：独立冬夜街景，运行时加细小飘雪。
- `extension-{left,right}.webp`：完整侧墙和延伸台面，横屏不再是竖图两侧空白。侧翼为固定建筑，新增业务并未在此实现。

零售商品、托盘、账簿、收银机、服务铃、玩家手、四位全身顾客及局部表情继续使用独立精灵；没有画进货架或母图。库存对象 ID、固定 socket、联机权威规则、存档不变。旧正式素材保留在 v3 目录供回滚。

运行时装配和像素来源见 `assets/interior-v4/manifest.json`、`src/kiosk-interior-v4.js`、`src/kiosk-view.js`。

## 构图与手机

固定物件坐标不随横竖屏重排；旋转改变取景。竖屏保留顶部环境和下方柜体，横屏展示服务台及两侧工作区。触摸目标至少 44 CSS 像素。狭窄手机把单件货物的位置向可见货架内侧收拢，同一库存数量变化不会挪动其他单件。

顾客对白改为一张小纸签，放在头像上方或横屏侧边；正常营业动作不再叠一块重复状态面板遮脸。错误提示仍可在物件附近短暂出现。

## GPTIMG 提示词记录

### 空店生产母图（生成）

Original empty tiny winter grocery kiosk interior, portrait 1024x1536. Reference the approved orange/navy/ivory flat anime menu for style only, original room. First-person behind a continuous honey-wood service counter, one point perspective, central blank navy service aperture, empty three-tier flanking shelves, small upper storage cabinets, ivory scalloped curtain and compact pendant. No customer, merchandise, register, tray, book, bell or UI baked into the image. Complete furnishings and uninterrupted backings, no hole between sill and counter. Calm clear hierarchy, hard-edged matte cel color shapes, no realistic texture or glossy bevels.

### 母图风格校正（编辑，完整最终提示词）

Edit target image1. Reference image2 is exact STYLE target. Keep image1 camera, layout, object outlines, positions and pixel dimensions 1024x1536 strictly unchanged. Restyle ALL surfaces to image2 bold FLAT graphic anime editorial art. Remove ALL smooth gradients, realistic wood grain, shiny beveled surfaces and 3D rendered shading. Each surface is exactly a solid matte color, shadows have straight hard-edged shapes. Main colors are DARK NAVY, CORNFLOWER BLUE, CREAM and GOLDEN ORANGE, identical to image2. Keep all empty shelf compartments genuinely empty, no products. Keep center window solid flat navy no characters. Preserve small floral textiles and personal details as simplified solid shapes. Counter should be one single clean orange flat plane with 3 restrained hard-shape cel shadow patches, no wood plank outlines. Dark blue shelf compartment interiors have a SINGLE blue silhouette shadow, not gradients. Window inside exact blank flat #283451. This is polished 2D cut-paper game background consistent with image2, not softly painted wood furniture. Do not add UI,text,labels, props, or people. Preserve all geometries for runtime sprite extraction.

### 独立街景（生成）

Cozy snowy winter evening pedestrian alley; original full-bleed backdrop only, no frame/interior/person/UI. Dark navy sky, cornflower low-rise houses, ivory snowcaps, small orange lit windows. Empty foreground path. Match the approved menu graphic shapes and the new room palette; quiet contrast behind customer.

### 两侧补画（编辑扩展）

Extend the reference shop into left and right complete architectural wings, preserving center source geometry. Cream plank side walls, navy framing, orange continuous empty worktops, lower cabinets and slate floor, sparse personal wall details. No extra retail products, characters, movable props, machines or UI. Same vanishing point and hard-edged flat palette. The generated output did not retain the requested central proportions; therefore only its outer architectural wings are used and the center remains the original mother image layers. Side-wing counter join heights are calibrated in the manifest. This is a fixed-perspective 2D workspace, not an arbitrary-angle 3D room.

## 实机证据与边界

`implemented-v4-portrait.png` 和 `implemented-v4-landscape.png` 是实际浏览器运行画面，不是概念图。`tests/workbench-browser.mjs` 用实际指针在四种屏幕直接完成第一笔交易，断言不打开辅助取景、镜头不自动切走、所有正式素材加载成功。

完整五单、错误恢复、委托、进货、回收、结算、次日和存档回归继续保留。联机由 GitHub Actions 的双客户端回归验证。

未完成的内容：成长/搬店后主菜单与店铺联动；新业务大量扩展；任意转身视角；真实 Android 硬件验收。图片美术是否符合用户审美须由用户判断，不能用代码测试代替。
