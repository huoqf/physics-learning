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
| 2026-05-30 | agent | @eslint/js@^9 | ESLint 9 flat config 的 js.configs.recommended 基础规则集（须锁 ^9，裸装会拉 v10 与 eslint@9 冲突） | ✅ 批准 | - |
| 2026-05-30 | agent | globals@^15 | flat config 中声明 browser/node/vitest 全局变量 | ✅ 批准 | - |
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
| 2026-05-30 | agent | M4 | 修复 Capacitor 平行板电容器动画（#BUG-015）：原实现几何错误——plateH（本应表示面积对应的极板尺寸）被当作垂直偏移量，致两板实际间距同时受 d 和 S 影响、且 S 不改变极板真实大小；并缺少最高频考点。重写：①几何修正——间距 gapPx 仅由 d 决定、板宽 plateW 仅由 S 决定（正对面积），介质填隙、匀强电场线随板宽；②新增「接电源(U不变)/断开电源(Q不变)」模式切换（connected 参数）——接源时 Q=CU、E=U/d 随 d 变；断源时 Q 守恒、U=Q/C、E=Q/(εS) 与 d 无关（默认状态充电后断开为电荷基准）；③电路示意含电池/断开开关符号，看板显示 C/U/Q/E 与情形说明。同步更新 registry 默认参数(connected:1)、AnimationPage 参数面板、physicsQuantities。新增测试 2 项（共 87）。验证：lint 0 警告 / tsc 通过 / vitest 87 通过 / build 成功 | `src/features/electromagnetism/Capacitor.tsx`, `src/data/animationRegistry.ts`, `src/pages/AnimationPage.tsx`, `src/data/physicsQuantities.ts`, `tests/data/physicsQuantities.test.ts` | #BUG-015 |
| 2026-05-30 | agent | M4 | 修复 ChargeInEField 不符合高中物理（#BUG-014）：原实现 x/y 用两套相差 10 万倍的比例致轨迹严重变形；默认参数 a≈4000m/s²、vy 涨到数千 m/s（远超 v0）、竖直位移上千米；且无打板判定靠 Math.min 生硬钳位。改为高中经典偏转电场（示波管）模型：真实几何 L=0.4m/D=0.2m，统一单一 px/m 比例尺（抛物线几何正确），终止条件二选一（射出电场 x=L 或 打在极板 |y|=D/2），vx/vy 同一速度比例尺、合速度即轨迹切线；参数单位 m 改为 mg、区间标定到可见且有界偏转（默认 E=10×10³N/C,q=5μC,m=200mg,v0=20 → a=250m/s²,偏转5cm,vy=5<v0,θ=14°），加 TIME_SCALE=0.02 慢放。同步更新 animationRegistry 默认参数、AnimationPage 参数面板（m: mg）、physicsQuantities（含结局判定）。新增/调整测试 2 项（共 85）。验证：lint 0 警告 / tsc 通过 / vitest 85 通过 / build 成功 | `src/features/electromagnetism/ChargeInEField.tsx`, `src/data/animationRegistry.ts`, `src/pages/AnimationPage.tsx`, `src/data/physicsQuantities.ts`, `tests/data/physicsQuantities.test.ts` | #BUG-014 |
| 2026-05-30 | agent | M4 | M4-1 恒定电流组件（分步推进第 3 步）：新增 src/features/electromagnetism/ 3 个 SVG 动画——OhmLaw（U-I 图像，过原点直线斜率 1/R，工作点投影，calculateOhmLaw）、CircuitAnalysis（串/并联可切换 mode，电路示意 + 各元件 I/U 标注，calculateSeries/ParallelResistance）、ClosedCircuit（I=EMF/(R+r)、路端电压、效率条，calculateClosedCircuit）；knowledgeTree 新增电磁学第2章知识点 electricity-2-1~2-3（importance gaokao），animationRegistry 新增 3 条 lazy 注册（anim-ohm-law/circuit-analysis/closed-circuit），AnimationPage 补 3 组参数面板，physicsQuantities 补 3 个 case（调 physics 纯函数）；全部遵循 useCanvasSize + theme token 约定，未引入新依赖。新增 physicsQuantities 测试 3 项（共 83）。验证：lint 0 警告 / tsc 通过 / vitest 83 通过 / build 成功（3 动画各自独立 chunk） | `src/features/electromagnetism/OhmLaw.tsx`, `src/features/electromagnetism/CircuitAnalysis.tsx`, `src/features/electromagnetism/ClosedCircuit.tsx`, `src/features/electromagnetism/index.ts`, `src/data/knowledgeTree.ts`, `src/data/animationRegistry.ts`, `src/pages/AnimationPage.tsx`, `src/data/physicsQuantities.ts`, `tests/data/physicsQuantities.test.ts` | M4-1 |
| 2026-05-30 | agent | M4 | M4-1 静电场组件（分步推进第 2 步）：创建 src/features/electromagnetism/ 4 个 SVG 动画组件——CoulombLaw（库仑力，同号斥/异号吸，调电量与间距，复用 calculateCoulombForce）、ElectricField（点电荷放射状电场线 + 试探点场强，calculateElectricField）、ChargeInEField（类平抛：平行板 + 匀强电场线 + 轨迹 + 速度分量，a=qE/m，到达板端自动暂停，用 useAnimationStore 时间驱动）、Capacitor（C=εS/d 含介质 εᵣ，实时 C 与 Q=CU，calculateCapacitor）；全部遵循 useCanvasSize + theme token + showVectors/showFormulas/showGrid 约定；knowledgeTree 新增电磁学第1章 4 个知识点（electricity-1-1~1-4，importance gaokao/core），animationRegistry 新增 4 条 lazy 注册（anim-coulomb-law/electric-field/charge-in-efield/capacitor），AnimationPage 补 4 组参数面板，physicsQuantities 补 4 个 case（调用 physics 纯函数）；KnowledgeTree 章节排序改为先按模块（力学→电磁→热→光→原子）再按章号，避免电磁第1章与力学第1章混排；未引入新依赖（电场线密集可视化时再评估 PixiJS）。新增 physicsQuantities 测试 4 项（共 80）。验证：lint 0 警告 / tsc 通过 / vitest 80 通过 / build 成功（4 个动画各自独立 chunk） | `src/features/electromagnetism/CoulombLaw.tsx`, `src/features/electromagnetism/ElectricField.tsx`, `src/features/electromagnetism/ChargeInEField.tsx`, `src/features/electromagnetism/Capacitor.tsx`, `src/features/electromagnetism/index.ts`, `src/features/index.ts`, `src/data/knowledgeTree.ts`, `src/data/animationRegistry.ts`, `src/pages/AnimationPage.tsx`, `src/data/physicsQuantities.ts`, `src/features/knowledge/KnowledgeTree.tsx`, `tests/data/physicsQuantities.test.ts` | M4-1 |
| 2026-05-30 | agent | M4 | M4-1 电磁学纯函数库（分步推进第 1 步）：创建 src/physics/electromagnetism.ts，实现 13 个 SI 单位纯函数——electricField(E=kq/r²)、electricPotential(V=kq/r)、capacitor(C=εS/d)、ohmLaw(I=U/R)、series/parallelResistance（并联含空数组/零电阻保护）、closedCircuit(I/U端/P出/P总/η)、ampereForce(BILsinθ)、lorentzForce(qvBsinθ)、chargeInMagField(r=mv/qB,T,ω，含除零保护)、faradayEMF(NΔΦ/Δt)、transformer(理想变压器 U/I)、acRMS(峰值/√2)；库仑力复用 dynamics.ts 不重复定义（遵守规范）；physics/index.ts 导出；新增 16 项单测（共 76）。未引入新依赖（PixiJS 留待电磁场粒子组件时申报）。验证：lint 0 警告 / tsc 通过 / vitest 76 通过 / build 成功 | `src/physics/electromagnetism.ts`, `src/physics/index.ts`, `tests/physics/electromagnetism.test.ts` | M4-1 |
| 2026-05-30 | agent | M3 | 完成 M3-5 练习与测试模式（[M3] 收官）：①因题目为分步解析式（无客观选项/标准答案）采用自评式答题——PracticeSession 会话组件支持练习模式（提示按钮+随时看解析）与测试模式（正计时可暂停+提交后才揭示），自评对错联动 useWrongStore（答错 addWrong/答对 recordCorrect），并激活此前未接线的 useProblemStore 管理会话状态（currentStep/currentProblem）；②新增 usePracticeStore 成绩历史 store（ScoreRecord：mode/total/correct/durationSec/wrongProblemIds/byModule，经 storage IndexedDB 持久化，最多 50 条）；③ScoreReport 成绩报告组件（总分+正确率+用时、各模块正确率条形图、薄弱知识点来自错题关联知识点并一键跳转复习动画）；④PracticePage 重写为入口（模式选择卡、按模块/难度筛选、成绩历史列表、浏览全部真题），mode 经 ?mode= query 驱动会话。新增 usePracticeStore 测试 4 项（共 60）。验证：lint 0 警告 / tsc 通过 / vitest 60 通过 / build 成功 | `src/stores/usePracticeStore.ts`, `src/stores/index.ts`, `src/features/practice/PracticeSession.tsx`, `src/features/practice/index.ts`, `src/features/index.ts`, `src/components/UI/ScoreReport.tsx`, `src/components/UI/index.ts`, `src/pages/PracticePage.tsx`, `tests/stores/usePracticeStore.test.ts` | M3-5 |
| 2026-05-30 | agent | M3 | 完成 M3-4 错题管理系统：①按 ui/05_WRONGBOOK_RULES 重写 useWrongStore——WrongRecord 结构（errorCount/correctStreak/status 四态/knowledgeIds/createdAt/lastAttemptTime/masteredAt/note），actions: addWrong/markViewed/recordCorrect/markMastered/addNote/removeWrong/clearAll/hydrate；连续答对≥2 自动判定已掌握；笔记 200 字上限；②IndexedDB 持久化——经 storage.setDB 写入、hydrate 从 storage.getDB 水合，刷新保持（禁止页面直接读写 IndexedDB，全部走 store）；③WrongPage 完整实现——四态 4px 色条 + 多次错误(≥3)角标、知识点标签(2+N)、统计面板(总数/未掌握/本周新增/本周掌握)、筛选(模块/难度/状态 chip 多选)、排序(最近/错误次数/难度)、已掌握折叠至底部、右键上下文菜单(标记已掌握/删除/笔记)、删除二次确认 Modal、笔记 Modal、全空+筛选无结果两种空态；④AnalysisPage 集成「加入错题本/标记已掌握」按钮，进入已收录题自动标记已查看。新增 useWrongStore 测试 8 项（共 56）。验证：lint 0 警告 / tsc 通过 / vitest 56 通过 / build 成功 | `src/stores/useWrongStore.ts`, `src/stores/index.ts`, `src/pages/WrongPage.tsx`, `src/pages/AnalysisPage.tsx`, `tests/stores/useWrongStore.test.ts` | M3-4 |
| 2026-05-30 | agent | M2/M3 | 架构改进（六项）：①代码分割(#PERF-008)——App.tsx 路由级 React.lazy+Suspense，vite manualChunks 拆 react/framer-motion/katex 三个 vendor chunk，主 bundle 596kB→191.89kB(gzip 60.9)，「>500kB」警告消除；②错误边界(#BUG-009)——新增 ErrorBoundary 组件，Layout 包裹 Outlet（resetKey=路由）+ AnimationPage 包裹动画（resetKey=动画id），单个动画/页面崩溃不再白屏全应用；③动画控制 Hook 化(#REFACTOR-010)——在 utils/animation.ts 新增按组件实例的 useAnimationFrame（遵循「动画统一入口」铁律，未在组件内裸调 rAF），AnimationPage 弃用全局单例，修复首帧时间戳为 0 的哨兵 bug；④消除 24 动画样板(#REFACTOR-011)——抽 utils/useCanvasSize Hook，24 个动画组件统一替换 getBoundingClientRect+resize 监听样板并清理无用 react 导入；⑤物理量计算下沉(#REFACTOR-012)——buildPhysicsQuantities 从 AnimationPage 巨型 switch 迁至 data/physicsQuantities.ts，统一调用 physics/ 纯函数，新增 physics/constants(GRAVITY/G/EARTH_MASS) 消除硬编码 g=9.8，新增 physics/energy 的 calculateRestitutionCollision；⑥死代码接线(#BUG-013)——PracticePage 接入 allProblems 真题列表、WrongPage 接入 useWrongStore 错题本（含空状态，对照 ui/05_WRONGBOOK_RULES），激活原先未被引用的题库数据层与 useWrongStore。新增测试：useAnimationFrame(5)、collision(3)、physicsQuantities(7)。验证：lint 0 警告 / tsc 通过 / vitest 48 通过 / build 成功且无大包警告 | `src/App.tsx`, `src/app/Layout.tsx`, `vite.config.ts`, `src/components/UI/ErrorBoundary.tsx`, `src/components/UI/index.ts`, `src/utils/animation.ts`, `src/utils/useCanvasSize.ts`, `src/utils/index.ts`, `src/pages/AnimationPage.tsx`, `src/features/mechanics/*Animation.tsx`(24), `src/data/physicsQuantities.ts`, `src/physics/constants.ts`, `src/physics/energy.ts`, `src/physics/index.ts`, `src/pages/PracticePage.tsx`, `src/pages/WrongPage.tsx`, `tests/utils/useAnimationFrame.test.tsx`, `tests/physics/collision.test.ts`, `tests/data/physicsQuantities.test.ts` | #PERF-008,#BUG-009,#REFACTOR-010,#REFACTOR-011,#REFACTOR-012,#BUG-013 |
| 2026-05-30 | agent | M2 | 质量闸门与架构治理（三合一）：①ESLint 9 flat config 迁移——新增 eslint.config.mjs（按 src(browser)/配置文件(node)/tests(vitest) 三环境分块，关闭核心 no-undef 交由 tsc 把关），删除失效的 .eslintrc.cjs，修正 lint 脚本移除 ESLint 8 的 --ext 参数，新增依赖 @eslint/js@^9 + globals@^15（须锁版本，裸装会拉 v10 与 eslint@9 冲突）；②动画注册表单一数据源重构——AnimationConfig.componentPath(死字段) 改为 Component: LazyExoticComponent，animationRegistry 改用 lazy(()=>import())，删除 AnimationPage 手写 animationComponents 双映射对象与 MechanicsAnimations 整包导入，改用 config.Component + Suspense，修正 anim-impulse 错配（指向不存在的 ImpulseAnimation → 真实 MomentumTheoremAnimation），删除 mechanics/index.ts 的 ImpulseAnimation 别名转接；③顺带修复迁移后暴露的既有报错（kinematics-sample.ts 的 \\, 转义同时修复 KaTeX 细空格渲染、AnimationPage useEffect 依赖数组补全 config）。效果：npm run lint 闸门真正生效且 0 error 0 warning；动画按需懒加载，主 bundle 676.92kB→596.10kB（gzip 193→179.66），24 个动画拆为独立异步 chunk；tsc 编译通过；Vitest 33/33；Vite build 成功 | `eslint.config.mjs`, `.eslintrc.cjs`(删), `package.json`, `src/data/types.ts`, `src/data/animationRegistry.ts`, `src/pages/AnimationPage.tsx`, `src/features/mechanics/index.ts`, `src/data/problems/mechanics/kinematics-sample.ts`, `.gitignore` | #BUG-005, #BUG-006, #PERF-007 |
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
| #BUG-015 | 🟢 已解决 | 2026-05-30 | Capacitor 平行板电容器动画几何错误：极板尺寸量(plateH)被当作垂直偏移，导致两板间距同时受 d 与 S 影响、S 不改变极板大小；且缺少接/断电源核心考点 | 高 | 几何修正（间距∝d、板宽∝S 独立）；新增接电源(U不变)/断开(Q不变)模式，展示 C/U/Q/E 随各量变化与 E 是否随 d 变 |
| #BUG-014 | 🟢 已解决 | 2026-05-30 | ChargeInEField 带电粒子在匀强电场动画不符合高中物理：x/y 比例尺相差 10 万倍致轨迹变形，默认 a≈4000m/s²、vy 达数千 m/s 远超 v0、位移上千米，且无打板判定 | 高 | 改为偏转电场（示波管）模型：真实几何 L/D、统一比例尺、射出/打板二选一终止、vx/vy 同比例合成切线、参数区间标定到可见有界偏转 |
| #BUG-013 | 🟢 已解决 | 2026-05-30 | 死代码/占位不符：PracticePage、WrongPage 为空标题占位，但导航/首页卡片均指向它们；题库数据层(data/problems)与 useWrongStore 完全未被引用 | 中 | PracticePage 接入 allProblems 真题列表（难度筛选+跳转解析），WrongPage 接入 useWrongStore 错题本（卡片+空状态，对照 ui/05_WRONGBOOK_RULES）；useProblemStore 留待 M3-5 答题交互 |
| #REFACTOR-012 | 🟢 已解决 | 2026-05-30 | buildPhysicsQuantities 近 300 行巨型 switch 位于 AnimationPage，重复实现 physics/ 已有纯函数且硬编码 g=9.8（违反禁止魔法数字铁律） | 中 | 下沉至 data/physicsQuantities.ts，统一调用 physics/ 纯函数；新增 physics/constants(GRAVITY/G/EARTH_MASS) 与 calculateRestitutionCollision |
| #REFACTOR-011 | 🟢 已解决 | 2026-05-30 | 24 个动画组件重复 getBoundingClientRect+resize 监听样板 | 低 | 抽 utils/useCanvasSize Hook，24 组件统一替换并清理无用 react 导入 |
| #REFACTOR-010 | 🟢 已解决 | 2026-05-30 | globalAnimationController 全局单例：只能驱动一个动画、StrictMode 下竞态、难测 | 中 | utils/animation.ts 新增按实例的 useAnimationFrame（仍为动画统一入口，符合铁律），AnimationPage 改用；修复首帧时间戳为 0 的哨兵 bug |
| #BUG-009 | 🟢 已解决 | 2026-05-30 | 无错误边界，任一动画/页面渲染抛错会白屏整个应用 | 中 | 新增 ErrorBoundary 组件，Layout 包裹 Outlet（resetKey=路由）+ AnimationPage 包裹动画（resetKey=动画id） |
| #PERF-008 | 🟢 已解决 | 2026-05-30 | 路由与页面零分割，重型依赖(katex/framer-motion)进主包 | 中 | App.tsx 路由级 React.lazy+Suspense，vite manualChunks 拆 react/framer-motion/katex；主 bundle 596kB→191.89kB，消除大包警告 |
| #PERF-007 | 🟢 已解决 | 2026-05-30 | 全部代码打进单一 ~677kB chunk，AnimationPage 静态导入全部 24 个动画组件，首页/知识树页仅为数个数也连带打包全部动画 | 中 | animationRegistry 改用 lazy(()=>import())，AnimationPage 用 Suspense 包裹，动画按需加载；主 bundle 降至 596kB，24 动画拆为独立异步 chunk |
| #BUG-006 | 🟢 已解决 | 2026-05-30 | 动画注册表存在双映射：animationRegistry.componentPath(死字段，无人读取) 与 AnimationPage 手写 animationComponents(实际使用) 不同步，导致 anim-impulse 的 componentPath 指向不存在的 ImpulseAnimation，靠 mechanics/index.ts 别名转接临时遮蔽 | 高 | 合并为单一数据源：componentPath→Component(lazy)，删除手写映射与别名转接，registry 直接持有组件引用 |
| #BUG-005 | 🟢 已解决 | 2026-05-30 | 项目装 ESLint 9 但配置仍为旧版 .eslintrc.cjs，npm run lint 直接报错无法运行，--max-warnings 0 质量闸门形同虚设 | 高 | 迁移到 eslint.config.mjs flat config（browser/node/vitest 三环境分块、关 no-undef），修正 lint 脚本，锁版本安装 @eslint/js@^9 + globals@^15 |
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
