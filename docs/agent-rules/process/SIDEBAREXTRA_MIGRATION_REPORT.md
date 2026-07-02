# SidebarExtra 收敛状态

> 最后更新：2026-07-02 | 完成记录：[2026-W27.md](./logs/2026-W27.md)

---

## 当前状态

| 指标 | 数值 |
|------|------|
| SidebarExtra 注册总量 | 27（原始 61，已删除 34） |
| 已完全删除 | 34 |
| 已大幅精简（controlMeta 接管核心控件） | 20 |
| **仍需手写 JSX 的硬骨头** | **7**（其中 1 个仅剩 1-2 个控件） |

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

## P1.5 已完成：左屏 0-6 顺序规范 + AnimationPage 拆分

### 背景

左屏各区块应按固定顺序排列（无论页面是否包含所有区块）：
```
§0 同考点模型切换 → §1 模型选择 → §2 子模式 → §3 核心参数 → §4 显示辅助 → §5 快捷预设 → §6 教学提示
```

### 核心机制

- **`group` 字段**驱动 ControlPanel 分组渲染顺序（按 `controlMeta` 数组中首次出现顺序）
- **`AnimationPage.tsx`** 将单个 `<ControlPanel>` 拆为 before/after `<ParamControl>` 两段：
  - 前段：`group ∈ ['模型选择', '子模式']` 的控件 → §1 + §2
  - 后段：其余 group 的控件 → §4 + §5 + §6
- §3 核心参数始终由 `ParamControl`（paramMeta 驱动）独立渲染

### 改动文件
- `src/pages/AnimationPage.tsx` — 拆分 ControlPanel 为 modeControls + auxControls，按 group 名过滤

### 本次迁移的 SidebarExtra（4 个）
| SidebarExtra | 迁移内容 | 结果 |
|-------------|---------|------|
| `AccelerationSidebar` | Δt 三档 segmented → controlMeta `group:'子模式'` | **已从 registry 移除 + 文件删除** |
| `VelocitySelectorSidebar` | 电荷极性 segmented + 2 条 TipCard → controlMeta | **已从 registry 移除 + 文件删除** |
| `FrictionSidebar` | 4 个重力预设 OptionButton → controlMeta `group:'快捷预设'` | **已从 registry 移除 + 文件删除** |
| `GasLawsSidebar` | 动态 slider → paramMeta 加 showIf 条件（mode 0→V, mode 1/2→T） | **已从 registry 移除 + 文件删除** |

---

## P2 已完成：`onChangeSideEffect` 联动机制

### 改动文件
- `src/data/types.ts` — `ControlCondition` 新增 `onChangeSideEffect?: { resetParams?: string[]; setParams?: Record<string, number> }`
- `src/components/UI/ControlPanel.tsx` — 新增 `defaultParams` prop；`handleValueChange` / `handleToggleChange` 末尾调用 `applySideEffect()`
- `src/pages/AnimationPage.tsx` — 两处 `<ControlPanel>` 传入 `defaultParams={config.defaultParams}`

### 本次迁移的 SidebarExtra（3 个）

| SidebarExtra | 迁移内容 | 结果 |
|-------------|---------|------|
| `FirstLawSidebar` | toggle(adiabatic) + side effect `Q=0` → controlMeta | **已从 registry 移除 + 文件删除** |
| `SpringCompositeSidebar` | segmented(mode) + side effect `time=0` → controlMeta | **已从 registry 移除 + 文件删除** |
| `ElectricPotentialSidebar` | toggle(drawMode) + side effect `runTime=0` + TipCard → controlMeta | **已从 registry 移除 + 文件删除** |

---

## 仍需手写 JSX 的 7 个 SidebarExtra 及阻塞原因

### 含 onChange 联动逻辑（1 个，可用 P2 机制迁移）
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

### 已精简但仍保留（1 个）
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
- 动态内容（如 TipCard 文本随参数变化）→ 等 P3
- action 按钮附带 params 更新（如 SatelliteSidebar 的 launch 需先 setParams）→ 需扩展 action 类型

### 左屏区块顺序约定（P1.5）

controlMeta 数组中 `group` 字段的排列顺序决定渲染顺序。推荐的 0-6 顺序：

| 顺序 | group 名 | 对应区块 | 说明 |
|------|---------|---------|------|
| 0 | （自动检测） | 同考点模型切换 | siblingAnimations，无需 controlMeta |
| 1 | `模型选择` | 模型/演示模式 | segmented 切换基础/进阶 |
| 2 | `子模式` | 子模式/结构选择 | 轨道模型、边界类型等 |
| 3 | （paramMeta） | 核心参数调整 | 由 ParamControl 独立渲染 |
| 4 | `显示辅助` | 显示矢量/网格等 | toggle / storeToggle |
| 5 | `快捷预设` | 预设参数组合 | preset 类型 |
| 6 | `教学提示` | 教学 Tip | tip 类型 |

`AnimationPage.tsx` 按 `group ∈ ['模型选择', '子模式']` 将 controlMeta 拆为两段，
分别在 ParamControl 前后渲染，确保 §3 始终位于 §1/§2 与 §4/§5/§6 之间。

---

## 后续推进方案

### 阶段三（P3）：`tip` 支持动态 content — 解锁 ~2 个

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
| P1.5 | 左屏 0-6 顺序规范 + AnimationPage 拆分 | ✅ | 4 个已删除（AccelerationSidebar, VelocitySelectorSidebar, FrictionSidebar, GasLawsSidebar） | `AnimationPage.tsx` + `mechanics-kinematics.ts` + `electromagnetism-magnetism.ts` + `mechanics-dynamics.ts` + `thermodynamics-gas-laws.ts` |
| P2 | `onChangeSideEffect` 联动 | ✅ | 3 个已迁移（FirstLawSidebar, SpringCompositeSidebar, ElectricPotentialSidebar） | `types.ts` + `ControlPanel.tsx` + `AnimationPage.tsx` + 3 个 registry 文件 |
| P3 | `tip` 动态 content | 待执行 | ~2 | `ControlPanel.tsx` |
| P4 | 电磁感应自定义布局 | 待评估 | 7 | 评估后决定 |

**P0+P1+P1.5+P2 完成后：注册量 27，硬骨头 7（其中 1 个已精简为单控件外壳）。P3 完成后预计可减少到 ~5 个。**
