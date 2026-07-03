# SidebarExtra 收敛状态

> 最后更新：2026-07-03 | 完成记录：[2026-W27.md](./logs/2026-W27.md)

---

## 当前状态

| 指标 | 数值 |
|------|------|
| SidebarExtra 注册总量 | 12（原始 61，已删除 49） |
| 硬骨头（不可迁移） | 0 |
| 已精简/合理保留 | 12 |

---

## 已解锁的原硬骨头（2 个）

| SidebarExtra | 解锁方式 |
|---|---|
| `ACValuesSidebarExtra` | toggle + tip 动态 content 替代 Auto 按钮 |
| `PowerTransmissionSidebarExtra` | 删除升/降变比按钮，用已有 k 滑块替代 |

### 其他保留（有技术阻塞或合理保留）

| SidebarExtra | 原因 |
|---|---|
| `FieldLinesSidebar` | segmented 切换时需条件分支重置探针位置 |
| `UniformAccelerationSidebar` | areaMode segmented（复杂 side effect）+ 自定义 range input |
| `FreeFallSidebar` | 已精简为纯提示卡片（环境状态 + g 值显示），保留用于动态 tip 内容 |
| `SatelliteSidebar` | launch 按钮需 setParams + restartAnimation 组合 |
| `ForceMotionSidebar` | 模式切换需重建整套默认参数 + 环境参数联动 |
| 其余 7 个 | 动力学/运动学/热学/直流电路等，已大幅精简 |

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

所有硬骨头已解锁，剩余 15 个 SidebarExtra 随后续维护逐步清理。
