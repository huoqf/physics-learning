# SidebarExtra 收敛状态

> 最后更新：2026-07-01 | 完成记录：[2026-W27.md](./logs/2026-W27.md)

---

## 当前状态

| 指标 | 数值 |
|------|------|
| SidebarExtra 注册总量 | 34（原始 61，已删除 27） |
| 已完全删除 | 27 |
| 已大幅精简（controlMeta 接管核心控件） | 20 |
| **仍需手写 JSX 的硬骨头** | **14**（其中 8 个仅剩 1-2 个控件） |

---

## P0 已完成：action + storeToggle 类型落地

### 改动文件
- `src/data/types.ts` — ControlMeta 新增 `action` / `storeToggle` 联合成员；SidebarExtraProps 新增 `toggleVectors`
- `src/components/UI/ControlPanel.tsx` — 新增 action（Button + animationActions 调度）和 storeToggle（ToggleSwitch + 桥接）渲染逻辑
- `src/pages/AnimationPage.tsx` — sidebarExtraProps 补充 `toggleVectors`；ControlPanel 传入 `setDirection` / `toggleVectors` / `toggleTimeSlices` / `toggleDualObjects`

### 本次迁移的 SidebarExtra（4 个）

| SidebarExtra | 迁移内容 | 剩余内容 |
|-------------|---------|---------|
| `KinematicsAdvancedSidebar` | storeToggle(toggleVectors) 已提取到 controlMeta | **已从 registry 移除**（空壳文件） |
| `FrictionSidebar` | storeToggle(toggleVectors) 已提取到 controlMeta | 重力预设 OptionButton grid |
| `VelocitySelectorSidebar` | segmented(mode) + 3 个 toggle + 2 个 action 按钮 | 电荷极性 segmented + 2 个 TipCard |
| `AccelerationSidebar` | segmented(advancedMode) + 4 个 preset(restartOnApply) + 2 个 tip | Δt 三档 OptionButton grid |

---

## P1 已完成：preset 函数式 params + 剩余 preset 迁移

### 改动文件
- `src/data/types.ts` — preset.params 改为 `Record<string, number> | ((current) => Record<string, number>)`
- `src/components/UI/ControlPanel.tsx` — handlePresetApply 检测函数类型后执行

### 本次迁移的 SidebarExtra（5 个）

| SidebarExtra | 迁移内容 | 剩余内容 |
|-------------|---------|---------|
| `GasLawsSidebar` | segmented(mode) + 3 tip | 动态 slider（mode 0→V, mode 1→T） |
| `FirstLawSidebar` | segmented(mode) + tip | adiabatic toggle（有 side effect: Q→0） |
| `SpringCompositeSidebar` | 2 个 toggle | segmented（有 side effect: time→0）+ 描述文本 |
| `ElectricPotentialSidebar` | segmented(zeroRef) | drawMode toggle（有 side effect: runTime→0）+ TipCard |
| `UniformAccelerationSidebar` | segmented(advancedMode) + 3 preset + 2 tip | areaMode segmented（复杂 side effect）+ 自定义 range input |

---

## 仍需手写 JSX 的 14 个 SidebarExtra 及阻塞原因

### 含 onChange 联动逻辑（1 个）
- `FieldLinesSidebar` — segmented 需重置探针位置（多参数 setParams，条件分支）

### 含 AnimationPage 专有 props（1 个）
- `FreeFallSidebar` — 使用 showTimeSlices / toggleTimeSlices（非 params 驱动）

### 含多层嵌套 OptionButton grid（1 个）
- `VelocitySidebar` — Δt 档位 + 运动模型多层嵌套

### 完全自定义布局（7 个）
- `InductionSidebarExtra` — 多分区（参数/回路/辅助/模式）+ 自定义 heading
- `LenzsLawSidebarExtra` — 四步探究法动态 TipCard + 自定义分区
- `CuttingEMFSidebarExtra` — Card 包装 + 多参数 Slider
- `FaradaySidebarExtra` — Card 包装 + 模态切换 + 多 Slider
- `ACGenerationSidebarExtra` — 自定义 Slider + Toggle 布局
- `ACValuesSidebarExtra` — useState 计算逻辑 + Auto 按钮
- `PowerTransmissionSidebarExtra` — 步进按钮 + 场景预设 + 稳压补偿

