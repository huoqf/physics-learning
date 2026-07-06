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
