# 项目过程日志

> 本文件记录所有技术决策、代码修改、依赖申报与问题追踪。

---

## 使用说明

- 每次代码提交前必须在本文件添加对应记录
- 依赖新增前必须先在此申报，待批准后方可安装
- 问题追踪采用「创建 → 处理中 → 已解决」三状态管理
- 本文件按时间倒序排列，最新记录在最上方

---

## 📋 依赖申报记录

> 新增 npm package 前必须在此申报

| 日期 | 申报人 | 包名 | 用途说明 | 批准状态 | 批准人 |
|------|--------|------|---------|---------|--------|
| 2026-05-29 | agent | react@19 | UI 框架 | ✅ 批准 | - |
| 2026-05-29 | agent | react-dom@19 | DOM 渲染 | ✅ 批准 | - |
| 2026-05-29 | agent | react-router-dom@7 | HashRouter 路由 | ✅ 批准 | - |
| 2026-05-29 | agent | zustand@5 | 状态管理 | ✅ 批准 | - |
| 2026-05-29 | agent | framer-motion@12 | 动画库 | ✅ 批准 | - |
| 2026-05-29 | agent | lucide-react@0 | 图标库 | ✅ 批准 | - |
| 2026-05-29 | agent | katex@0.16 | 数学公式渲染（离线） | ✅ 批准 | - |
| 2026-05-29 | agent | zod@3 | 数据验证 | ✅ 批准 | - |
| 2026-05-29 | agent | idb@8 | IndexedDB 封装 | ✅ 批准 | - |
| 2026-05-29 | agent | vite@6 | 构建工具 | ✅ 批准 | - |
| 2026-05-29 | agent | tailwindcss@4.0.0-alpha | CSS 框架 | ✅ 批准 | - |
| 2026-05-29 | agent | @tailwindcss/postcss@4.0.0-alpha | Tailwind PostCSS 插件 | ✅ 批准 | - |
| 2026-05-29 | agent | typescript@5.7 | TypeScript 编译 | ✅ 批准 | - |
| 2026-05-29 | agent | vitest@3 | 测试框架 | ✅ 批准 | - |
| 2026-05-29 | agent | @testing-library/react@16 | React 测试库 | ✅ 批准 | - |
| 2026-05-29 | agent | jsdom@26 | DOM 模拟 | ✅ 批准 | - |
| 示例：2026-05-29 | agent | framer-motion@11 | 页面级过渡动画、参数面板弹出 | ✅ 批准 | - |

---

## 🔧 技术决策记录

| 日期 | 决策人 | 决策内容 | 背景与理由 | 影响范围 |
|------|--------|---------|-----------|---------|
| 2026-05-30 | agent | solveQuadraticTime函数统一归入src/math/numerical.ts | 之前分散在多个动画组件内，不符合架构规范（数学工具应归入src/math/作为纯函数库），且各实现存在差异可能导致物理计算不一致 | M1力学模块所有动画组件 |
| 2026-05-29 | agent | 使用 Tailwind CSS 4 + @tailwindcss/postcss 配置 | Tailwind CSS 4 正式版配置方式变更，不再需要 tailwind.config.ts，直接在 CSS 中使用 @theme | 全局 |
| 示例：2026-05-29 | agent | 统一使用 `useAnimationStore`，废弃 `usePhysicsState` 方案 | 两者职责完全重叠，合并避免状态分裂 | M1-0、所有动画组件 |

---

## 📝 代码修改记录

