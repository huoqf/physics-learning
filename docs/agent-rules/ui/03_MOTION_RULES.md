# 03_MOTION_RULES — 动效规则

&gt; 依赖：02_UI_RULES | 最后更新：2026-05-29
&gt; 涉及任何动效实现时读本文件，详细 duration/easing 值见 `src/theme/motion.ts`

---

## 1. 核心原则（不可违反）

**所有动效必须符合物理直觉** — 本产品教物理，动效本身就是示范。

- ✅ 使用 `ease-out`（减速）：模拟自然停止，用于 hover/显现
- ✅ 使用 `ease-in-out`（匀变速）：用于状态切换、展开/收起
- ❌ 禁止 `bounce` / 弹跳 easing：与物理场景的惯性规律冲突
- ❌ 禁止 `cubic-bezier(0.68,-0.55,0.265,1.55)` 等超出 [0,1] 范围的曲线

---

## 2. 时长规范

| 场景 | 时长 | Easing | token |
|------|------|--------|-------|
| hover/focus 响应 | 150ms | ease-out | `duration.fast` |
| 状态切换（展开/收起/显示）| 250ms | ease-in-out | `duration.normal` |
| 卡片 hover 上浮 | 200ms | ease-out | `duration.normal` |
| 页面路由切换（fade）| 300ms | ease-out | `duration.slow` |
| 抽屉/侧边栏滑入 | 300ms | ease-out | `duration.slow` |
| Modal 出现 | 200ms | ease-out | `duration.normal` |
| 学习状态变化 | 300ms | ease-in-out | `duration.slow` |
| 知识点已掌握庆祝 | 500ms | ease-in-out | `duration.celebration` |
| 按钮 active 按压 | 100ms | ease-out | `duration.instant` |

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
- 已掌握光晕出现：`box-shadow` 从 0 → `0 0 0 2px #10B981`，500ms

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
| 0.25x / 0.5x | secondary-500 `#06B6D4` | 慢放，细看 |
| 1x（正常）| primary-500 `#3B82F6` | 标准 |
| 2x | accent-500 `#F59E0B` | 快放，概览 |

---

## 5. 禁止项

- 禁止 bounce/弹跳 easing（任何场景）
- 禁止 Canvas 动画之外的页面元素使用 `requestAnimationFrame`
- 禁止在物理仿真中使用固定时间步（必须使用 deltaTime）
- 禁止超过 500ms 的非庆祝类动效（庆祝类上限 800ms）
- 禁止同时触发超过 3 个独立 CSS transition（性能与视觉干扰）
