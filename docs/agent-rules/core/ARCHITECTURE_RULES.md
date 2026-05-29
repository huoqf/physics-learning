# 架构规则文档

## 0. 适用范围与优先级

本文件约束「高中物理交互动画学习系统」的前端、数据层、物理计算层、题目解析层与桌面打包层实现。

本文件是技术架构的权威来源。**按需加载策略与文档优先级见 `CORE_RULES.md §2.1`**（每次任务必读，此处不重复）。

---

## 1. 技术栈声明

| 类别 | 选型 |
|------|------|
| 前端框架 | React 19 |
| 构建工具 | Vite 6，`base: './'` |
| 语言 | TypeScript 5.5+（strict mode） |
| CSS 框架 | TailwindCSS 4 |
| 状态管理 | Zustand |
| 路由 | react-router-dom（**HashRouter only**） |
| 动画渲染 | SVG（教学图解优先）/ Canvas（高频动画）/ PixiJS（后期复杂场景） |
| 数学公式 | KaTeX（完全离线） |
| 图标 | lucide-react |
| 数据验证 | Zod |
| 本地存储 | IndexedDB（主）/ LocalStorage（轻量配置） |
| 测试 | Vitest + Testing Library |
| 打包目标 | 浏览器本地运行优先，后期平滑迁移 Electron |

&gt; HashRouter 原因：Electron 以 `file://` 加载时，BrowserRouter 路由失效。

---

## 2. 目录结构

```
src/
├── app/                    # 应用壳、路由、全局布局
├── components/
│   ├── Layout/             # 布局组件
│   └── UI/                 # UI 基础组件
├── pages/                  # 页面级容器
├── features/               # 按学科/能力拆分的业务模块
│   ├── mechanics/
│   ├── electricity/
│   ├── thermodynamics/
│   ├── optics/
│   ├── atomic/
│   ├── analysis/           # 题目拆解模块
│   └── knowledge/          # 知识树浏览模块
├── physics/                # 纯物理计算（无副作用）
├── math/                   # 数学工具（矢量、三角、矩阵、数值求解）
├── utils/                  # 坐标、动画、存储等共享工具
├── data/
│   ├── knowledge/          # 分模块知识库 JSON
│   ├── problems/           # 题目与解析数据
│   ├── knowledgeTree.ts
│   ├── animationRegistry.ts
│   └── analysisRegistry.ts
└── stores/
    ├── useAnimationStore.ts
    ├── useKnowledgeStore.ts
    ├── useProblemStore.ts
    └── useWrongStore.ts

theme/                      # 设计 token（颜色/间距/圆角/阴影/动效）
├── colors.ts               # 唯一颜色来源，Tailwind 从此导入
├── physicsColors.ts        # 物理量颜色语义映射 + Canvas 元素尺寸
├── spacing.ts              # 间距比例尺 + 布局固定尺寸 + 密度上限
├── radius.ts               # 圆角规范
├── shadow.ts               # 阴影规范
├── motion.ts               # 动效时长与 easing
└── index.ts                # 统一导出入口

electron/                   # Electron 预留目录
├── main.ts
└── preload.ts

tests/
├── setup.ts
└── utils/
    ├── coordinate.test.ts
    └── animation.test.ts
```

新增规则：
- 新功能模块 → `src/features/`
- 纯物理计算 → `src/physics/`
- 数学工具 → `src/math/`
- 状态管理 → `src/stores/`
- 静态数据 → `src/data/`
- 禁止将页面逻辑直接塞进业务组件内部

---

## 3. 组件分层与依赖方向

### 3.1 分层职责

- **页面组件**：路由装配、布局组织、数据注入，不放复杂业务逻辑
- **功能组件**：单一物理场景、题目拆解或知识点演示
- **通用组件**：可复用 UI 片段
- **工具函数**：纯逻辑或明确副作用，不承担页面职责

### 3.2 依赖方向（单向）

```
页面组件 → 功能组件 → 通用组件 → 工具函数
                              ↗
                    physics/ &amp; math/
```

- `physics/` 与 `math/` **不得**依赖 React、DOM、window、document
- `physics/` **不得**直