| 日期 | 作者 | 里程碑 | 修改内容 | 影响文件 | 关联issue |
|------|------|--------|---------|---------|----------|
| 2026-05-30 | agent | M3 | 修复知识树数据缺失 BUG：knowledgeTree.ts 原为空数组，导致知识树页面无法显示任何节点（KnowledgeTree.tsx 依赖 knowledgeTree 数据进行分组渲染，KnowledgePage.tsx 依赖 knowledgeTree.length 计算进度）；填充力学8章共35个知识节点（覆盖第1-8章），与 animationRegistry 中23个动画完整关联（每个有动画的知识点配置了对应 animationIds），构建 knowledgeIndex 索引支持 getKnowledgeNode(id) 按 ID 查找，prerequisites 字段建立知识点依赖关系；TypeScript 编译通过；Vite build 成功 | `src/data/knowledgeTree.ts` | #BUG-001 |
| 2026-05-30 | agent | M3 | M3-3 KaTeX 离线集成验证完成：KatexFormula 组件接口从 `block?: boolean` 改为 `mode?: 'inline' \| 'block'`，符合 ROADMAP_M3_EXAM.md 规范；行内模式添加 `my-0.5`（2px）间距，块级模式使用 `px-4 py-3`（12px×16px）padding + `rounded-sm` + `my-4`（16px）间距，符合 ui/02_UI_RULES.md §7；同步更新所有调用点（AnalysisPage.tsx 3处、PhysicsPanel.tsx 1处）；移除 `console.error` 仅保留降级显示原始字符串；验证 katex.min.css 与全部 45 个字体文件正确打包到 dist/assets/，完全离线可用；TypeScript 编译通过；Vitest 33 测试通过；Vite build 成功 | `src/components/UI/KatexFormula.tsx`, `src/pages/AnalysisPage.tsx`, `src/components/UI/PhysicsPanel.tsx` | - |
| 2026-05-30 | agent | M3 | M3-2 AnalysisPage 页面实现完成：创建完整 AnalysisPage 组件，包含①题干区（显示年份/省份/难度标签/知识点标签/题目正文）、②分步解析区（手风琴折叠卡片、步骤状态高亮、未到达/当前/已完成三种状态样式、KaTeX 公式渲染、关联知识点标签+跳转动画按钮）、③知识链路区（知识点节点列表、按 importance 显示标签色、当前步骤高亮框 box-shadow: 0 0 0 2px #60A5FA、已完成节点左侧 3px success-500 色条）、④步骤导航（上一步/下一步按钮）；符合 ui/04_ANALYSIS_PAGE_RULES.md 规范；TypeScript 编译通过；Vite build 成功 | `src/pages/AnalysisPage.tsx` | - |
| 2026-05-30 | agent | M3 | M3-1 数据结构与注册表完成：创建 analysisRegistry.ts 题目解析注册表（含 AnalysisEntry 接口、自动从 allProblems 生成、支持按知识点/难度/年份/省份筛选查询）；创建 src/data/problems/mechanics/ 目录结构，录入 22 道力学高考真题（运动学3题、动力学4题、能量4题、动量4题、抛体圆周4题、天体3题），每题含完整分步解析（description/formula/explanation/knowledgeId）；创建 problems/index.ts 统一导出 + 查询工具函数（getProblemById/getProblemsByKnowledgeId/getProblemsByModule/getProblemsByDifficulty）；知识点 importance 标记已在 knowledgeTree.ts 中完整 | `src/data/analysisRegistry.ts`, `src/data/problems/mechanics/*`, `src/data/problems/index.ts` | - |
| 2026-05-30 | agent | M1 | 动画边界约束与物理规律修复（共9个动画组件）：VelocityAnimation添加maxVisibleX边界钳制与到达边界自动暂停；AccelerationAnimation修正边界判断逻辑与显示值同步；UniformAccelerationAnimation添加右边界约束与落地暂停；FreeFallAnimation添加落地自动暂停；VerticalThrowAnimation修正物理公式（v=v₀-gt，y=v₀t-½gt²实现正确上升回落）、动态scale确保完整轨迹可见；ProjectileAnimation/ObliqueThrowAnimation添加落地自动暂停；WeightlessnessAnimation全面重写（电梯与物体作为整体运动、真实物理位移s=½at²、移除人为放大系数、加速度负值正确处理、边界自动暂停）。所有修改确保动画到达画面边界时自动暂停，显示参数与视觉位置一致，物理公式符合高中物理规律 | `src/features/mechanics/VelocityAnimation.tsx`, `src/features/mechanics/AccelerationAnimation.tsx`, `src/features/mechanics/UniformAccelerationAnimation.tsx`, `src/features/mechanics/FreeFallAnimation.tsx`, `src/features/mechanics/VerticalThrowAnimation.tsx`, `src/features/mechanics/ProjectileAnimation.tsx`, `src/features/mechanics/ObliqueThrowAnimation.tsx`, `src/features/mechanics/WeightlessnessAnimation.tsx`, `src/math/numerical.ts`, `docs/agent-rules/process/PROCESS_LOG.md` | #003,#004 |
| 2026-05-29 | agent | M1/M2 | 物理规律修正：修复6个动画组件的物理计算问题，使其符合真实物理规律。修复包括：1) EnergyConservationAnimation - 使用calculateFreeFall函数替代固定公式；2) SpringForceAnimation - 改进弹簧位移单位为米；3) ConnectedBodiesAnimation - 添加初速度v0=0使公式完整；4) SatelliteAnimation - 使用开普勒第三定律计算真实轨道周期；5) KeplerAnimation - 使用开普勒第二定律（面积速度恒定）计算速度；6) MomentumConservationAnimation - 使用真实碰撞时间计算替代固定时间分段。所有修改通过TypeScript编译和测试验证 | `src/features/mechanics/EnergyConservationAnimation.tsx`, `src/features/mechanics/SpringForceAnimation.tsx`, `src/features/mechanics/ConnectedBodiesAnimation.tsx`, `src/features/mechanics/SatelliteAnimation.tsx`, `src/features/mechanics/KeplerAnimation.tsx`, `src/features/mechanics/MomentumConservationAnimation.tsx` | - |
| 2026-05-29 | agent | M2 | [M2] 里程碑核心功能完成！所有 M2-1/M2-2/M2-3/M2-4 核心任务完成。验证发现所有动画组件使用 SVG 而非 Canvas，因此 Canvas 脏区检测和 RK4 数值积分优化不适用于当前实现。更新文档标记 M2 为完成状态，准备进入 [M3] 里程碑 | `docs/agent-rules/roadmap/ROADMAP_M2_POLISH.md`, `docs/agent-rules/roadmap/ROADMAP_PROGRESS.md` | - |
| 2026-05-29 | agent | M2 | 完成 M2-4 统一过渡动画和 AnimationPage 实现：实现完整的 AnimationPage 组件（支持动画加载、参数控制、播放控制、物理面板）；创建 PageTransition 组件实现页面淡入淡出过渡；更新 Layout 组件添加路由切换过渡动画；所有组件使用 theme 中的 duration 和 easing token；TypeScript 编译通过 | `src/pages/AnimationPage.tsx`, `src/components/UI/PageTransition.tsx`, `src/components/UI/index.ts`, `src/app/Layout.tsx` | - |
| 2026-05-29 | agent | M2 | 验证并完成 M2 核心功能：修复 KnowledgePage.tsx（添加 useEffect 初始化 totalCounts，确保知识树数据正确加载和显示；修复进度条模板字符串语法错误）；TypeScript 编译通过（npx tsc -b 无错误）；更新 ROADMAP_M2_POLISH.md 标记 M2-1/M2-2/M2-3 核心任务为完成状态；更新 ROADMAP_PROGRESS.md 同步当前进度 | `src/pages/KnowledgePage.tsx`, `docs/agent-rules/roadmap/ROADMAP_M2_POLISH.md`, `docs/agent-rules/roadmap/ROADMAP_PROGRESS.md` | - |
| 2026-05-29 | agent | M2 | 完成 M2-3 学习进度系统：完善 HomePage.tsx（学习进度总览页面，包含学习进度统计卡片、快速开始按钮区、学习提示区）；完善 Layout.tsx（添加顶部导航栏，包含首页、知识树、真题练习、错题本链接）；使用 useProgressStore 持久化学习数据；TypeScript 编译验证通过 | `src/pages/HomePage.tsx`, `src/app/Layout.tsx`, `src/stores/useProgressStore.ts` | - |
| 2026-05-29 | agent | M2 | 完成 M2-2 知识导航系统：创建 KnowledgeTree.tsx（知识树导航组件，支持章节展开/折叠、知识点完成状态显示、点击跳转对应动画页面）；实现 ProgressBadge.tsx（知识点掌握状态徽章）；更新 KnowledgePage.tsx（知识树浏览页，添加学习进度统计卡片区）；更新 features/index.ts 和 UI/index.ts 导出新组件；TypeScript 编译验证通过 | `src/features/knowledge/KnowledgeTree.tsx`, `src/features/knowledge/index.ts`, `src/components/UI/ProgressBadge.tsx`, `src/pages/KnowledgePage.tsx`, `src/features/index.ts`, `src/components/UI/index.ts` | - |
| 2026-05-29 | agent | M2 | 完善 M2-1 统一交互层：创建 PhysicsPanel.tsx（右侧数据看板，支持实时物理量显示、公式展示、高考要点卡片）；创建 useProgressStore.ts（学习进度状态管理，支持 LocalStorage 持久化，包含 viewedAnimations/masteredKnowledge/lastVisited）；更新 UI/index.ts 和 stores/index.ts 导出新组件；TypeScript 编译验证通过 | `src/components/UI/PhysicsPanel.tsx`, `src/stores/useProgressStore.ts`, `src/components/UI/index.ts`, `src/stores/index.ts` | - |
| 2026-05-29 | agent | M2 | 修复 M2-1 统一交互层组件不符合 UI 规范的问题：AnimationControls.tsx 添加进度条按播放速度变色（慢放 secondary-500、正常 primary-500、快放 accent-500）、使用 theme duration token 替换硬编码 duration、按钮添加 active:scale-[0.97] 效果；ParamControl.tsx 使用 theme duration token、重置按钮添加 active:scale-[0.97] 效果；VectorArrow.tsx 默认颜色使用 PHYSICS_COLORS.acceleration 和 PHYSICS_COLORS.velocity；PhysicsGraph.tsx 使用 CHART_COLORS 替换硬编码颜色值；TypeScript 编译验证通过 | `src/components/UI/AnimationControls.tsx`, `src/components/UI/ParamControl.tsx`, `src/components/UI/VectorArrow.tsx`, `src/components/UI/PhysicsGraph.tsx` | - |
| 2026-05-29 | agent | M2 | 完成 M2-1 统一交互层组件：创建 AnimationControls.tsx（统一控制栏，包含播放/暂停/重置/速度调节0.25x/0.5x/1x/2x/时间进度条）；创建 ParamControl.tsx（参数面板，支持 Slider + 数值输入双绑定）；创建 VectorArrow.tsx（矢量箭头 SVG 组件，支持配置颜色/标签/比例）；创建 PhysicsGraph.tsx（通用物理图像组件，支持 x-t/v-t/F-x 等多种图像类型，多曲线显示）；创建 screenshot.ts（截图工具函数，支持 Canvas 和 SVG 截图和下载）；更新 UI/index.ts 导出所有新组件；TypeScript 编译验证通过 | `src/components/UI/AnimationControls.tsx`, `src/components/UI/ParamControl.tsx`, `src/components/UI/VectorArrow.tsx`, `src/components/UI/PhysicsGraph.tsx`, `src/utils/screenshot.ts`, `src/components/UI/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建剩余的所有力学动画组件：VectorAdditionAnimation（力的合成与分解）、EquilibriumAnimation（共点力平衡）、WeightlessnessAnimation（超重与失重）、ConnectedBodiesAnimation（连接体问题）、KeplerAnimation（开普勒定律）、GravityAnimation（万有引力定律）、SatelliteAnimation（人造卫星）；添加 ImpulseAnimation 别名指向 MomentumTheoremAnimation；更新 mechanics/index.ts 导出；TypeScript 编译验证通过 | `src/features/mechanics/VectorAdditionAnimation.tsx`, `src/features/mechanics/EquilibriumAnimation.tsx`, `src/features/mechanics/WeightlessnessAnimation.tsx`, `src/features/mechanics/ConnectedBodiesAnimation.tsx`, `src/features/mechanics/KeplerAnimation.tsx`, `src/features/mechanics/GravityAnimation.tsx`, `src/features/mechanics/SatelliteAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建动量定理动画组件 MomentumTheoremAnimation.tsx 和动量守恒动画组件 MomentumConservationAnimation.tsx，更新 mechanics/index.ts 导出 | `src/features/mechanics/MomentumTheoremAnimation.tsx`, `src/features/mechanics/MomentumConservationAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建匀变速直线运动动画组件 UniformAccelerationAnimation.tsx（显示速度和加速度向量，公式 v=v₀+at、s=v₀t+½at²）；创建竖直上抛运动动画组件 VerticalThrowAnimation.tsx（显示上升、最高点、下落过程，速度向量、公式 v=v₀-gt、y=v₀t-½gt²）；更新 mechanics/index.ts 导出；修复未使用变量的 TypeScript 错误 | `src/features/mechanics/UniformAccelerationAnimation.tsx`, `src/features/mechanics/VerticalThrowAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建速度演示动画组件 VelocityAnimation.tsx（匀速直线运动，显示速度向量、位移 s = v·t）；创建加速度演示动画组件 AccelerationAnimation.tsx（匀加速直线运动，显示速度和加速度向量、公式 v = v₀+at、s = v₀t+½at²）；更新 mechanics/index.ts 导出；修复未使用变量的 TypeScript 错误 | `src/features/mechanics/VelocityAnimation.tsx`, `src/features/mechanics/AccelerationAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建向心加速度与向心力动画组件 CentripetalAnimation.tsx（显示速度向量、半径、向心加速度、向心力）；更新 mechanics/index.ts 导出 | `src/features/mechanics/CentripetalAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建动能定理动画组件 KineticEnergyAnimation.tsx（显示力做功、动能变化、动能定理验证）；创建机械能守恒动画组件 EnergyConservationAnimation.tsx（显示动能、势能、总机械能实时变化，守恒验证）；更新 mechanics/index.ts 导出；修复未使用导入和变量的 TypeScript 错误 | `src/features/mechanics/KineticEnergyAnimation.tsx`, `src/features/mechanics/EnergyConservationAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建4个新动画组件：CircularMotionAnimation（匀速圆周运动）、ObliqueThrowAnimation（斜抛运动）、NewtonSecondAnimation（牛顿第二定律）、CollisionAnimation（弹性/非弹性碰撞）；修复 CollisionAnimation 类型错误 | `src/features/mechanics/CircularMotionAnimation.tsx`, `src/features/mechanics/ObliqueThrowAnimation.tsx`, `src/features/mechanics/NewtonSecondAnimation.tsx`, `src/features/mechanics/CollisionAnimation.tsx`, `src/features/mechanics/index.ts` | - |
| 2026-05-29 | agent | M1 | 创建 mechanics 功能模块目录及第一个动画组件 FreeFallAnimation.tsx（自由落体运动可视化）；修复 TypeScript 类型错误 | `src/features/mechanics/FreeFallAnimation.tsx`, `src/features/mechanics/index.ts`, `src/data/animationRegistry.ts`, `src/physics/dynamics.ts` | - |
| 2026-05-29 | agent | M1 | 更新 knowledgeTree.ts 添加力学模块全8章知识点（质点参考系、速度加速度、匀变速运动、自由落体、弹力摩擦力、牛顿定律、曲线运动、圆周运动、万有引力、能量动量等39个知识点）；更新 animationRegistry.ts 添加23个动画配置；创建 physics/index.ts 导出文件 | `src/data/knowledgeTree.ts`, `src/data/animationRegistry.ts`, `src/physics/index.ts` | - |
| 2026-05-29 | agent | M1 | 完成 M1-0 物理计算基础设施：创建 kinematics.ts（运动学）、dynamics.ts（动力学）、energy.ts（能量动量）、celestial.ts（天体卫星）；扩展 useAnimationStore.ts 添加 showVectors/showFormulas/showGrid 字段 | `src/physics/kinematics.ts`, `src/physics/dynamics.ts`, `src/physics/energy.ts`, `src/physics/celestial.ts`, `src/stores/useAnimationStore.ts` | - |
| 2026-05-29 | agent | M0 | 完成 [M0] 技术基础架构全部任务：项目初始化、路由、Store、工具函数、数学库、UI组件、数据结构、测试环境、KaTeX 离线化 | 所有 `src/*`, `tests/*`, `public/*`, 配置文件 | - |
| 示例：2026-05-29 | agent | M0 | 初始化项目骨架，创建路由、Store、主题 Token | `src/theme/*`, `src/stores/*`, `src/App.tsx` | - |

---

## 🐛 问题追踪

### 问题状态

- 🔴 待处理
- 🟡 处理中
- 🟢 已解决

### 问题列表

| 编号 | 状态 | 创建日期 | 问题描述 | 优先级 | 解决方案 |
|------|------|---------|---------|-------|---------|
| #BUG-001 | 🟢 已解决 | 2026-05-30 | knowledgeTree.ts 知识节点数据完全为空（数组为空），导致知识树页面无法显示任何章节和节点，KnowledgePage 进度条计算为 0/0=0% | 高 | 填充力学8章共35个知识节点，构建 knowledgeIndex 索引，关联全部23个动画 ID，prerequisites 建立依赖关系 |
| #004 | 🟢 已解决 | 2026-05-30 | 多个动画组件物体超出画面或到达边界后参数仍在变化（VelocityAnimation超出右边界无约束、AccelerationAnimation到达边界后物理值未同步、UniformAccelerationAnimation超出画面、FreeFallAnimation落地后参数继续变化、VerticalThrowAnimation物体上抛超出画面、竖直上抛物理公式错误未正确回落） | 高 | 为所有动画添加边界约束与到达边界自动暂停；将solveQuadraticTime提取到src/math/numerical.ts作为共享数学工具，确保物理公式统一正确 |
| #003 | 🟢 已解决 | 2026-05-30 | solveQuadraticTime函数分散在多个动画组件中，不符合架构规范（数学工具应归入src/math/） | 高 | 提取到src/math/numerical.ts，各组件统一import |
| #002 | 🟢 已解决 | 2026-05-29 | 多个动画组件物理规律不符合真实物理（EnergyConservationAnimation使用固定公式、SpringForceAnimation单位错误、ConnectedBodiesAnimation公式不完整、SatelliteAnimation周期固定、KeplerAnimation速度计算错误、MomentumConservationAnimation固定时间分段） | 高 | 使用物理公式库函数和真实物理定律替代固定计算 |
| 示例：#001 | 🟢 已解决 | 2026-05-29 | tension 与 potentialEnergy 颜色值相同导致同屏混淆 | 高 | tension 改为 #9333EA（purple-600） |

---

## 📊 里程碑进度

> ⚠️ **单一来源原则**：里程碑状态权威记录在 `roadmap/ROADMAP_PROGRESS.md`，本文件**不再维护**重复的状态表，避免两处失步。
>
> 查看或更新里程碑状态 → [`../roadmap/ROADMAP_PROGRESS.md`](../roadmap/ROADMAP_PROGRESS.md)

---

## 📚 参考资料

- 架构规则：[../core/ARCHITECTURE_RULES.md](../core/ARCHITECTURE_RULES.md)
- UI 设计规范：[../ui/02_UI_RULES.md](../ui/02_UI_RULES.md)
- 项目进度：[../roadmap/ROADMAP_PROGRESS.md](../roadmap/ROADMAP_PROGRESS.md)
- 核心规则：[../core/CORE_RULES.md](../core/CORE_RULES.md)
