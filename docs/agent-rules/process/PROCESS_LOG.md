# 物理演示项目工程日志 (PROCESS_LOG)

## 2026-06-04

### AnimationPage 规范合规重构（归属 [M2] 架构完善）

原始 AnimationPage 773 行，违反 §3.1 薄页面原则、§8.1 动画注册表唯一入口、§9 不得硬编码动画组件引用、§5 useAppStore 不得与业务状态混写等 5 条规范。重构后 275 行，通过 registry 驱动，新增动画只需改 registry 一处。

- **types.ts**：新增 `ParamMeta`（参数控件元数据）、`SidebarExtraProps`（侧边栏扩展 props）类型；`AnimationConfig` 扩展 `paramMeta`/`supportsDiscovery`/`DiscoveryComponent`/`discoverySteps`/`SidebarExtra`/`CenterExtra` 可选字段
- **animationRegistry.ts**：所有动画条目增加 `paramMeta`（原页面层 paramConfigs 230 行合并至此）；`anim-uniform-acceleration` 增加 `supportsDiscovery`/`DiscoveryComponent`/`discoverySteps`/`CenterExtra`；`anim-free-fall` 增加 `supportsDiscovery`/`DiscoveryComponent`/`discoverySteps`/`SidebarExtra`
- **AnimationPage.tsx**：773→275 行，移除硬编码 paramConfigs/discoverySteps/特异 UI，通过 registry 可选字段驱动渲染，切换动画时重置 mode
- **FreeFallSidebar.tsx**（新建）：自由落体特异 UI（环境预设/时间切片/牛顿管按钮组），从页面层下沉到 features/
- **UniformAccelerationCenterExtra.tsx**（新建）：匀变速动画模式中心区域扩展（公式面板 + VT 图），从页面层下沉到 features/
- **UniformAccelerationDiscoverySteps.tsx**（新建）：匀变速发现模式 6 步骤定义，从页面层下沉到 features/
- **FreeFallDiscoverySteps.tsx**（新建）：自由落体发现模式 5 步骤定义，从页面层下沉到 features/
- **useAppStore.ts**：新增 `discoveryMaxStep`/`setDiscoveryMaxStep`，修复 `nextDiscoveryStep` 硬编码步数上限

### 自由落体牛顿管实验逻辑修正（归属 [M1] 力学动画）

原始实现 `isDual = showDualObjects && dragK > 0`，导致真空模式（dragK=0）下无法展示双物体同时落地——而这正是牛顿管实验的核心教学场景。同时存在羽毛缺少重力加速度箭头、v-t 曲线落地后未截断、阻力参数量级偏大等问题。

- **FreeFallAnimation.tsx**：①`isDual` 判断改为仅 `showDualObjects`，与 `dragK` 解耦 ②牛顿管标注根据 `dragK` 值显示「真空」/「k=…」③新增羽毛重力加速度 g 箭头 ④羽毛 v-t 曲线落地后截断并添加零速水平线段
- **FreeFallSidebar.tsx**：牛顿管按钮不再强制设 `dragK=0.5`，仅切换 `showDualObjects`；「空气阻力」预设值 `0.5` → `0.02`
- **animationRegistry.ts**：`dragK` 参数范围 `0~2` → `0~0.2`，步长 `0.05` → `0.01`（对齐羽毛实际阻力量级）

### 项目规范整合至 .trae/rules/project_rules.md

原规范散布在 AGENT.md + docs/agent-rules/core/ + docs/agent-rules/ui/ 多处，每次需手动查找。整合至 Trae IDE 默认加载位置，自动生效。

- **.trae/rules/project_rules.md**（新建）：整合 AGENT.md + ARCHITECTURE_RULES + UI 规范核心内容（17 节），Trae IDE 每次任务自动加载
- **AGENT.md**：精简为按需加载索引，指向 .trae/rules/project_rules.md 为自动加载入口
- **ARCHITECTURE_RULES.md**：添加 .trae/rules/project_rules.md 引用说明

## 2026-06-03

### 三屏布局响应式改造
- **spacing.ts**：新增 `BREAKPOINT`（mobile 1024 / tablet 1280 / desktop 1440）和 `PANEL`（左右面板宽度配置，含 standard/compact/min/max）；`LAYOUT` 值改为引用 `PANEL`/`BREAKPOINT` 保持向后兼容
- **ThreePanel.tsx**：从死代码重写为响应式组件（132 行），内置 `useBreakpoint` Hook，4 级断点自动切换：standard(≥1440) / compact(1280-1439) / tablet(1024-1279) / mobile(<1024)；tablet/mobile 左侧面板变抽屉（translateX 动画 + 遮罩层 + PanelLeftOpen/Close 切换按钮）；mobile 右侧面板下移至 Canvas 下方
- **AnimationPage.tsx**：从手动 flex 布局 + `style={{ width: LAYOUT.leftPanelWidth }}` 迁移到 `<ThreePanel>` 组件，移除 `LAYOUT` import
- **02_UI_RULES.md §5**：从固定像素描述更新为 4 级断点表格，引用 `BREAKPOINT`/`PANEL`/`ThreePanel`
- **AGENT.md**：import 速查表新增 `BREAKPOINT`/`PANEL`

