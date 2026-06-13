# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W24（06-13）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W24.md](./logs/2026-W24.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W22.md](./logs/2026-W22.md)（05-26 ~ 06-01）
- [2026-W23.md](./logs/2026-W23.md)（06-02 ~ 06-04）
- [2026-W24.md](./logs/2026-W24.md)（06-05 ~ 06-13）

完整未压缩历史备份：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 摘要 |
|------|------|------|------|
| 2026-06-13 | anim-closed-circuit | feature | 闭合电路欧姆定律三屏职责分离重构：实现真实的闭合回路 SVG 电路（含真实电源虚线框、内阻焦耳热暗红高亮渐变、滑动变阻器滑片物理位移联动、理想电流电压表及与电流成正比的电荷粒子流动）；设计双模式下 SVG 实时图表交互，支持 U-I 伏安特性（标注 E 和 I_短 截距）与 P_出-R 单峰曲线（标注最大功率点并随内电阻 r 调节实时左右平移波峰及高度变化）；在右面板扩展了丰富细致的物理量因变量、核心公式、高考考点和易错警示 |
| 2026-06-13 | anim-electric-potential | feature | 电势与电势差三屏职责分离重构：实现匀强电场+固定正电荷复合非匀强电场模拟，支持零势能参考（无穷远/大地0V）切换，支持手写轨迹生成与自适应弧长匀速滑行动画，下半屏显示合力矢量与能量守恒柱状图（Ek青、Ep紫），上半屏绘制一维 phi-x 图线，支持 Hover 实时切线斜率求导交互联动。优化图表及动画的鼠标指针样式以体现交互操作，在 A 锚点引入涟漪波纹引导，并增加了醒目的求导与画线文字提示卡 |
| 2026-06-13 | anim-field-lines | feature | 电场线与等势面三屏分离重构：实现 4 种拓扑电场切换，黄色电场线平滑追踪及中部流向箭头，紫色等势面网格 Marching Squares 渲染与深浅渐变，支持手持试探电荷探针及受力矢量拖拽同步，右看板定量计算绝对电势与电场力做功，悬浮青/紫双柱图表呈现能量守恒此消彼长 |
| 2026-06-13 | anim-capacitor | feature | 平行板电容器（C=Q/U）三屏职责分离：实现接通/断开电源双场景交互控制，引入平滑电介质滑块和电压刻度静电计，粒子数与电场线密度随电量 Q 联动（断电拉大板距时场强线密度恒定，验证 E 恒定），底部绘制 C、Q、U、E 实时联动渐变柱状图，升级右看板定量计算、公式、高考要点和警示 |
| 2026-06-12 | anim-charge-in-efield | refactor | 带电粒子在匀强电场中运动三屏职责分离重构：实现恒定直流/交变方形波/重力复合场物理仿真，中屏接入 MiniChart 绘制 vy-t 折线图并绘制速度分解辅助框与极性动态反转，左屏 SidebarExtra 控制电场及重力，右屏 PhysicsPanel 定量计算与高考要点推送 |
| 2026-06-12 | architecture | refactor | 矢量箭头统一架构：vectorLength 归一化重构 + VectorArrow refMagnitude 三层优先级 + SceneConfig refMagnitudes + CoulombLaw 迁移 + 项目规范同步更新 + 第 1 章运动学 5 文件迁移（Velocity/Acceleration/UniformAcceleration） |
| 2026-06-11 | architecture | refactor | 移除全部网格纸底纹（5文件），清理无用OPACITY import（3文件），确认无死代码；详见 [TODO_deferred.md](./TODO_deferred.md) |
| 2026-06-09 | architecture | refactor | 按子主题重构目录结构：力学/电磁学动画按 kinematics/dynamics/circular/gravitation/momentum/energy/electrostatics/dc-circuits/magnetism/induction 分子目录；animationRegistry/physicsQuantities 按子模块拆分注册表；新增 defineAnimations/quantities 构建器工具链 |
| 2026-06-08 | anim-satellite | feature | 人造卫星双模式与轨道发射模拟 |
| 2026-06-08 | anim-gravity | feature | 万有引力双模式与 F-r 图表联动 |
| 2026-06-08 | anim-kepler | feature | 开普勒定律三模式与 T²-a³ 图表 |
| 2026-06-07 | anim-centripetal | feature | 向心力与向心加速度 F-a 图表 |
| 2026-06-07 | anim-circular-motion | feature | 匀速圆周运动与简谐投影 |
| 2026-06-07 | anim-oblique-throw | feature | 斜抛运动空气阻力进阶 |
| 2026-06-07 | anim-projectile | feature | 平抛运动双模式与 v-t 图表 |
| 2026-06-07 | anim-weightlessness | fix | 超重失重 N-a 图同步修复 |
| 2026-06-07 | anim-connected-bodies | refactor | 连接体问题物理模型修正 |
| 2026-06-07 | utils | refactor | 死代码清理与预留函数规范化 |
| 2026-06-06 | anim-gravity-basic | feature | 新增重力与重心教学演示 |
| 2026-06-06 | anim-friction | feature | 摩擦力双模式重构美化 |

## 日志记录规范

1. **主文件瘦身原则**：`PROCESS_LOG.md` 仅保留当前周索引与最近 10-20 条摘要
2. **按周归档**：详细记录按 ISO 周存入 `./logs/YYYY-Wxx.md`，单文件不超过 800 行
3. **变更分类**：每条记录需标注类型（feature/refactor/fix/test/docs/style/compliance）
4. **格式压缩**：每条记录 ≤ 6 条 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策独立归档**：重要技术决策存入 ADR，避免在日志中过度展开设计细节
6. **重复日期合并**：同一日期下的多条记录合并在同一日期标题下

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
