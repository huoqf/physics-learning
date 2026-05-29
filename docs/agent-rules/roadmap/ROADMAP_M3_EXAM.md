# [M3] 真题训练系统

&gt; 依赖：[M1] ✅ | 可与 [M2] 并行
&gt; 最后更新：2026-05-29

---

## 执行说明

- M3-1 数据结构必须最先完成，其他任务依赖它
- 题目数据初期用少量真题验证流程，后续持续补充
- 完成后更新 `roadmap/ROADMAP_PROGRESS.md` 中 [M3] 状态 → ✅

---

## M3-1 数据结构与注册表（必须最先完成）

- [ ] 确认 `src/data/types.ts` 中 `Problem` / `ProblemStep` 类型定义完整（见 M0-8）
- [ ] **`src/data/analysisRegistry.ts`** — 题目解析注册表
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
- [ ] **`src/data/problems/`** 目录结构：
  ```
  src/data/problems/
  ├── mechanics/
  │   ├── kinematics-sample.ts   // 运动学示例题（3-5题验证流程）
  │   └── dynamics-sample.ts     // 动力学示例题
  ├── electricity/               // [M4] 后填充
  └── index.ts                   // 统一导出
  ```
- [ ] 知识点重要性标记完整（每个 KnowledgeNode 的 importance 字段）：
  - `basic`：基础概念，必须掌握
  - `core`：核心定律，必考
  - `gaokao`：高考高频考点（近5年出现≥3次）
  - `hard`：难点，选考提分点
  - `extend`：拓展内容（竞赛/自主招生）

---

## M3-2 AnalysisPage 页面实现

- [ ] **`src/pages/AnalysisPage.tsx`** — 页面骨架
  - 通过 `src/data/analysisRegistry.ts` 按 id 查找题目配置
  - 通过 `React.lazy + Suspense` 按需加载题目详情组件

- [ ] **版式实现** → 布局规范见 [`ui/04_ANALYSIS_PAGE_RULES.md §1`](../ui/04_ANALYSIS_PAGE_RULES.md)

- [ ] **分步解析区**：
  - 每步默认折叠，点击展开公式与说明
  - 公式用 KaTeX 渲染，支持行内 `$...$` 和块级 `$$...$$`
  - 逐步揭示动画（展开时平滑过渡）
  - 「上一步/下一步」按钮导航

- [ ] **知识链路区**：
  - 树形/线性排列：基础概念在上，综合考点在下
  - 节点按 importance 显示对应标签色（参见 `ui/02_UI_RULES.md` §6）
  - 当前步骤的关联节点：`box-shadow: 0 0 0 2px #60A5FA`（primary-400）
  - 已覆盖节点：左侧 3px success-500 色条
  - 点击节点：新标签打开 `/animation/:id`（不打断当前解析进度）
  - 悬停：tooltip 显示知识点一句话说明（≤ 30字）

---

## M3-3 KaTeX 离线集成

- [ ] `katex` 已在 M0-10 中离线化，此处验证 AnalysisPage 中的公式渲染
- [ ] `src/components/UI/KatexFormula.tsx` 支持：
  - `mode="inline"` → 行内公式，与文字间距 4px
  - `mode="block"` → 块级公式，上下间距 16px
  - 错误处理：公式解析失败时显示原始字符串

---

## M3-4 错题管理系统

- [ ] **`src/stores/useWrongStore.ts`** 完整实现
  ```ts
  interface WrongRecord {
    problemId: string
    errorCount: number
    lastAttemptTime: number   // timestamp
    masteredAt?: number       // 连续答对2次后设置
    note?: string             // 用户笔记
  }
  // actions: addWrong / markMastered / addNote / clearAll
  ```
- [ ] 错题写入 IndexedDB（通过 `storage.setDB`），刷新后保持
- [ ] **`src/pages/WrongPage.tsx`** — 错题卡片列表（对照 `ui/05_WRONGBOOK_RULES.md`）
  - 卡片显示：题目摘要 / 错误次数 / 最近作答时间 / 难度标签 / 关联知识点
  - 筛选：按模块筛选 / 按难度筛选 / 按掌握状态筛选
  - 排序：最近错误（默认） / 错误次数多→少 / 难度高→低
  - 卡片悬停：轻微上浮反馈（shadow-md → shadow-lg）
  - 点击卡片：跳转 `/analysis/:id`（当前标签页）
  - 已掌握卡片：默认折叠至列表底部，点击"显示已掌握"展开
  - 长按/右键：显示上下文菜单：标记已掌握 / 删除 / 添加笔记

---

## M3-5 练习与测试模式

- [ ] **练习模式**（`/practice?mode=practice`）
  - 有提示按钮（可查看当前步骤提示）
  - 可随时查看完整解析
  - 答对/答错即时反馈

- [ ] **测试模式**（`/practice?mode=test`）
  - 计时器（正计时，可暂停）
  - 无提示，提交后才显示答案
  - 成绩统计：得分/总分/用时/各知识点正确率

- [ ] **`src/pages/PracticePage.tsx`** — 练习/测试入口
  - 模式选择（练习/测试）
  - 题目筛选（按模块/难度/知识点）
  - 成绩历史记录

- [ ] **`src/components/UI/ScoreReport.tsx`** — 成绩报告
  - 总体得分、各模块得分、薄弱知识点标注
  - 建议复习的知识点列表（链接到 AnimationPage）

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
