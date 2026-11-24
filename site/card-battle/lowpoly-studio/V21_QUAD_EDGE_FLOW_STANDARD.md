# V21 四边形边流规范
原批准光头参考不替换。统一正交投影与比例。原身体坐标不改；只编辑头部半侧，镜像中心线。普通耳独立。源头部保留真实四边形，显示线框只绘制源多边形边。不能仅凭四个索引判断四边形质量，近共线顶点、凹面、扭曲面均应检查。
## 资料
- Blender Studio: https://studio.blender.org/blog/retopology-modifiers-pinning-relaxing/ — 锁定关键轮廓线和点，松弛其余网格，保持形状。
- Blender 官方 Relax Edge Loops: https://docs.blender.org/manual/en/dev/modeling/meshes/editing/mesh/transform/relax_edge_loops.html — 边环松弛与均匀分布。
- Polycount Face Topology: https://polycount.com/discussion/comment/1367984 — 面流平顺、密度过渡、合理极点及斜视角检查。
- Blender Studio: https://studio.blender.org/blog/live-retopology-at-bcon22/ — 形体主线与面流优先。
- Sandia/CUBIT: https://www.sandia.gov/files/cubit/15.2/help_manual/WebHelp/mesh_generation/mesh_quality_assessment/quadrilateral_metrics.htm — 四边形角度、扭曲、边长比例等量化检查。该来源是工程网格质量规范，仅借用其指标，不把有限元阈值当作角色行业强制规定。
## 项目规则
1. 先锁定原图轮廓及鼻、嘴、下巴关键位置；沿形体组织面流。
2. 四边形的顶点不可近共线；避免明显凹面、窄长楔形或密度突变。
3. 四价顶点的两条连续边流应平顺，3/5价极点用于合理转接，不可全部堆在同一区域；镜像。
4. 锁定轮廓后对其余顶点做间距、角度、平整度联合松弛，保持低模大折面，不用细分掩盖错误。
5. 当前阶段回归门槛：头部源面全四边形；最大内角≤150°，最小≥40°，面内两三角法线夹角≤15°；这些是项目暂定门槛，不是通用行业标准。还必须检查边流和视觉效果。
6. 对照图必须首排原始参考，次排实际模型，第三排45%叠加，第四排实际四边形布线。不能用 AI 生成的效果图冒充网格渲染。
## V21 实测
V20最大内角179.36°，V21 147.12°；最小37.76°→45.31°；>155°面2→0；最大扭曲19.46°→12.30°；边流转折角90分位41.26°→35.26°；最大单面边长比7.00→4.54。96头部四边形不变。镜像误差0，严格非共面三角穿越检测0，闭合及绕序检查通过，原身体坐标不变。侧脸下颌面流仍需要美术精修，不宣称完成。线上浏览器未验证。
