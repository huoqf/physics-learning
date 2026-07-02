# SidebarExtra 收敛状态

> 最后更新：2026-07-02 | 完成记录：[2026-W27.md](./logs/2026-W27.md)

---

## 当前状态

| 指标 | 数值 |
|------|------|
| SidebarExtra 注册总量 | 23（原始 61，已删除 38） |
| 硬骨头（不可迁移） | 3 |
| 已精简/合理保留 | 20 |

---

## 仍需手写 JSX 的硬骨头（3 个）

| SidebarExtra | 阻塞原因 | 可能的解锁路径 |
|---|---|---|
| `ACValuesSidebarExtra` | Auto 按钮含 `getEffectiveCurrent()` 计算 + `useState(revealed)` 内部状态 | 扩展 action 类型支持计算回调 |
| `ACGenerationSidebarExtra` | mode 重置逻辑需 `resetAnimation()` + mode-dependent 滑块 | 扩展 onChangeSideEffect 支持 resetAnimation |
| `PowerTransmissionSidebarExtra` | 步进按钮（升/降电压）含计算逻辑 | 扩展 action 类型 |

### 其他保留（6 个，有技术阻塞或合理保留）

| SidebarExtra | 原因 |
|---|---|
| `FieldLinesSidebar` | segmented 切换时需条件分支重置探针位置 |
| `FreeFallSidebar` | 使用 `showTimeSlices`/`toggleTimeSlices`（非 params 驱动） |
| `VelocitySidebar` | Δt 档位 OptionButton grid + 运动模型嵌套 |
| `UniformAccelerationSidebar` | areaMode segmented（复杂 side effect）+ 自定义 range input |
| `ManBoatSidebar` | 键盘操作提示（动画功能本身） |
| 其余 14 个 | 力学能量/动力学/运动学/热学/直流电路等，已大幅精简 |

---

## controlMeta 支持矩阵

| controlMeta 类型 | 对应 UI 控件 | 支持的属性 |
|-----------------|-------------|-----------|
| `number` | Slider | min/max/step/unit, showIf/hideIf |
| `segmented` | SegmentedControl | options[], resetOnChange, showIf/hideIf |
| `toggle` | ToggleSwitch | trueValue/falseValue, resetOnChange, showIf/hideIf |
| `preset` | OptionButton(variant=preset) | params{}(支持函数式), resetOnApply/restartOnApply, showIf/hideIf |
| `tip` | TipCard | title/content(支持函数式), variant, showIf/hideIf |
| `action` | Button | label, variant, action(launch/restart/reset/setDirection), directionValue, showIf/hideIf |
| `storeToggle` | ToggleSwitch | label, storeKey(toggleVectors/toggleTimeSlices/toggleDualObjects), showIf/hideIf |

**仍不支持的能力**：
- action 按钮附带 params 更新（如 SatelliteSidebar 的 launch 需先 setParams）
- action 按钮执行计算回调（如 ACValues 的 Auto 等效）

### 左屏区块顺序约定

controlMeta 数组中 `group` 字段的排列顺序决定渲染顺序：

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

## 后续推进

解锁剩余 3 个硬骨头需扩展 `action` 类型：

```ts
// 目前 action 只支持语义化枚举
action: 'launch' | 'restart' | 'reset' | 'setDirection'

// 需扩展为支持自定义回调
action: 'launch' | 'restart' | 'reset' | 'setDirection' | 'custom'
onAction?: (params: Record<string, number>, setParams: (p: Record<string, number>) => void) => void
```

优先级：ACGeneration（最简单，仅需 resetAnimation） > PowerTransmission（步进按钮） > ACValues（计算逻辑最复杂）
