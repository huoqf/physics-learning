# [M3] 真题训练系统

> 依赖：[M1] ✅ | 可与 [M2] 并行
> 最后更新：2026-05-30

---

## 执行说明

- M3-1 数据结构必须最先完成，其他任务依赖它
- 题目数据初期用少量真题验证流程，后续持续补充
- 完成后更新 `roadmap/ROADMAP_PROGRESS.md` 中 [M3] 状态 → ✅

---

## M3-1 数据结构与注册表（必须最先完成）

- [x] 确认 `src/data/types.ts` 中 `Problem` / `ProblemStep` 类型定义完整（见 M0-8）
- [x] **`src/data/analysisRegistry.ts`** — 题目解析注册表
  ```ts
  // 格式对照 animationRegistry.ts
  interface AnalysisEntry {
    id: string              // 如 'gaokao-2023-national1-q14'
    title: string           // 简短标题
    year: number
    province: string        // '全国甲' / '全国乙' / '北京' / ...
    difficulty: 1 | 2 | 3 | 4 | 5
    knowledgeIds: string[]  // 关联知识点
    dataPath: string        // 指向 src/data/problems/ 下具体文件
  }
  ```
- [x] **`src/data/problems/`** 目录结构：
  ```
  src/data/problems/
  ├── mechanics/
  │   ├── kinematics-sample.ts   // 运动学3题
  │   ├── dynamics-sample.ts     // 动力学4题
  │   ├── energy-sample.ts       // 能量4题
  │   ├── momentum-sample.ts     // 动量4题
  │   ├── projectile-sample.ts   // 抛体/圆周4题
  │   ├── celestial-sample.ts    // 天体3题
  │   └── index.ts               // 统一导出
  ├── electricity/               // [M4] 后填充
  └── index.ts                   // 统一导出 + 查询工具函数
  ```
- [x] 知识点重要性标记完整（每个 KnowledgeNode 的 importance 字段）：
  - `basic`：基础概念，必须掌握
  - `core`：核心定律，必考
  - `gaokao`：高考高频考点（近5年出现≥3次）
  - `hard`：难点，选考提分点
  - `extend`：拓展内容（竞赛/自主招生）

---

## M3-2 AnalysisPage 页面实现

- [x] **`src/pages/AnalysisPage.tsx`** — 页面骨架
  - 通过 `src/data/analysisRegistry.ts` 按 id 查找题目配置
  - 通过 `React.lazy + Suspense` 按需加载题目详情组件

- [x] **版式实现** → 布局规范见 [`ui/04_ANALYSIS_PAGE_RULES.md §1`](../ui/04_ANALYSIS_PAGE_RULES.md)

- [x] **分步解析区**：
  - 每步默认折叠，点击展开公式与说明
  - 公式用 KaTeX 渲染，支持行内 `$...$` 和块级 `$$...$$`
  - 逐步揭示动画（展开时平滑过渡）
  - 「上一步/下一步」按钮导航

- [x] **知识链路区**：
  - 树形/线性排列：基础概念在上，综合考点在下
  - 节点按 importance 显示对应标签色（参见 `ui/02_UI_RULES.md` §6）
  - 当前步骤的关联节点：`box-shadow: 0 0 0 2px #60A5FA`（primary-400）
  - 已覆盖节点：左侧 3px success-500 色条
  - 点击节点：新标签打开 `/animation/:id`（不打断当前解析进度）
  - 悬停：tooltip 显示知识点一句话说明（≤ 30字）

---

## M3-3 KaTeX 离线集成

- [x] `katex` 已在 M0-10 中离线化，此处验证 AnalysisPage 中的公式渲染
- [x] `src/components/UI/KatexFormula.tsx` 支持：
  - `mode="inline"` → 行内公式，与文字间距 4px
  - `mode="block"` → 块级公式，上下间距 16px
  - 错误处理：公式解析失败时显示原始字符串

---

## M3-4 错题管理系统

- [x] **`src/stores/useWrongStore.ts`** 完整实现
  ```ts
  interface WrongRecord {
    problemId: string
    errorCount: number
    correctStreak: number     // 连续答对次数，>=2 触发已掌握
    status: 'new'|'viewed'|'retrying'|'mastered'
    knowledgeIds: string[]
    createdAt: number
    lastAttemptTime: number   // timestamp
    masteredAt?: number       // 连续答对2次后设置
    note?: string             // 用户笔记（≤200字）
  }
  // actions: addWrong / markViewed / recordCorrect / markMastered / addNote / removeWrong / clearAll / hydrate
  ```
- [x] 错题写入 IndexedDB（通过 `storage.setDB`），刷新后保持（hydrate 从 storage.getDB 水合）
- [x] **`src/pages/WrongPage.tsx`** — 错题卡片列表（对照 `ui/05_WRONGBOOK_RULES.md`）
  - [x] 卡片显示：题目摘要 / 错误次数 / 最近作答时间 / 难度标签 / 知识点标签（最多2个 +N）
  - [x] 四态左侧 4px 色条（未复习/已查看/重练中/已掌握）+ 多次错误(≥3) danger-700 角标
  - [x] 卡片悬停：translateY(-2px) + shadow-lg（200ms）
  - [x] 点击卡片：跳转 `/analysis/:id`（当前标签页）
  - [x] 筛选：按模块 / 按难度 / 按状态（chip 多选，不互斥）
  - [x] 排序：最近错误（默认）/ 错误次数多→少 / 难度高→低
  - [x] 已掌握卡片默认折叠至底部，点击"显示已掌握"展开
  - [x] 右键上下文菜单：标记已掌握 / 删除 / 添加笔记
  - [x] 删除二次确认 Modal；笔记 Modal（200字上限）
  - [x] 顶部统计面板：总错题数 / 未掌握 / 本周新增 / 本周掌握
  - [x] 空态（全空 + 筛选无结果）
- [x] **集成点**：`AnalysisPage` 顶部「加入错题本 / 标记已掌握」按钮，进入已收录题自动标记"已查看"

> 附带产出（非 M3-4 计划内，为消除死代码/占位不符）：`src/pages/PracticePage.tsx` 接入 `allProblems` 真题列表（难度筛选 + 跳转解析），激活原先未被引用的题库数据层。
>
> M3-4 完成度说明：错题管理主流程完整可用。**答题自动判错/判对**（调用 recordCorrect/addWrong）依赖 M3-5 练习/测试模式的答题交互，届时接入；当前先由 AnalysisPage 手动入口驱动状态流转。

---

## M3-5 练习与测试模式 ✅

> 数据为「分步解析式」（题目无客观选项/标准答案），故答题采用**自评式**：
> 展示题干 → 作答 → 揭示分步解析 → 学生自评对错 → 联动错题本（recordCorrect/addWrong）。

- [x] **练习模式**（`/practice?mode=practice`）
  - [x] 提示按钮（展示首步思路提示）
  - [x] 可随时「查看解析」
  - [x] 自评答对/答错即时反馈
- [x] **测试模式**（`/practice?mode=test`）
  - [x] 计时器（正计时，可暂停）
  - [x] 无提示，「提交并查看答案」后才显示解析
  - [x] 成绩统计：得分/总分/用时/各模块正确率
- [x] **`src/features/practice/PracticeSession.tsx`** — 答题会话（两模式共用，激活 useProblemStore 管理会话状态）
  - [x] 进度条 + 计时器 + 上一题/下一题/完成
  - [x] 自评联动 useWrongStore：答错 addWrong、答对 recordCorrect
- [x] **`src/pages/PracticePage.tsx`** — 练习/测试入口
  - [x] 模式选择卡（练习/测试）
  - [x] 题目筛选（按模块/难度）
  - [x] 成绩历史记录（usePracticeStore + IndexedDB 持久化）
  - [x] 浏览全部真题（跳转 AnalysisPage）
- [x] **`src/components/UI/ScoreReport.tsx`** — 成绩报告
  - [x] 总体得分 + 正确率 + 用时
  - [x] 各模块正确率条形图
  - [x] 薄弱知识点（来自错题关联知识点）+ 一键跳转复习动画

> 新增 store：`src/stores/usePracticeStore.ts`（成绩历史，IndexedDB 持久化，最多保留 50 条）。
> 至此 [M3] 真题训练系统全部任务完成 → 更新 ROADMAP_PROGRESS [M3] 状态。

---

## 高考真题数据录入计划

&gt; 初期录入足够验证流程即可，后续持续补充

| 优先级 | 题型 | 目标题量 | 知识点覆盖 |
|--------|------|---------|-----------|
| P1（先做）| 力学计算题 | 10题 | 动能定理+动量守恒 |
| P1（先做）| 运动学选择题 | 10题 | 匀变速/图像分析 |
| P2 | 圆周运动/天体 | 8题 | 向心力来源+卫星 |
| P2 | 牛顿定律综合 | 8题 | 斜面+连接体 |
| P3 | 机械能综合 | 6题 | 守恒条件判断 |
| P3 | 电磁感应（[M4]后）| 持续补充 | — |
