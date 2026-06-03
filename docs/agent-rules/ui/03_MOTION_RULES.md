# 03_MOTION_RULES — 动效规则

&gt; 依赖：02_UI_RULES | 最后更新：2026-05-31
&gt; 涉及任何动效实现时读本文件，详细 duration/easing 值见 `src/theme/motion.ts`

---

## 1. 核心原则（不可违反）

**所有动效必须符合物理直觉** — 本产品教物理，动效本身就是示范。

- ✅ 使用 `ease-out`（减速）：模拟自然停止，用于 hover/显现
- ✅ 使用 `ease-in-out`（匀变速）：用于状态切换、展开/收起
- ❌ 禁止 `bounce` / 弹跳 easing 用于 UI 导航与界面动效：与惯性规律冲突
- ✅ 物理模拟动画中的弹簧/碰撞回弹不受此限制（如弹簧振子、碰撞回弹，属物理行为而非 UI 装饰）
- ❌ 禁止 `cubic-bezier(0.68,-0.55,0.265,1.55)` 等超出 [0,1] 范围的曲线

---

## 2. 时长规范

| 场景 | 时长 | 分类 | Easing | token |
|------|------|------|--------|-------|
| hover/focus 响应 | 150ms | 反馈类 | ease-out | `duration.fast` |
| 答题对（scale 1.02）| 200ms | 反馈类 | ease-out | `duration.fast` |
| 答题错（shake）| 400ms | 反馈类 | ease-out | `duration.feedback` |
| 状态切换（展开/收起/显示）| 250ms | 状态类 | ease-in-out | `duration.normal` |
| 卡片 hover 上浮 | 200ms | 反馈类 | ease-out | `duration.normal` |
| 页面路由切换（fade）| 300–500ms | 页面级过渡 | ease-out | `duration.slow` |
| 抽屉/侧边栏滑入 | 300ms | 页面级过渡 | ease-out | `duration.slow` |
| Modal 出现 | 200ms | 状态类 | ease-out | `duration.normal` |
| 学习状态变化 | 300ms | 状态类 | ease-in-out | `duration.stateChange` |
| 已掌握光晕（手动标记）| 300ms | 状态类 | ease-in-out | `duration.stateChange` |
| 知识点已掌握庆祝（连续答对≥2次）| 500–800ms | 庆祝类 | ease-in-out | `duration.celebration` |
| 按钮 active 按压 | 100ms | 反馈类 | ease-out | `duration.instant` |

---

## 3. 界面动效规范

### 页面切换
- 路由切换：`opacity 0 → 1`，300ms ease-out
- 禁止滑动切换（会与 Canvas 物理运动混淆）

### 展开/折叠（手风琴、步骤、抽屉）
- `height + opacity` 联动，250ms ease-in-out
- 不使用 `display:none` 硬切换

### 卡片交互
- hover：`translateY(-2px)` + shadow 升级，200ms ease-out
- active：`scale(0.97)`，100ms ease-out

### 答题反馈
- 答对：`scale(1.02)`，200ms ease-out — 轻微放大感，不夸张
- 答错：水平 shake `translateX(±6px)`，400ms（3次往复）

### 进度/状态变化
- 颜色渐变：300ms transition-colors
- 已掌握光晕出现：`box-shadow` 从 0 → `glowRing.mastered`，300ms（状态类）；连续答对≥2次触发时归庆祝类，500–800ms

---

## 4. Canvas 物理动画规范

- **帧率目标**：60fps，通过 `src/utils/animation.ts` 统一调度
- **禁止**在组件内直接调用 `requestAnimationFrame`
- **慢放**（&lt; 1x）：缩小物理仿真时间步，不降低渲染帧率
- **deltaTime**：所有物理更新基于实际 RAF 时间差，禁止固定步长
- **解耦原则**：动画渲染频率与物理计算频率独立

### 进度条颜色与播放速度联动

| 播放速度 | 进度条颜色 | 含义 |
|---------|---------|------|
| 0.25x / 0.5x | secondary-400 `#22D3EE` | 慢放，细看 |
| 1x（正常）| primary-500 `#3B82F6` | 标准 |
| 2x | accent-500 `#F59E0B` | 快放，概览 |

### 暂停/播放动效编排

当用户点击播放/暂停时，Canvas RAF 循环与 UI CSS transition 必须按编排时序执行，避免同时触发多个独立 transition 超过 §5 上限。

**播放 → 暂停 时序：**

| 延迟 | 动作 | 属性 | 时长 | 分类 |
|------|------|------|------|------|
| 0ms | 暂停物理计算（`cancelAnimationFrame`）| — | — | — |
| 0ms | 进度条颜色切换（如速度同步变化）| background-color | 150ms | 反馈类 |
| 0ms | 播放按钮图标切换（Play ↔ Pause）| — | 无 transition | — |
| 150ms | Canvas dimmed（opacity 1 → 0.9）| opacity | 250ms | 状态类 |
| 150ms | 底部按钮状态提示（如"已暂停"）| opacity | 150ms | 反馈类 |
| — | 看板区数值冻结，**不触发 transition** | — | — | — |

关键规则：
- 看板区数值暂停时仅冻结（停止更新），不触发颜色/透明度变化，避免产生无意义的 transition
- Canvas dimmed 延迟 150ms 启动，与进度条颜色切换错开，确保同时活跃的 transition ≤ 2 个
- 播放按钮图标使用 React 条件渲染（无 transition），不计入 transition 并发数

**暂停 → 播放 时序：**

| 延迟 | 动作 | 属性 | 时长 | 分类 |
|------|------|------|------|------|
| 0ms | Canvas 恢复（opacity 0.9 → 1）| opacity | 250ms | 状态类 |
| 0ms | 播放按钮图标切换 | — | 无 transition | — |
| 0ms | 恢复物理计算（`requestAnimationFrame`）| — | — | — |
| — | 看板区数值恢复更新，**不触发 transition** | — | — | — |

暂停→播放无需延迟编排：Canvas 恢复和 RAF 重启可同时发生，因为恢复时只有 1 个 opacity transition 活跃。

---

## 5. 禁止项

- 禁止 bounce/弹跳 easing 用于 UI 导航与界面动效（物理模拟动画中的弹簧/碰撞回弹不受此限制）
- 禁止 Canvas 动画之外的页面元素使用 `requestAnimationFrame`
- 禁止在物理仿真中使用固定时间步（必须使用 deltaTime）
- 禁止超过 300ms 的状态类动效、禁止超过 400ms 的反馈类动效（庆祝类上限 800ms，页面级过渡允许 300–500ms）
- 禁止同时触发超过 3 个独立 CSS transition（性能与视觉干扰）；按 §4「暂停/播放动效编排」时序错开的 transition 不计入并发数

---

## 6. 动效分类定义

| 分类 | 触发条件 | 时长上限 | 允许组合 | Easing |
|------|---------|---------|---------|--------|
| 庆祝类 | 连续答对 ≥ 2 次、首次完整掌握知识点 | 800ms | scale + 光晕 + 粒子（可选） | ease-in-out |
| 状态类 | 任意 UI 状态变化（展开/收起/颜色变化/光晕出现） | 300ms | 单属性 transition，禁止同时超过 2 个属性 | ease-in-out 或 ease-out |
| 反馈类 | 用户操作即时响应（答题对/错、按钮点击、shake） | 400ms | shake 可达 400ms，单色变化 ≤ 200ms | ease-out |
| 页面级过渡 | 路由切换、全屏 Modal | 300–500ms | opacity + transform | ease-out |