### 已精简但仍保留（8 个）
- `FrictionSidebar` — 仅剩重力预设 grid
- `AccelerationSidebar` — 仅剩 Δt 三档 grid
- `VelocitySelectorSidebar` — 仅剩电荷极性 segmented + TipCard
- `GasLawsSidebar` — 仅剩动态 slider
- `FirstLawSidebar` — 仅剩 adiabatic toggle（有 side effect: Q→0）
- `SpringCompositeSidebar` — 仅剩 segmented（有 side effect: time→0）+ 描述文本
- `ElectricPotentialSidebar` — 仅剩 drawMode toggle（有 side effect: runTime→0）+ TipCard
- `UniformAccelerationSidebar` — 仅剩 areaMode segmented（复杂 side effect）+ 自定义 range input

> **注**：`ManBoatSidebar` 保留的键盘操作提示 div 对应动画中的 `manBoatControl=1` 模式——`ManBoatAnimation.tsx:65` 注册了 `keydown` 事件监听，用左右方向键操控小人在船上行走。这是动画本身的功能。

---

## controlMeta 支持矩阵

| controlMeta 类型 | 对应 UI 控件 | 支持的属性 |
|-----------------|-------------|-----------|
| `number` | Slider | min/max/step/unit, showIf/hideIf |
| `segmented` | SegmentedControl | options[], resetOnChange, showIf/hideIf |
| `toggle` | ToggleSwitch | trueValue/falseValue, resetOnChange, showIf/hideIf |
| `preset` ✅ | OptionButton(variant=preset) | params{}(支持函数式), resetOnApply/restartOnApply, showIf/hideIf |
| `tip` | TipCard | title/content, variant, showIf/hideIf |
| `action` ✅ | Button | label, variant, action(launch/restart/reset/setDirection), directionValue, showIf/hideIf |
| `storeToggle` ✅ | ToggleSwitch | label, storeKey(toggleVectors/toggleTimeSlices/toggleDualObjects), showIf/hideIf |

**仍不支持的能力**：
- onChange 联动（如切换模式时重置特定参数）→ 等 P2
- 动态内容（如 TipCard 文本随参数变化）→ 等 P3
- action 按钮附带 params 更新（如 SatelliteSidebar 的 launch 需先 setParams）→ 需扩展 action 类型

---

## 后续推进方案

### 阶段三（P2）：`onChangeSideEffect` 联动机制 — 解锁 ~5 个

```ts
onChangeSideEffect?: {
  resetParams?: string[]
  setParams?: Record<string, number>
}
```

覆盖：`FieldLinesSidebar`（条件分支重置探针）、`GasLawsSidebar`（slider 动态 key）、`FirstLawSidebar`（Q→0 联动）、`SpringCompositeSidebar`（time→0 联动）、`ElectricPotentialSidebar`（runTime→0 联动）。

### 阶段四（P3）：`tip` 支持动态 content — 解锁 ~2 个

```ts
content: string | ((params: Record<string, number>) => string)
```

覆盖：`LenzsLawSidebarExtra` 四步探究法动态 TipCard 等。

### 阶段五（P4）：电磁感应 7 个自定义布局 — 最后处理

---

## 实施优先级汇总

| 优先级 | 任务 | 状态 | 实际解锁 | 改动范围 |
|--------|------|------|---------|---------|
| P0 | `action` + `storeToggle` 类型 | ✅ | 4 个已迁移 | `types.ts` + `ControlPanel.tsx` + `AnimationPage.tsx` |
| P1 | `preset` 函数式 params | ✅ | 6 个已迁移 | `types.ts` + `ControlPanel.tsx` |
| P2 | `onChangeSideEffect` 联动 | 待执行 | ~5 | `types.ts` + `ControlPanel.tsx` |
| P3 | `tip` 动态 content | 待执行 | ~2 | `ControlPanel.tsx` |
| P4 | 电磁感应自定义布局 | 待评估 | 7 | 评估后决定 |

**P0+P1+本轮完成后：注册量 34，硬骨头 14（其中 8 个已精简为单控件外壳）。P2~P3 完成后预计可减少到 ~6 个。**
