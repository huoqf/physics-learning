# ROADMAP — 高中物理交互动画学习软件

&gt; 最后更新：2026-06-02

---

## ⚡ AI Agent 执行规则（每次任务必读）

1. **先读本文件**，确认当前里程碑状态与活跃任务
2. **再读对应子文件**，获取该里程碑的完整知识点列表与组件任务
3. **严格按子文件的任务清单执行**，完成后更新对应子文件中的 `[x]` 状态
4. **禁止跨里程碑超前实现**（除非本文件明确标注 can-start）
5. **任务结束后**同步更新本文件里程碑状态表 + `process/PROCESS_LOG.md`
6. **里程碑命名唯一来源**：本文件，格式 `[M0]`–`[M4]`，禁止自然语言替代

---

## 📊 里程碑总览

| 里程碑 | 名称 | 状态 | 依赖 | 子文件 |
|--------|------|------|------|--------|
| [M0] | 技术基础架构 | ✅ 已完成 | — | `roadmap/ROADMAP_M0_FOUNDATION.md` |
| [M1] | 力学模块（全8章） | ✅ 已完成 | [M0] | `roadmap/ROADMAP_M1_MECHANICS.md` |
| [M2] | 力学完善 + 导航系统 | ✅ 已完成 | [M1] | `roadmap/ROADMAP_M2_POLISH.md` |
| [M3] | 真题训练系统 | ✅ 已完成 | [M1] | `roadmap/ROADMAP_M3_EXAM.md` |
| [M4] | 电磁/热/光/原子模块 | 🚧 进行中 | [M2] | `roadmap/ROADMAP_M4_PHYSICS.md` |

**状态标记**：⏳ 待开始 / 🚧 进行中 / ✅ 已完成 / ⛔ 阻塞

---

## 🎯 当前活跃任务

> 更新此区域反映每次任务的工作焦点

