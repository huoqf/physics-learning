# 06_NAVIGATION_RULES — 导航与状态保持规则

&gt; 依赖：02_UI_RULES、04_ANALYSIS_PAGE_RULES、05_WRONGBOOK_RULES | 最后更新：2026-05-31
&gt; 涉及跨页面导航、URL 状态保持时必须读本文件

---

## 1. 核心原则

- **URL 即状态**：所有用户可感知的导航状态必须编码在 URL 中，确保刷新/分享/前进后退可恢复
- **最小编码**：只编码用户主动操作产生的状态，不编码临时 UI 状态（如 hover、展开动画）
- **向后兼容**：缺少参数时使用默认值，不报错

---

## 2. AnalysisPage 步骤进度

### 2.1 URL hash 保持

- 步骤进度通过 URL hash 保持：`/analysis/:id#step-3`
- 用户展开/切换步骤时，同步更新 hash
- 页面加载时读取 hash，恢复到对应步骤（若无 hash，默认第 1 步折叠态）

### 2.2 刷新恢复

- 刷新页面后，从 hash 恢复步骤进度
- 恢复时仅展开当前步骤，不展开之前步骤（避免信息过载）

### 2.3 知识链路跳转

- 点击知识链路节点：新标签打开 `/animation/:id`（不打断当前解析进度，已定义于 04_ANALYSIS §3.3）
- 返回后步骤进度保持（通过 hash）

---

## 3. WrongPage 筛选条件

### 3.1 URL query 保持

- 筛选条件通过 URL query 保持：`/wrongbook?module=mechanics&difficulty=5&status=new,viewed`
- 参数映射：

| 参数 | 值 | 说明 |
|------|---|------|
| `module` | `mechanics` / `electricity` / `thermodynamics` / `optics` / `atomic` | 多选用逗号分隔 |
| `difficulty` | `1`–`5` | 多选用逗号分隔 |
| `status` | `new` / `viewed` / `retrying` / `mastered` | 多选用逗号分隔 |
| `sort` | `recent` / `errors` / `difficulty` | 单选，默认 `recent` |

### 3.2 分享链接

- 分享链接可直接还原筛选状态
- 缺少参数时使用默认值（全部不筛选 + recent 排序）

### 3.3 返回恢复

- 从 AnalysisPage 返回 WrongPage 时，筛选条件通过 URL query 自动恢复
- 滚动位置通过浏览器原生 `history.scrollRestoration` 恢复

---

## 4. 错题本 ↔ 分析页数据流向

### 4.1 来源标识

- WrongPage 点击卡片跳转时携带来源参数：`/analysis/:id?from=wrongbook`
- AnalysisPage 通过 `useSearchParams` 读取 `from` 参数判断是否为复习模式

### 4.2 复习模式 UI 差异

当 `from=wrongbook` 时，AnalysisPage 显示以下差异：

| 元素 | 普通浏览 | 复习模式 |
|------|---------|---------|
| 顶部进度条 | 无 | 2px warning-500 进度条（表示复习进度，区分于播放进度条） |
| 完成所有步骤后 | 无特殊操作 | 显示「标记为已复习」按钮（Primary md） |
| 标题栏 | 仅显示题目标题 | 标题前显示 `复习` 标签（warning-500 背景，warning-900 文字，rounded-full） |

### 4.3 复习完成行为

- 点击「标记为已复习」按钮后：
  1. 调用 `useWrongStore.markViewed(problemId)`（如当前为 `new` 状态）
  2. 或调用 `useWrongStore.recordCorrect(problemId)`（如当前为 `retrying` 状态，触发 correctStreak + 1）
  3. 显示「已记录」toast（neutral-600，2 秒后消失）
  4. 按钮变为 disabled 态，文字改为「已复习」

### 4.4 非复习模式

- 普通浏览 AnalysisPage 时不触发任何 wrongStore 操作
- 普通浏览不显示复习模式 UI 元素

---

## 5. 禁止项

- 禁止使用 sessionStorage/localStorage 存储导航状态（必须用 URL）
- 禁止在刷新后丢失用户已操作的步骤进度
- 禁止复习模式影响普通浏览的 UI（条件渲染，非全局状态）
- 禁止「标记为已复习」按钮跳过确认（需二次确认：点击 → 确认弹窗 → 执行）
