# CORE RULES

## 1. 项目目标

本项目是面向高中物理的交互式本地学习系统，核心目标：

1. 建立完整且清晰的高中物理知识结构
2. 用交互动画帮助理解物理现象与概念
3. 通过真题拆解帮助学习者建立解题思路
4. 可长期扩展，便于持续加入新章节、新题型与新场景

---

## 2. 文档体系与执行规则

### 2.1 文档按需加载策略

**核心原则：每次任务只读刚好够用的文档，不预加载无关规则。**

#### 必读（每次任务开始前）

| 文档 | 说明 |
|------|------|
| `CORE_RULES.md` | 本文件，总纲与调度入口 |
| `ARCHITECTURE_RULES.md` | 技术栈、目录、Store、路由、依赖等实现约束 |
| 当前里程碑的 `roadmap/ROADMAP_Mx_*.md` | 仅读本次任务所属里程碑的文件 |

#### 按需读取（触发时才读，否则跳过）

| 触发条件 | 读取的文档 |
|---------|----------|
| 涉及任何 UI 组件、布局、颜色、间距实现 | `ui/02_UI_RULES.md` |
| 涉及过渡动画、Framer Motion、easing | `ui/03_MOTION_RULES.md` |
| 实现 `AnalysisPage` 或题目解析页布局 | `ui/04_ANALYSIS_PAGE_RULES.md` |
| 实现 `WrongPage`、错题卡片、错题状态 | `ui/05_WRONGBOOK_RULES.md` |
| 查看里程碑全局进度 / 选择下一个任务 | `roadmap/ROADMAP_PROGRESS.md` |
| 申报依赖 / 查历史决策 / 追问题 | `process/PROCESS_LOG.md` |

#### 无需读文档，直接调用代码

| 需求 | 直接操作 |
|------|---------|
| 颜色 / 间距 / 圆角 / 阴影值 | `import { ... } from '@/theme'` |
| Canvas 物理量颜色 / 尺寸规范 | `import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'` |
| 动效 duration / easing / transition | `import { duration, easing, transition } from '@/theme/motion'` |

冲突时以优先级更高的文档为准（`CORE_RULES` > `ARCHITECTURE_RULES` > `ui/02` > `ui/03–05`）。

### 2.2 执行前必须做

1. 读 `CORE_RULES.md`（本文件）+ `ARCHITECTURE_RULES.md`
2. 读当前里程碑的 `ROADMAP_Mx_*.md`
3. **仅当触发上方按需条件时**，再读对应子规则文档

严格遵守 `[M0]`–`[M4]` 里程碑命名，禁止使用"阶段二"等自然语言描述。

### 2.3 完成后必须更新

任务结束后同步更新：`roadmap/ROADMAP_PROGRESS.md`、`process/PROCESS_LOG.md`。记录内容至少包括：修改内容、新增模块、架构影响、未完成事项。

---

## 3. 铁律（禁止行为）

以下规则的细则定义在 `ARCHITECTURE_RULES.md`，此处为强制摘要：

- **禁止擅自重构**：禁止修改架构边界、重命名核心模块、大规模文件迁移
- **禁止破坏坐标系统**：所有图形渲染必须通过 `src/utils/coordinate.ts` 转换，禁止魔法数字坐标
- **禁止分散动画控制**：所有动画必须通过 `src/utils/animation.ts`，禁止组件自行调用 `requestAnimationFrame`
- **禁止污染纯计算层**：`src/physics/` 与 `src/math/` 不得依赖 React、DOM、window、document
- **禁止擅自新增依赖**：新增 npm 包前必须先在 `process/PROCESS_LOG.md` 申报，更新 `ARCHITECTURE_RULES.md` 依赖清单后方可安装

---

## 4. 输出要求

任何交付物必须满足：结构清晰、名称一致、规则可执行、不引入额外歧义。