- **当前里程碑**：[M4] 电磁/热/光/原子模块 🚧 进行中（分步推进）
- **M4-1 电磁学纯函数库完成（2026-05-30）**：src/physics/electromagnetism.ts 实现 13 个纯函数（电场/电势/电容/欧姆/串并联/闭合电路/安培力/洛伦兹力/磁场圆周/法拉第/变压器/交流有效值），库仑力复用 dynamics.ts；新增 16 项单测
- **M4-1 静电场组件完成（2026-05-30）**：CoulombLaw / ElectricField / ChargeInEField（类平抛，自动暂停）/ Capacitor 四个 SVG 动画 + 知识点 electricity-1-1~1-4 + 全接线；KnowledgeTree 按模块分组排序。新增 4 项测试
- **M4-1 恒定电流组件完成（2026-05-30）**：OhmLaw（U-I 图像）/ CircuitAnalysis（串/并联可切换）/ ClosedCircuit（闭合电路+效率）三个 SVG 动画 + 知识点 electricity-2-1~2-3 + 注册表 + 参数面板 + 物理量看板全接线。新增 3 项测试（共 83）。下一步：磁场 / 电磁感应等组件
- **M4-1 磁场组件完成（2026-05-31）**：AmpereForce（F=BIL·sinθ）/ LorentzForce（F=qvB·sinθ，力方向随 q 正负翻转、v 方向可调）/ ChargeInBField（圆周运动 r=mv/qB，实时轨迹+速度/力矢量同步旋转）三个 SVG 动画 + 知识点 electricity-3-1~3-3 + animationRegistry 3 条 lazy 注册 + 参数面板 + 物理量看板全接线；主题新增 positiveCharge/negativeCharge 颜色 token；组件审查修复 10 项问题（P0：负电荷力方向 / transform 插值；P1：fontSize/strokeWidth token 化 / 电荷颜色语义修正 / 粒子内文字 fill token 化 / 速度箭头视觉增强；P2：水平网格线 / F=0 隐藏箭头）。验证：lint 0 警告 / tsc 通过 / build 成功（3 动画各自独立 chunk）
- **M4-1 磁场组件审查修复（2026-05-31）**：LorentzForce 修复 angle 参数无视觉反映（新增 θ 弧线标注 + sinθ 数值显示）、力的线段长度随 F 大小正确变化（F/F_max 相对比例计算，钳位 [15,120]）；AmpereForce 修复力/电流箭头颜色混淆（electricCurrent 从 #C2410C 改为 #059669 翡翠绿，与 forceNet 橙色 #EA580C 区分）；影响范围验证确认新颜色不与 elasticForce 及其他电磁学组件混淆（elasticForce 仅力学、electricCurrent 仅电磁学，不同屏）。验证：lint 0 警告 / tsc 通过 / build 成功
- **M4-1 静电场完成（2026-05-31）**：新增 FieldLines（电场线+等势面，同种/异种电荷可切换，电场线从正到负，等势面虚线圆与电场线垂直）/ ElectricPotential（电势分布，V=kq/r，不同电势值用颜色渐变环标注，沿电场线方向电势降低可视化）；知识点 electricity-1-5~1-6 + animationRegistry + 参数面板 + 物理量看板全接线。验证：lint 0 警告 / tsc 通过 / build 成功（36 个动画 chunk）
- **M4-1 电磁感应组件完成（2026-05-31）**：FaradayLaw（法拉第电磁感应定律 EMF=N·dΦ/dt，三种磁通量变化方式可切换：B正弦变化/角度旋转/S变化，线圈匝数可视化+磁通量箭头+感应电流方向指示）/ LenzsLaw（楞次定律，磁铁插入/拔出线圈动画，N/S极可切换，原磁场线与感应磁场线分别标注，实时状态显示）/ CuttingEMF（导体切割磁感线 EMF=BLv，导轨模型，导体棒运动+电阻回路，速度/安培力/感应电动势矢量标注）；知识点 electricity-4-1~4-3 + animationRegistry 3 条 lazy 注册 + 参数面板 + 物理量看板全接线。验证：lint 0 警告 / tsc 通过 / build 成功（39 个动画 chunk）
- **M4-1 交变电流模块完成（2026-06-02）**：[M4-1]收官！①ACGeneration 交变电流产生——线圈在匀强磁场中转动，3D 旋转视觉，e-t 图像，Em=NBSω 实时计算，中性面/最大值面切换；②ACValues 有效值与峰值——V_rms=V_peak/√2，交流电vs直流电热效应对比，可调节 V_peak/R/U_dc；③Transformer 理想变压器——匝数比 n1/n2 可调，U1:U2=n1:n2，I1:I2=n2:n1，功率守恒验证；④PowerTransmission 远距离输电——升压→高压输电→降压全流程，线路损耗 P_loss=I²R，提高输电电压减少损耗演示；⑤知识树新增 electricity-5-1~5-4（4个知识点），animationRegistry 新增 anim-ac-generation/anim-ac-values/anim-transformer/anim-power-transmission，physicsQuantities 补4个case，AnimationPage 补4组参数面板。全部组件符合主题 token + useCanvasSize 规范，未引入新依赖。验证：lint 0 警告 / tsc 通过 / build 成功（36→40 个动画 chunk）
- **M4-1 电磁感应组件审查修复（2026-05-31）**：10 项问题修复——🔴严重：①LenzsLaw 感应磁场线方向反转（B_induced>0向下时线画成向上，重写起止坐标使线穿过线圈指向正确方向）；②CuttingEMF EMF方向箭头反转（B⊗+v→右手定则正电荷向上b→a，但箭头指向下，交换y1/y2修正）。🟡中等：③LenzsLaw N/S极硬编码颜色→PHYSICS_COLORS.magnetNorth/magnetSouth（新增 token）；④LenzsLaw/CuttingEMF/FaradayLaw 硬编码 strokeWidth→CANVAS_STYLE.stroke.*；⑤FaradayLaw Mode1 dΦ/dt 用 omegaAnim=0.5→实际角速度 mode1Omega=π/6≈0.524；⑥FaradayLaw Mode1 线圈不随角度旋转→coilRx=max(0.15,|cosθ|)椭圆投影；⑦删除未使用变量 Phi。🔵轻微：⑧CuttingEMF 移除未使用 m 参数（registry+paramConfigs+组件）；⑨导体棒到达右端后停止→ping-pong 往复运动+rodDirection 控制速度/安培力方向；⑩physicsQuantities FaradayLaw Mode1 omega 同步修正。验证：lint 0 警告 / tsc 通过 / build 成功
- **质量闸门治理（2026-05-30，归属 [M2]）**：完成 ESLint 9 flat config 迁移（#BUG-005，`npm run lint` 恢复并 0 警告）、动画注册表单一数据源重构（#BUG-006，消除 componentPath/animationComponents 双映射与 anim-impulse 错配）、动画懒加载分包（#PERF-007，主 bundle 676→596kB）。详见 `process/PROCESS_LOG.md`
- **架构改进六项（2026-05-30，归属 [M2]/[M3]）**：路由级代码分割+vendor manualChunks（#PERF-008，主 bundle 596→191.89kB，消除大包警告）、ErrorBoundary 错误边界（#BUG-009）、useAnimationFrame 按实例动画 Hook（#REFACTOR-010）、useCanvasSize 消除 24 动画样板（#REFACTOR-011）、物理量计算下沉至 data/physicsQuantities + physics/constants 消除硬编码 g（#REFACTOR-012）、PracticePage/WrongPage 接线激活题库与 useWrongStore 死代码（#BUG-013，完成 M3-4 错题本主体）。新增 15 项测试（共 48）。详见 `process/PROCESS_LOG.md`
- **M3-4 错题管理系统完成（2026-05-30）**：按 ui/05_WRONGBOOK_RULES 重写 useWrongStore（WrongRecord 四态 + IndexedDB 持久化 hydrate）、WrongPage 完整实现（统计面板/三类筛选/三种排序/已掌握折叠/右键菜单/删除二次确认/笔记 Modal/空态）、AnalysisPage 集成加入错题本入口。新增 8 项测试（共 56）。M3-4 主流程完整，答题自动判错判对待 M3-5 接入
- **当前任务**：M3-3 KaTeX 离线集成验证已完成，同时发现并修复知识树数据缺失 BUG
- **已完成**：M3-1 完成 — 创建 analysisRegistry.ts 题目解析注册表、problems/ 目录结构（6个分类22道力学真题）；M3-2 完成 — AnalysisPage 完整实现（题干区/分步解析区/知识链路区/步骤导航）；M3-3 完成 — KatexFormula 组件改用 mode 属性（inline/block），符合 UI 规范，KaTeX CSS 与字体全部离线打包验证通过；**关键修复** — 填充 knowledgeTree.ts 力学8章共35个知识节点，与 animationRegistry 23个动画完整关联，knowledgeIndex 索引正确构建
- **M3-5 练习与测试模式完成（2026-05-30）**：自评式答题会话 PracticeSession（练习/测试双模式、计时器、提示、揭示解析、自评联动 useWrongStore 自动判错判对）、PracticePage 入口（模式选择+筛选+成绩历史+浏览真题）、ScoreReport 成绩报告（总分/各模块正确率/薄弱知识点跳转）、新增 usePracticeStore（成绩历史 IndexedDB 持久化）、激活此前未接线的 useProblemStore。新增 4 项测试（共 60）。**[M3] 全部完成**
- **UI 主题一致性优化（2026-05-31，归属 [M2]）**：修复 4 份 UI 规范与主题代码间的语义不一致——①进度条撞色：慢放 `secondary-500`→`secondary-400`（与动能色 `#0891B2` 拉开 2 色阶），新增速度文字标签（色盲友好）；②光晕 token 统一：shadow.ts 新增 `glowRing` 对象（highlight/mastered/activeStep/error），AnalysisPage 硬编码→引用 token，旧 masteredGlow/focusGlow 标记 deprecated；③动效分类体系：motion.ts 新增 celebration/stateChange/feedback 时长 token，03_MOTION_RULES 新增 §6 动效分类定义表（庆祝类≤800ms/状态类≤300ms/反馈类≤400ms/页面级过渡300-500ms），消除原 §2 与 §5 的矛盾；④分析页信息密度：04_ANALYSIS 新增 §2.3 单步内容上限（SVG≤1/公式≤2/文字≤80字/标签≤3），两步展开时 SVG 降级为缩略图而非完全收起，新增"已展开 N/2 步"指示器。验证：tsc 通过 / lint 0 警告
- **M4-1.x CuttingEMF 增强（2026-06-02 路线图追加）**：在 [M4-1] 收官后启动 CuttingEMF 单点增强——参数扩展（θ/r/B_out）+ 物理真实化（取消 ping-pong 镜像、支持 v 反向）+ 磁场符号方向化（⊗/⊙ 切换）+ 公式更新（sinθ、含内阻 r）+ 探索任务卡（探索一修订为 B↑/v↑ 路径，避免"减 R 最亮"误区）+ PiP 放大镜（自由电子+洛伦兹力）+ 真实右手定则 SVG（inline 路径手绘）+ 交互模式三态（手动拖拽/匀速/受力）。**进度**：[PR 1] 参数扩展+物理真实化 ✅（2026-06-02）/[PR 1.1] 视觉同步修复 ✅（2026-06-02）/[PR 2] 交互模式三态 ✅（2026-06-02）/[PR 3] PiP 放大镜+真实右手SVG ✅（2026-06-02）/[PR 4] 探索任务卡 ⏳ 待开始。详见 `roadmap/ROADMAP_M4_PHYSICS.md` 电磁感应小节 [M4-1.x] 章节。**M4-2 热学模块仍按计划推进**。
- **下一步**：M4-2 热学模块——分子运动/分子力/气体定律/理想气体状态方程/热力学定律（BrownianMotion/MolecularForce/GasLaws/IdealGasState/FirstLawThermo/SecondLawThermo）

---

## 🏗️ 整体架构速查

```
技术栈：React 19 + Vite 6 + TypeScript 5.5 + TailwindCSS 4
状态管理：Zustand | 路由：HashRouter | 公式：KaTeX（离线）
渲染：SVG（教学）/ Canvas（高频）/ PixiJS（复杂场景，[M4]引入）
存储：IndexedDB（主）+ LocalStorage（配置）≤ 200MB
打包：浏览器优先，后期 Electron；base: './'，禁止运行时 CDN
```

&gt; 完整架构约束见 `core/ARCHITECTURE_RULES.md`，UI规范见 `ui/02_UI_RULES.md`

---

## 📋 全局约束（所有里程碑适用）

| 约束 | 规则 |
|------|------|
| 路由 | 强制 HashRouter |
| 离线 | KaTeX/图标/题库全部打包，禁止运行时 CDN |
| 坐标 | 所有渲染必须通过 `src/utils/coordinate.ts` |
| 动画 | 所有动画必须通过 `src/utils/animation.ts` |
| 纯函数 | `src/physics/` `src/math/` 不得依赖 DOM/React/window |
| 依赖 | 新增 npm 包必须先在 `process/PROCESS_LOG.md` 申报 |
| 数据 | 知识数据存 `src/data/knowledge/`，题目存 `src/data/problems/` |

---

## 📁 文档索引

| 文件 | 用途 |
|------|------|
| `core/CORE_RULES.md` | 总纲与铁律 |
| `core/ARCHITECTURE_RULES.md` | 技术架构细则 |
| `ui/02_UI_RULES.md` | 视觉与交互规范 |
| `roadmap/ROADMAP_PROGRESS.md` | **本文件**：进度入口 |
| `roadmap/ROADMAP_M0_FOUNDATION.md` | [M0] 技术基础详细任务 |
| `roadmap/ROADMAP_M1_MECHANICS.md` | [M1] 力学全知识点 + 组件清单 |
| `roadmap/ROADMAP_M2_POLISH.md` | [M2] 力学完善 + 导航系统任务 |
| `roadmap/ROADMAP_M3_EXAM.md` | [M3] 真题系统全任务 |
| `roadmap/ROADMAP_M4_PHYSICS.md` | [M4] 电磁/热/光/原子全知识点 |
| `process/PROCESS_LOG.md` | 变更记录与依赖申报 |
