# ROADMAP — 高中物理交互动画学习软件

&gt; 最后更新：2026-05-30

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
| [M4] | 电磁/热/光/原子模块 | ⏳ 待开始 | [M2] | `roadmap/ROADMAP_M4_PHYSICS.md` |

**状态标记**：⏳ 待开始 / 🚧 进行中 / ✅ 已完成 / ⛔ 阻塞

---

## 🎯 当前活跃任务

> 更新此区域反映每次任务的工作焦点

- **当前里程碑**：[M3] 真题训练系统 ✅ 已完成 → 下一里程碑 [M4]
- **质量闸门治理（2026-05-30，归属 [M2]）**：完成 ESLint 9 flat config 迁移（#BUG-005，`npm run lint` 恢复并 0 警告）、动画注册表单一数据源重构（#BUG-006，消除 componentPath/animationComponents 双映射与 anim-impulse 错配）、动画懒加载分包（#PERF-007，主 bundle 676→596kB）。详见 `process/PROCESS_LOG.md`
- **架构改进六项（2026-05-30，归属 [M2]/[M3]）**：路由级代码分割+vendor manualChunks（#PERF-008，主 bundle 596→191.89kB，消除大包警告）、ErrorBoundary 错误边界（#BUG-009）、useAnimationFrame 按实例动画 Hook（#REFACTOR-010）、useCanvasSize 消除 24 动画样板（#REFACTOR-011）、物理量计算下沉至 data/physicsQuantities + physics/constants 消除硬编码 g（#REFACTOR-012）、PracticePage/WrongPage 接线激活题库与 useWrongStore 死代码（#BUG-013，完成 M3-4 错题本主体）。新增 15 项测试（共 48）。详见 `process/PROCESS_LOG.md`
- **M3-4 错题管理系统完成（2026-05-30）**：按 ui/05_WRONGBOOK_RULES 重写 useWrongStore（WrongRecord 四态 + IndexedDB 持久化 hydrate）、WrongPage 完整实现（统计面板/三类筛选/三种排序/已掌握折叠/右键菜单/删除二次确认/笔记 Modal/空态）、AnalysisPage 集成加入错题本入口。新增 8 项测试（共 56）。M3-4 主流程完整，答题自动判错判对待 M3-5 接入
- **当前任务**：M3-3 KaTeX 离线集成验证已完成，同时发现并修复知识树数据缺失 BUG
- **已完成**：M3-1 完成 — 创建 analysisRegistry.ts 题目解析注册表、problems/ 目录结构（6个分类22道力学真题）；M3-2 完成 — AnalysisPage 完整实现（题干区/分步解析区/知识链路区/步骤导航）；M3-3 完成 — KatexFormula 组件改用 mode 属性（inline/block），符合 UI 规范，KaTeX CSS 与字体全部离线打包验证通过；**关键修复** — 填充 knowledgeTree.ts 力学8章共35个知识节点，与 animationRegistry 23个动画完整关联，knowledgeIndex 索引正确构建
- **M3-5 练习与测试模式完成（2026-05-30）**：自评式答题会话 PracticeSession（练习/测试双模式、计时器、提示、揭示解析、自评联动 useWrongStore 自动判错判对）、PracticePage 入口（模式选择+筛选+成绩历史+浏览真题）、ScoreReport 成绩报告（总分/各模块正确率/薄弱知识点跳转）、新增 usePracticeStore（成绩历史 IndexedDB 持久化）、激活此前未接线的 useProblemStore。新增 4 项测试（共 60）。**[M3] 全部完成**
- **下一步**：进入 [M4] 电磁/热/光/原子模块（依赖 [M2]✅）

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
