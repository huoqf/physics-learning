# 02_UI_RULES — UI 视觉铁律

&gt; 优先级：低于 core/ARCHITECTURE_RULES，高于 03/04/05
&gt; AI任务入口：涉及任何 UI 实现前必须读本文件，细节查 src/theme/ 代码
&gt; 最后更新：2026-05-31

---

## 1. 设计哲学（不可违反）

本产品气质：**精密学习工具**，介于科学仪器与教育软件之间。

| 维度 | ✅ 应有 | ❌ 禁止 |
|------|--------|--------|
| 颜色 | 深海蓝主色，冷白背景，冷灰中性色 | 彩虹色、荧光色、卡通暖色 |
| Canvas | 实验室图纸感：干净轴线、精确标注 | 游戏风粒子爆炸、霓虹效果 |
| 动效 | ease-out / ease-in-out，符合物理惯性 | bounce、弹跳、随机飞入 |
| 排版 | 科学论文级清晰度，克制留白 | 过度装饰、四处塞满内容 |

---

## 2. Token 体系（权威来源：src/theme/）

所有实现必须从以下文件引用 token，**禁止硬编码任何颜色/间距/圆角值**：

| 文件 | 内容 |
|------|------|
| `src/theme/colors.ts` | 5套色阶（primary/secondary/accent/neutral/状态色） |
| `src/theme/physicsColors.ts` | 18个物理量颜色语义映射 |
| `src/theme/spacing.ts` | 间距比例尺（4px基准） |
| `src/theme/radius.ts` | 圆角规范 |
| `src/theme/shadow.ts` | 阴影规范 |
| `src/theme/motion.ts` | 动效时长与 easing |

Tailwind 配置从 `src/theme/colors.ts` 导入，不在 `tailwind.config.*` 中重复定义颜色值。

---

## 3. 物理量颜色语义（不可更改）

Canvas/SVG 中每类物理量有固定颜色，详见 `src/theme/physicsColors.ts`。
核心摘要：

| 物理量 | 颜色语义 | 用途 |
|--------|---------|------|
| 速度 v | Velocity Blue `#2563EB` | 速度箭头、v-t曲线 |
| 加速度 a | Acceleration Red `#DC2626` | 加速度箭头 |
| 合力 F | Force Orange `#EA580C` | 合力箭头（粗3px） |
| 重力 mg | Gravity Slate `#475569` | 重力箭头（弱化） |
| 动能 Ek | Kinetic Cyan `#0891B2` | 能量柱状图 |
| 势能 Ep | Potential Purple `#7C3AED` | 势能柱状图 |
| 电场 E | Electric Yellow `#CA8A04` | 电场矢量 |
| 磁场 B | Magnetic Purple `#7E22CE` | 磁感线 |

规则：同一画面最多5种物理量颜色；合力箭头比分力粗1.5倍；历史轨迹固定用 `#94A3B8`（Track Gray）。

---

## 4. 信息密度铁律

**Canvas 黄金规则：任意时刻可见元素 ≤ 7个**

| 层级 | 默认可见 | 默认隐藏（toggle开启） |
|------|---------|---------------------|
| 必要层 | 物体、轨迹、坐标轴 | — |
| 重要层 | 主矢量（速度/合力） | 分量矢量 |
| 辅助层 | 当前物理量标注 | 参考线、网格 |
| 分析层 | — | 加速度矢量、历史轨迹 |

三屏布局密度上限：
- 左侧参数区：最多 **5个参数**
- Canvas 中间：最多 **7个元素**，Canvas内文字标注 ≤ 5个
- 右侧看板：最多 **8行物理量** + 高考要点卡片（≤ 3条，每条≤ 30字）

---

## 5. 三屏联动布局规范

```
左侧 280px（bg-neutral-50）│ 中间自适应（bg-white）│ 右侧 320px（bg-neutral-50）
分隔线：border-neutral-200 1px
```

