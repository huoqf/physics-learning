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
| 2026-05-29 | agent | 使用 Tailwind CSS 4 + @tailwindcss/postcss 配置 | Tailwind CSS 4 正式版配置方式变更，不再需要 tailwind.config.ts，直接在 CSS 中使用 @theme | 全局 |
| 示例：2026-05-29 | agent | 统一使用 `useAnimationStore`，废弃 `usePhysicsState` 方案 | 两者职责完全重叠，合并避免状态分裂 | M1-0、所有动画组件 |

---

## 📝 代码修改记录

| 日期 | 作者 | 里程碑 | 修改内容 | 影响文件 | 关联issue |
|------|------|--------|---------|---------|----------|
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
