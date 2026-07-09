# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W27（07-05）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W27.md](./logs/2026-W27.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W27.md](./logs/2026-W27.md)（07-01 ~ ）
- [2026-W26.md](./logs/2026-W26.md)（06-22 ~ 06-30）
- 完整历史：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
|------|------|------|------|
| 07-09 | utils/viewport | feat | ViewportInfo 新增 designVisibleW/designVisibleH/designLeft/designTop 4 个派生字段，用于 edge-to-edge 元素（地面等）撑满可视区域；BlockBoardAnimation 地面改用 vp.designLeft/designVisibleW；07_CANVAS_SVG_CHART_RULES 新增场景 6 规范；tsc 零错误 |
| 07-09 | theme | refactor | 全量 preset 对齐实际容器宽度：full 700→840、splitV 700→840、splitH 350→420；20+ 组件硬编码坐标同步缩放（OhmLaw/SingleRod/Conveyor/MechanicalWave/ChargeInEField/Capacitor/SpringForce/CombinedFields/ThinLens/Reflection/Refraction/TIR/WaveDiffraction/MomentumConservation/FreeFall/Kepler/FieldLines/ElectricField/ClosedCircuit/SpringComposite）；规范文档 project_rules/ARCHITECTURE_RULES/viewport_audit_report/TODO_deferred 全部同步；tsc 零错误 |
| 07-09 | vibration/wave | feat | 机械波三动画落地：physics/wave.ts（行波因果阶跃/单脉冲/单缝强度/双源干涉场，16 单测）；anim-mechanical-wave（splitV+双图 y-x/y-t，Ball/VectorArrow/useAnimationViewport）；anim-wave-diffraction / anim-wave-interference（splitH，Canvas 场+SVG 叠加，setupCanvasDPR，时钟仅 useAnimationFrame）；knowledgeTree vibration-2-1/2-2 接线；quantities 右屏；ANIMATION_COUNT 77；tsc+547 tests+build 通过 |
| 07-08 | electromagnetism/induction | feat | 新增“电磁感应单杆模型”页面：知识树在双杆模型前插入 electricity-4-5 单杆、双杆/线框顺延至 4-6/4-7；新增纯物理解析函数 singleRod.ts，支持恒力启动收尾与初速度释放指数衰减、电荷量与焦耳热计算；中屏 splitV 上方三图并列 v-t/I-t/能量转化，下方标准 AnimationSvgCanvas 绘制导轨、电阻、磁场×、导体棒、电流粒子、VectorArrow 速度/安培力/外力与电荷积累槽；右看板补 E=BLv、F_A=B²L²v/R、v_m 与 q=mΔv/(BL) 高考公式 |
| 07-08 | mechanics/dynamics | feat | 新增“传送带模型”页面：知识树 mechanics-4-7 接入 anim-conveyor；新增纯物理函数 conveyor.ts 支持水平/倾斜传送带、相对速度判定、共速分段、左右边界离开、相对位移与摩擦生热；左屏使用 paramMeta/controlMeta 声明 v带/v0/μ/L、模型切换、共速线和划痕开关；中屏 splitV 上方 BasePhysicsChart 显示 v物-t 与 v带 共速/离开标记，下方 AnimationSvgCanvas 绘制履带、转轮、物块、速度/摩擦 VectorArrow 与生热划痕；右看板补高考分段模板与倾斜带 μ≥tanθ 判据 |
| 07-08 | mechanics/circular | feat | 新增“圆盘与圆锥摆模型”页面：知识树 mechanics-5-7 接入 anim-circular-models；左屏以 paramMeta/controlMeta 声明模型切换、ω、L/r、μ；中屏 splitH 左侧标准 AnimationSvgCanvas 绘制圆锥摆/水平圆盘、速度/重力/向心力来源矢量，右侧 BasePhysicsChart 展示 θ-ω 或 Fn-ω 与静摩擦临界；右看板补圆锥摆与圆盘临界公式体系；新增纯物理函数 circularModels.ts |
| 07-08 | mechanics/gravitation | compliance | 天体双星/多星模型深度优化：保持 splitH 左右分区，对三星模式启用独立的 scale = 28 放大因子以饱溢画布、减少四周空白；主屏右侧彻底移除与右看板重复的动力学校验数据卡，腾出空间并新增线速度投影-时间图 (v_x-t)，与位置投影-时间图 (x-t) 垂直并列并共享时域滑动游标，极佳呈现实时简谐相位关联；celestial 单测与天体类型检查全数通过 |
| 07-08 | viewport migration | refactor | splitV/splitH 标准替换类 8 个文件迁移至 §2.2 标准路径：Capacitor、BinaryStarsAnimation、SpringForceCutRopeScene、SpringForceHookeLawScene 改为自包含模式（useAnimationViewport + AnimationSvgCanvas）；LoopPassFieldScene、DualRodsScene 子组件改为自包含模式，父组件 InductionLoopField/InductionDualRods 移除 viewport 手写；SpringForceCenterExtra 图表组件迁移；PhotoelectricSim Canvas 组件迁移；tsc 与 461 tests 全通过 |
| 07-08 | electromagnetism/magnetism | refactor | 磁场圆周几何模型分屏与矢量纠偏重构：剥离物理板书至右看板；解耦左动画（Component，splitH预设 350x650 viewBox）与右图表（CenterExtra组件，w-360px）；彻底重算 175 居中物理像素坐标变换；实现动态瞬时速度（蓝）及洛伦兹力向心力（紫）双矢量实时跟随粒子；tsc 与打包成功通过 |
| 07-08 | vibration | refactor | 简谐运动与单摆重构：物理库 oscillation.ts 新增单摆/竖直振子状态计算；知识树 vibration-1-2 正式关联单摆动画并由 v-osc.ts 分拆为两个独立动画注册；SimpleHarmonicAnimation 新增水平/竖直/能量三模式、沙摆滚动履带绘图及受力分析（重力/弹力/合力）；新建 SimplePendulumAnimation 支持小摆角限制、摆长/g参数调节探究及受力分析与参考圆投影虚线同步；tsc 与 Vite 编译打包完全通过 |
| 07-08 | mechanics/gravitation | feat | 天体双星/多星模型交互动画：纯物理计算 src/physics/celestial.ts 新增 calculateBinaryStars/calculateTripleStars，AnimationConfig 扩展 centerLayout 支持 splitH 左右分区；主屏 BinaryStarsAnimation 绘制双星及三星轨道、引力（橙）与速度（蓝）矢量，复用 Ball 和 VectorArrow；右侧屏 BinaryStarsCenterExtra 垂直并列反比校验图（半径/速度/加速度比）和受力对比图（力大小恒 1:1），复用 EnergyBars 并联动质量反比虚线；celestial 单元测试全通过；tsc 类型检查与 Vite 打包通过 |
| 07-08 | vibration/simple-harmonic | feat | 新增简谐运动（弹簧振子）动画组件：纯函数库 src/physics/oscillation.ts（computeAngularFrequency/computeSHMState/computeSHMEnergy，JSDoc+单位）；组件 SimpleHarmonicAnimation 复用 Spring/Block/PhysicsGround/VectorArrow/EnergyBars，方式C 布局，位移/速度/加速度三矢量 + 参考圆 + 能量柱，registry 驱动左屏参数（A/T/φ）与基础/进阶模式；knowledgeId vibration-1-1 接入 knowledgeTree 并补 vibration 模块序；oscillation 单测 9 项；build/lint(--max-warnings=0)/test 全通过 |