- 顶部栏：高度 56px，bg-primary-800，白色文字
- 底部控制栏：高度 48px，播放/暂停/重置/速度/进度条
- 响应式降级（&lt; 1024px）：左侧折为抽屉（齿轮图标触发），右侧移至 Canvas 下方

---

## 6. 学习状态视觉体系

### 知识点掌握四态

```
未学习（neutral-300）→ 已浏览（primary-400）→ 练习中（primary-600）→ 已掌握（success-500）
```

状态变化有 300ms transition；已掌握节点有 `box-shadow: glowRing.mastered（详见 src/theme/shadow.ts）` 光晕。

### 高考重要性标签（5级，使用 accent 金色系）

| importance | 标签 | 样式 |
|-----------|------|------|
| `gaokao` | 高考高频 ⭐ | accent-100 背景，accent-700 文字，左侧4px金色竖条 |
| `hard` | 难点 | danger-100 背景，danger-700 文字 |
| `core` | 核心 | primary-100 背景，primary-700 文字 |
| `basic` | 基础 | neutral-100 背景，neutral-600 文字 |
| `extend` | 拓展 | secondary-100 背景，secondary-700 文字 |

### 动画播放状态

| 状态 | 视觉变化 |
|------|---------|
| 播放中 | 顶部 2px primary-500 进度条 |
| 暂停 | Canvas opacity 0.9 dimmed |
| 慢放 &lt; 1x | 进度条变 secondary-400 |
| 快放 &gt; 1x | 进度条变 accent-500 |

---

## 7. 组件规范摘要

### 按钮尺寸

| 尺寸 | 高度 | 字号 |
|------|------|------|
| sm | 32px | 13px |
| md（默认）| 40px | 14px |
| lg | 48px | 16px |

### 按钮变体（详见 src/theme/colors.ts）

Primary（primary-600）/ Secondary（white + primary边框）/ Ghost（transparent）/ Danger（danger-500）

### 排版层级

| 级别 | 尺寸/字重 | 颜色 |
|------|---------|------|
| h1 | 28px/700 | neutral-800 |
| h2 | 22px/600 | neutral-800 |
| h3 | 18px/600 | neutral-700 |
| body | 15px/400 | neutral-600 |
| body-sm | 13px/400 | neutral-500 |
| mono（数值）| 14px/400 | neutral-700 |

字体栈：`'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif`

### 数值显示规则

- 正数：neutral-700；负数：danger-600；零值：neutral-400（弱化）；极值：accent-600 + bold
- 单位：body-sm neutral-500，数值右侧 4px

### KaTeX 公式

- 行内：同正文字号，上下 2px margin
- 块级：primary-50 背景，rounded-sm，padding 12px 16px，上下 16px margin

### 组件必须实现的8态

默认 / Hover / Focus（primary-500 outline 2px）/ Active（scale 0.97）/ Disabled（opacity-40）/ Loading（spinner）/ 空态 / 错误态

---

## 8. UI 专属禁止项

- 禁止硬编码任何颜色值（包括 Canvas 内部）
- Canvas 物理量颜色必须从 `src/theme/physicsColors.ts` 引用
- 禁止在 Canvas 内使用 lucide 图标（用 SVG 路径手绘）
- 禁止单页面试验深色模式（当前阶段浅色优先）
- 禁止发明新颜色或新 token（先更新 src/theme/ 对应文件）
- 禁止在 `tailwind.config.*` 中重复定义颜色值（从 colors.ts 导入）

---

## 9. 详细规则索引

| 需要查询 | 查阅位置 |
|---------|---------|
| 完整色阶 HEX 值 | `src/theme/colors.ts` |
| 物理量颜色完整表 | `src/theme/physicsColors.ts` |
| 动效时长/easing | `src/theme/motion.ts` → `ui/03_MOTION_RULES.md` |
| AnalysisPage 版式 | `ui/04_ANALYSIS_PAGE_RULES.md` |
| 错题本卡片 | `ui/05_WRONGBOOK_RULES.md` |
| Canvas 元素尺寸 | `src/theme/physicsColors.ts` 中 CANVAS_STYLE |
