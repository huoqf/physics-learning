# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W26（06-24）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W26.md](./logs/2026-W26.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W25.md](./logs/2026-W25.md)（06-16 ~ 06-22）
- [2026-W23.md](./logs/2026-W23.md)（06-02 ~ 06-04）
- [2026-W24.md](./logs/2026-W24.md)（06-05 ~ 06-15）
- [2026-W24-sidebar-unify.md](./logs/2026-W24-sidebar-unify.md)（侧屏统一风格）
- 完整历史：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
| 06-27 | mechanics/energy | feature | 新增轻绳连接体三阶段模型：在 lightRodRope.ts 中实现基于 PBD 几何约束投影的三阶段运动学数值积分算法；攻克摆动下落拉紧瞬时的沿绳完全非弹性碰撞速度同化计算，并在拉直时刻解析叠加张力脉冲尖脉冲；重构 LightRodRopeSidebar 追加 showVelocityDecomp 速度三角形 Toggle 并彻底隔离长文本；重塑 EnergyBars 语义色，在碰撞瞬间总能量柱增加红光发光与“碰撞损失”Badge；联动控制当显示速度三角形时隐藏拉力和重力；右侧屏实时并存渲染以时间为轴的 v-t 与 F-t 关联曲线，并由 markers 指示状态突变标记线；tsc 静态检查无错误 |
| 06-25 | optics/thin-lens | refactor | 薄透镜成像页面动画重构：修正凸透镜、凹透镜及实像、虚像下的三条特殊光线几何追迹方程；新增 CandleShape 倒立烛身渲染以符合物理实像性质；解锁共轭测焦距模式拖拽限制并引入基于 SVG 滤镜 feGaussianBlur 的动态调焦模糊和透明度变化；重绘主光轴为厘米刻度金属光学导轨，加入透镜玻璃感材质与激光束微光发光特效；RelationChart 颜色重构为合规 warm 变体并高亮 conjugate 点 |
| 06-25 | components/UI | refactor | UI通用组件优化与美化：修复 Slider/ParamControl/AnimationControls 自定义圆纽遮挡 input 导致的交互卡顿，增加 z-10 peer 与 h-6 交互区并添加 pointer-events-none；Button 8态规范并用 absolute 居中 spinner + opacity-0 文字消除 loading 宽度抖动；ToggleSwitch 增加 focus-visible、圆纽 shadow-md 与两端对称；SegmentedControl 增加 hover/active 缩放反馈；PhysicsPanel 手风琴折叠默认展开，重构公式/要点/警示卡片并引入 Lucide 矢量图标，规范数值 font-mono 及语义色彩显示；DiscoveryGuide capsule 进度条与 fadeIn 提示；单元测试 289 通过 |
| 06-25 | mechanics/kinematics | feature | 新增运动学进阶（图象逆推模型）：引入上下自适应布局，基于 Viewport 架构缩放，由 RelationChart 联动展示一次函数物理规律及刹车状态拦截 |
| 06-25 | mechanics/momentum | refactor | 动量定理三屏重构：净化主屏右侧卡片为自适应图表，数值监测看板移植至右侧屏 `momentum.ts` 量表并联动 `_time`；基础模式添加缓冲垫标注 |
| 06-24 | mechanics/dynamics | feature | 摩擦力演示重构：calculateDoubleFrictionIncline 双体解算，anim-friction 自变量感知，MiniChart 组件化双曲线映射，取消网格与重合的浮动卡片，PhysicsGround/Block 器材替换，对地加速度正交分解辅助线，tsc零错误 |
| 06-24 | project | refactor | 结构修复方案全量执行：P0-1 清理自造 marker（ACGeneration 删 aB，Capacitor/SpringForce/ElectricPotential 加注释）；P0-2 ForceMotionTripleChart 重写（三次 BasePhysicsChart + SingleChartContent 模式）；P0-4 AnalysisPage/WrongPage 业务逻辑外迁（新建 9 文件，页面薄壳化）；P1-1 定义 SceneLayoutProfile + IDENTITY_SCENE_SCALE + createSceneScaleFromViewport；P1-2 批量修复 50 文件子路径导入（9 组模式）；P2-1 DCSource/Block fontSize 迁移（FONT_BASE 常量 + 可选 font prop）；P2-2 清理 23 处 VectorArrow 假 sceneScale；P2-3 颜色+像素值清单记录；tsc 零错误 |
| 06-22 | mechanics/kinematics + Chart | refactor | 高难度三件套收官：VerticalThrowCharts 右侧 v-t/y-t 双图迁入 VelocityTimeChart / DisplacementTimeChart 预设；用 foreignObject 承载标准图表，专题特有的全轨迹淡线、真空对照、面积/切片、目标高度、最高点、割线/切线和时间拖拽改为插件层；VelocityTimeChart/DisplacementTimeChart 增加 xLabel/yLabel；test/build 通过，lint 剩余非本次 5 个 error |
| 06-22 | electromagnetism/induction + Chart | refactor | FaradayChartPanel 右侧 Φ-t / E-t 双图迁入 VelocityTimeChart 预设；用 foreignObject 承载标准图表，保留 0~10s 全曲线、当前时刻游标与 E=0 特殊说明；VelocityTimeChart 增加 xLabel/yLabel 以支持 Φ/Wb、E/V 轴标签；test/build 通过，lint 剩余非本次 5 个 error |
| 06-22 | electromagnetism/induction + Chart | refactor | ACValues I-t/Q-t 双图迁入 VelocityTimeChart 预设；VelocityTimeChart 新增 `ChartDataSeries` 多曲线接口 + `additionalSeries` + `tDomain` + `stages` + `underlay`/`children` 插件层；ACValues 保留加热盒动画、周期撞线裁判、有效值/峰值标注；test/build 通过，lint 剩余非本次 5 个 error |
| 06-22 | mechanics/kinematics | refactor | VerticalThrow 图表区拆分：新增 VerticalThrowCharts.tsx 承接右侧 v-t/y-t 双图、ChartSecant/ChartTangent 插件、目标高度/面积/双轨对照标记和图表交互热区；VerticalThrowAnimation.tsx 741→415 行，脱离 P0 超长文件；test/build 通过，lint 剩余非本次 5 个 error |
| 06-22 | components/Chart + mechanics/kinematics | refactor | VelocityTimeChart / DisplacementTimeChart 增加 tDomain 滑动窗口与 underlay/children 插件层；VelocityVTChart 迁入 VelocityTimeChart，保留 Δt 面积、平均速度线、割线/切线加速度语义；VelocityXTChart 迁入 DisplacementTimeChart，保留 x-t 割线三角形、切线与 Δt→0 提示；test/build 通过，lint 剩余非本次 5 个 error |
| 06-21 | components/Chart + mechanics/kinematics | feature | 创建 ChartSecant 插件（割线+斜率三角形，支持 ChartContext 与 legacy SVG 显式坐标）；ChartTangent 扩展 color/stroke/opacity/dash/showPoint；VelocityVT 接入 v-t 割线/切线读平均/瞬时加速度；VelocityXT 接入 x-t 割线三角形与切线；VerticalThrow 启动图表插件化（v-t 最高点切线、y-t 割线/切线）；修复 ChartArea/MiniChart 条件 Hook 顺序问题；test/build 通过，lint 剩余非本次 5 个 error |
| 06-19 | thermodynamics | feature | 热力学第二定律动画模块：secondLaw.ts（粒子碰撞热传导/气体扩散/Ω微观态数计算/温度→颜色映射）；SecondLawAnimation.tsx（Canvas粒子+SVG叠加+逆向警告框）；SecondLawSidebar.tsx（场景切换+正向/逆向按钮）；SecondLawCenterExtra.tsx（MiniChart无序度时序图）；useAnimationStore新增direction字段；types.ts AnimationActions新增setDirection；useAnimationLifecycle支持方向乘数；tsc零错误，build成功 |
| 06-19 | hooks/animation | fix | useAnimationLifecycle rAF首帧零delta触发<=0守卫导致动画无法播放：首帧deltaTime=0使time保持0，新加<=0守卫立即禁止播放。修复：direction===-1条件限定，仅逆向时触发。useAnimationLifecycle.ts 1行改动 |
| 06-18 | physics | feature | 光学纯函数库 optics.ts：calculateRefraction（斯涅尔定律）、calculateCriticalAngle（全反射临界角）、calculateThinLens（薄透镜成像）；注册 index.ts，tsc 零错误 |
| 06-18 | physics | feature | 热学纯函数库 thermodynamics.ts：calculateIdealGas（理想气体三大定律）、calculateInternalEnergy（热力学第一定律）、calculateThermoProcess（等温/等容/等压过程功热量计算）；注册 index.ts，tsc 零错误 |
| 06-17 | data/quantities | fix | electromagnetism.ts 颜色硬编码修复：41 处十六进制颜色值 → PHYSICS_COLORS token（electricCurrent/magnetSouth/magneticField/velocity/acceleration/lorentzForce 等）；剩余 2 处（#EAB308/#64748B）无直接 token 映射，待后续评估 |
| 06-17 | electromagnetism | fix | 变压器规范合规修复：回退 colors.ts 新增 token（primaryCircuit/secondaryCircuit/magneticFlux → electricCurrent/magnetSouth/magneticField）；InfoBar 硬编码字号 → font(FONT.xxx)；w-52 → px(208)；CSS 动画 -24px → CSS 变量 + px()；fluxStrokeW 魔法数字 → 整体 px()；透明度魔法数字 → HIGHLIGHT_ALPHA 常量 |
| 06-17 | electromagnetism | feature | 变压器原理三屏联动重构：新增 TransformerSidebarExtra（基础/进阶模式切换）、4 只 DialMeter 电表 + Rheostat 负载、原副边红蓝配色、InfoBar 功率配平 + 动态因果链多米诺高亮；quantities builder 补充公式/高考要点/易错警示；全部布局值 px() 缩放 |
| 06-16 | electromagnetism | feature | 法拉第电磁感应定律三屏联动与双模式重构，支持 O(1) 解析式实时图表绘制 |
| 06-15 | theme | refactor | 删除 tailwindColors 死代码；neutral[0]→neutral.white（17文件64处）；CANVAS_COLORS 8个 neutral 映射改为引用 colors.* |
| 06-15 | theme | fix | 4 个 Physics 通用组件 10 处硬编码颜色违规修复（Block/SportsCar/LightBulb/DialMeter） |
| 06-15 | kinematics | fix | AccelerationCenterExtra：animate-bounce→pulse、Card 组件、selector 订阅、颜色 token |
| 06-15 | stores | refactor | 全库 useAnimationStore selector 迁移：67 文件全量解构→selector/useShallow |
| 06-15 | docs | cleanup | TODO_deferred.md 精简：删除已完成项，新增 §8-11 颜色治理后续项 |
| 06-15 | theme | refactor | 删除 colors.ts 迷你版 PHYSICS_COLORS/SCENE_COLORS；统一 Block/Ball/forceMotion 导入路径 |
| 06-14 | components | refactor | 手指定则提取为通用组件（SkeletalHand/HandRule）；删除 shared/ 目录 |
| 06-14 | tests | fix | 修复 3 个测试文件 28 个失败；lint errors 11→0 |
| 06-14 | electromagnetism | feature | 安培力双模式重构；洛伦兹力双模式重构；速度选择器并入 |

## 日志记录规范

1. **主文件瘦身**：仅保留当前周索引 + 最近 10-20 条摘要
2. **按周归档**：详细记录存入 `./logs/YYYY-Wxx.md`，单文件 ≤ 800 行
3. **变更分类**：feature/refactor/fix/test/docs/style/compliance
4. **格式压缩**：每条 ≤ 6 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策**：独立归档到 ADR

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