| 07-08 | electromagnetism/combined-fields | feat | 复合场组合场模型（速度选择器+回旋加速器）级联动画：纯函数库 src/physics/fieldsCascade.ts（速度选择器平衡/回旋共振频率/最大能量/stepCyclotronSlit 频率硬核匹配修正）；组件 CombinedFieldsAnimation 以 splitH 方式A 左画布（双场景切换）+ 右 HTML 栏双图表（受力平衡柱/动能阶梯），复用 VectorArrow/KatexFormula/自定义 SVG 图表；autoTune 改为声明式 resonanceLock 共振锁定；knowledgeId electricity-3-4 接入 knowledgeTree；fieldsCascade 单测 8 项；build/lint(--max-warnings=0)/test 全通过 |
| 07-06 | modern/bohr-theory | refactor | 原子结构与玻尔理论教学与规范化重构：将 controlsMode 改为 timed 以启用底部播放控制；移除 Canvas 内悬浮控制浮层并统一由声明式 controlMeta 承载；新增 α 散射偏角累计直方图与轨迹簇持久化；支持真实 $n^2$ 物理轨道比例与量子跃迁动态公式展示；添加轨道退激路径箭头、碰撞能量传递分配卡与退激光谱公式比对板；绘制实时光电流-电压 $I-U$ 曲线图与红色工作点并高度同步仿真行为 |
| 07-06 | electromagnetism/induction | refactor | CuttingEMF 页面迁移与优化：去除预设缩水代偿 {presetCompensation: 1.2}；将下半屏场景高度上限大幅提升至 420px，充盈剩余纵向画布空间；对轨距进行 1.6 倍视觉放大；动力学矢量的垂向纵标参数化绑定至轨道切线 |
| 07-06 | mechanics/energy | refactor | LightRodRopeAnimation 页面合规迁移与优化：将 SVG 内嵌 foreignObject 图表重构为标准 HTML flex 平级并列架构（铁律 8）；移除预设缩水代偿与形式主义 useViewport；纵向支点下移至 y=220 且轻杆比例放大至 240px/m，充盈 650 视口；滑轮半径参数化绑定 |
| 07-06 | electromagnetism/induction | refactor | InductionPhenomenon 页面布局重构：规范化至 standard full 预设 (700×650)；清理形式主义 useViewport 调用；实施方案二舒展充盈布局，接线柱与曲线控制点参数化绑定，拉开上下垂距保持连线自然 |
| 07-06 | electromagnetism/induction | refactor | LenzsLaw 页面迁移与优化：去预设缩水代偿至 standard full (700×650)；磁铁/螺线管/电流计尺寸放大；纵向运动范围延展为 130~360；接线柱连接线参数化绑定解算；优化右手螺旋定则与监控看板布局 |
| 07-05 | electromagnetism/electrostatics | refactor | ChargeInEField.tsx 重构与高考优化：主屏重构至 splitV (700x325) 预设与 SVG 方式 A，移除中屏悬浮面板以保证三屏不交叉；收窄限制左屏参数范围，修改质量 m=10 μg，使轨迹偏向达 50px 极度显著；右屏实时计算并高亮验证偏角比 (tanθ/tanα=2) 及交变动能定理功比对；底部图表升级为速度、能量守恒、y-x 空间轨迹切换；tsc + 76 tests pass |
| 07-05 | electromagnetism/electrostatics | refactor | CoulombLaw.tsx 拆分：708→28+290+288 行，抽 BasicMode/ThreeChargeMode 子组件；物理函数 `findEquilibriumX3` 抽离至 `src/physics/electrostatics.ts`；修复硬编码颜色（`#1e293b`→`CANVAS_COLORS.strokeDark`）及 `colors.neutral.white` 违规（7 处→`CANVAS_COLORS.white`）；补全 JSDoc 文档 |
| 07-03 | mechanics/momentum | refactor | MomentumConservationAnimation.tsx 拆分：743→329 行，抽 `useMomentumConservationPhysics` hook + 复用 `src/physics/momentumConservation`；JSX 零物理公式；tsc + 385 tests pass |
| 07-03 | mechanics/gravitation | refactor | KeplerAnimation.tsx 拆分：673→460 行，抽 `useKeplerPhysics` hook + 复用 `src/physics/celestial`；JSX 零物理公式；font()/colors 修复 + DESIGN_WIDTH/HEIGHT 常量；tsc + 385 tests pass |
| 07-03 | electromagnetism/induction | refactor | PowerTransmission.tsx 拆分：696→256 行，抽 `usePowerTransmissionPhysics` hook + `VoltageProfileChart` + `NetworkTopology` + `PowerInfoBar`；JSX 零物理公式；tsc + 385 tests pass |
| 07-03 | data/types | feat | action 类型扩展：新增 `setDirectionAndRestart` 和 `resetAndRestart` 组合动作，解锁剩余 SidebarExtra 迁移 |
| 07-02 | theme | refactor | CANVAS_PRESETS 废弃别名清理：31 个组件从 standard/mediumTall/mediumWide/extraWide 迁移至 wide/tall，spacing.ts 删除 4 个废弃别名；ReflectionAnimation/ThinLensAnimation 旧方案迁移至方式A（静态 viewBox + preserveAspectRatio）；tsc 零错误、385 tests 通过 |
| 07-01 | UI/animation | refactor | SidebarExtra→controlMeta 收敛：32 个动画迁移（24 完全删除 + 8 部分精简），SidebarExtra 从 61→29；8 批次执行，tsc 零错误；详见 logs/2026-W27.md |
| 07-01 | docs/rules | docs | 更新左屏控制台项目规范：project_rules 增加"左屏控制台声明式优先"铁律，08_THREE_PANEL/02_UI/ARCHITECTURE 补 LeftPanel、ParamMeta、controlMeta、SidebarExtra 收敛规则 |
| 07-01 | UI/animation | refactor | controlMeta 第一阶段：新增 ControlMeta 协议与 ControlPanel 渲染器（number/segmented/toggle/preset/tip），AnimationPage 接入声明式控件，库仑定律/力的合成与分解/共点力平衡/恒力做功/开普勒定律等简单 SidebarExtra 迁移为 controlMeta；补 ControlPanel 单测 3 项；build/test/lint/check:architecture 通过 |
| 07-01 | UI/animation | refactor | ParamMeta 协议扩展：新增 group/description/marks/importance/resetOnChange，ParamControl 支持参数分组、教学说明、关键标记与重要性样式；补单测至 5 项；build/test/lint/check:architecture 通过 |
| 07-01 | UI/animation | refactor | 左屏容器统一：新增 LeftPanel/LeftPanelSection/LeftPanelScrollArea，AnimationPage 左屏改用统一容器；批量迁移 49 个静态根容器 SidebarExtra 到 LeftPanelSection；build/test/lint/check:architecture 通过 |
| 07-01 | electromagnetism/magnetism | fix | 安培力 F=BIL 进阶斜面平衡分步修复：锁定 3D 磁场包围盒、2D 图补 +x′ 正方向、主屏状态箭头标为 a、矢量多边形按方案 B 改为 p0→p4 真实 F_合；拆出 drawMagneticFieldGrid 消除 lint warning；build/test/lint/check 通过 |
| 07-01 | electromagnetism/magnetism | compliance | 安培力 F=BIL 页面规范合规修复：AmpereForce.tsx 补 useViewport（方式B）+ viewBox 改 canvasSize 动态绑定；5 个文件共 10 处 `colors.neutral[]` → `CANVAS_COLORS.*`（InclineForceDiagram/ForcePolygon/UniformMagneticField）；tsc 零错误 |
| 06-30 | electromagnetism/induction | refactor | Transformer.tsx 拆分：724行→90行，抽取 transformer/model + hooks + components；补 transformerModel 单测 4 项 |
| 06-30 | electromagnetism/magnetism | refactor | VelocitySelector.tsx 拆分：720行→100行，抽取 velocity-selector/model + hooks + components；补 velocitySelectorModel 单测 4 项 |
| 06-30 | app | fix | ESLint 配置补齐 `scripts/**/*.mjs` Node globals |
| 06-30 | electromagnetism/induction | fix | HeatingBox.tsx 删除 `isAC && false && ...` 死代码 |
| 06-30 | optics/thin-lens | fix | ThinLensShapes.tsx `lensShape` 移至 `lensGeometry.ts`，消除 Fast Refresh warning |
| 06-30 | theme | refactor | Canvas 颜色违规第一批修复：10 个文件 20 处 `colors.neutral[]` → `CANVAS_COLORS.*`；tsc 零错误 |
| 06-30 | theme | fix | P3 低风险项修复：LightRodRopeScene 2 处硬编码 fontSize→font()；ThinLensAnimation/MomentumScene 2 处 rgba()→withAlpha()；useEquilibriumPhysics 1 处无 selector store 调用→精确 selector |
| 06-30 | mechanics/kinematics | refactor | VectorAdditionAnimation 拆分：808行→78行（降91%），抽取 5 个子模块 |
| 06-30 | mechanics/weightlessness | refactor | WeightlessnessAnimation 拆分：771行→29行，新建 useWeightlessnessPhysics.ts + layout/viewModel |
| 06-29 | electromagnetism/induction | refactor | ACValues.tsx 拆分：965行→5文件（ACValues 234行 + useACValuesPhysics 119行 + ACValuesChartPanel 238行 + HeatingBox 225行 + utils 9行） |
| 06-28 | physics | refactor | 超长文件拆分 P0 收官：momentumApplication.ts/EnergyConservationAnimation.tsx/UniformAccelerationCenterExtra.tsx 拆分完成 |
| 06-28 | mechanics/energy | fix | 动能定理矢量显示修复：变力模式 origin.y 坐标错误；恒力模式力箭头方向修正；能量柱改用 SVGSingleBar |
| 06-28 | electromagnetism | refactor | ForcePolygon 手写箭头重构为 VectorArrow；19 个 registry 文件改用 lazyWithPreload |
| 06-28 | app | fix | 懒加载白屏修复：Suspense fallback→可见 loading 态；KnowledgeTree hover 触发 chunk 预加载 |
| 06-27 | mechanics/energy | feature | 轻绳连接体三阶段模型：PBD 几何约束投影数值积分；碰撞损失 Badge；v-t/F-t 关联曲线 |
| 06-25 | optics/thin-lens | refactor | 薄透镜成像重构：三条特殊光线修正；CandleShape 倒立烛身；共轭测焦距模糊；光学导轨刻度 |
| 06-25 | components/UI | refactor | UI 通用组件优化：Slider/ParamControl/AnimationControls 交互修复；Button 8态规范；ToggleSwitch/SegmentedControl 改进；PhysicsPanel 手风琴重构 |
| 06-25 | mechanics/kinematics | feature | 运动学进阶（图象逆推模型）：上下自适应布局 + Viewport 缩放 + RelationChart 联动 |
| 06-25 | mechanics/momentum | refactor | 动量定理三屏重构：主屏右侧卡片→自适应图表；数值监测看板→右侧屏量表 |
| 06-24 | mechanics/dynamics | feature | 摩擦力演示重构：calculateDoubleFrictionIncline 双体解算；MiniChart 组件化；PhysicsGround/Block 器材替换 |
| 06-24 | project | refactor | 结构修复全量执行：P0-1 自造 marker 清理；P0-2 ForceMotionTripleChart 重写；P0-4 页面薄壳化；P1 场景缩放定义；P2 批量修复子路径导入/VectorArrow/颜色 |

## 日志记录规范

1. **主文件瘦身**：仅保留当前周索引 + 最近 10-20 条摘要
2. **按周归档**：详细记录存入 `./logs/YYYY-Wxx.md`，单文件 ≤ 800 行
3. **变更分类**：feature/refactor/fix/test/docs/style/compliance
4. **格式压缩**：每条 ≤ 6 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策**：独立归档到 ADR

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
