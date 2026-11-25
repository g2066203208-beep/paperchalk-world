# 清道夫：跑步、蒙皮、衣物参考与验收
A01–A04 未通过用户视觉验收。保留 V09 表情、V07 外形、V48 膝部烘焙修形。A04 的脚踝轨迹 IK 和程序化衣摆不是正式衣服蒙皮或布料物理。
## 实际查阅资料
- https://www.animationmentor.com/blog/animating-dynamic-run-cycles/ 正文115–157行：真人参考、跨步/下降/经过/蹬地、镜像和曲线细化、髋部推进、横向重心、胸头相位差。跑步双脚离地；持斧时保留武器握点，不套空手摆臂。
- https://rustyanimator.com/run-cycle/ 跑步关键姿势与时序对照。
- https://dev.epicgames.com/documentation/unreal-engine/panel-cloth-editor-overview 正文24–43行：衣物网格、权重转移、局部权重图、碰撞体、游戏内验收；XPBD 可供借鉴。
- https://dev.epicgames.com/community/learning/tutorials/Dl20/unreal-engine-panel-cloth-transfer-skin-weights-node 搜索摘要说明 Inpaint 权重适合宽松衣物；完整正文不可读。
- https://docs.blender.org/manual/en/latest/sculpt_paint/weight_paint/editing.html 权重归一化；https://docs.blender.org/manual/en/5.0/physics/cloth/examples.html 搜索摘要确认固定顶点组与人体碰撞；全文访问受限。
- https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_springBone-1.0/README.md 正文524–659行：前帧惯性、刚度、重力、长度约束、球/胶囊碰撞、根到末端顺序、回写旋转。用于头发围巾末端，不用于刚性斧头。
## 实施顺序
1. 用真实参考校准四阶段跑步动作，再调整骨盆、胸腔、头、支撑脚、摆动腿。原关节修形和骨长不变，双手固定握点。脚底支撑期锁定，腾空期不得穿地。
2. 夹克裤子复用人体表面修形；独立围裙上半和背带绑定人体三角形重心坐标及局部偏移。固定件不能单独漂移。
3. 下围裙固定根部、活动端使用低面数约束网格，固定步长、惯性、重力、结构边长、弯曲约束、骨盆大腿胶囊碰撞；口袋内容物绑定同一局部坐标。围巾和头发采用轻量弹簧骨。
4. 验收正侧背、慢放、帧间检查；测量骨长、翻面、穿插、握点、支撑脚滑动、循环连续性。保存实际渲染 PNG/GIF 并直接展示，数值测试不能替代视觉验收。
## 范围
本次仅归档研究及规范，未提交新合格动作或布料系统。A04 未完成渲染验收。尚未下载和逐帧测量真人参考视频。