### CuttingEMF 物理量看板修复
- **physicsQuantities.ts**：`anim-cutting-emf` 分支改用 `calculateCuttingEMF` 纯函数，消除硬编码公式（原 `B*L*v` → `BLv·sinθ`，`EMF/R` → `EMF/(R+r)`）；看板新增 `θ` / `内阻 r` 显示项，EMF/I 取 `Math.abs()` 展示大小
- **对齐组件**：与 `CuttingEMF.tsx` 组件物理计算保持一致，避免参数调节时画面与看板数据矛盾
- **构建验证**：`tsc --noEmit` + `vite build` 零错误

### 颜色治理 — Token 一致性专项
- **1a 统一 import 策略**：50 个文件从 `@/theme/physicsColors` / `@/theme` / 相对路径迁移至子模块入口（`@/theme/physics`、`@/theme/colors`、`@/theme/motion`）；更新 AGENT.md / ARCHITECTURE_RULES.md / 02_UI_RULES.md 规范文档
- **1b A 类硬编码清理**：6 个文件 34 处替换（`#fff` → `colors.neutral[0]`、`#E2E8F0` → `PHYSICS_COLORS.grid` 等）
- **1c B 类颜色语义归属**：3 处（`#1e3a8a` → `DYNAMICS_COLORS.forceComponent`、`#f97316` → `PHYSICS_COLORS.electricForce`、`#c2410c` → `PHYSICS_COLORS.forceNetArrow`）
- **1d C 类场景色替换**：ACGeneration(20+)、FaradayLaw(8)、SkeletalHand(11) — 引入 `SCENE_COLORS` token
- **1e 魔法数字替换**：18 个文件 210 处（strokeWidth/fontSize/strokeDasharray → `STROKE`/`FONT`/`DASH` token）
- **规范变更**：删除"导入必须显式写出后缀"规则（与 Vite/TS bundler 模式冲突）；import 路径改为"子模块优先，统一入口仍可用"

## 2026-06-02

### 右手定则手性认知偏差修正
- **架构重构**：废弃 `SkeletalHand.tsx` 中基于 `mirrorX` 的对称几何镜像逻辑，改为解耦的独立手性骨骼模型体系
- **视觉修正**：`Palm` 组件根据物理驱动状态 (`isBack`) 动态渲染掌心/手背文字标注
- **逻辑对齐**：磁场方向 (`B_out`) 与手掌渲染状态精准映射（⊗→掌心，⊙→手背）
- **架构升级**：`SkeletonHand` props 引入 `isBack` 属性，实现物理层驱动视觉渲染的无状态架构

### 右手定则手部姿态偏斜修复
- 重构 `computeHandPose` 算法，切换旋转参考系
- 从"以拇指为基准对齐"更改为"以四指平面（中指指向）为基准对齐"
- 验证修正对 `chirality` 判定逻辑的物理无损性

## 2026-05-31

### M4-1 磁场组件审查修复（10 项）
- 🔴 P0：负电荷力方向修正 / transform 插值修复
- 🟡 P1：fontSize/strokeWidth token 化 / 电荷颜色语义修正 / 粒子内文字 fill token 化 / 速度箭头视觉增强
- 🟡 P1：LorentzForce angle 参数无视觉反映（新增 θ 弧线标注 + sinθ 数值显示）、力的线段长度随 F 大小正确变化
- 🟡 P1：AmpereForce 力/电流箭头颜色混淆（electricCurrent 从 #C2410C 改为 #059669 翡翠绿）
- 🔵 P2：水平网格线 / F=0 隐藏箭头

### M4-1 电磁感应组件审查修复（10 项）
- 🔴 严重：①LenzsLaw 感应磁场线方向反转 ②CuttingEMF EMF 方向箭头反转
- 🟡 中等：③N/S极硬编码颜色→PHYSICS_COLORS token ④硬编码 strokeWidth→CANVAS_STYLE token ⑤FaradayLaw Mode1 dΦ/dt omega 修正 ⑥线圈不随角度旋转→椭圆投影 ⑦删除未使用变量
- 🔵 轻微：⑧移除未使用 m 参数 ⑨导体棒 ping-pong 往复运动 ⑩physicsQuantities omega 同步修正

### UI 主题一致性优化（归属 [M2]）
- ①进度条撞色：慢放 secondary-500→secondary-400，新增速度文字标签
- ②光晕 token 统一：shadow.ts 新增 `glowRing` 对象，旧 masteredGlow/focusGlow 标记 deprecated
- ③动效分类体系：motion.ts 新增 celebration/stateChange/feedback 时长 token，03_MOTION_RULES 新增 §6 动效分类定义表
- ④分析页信息密度：04_ANALYSIS 新增 §2.3 单步内容上限

## 2026-05-30

### M4-1 电磁学纯函数库
- src/physics/electromagnetism.ts 实现 13 个纯函数（电场/电势/电容/欧姆/串并联/闭合电路/安培力/洛伦兹力/磁场圆周/法拉第/变压器/交流有效值），库仑力复用 dynamics.ts；新增 16 项单测

### M4-1 静电场组件
- CoulombLaw / ElectricField / ChargeInEField / Capacitor 四个 SVG 动画 + 知识点 electricity-1-1~1-4 + 全接线

### M4-1 恒定电流组件
- OhmLaw / CircuitAnalysis / ClosedCircuit 三个 SVG 动画 + 知识点 electricity-2-1~2-3 + 注册表 + 参数面板 + 物理量看板全接线

### M4-1 磁场组件
- AmpereForce / LorentzForce / ChargeInBField 三个 SVG 动画 + 知识点 electricity-3-1~3-3 + animationRegistry + 参数面板 + 物理量看板全接线

### M4-1 静电场（续）
- FieldLines（电场线+等势面）/ ElectricPotential（电势分布）；知识点 electricity-1-5~1-6

### M4-1 电磁感应组件
- FaradayLaw / LenzsLaw / CuttingEMF 三个 SVG 动画 + 知识点 electricity-4-1~4-3 + animationRegistry + 参数面板 + 物理量看板全接线

### 质量闸门治理（归属 [M2]）
- ESLint 9 flat config 迁移（#BUG-005，`npm run lint` 恢复并 0 警告）
- 动画注册表单一数据源重构（#BUG-006，消除 componentPath/animationComponents 双映射与 anim-impulse 错配）
- 动画懒加载分包（#PERF-007，主 bundle 676→596kB）

### 架构改进六项（归属 [M2]/[M3]）
- 路由级代码分割+vendor manualChunks（#PERF-008，主 bundle 596→191.89kB）
- ErrorBoundary 错误边界（#BUG-009）
- useAnimationFrame 按实例动画 Hook（#REFACTOR-010）
- useCanvasSize 消除 24 动画样板（#REFACTOR-011）
- 物理量计算下沉至 data/physicsQuantities + physics/constants 消除硬编码 g（#REFACTOR-012）
- PracticePage/WrongPage 接线激活题库与 useWrongStore 死代码（#BUG-013，完成 M3-4 错题本主体）
- 新增 15 项测试（共 48）

### M3-4 错题管理系统
- 按 ui/05_WRONGBOOK_RULES 重写 useWrongStore（WrongRecord 四态 + IndexedDB 持久化 hydrate）
- WrongPage 完整实现（统计面板/三类筛选/三种排序/已掌握折叠/右键菜单/删除二次确认/笔记 Modal/空态）
- AnalysisPage 集成加入错题本入口；新增 8 项测试（共 56）

### M3-1~M3-3 真题训练系统
- M3-1：创建 analysisRegistry.ts 题目解析注册表、problems/ 目录结构（6 个分类 22 道力学真题）
- M3-2：AnalysisPage 完整实现（题干区/分步解析区/知识链路区/步骤导航）
- M3-3：KatexFormula 组件改用 mode 属性，KaTeX CSS 与字体全部离线打包验证通过；填充 knowledgeTree.ts 力学 8 章共 35 个知识节点

### M3-5 练习与测试模式
- PracticeSession（练习/测试双模式、计时器、提示、揭示解析、自评联动 useWrongStore 自动判错判对）
- PracticePage 入口 + ScoreReport 成绩报告 + usePracticeStore（成绩历史 IndexedDB 持久化）
- 新增 4 项测试（共 60）；**[M3] 全部完成**

## 2026-06-02

### M4-1 交变电流模块（[M4-1] 收官）
- ACGeneration（3D 旋转线圈 + e-t 图像 + 中性面/最大值面切换）
- ACValues（有效值与峰值对比 + 热效应演示）
- Transformer（理想变压器匝数比 + 功率守恒验证）
- PowerTransmission（远距离输电全流程 + 线路损耗演示）
- 知识树新增 electricity-5-1~5-4，animationRegistry 新增 4 条，physicsQuantities 补 4 个 case

### M4-1.x CuttingEMF 增强
- [PR 1] 参数扩展+物理真实化 ✅
- [PR 1.1] 视觉同步修复 ✅
- [PR 2] 交互模式三态 ✅
- [PR 3] PiP 放大镜+真实右手 SVG（手性与掌心掌背逻辑彻底纠偏）✅
- [PR 4] 探索任务卡 ⏳ 待开始
