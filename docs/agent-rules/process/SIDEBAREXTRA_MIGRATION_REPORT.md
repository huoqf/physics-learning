# SidebarExtra 收敛状态

> 最后更新：2026-07-03 | 完成记录：[2026-W27.md](./logs/2026-W27.md)

---

## 当前状态

| 指标 | 数值 |
|------|------|
| SidebarExtra 注册总量 | 0（原始 61，已删除 61） |
| 已迁移至 controlMeta | 11 |
| 保留（技术阻塞） | 0 |
| 孤立文件已清理 | 13 |

---

## 本次清理成果

### 已删除（孤立/空壳文件，12 个）

| 文件 | 原因 |
|------|------|
| `SpringBlocksSidebar.tsx` | 已空壳（返回 null） |
| `KinematicsAdvancedSidebar.tsx` | 已空壳（返回 null） |
| `CoulombLawSidebar.tsx` | 无 registry 引用 |
| `VectorAdditionSidebar.tsx` | 无 registry 引用 |
| `EquilibriumSidebar.tsx` | 无 registry 引用 |
| `EnergyConservationSidebar.tsx` | 无 registry 引用 |
| `KineticEnergySidebar.tsx` | 无 registry 引用 |
| `PowerSidebar.tsx` | 无 registry 引用 |
| `KeplerSidebar.tsx` | 无 registry 引用 |
| `WorkSidebar.tsx` | 无 registry 引用 |
| `ACValuesSidebarExtra.tsx` | 无 registry 引用 |
| `PowerTransmissionSidebarExtra.tsx` | 无 registry 引用 |

### 已迁移至 controlMeta（9 个）

| SidebarExtra | 迁移方式 |
|---|---|
| `SecondLawSidebar` | action: setDirectionAndRestart + resetAndRestart |
| `CircuitAnalysisSidebar` | tip: 动态 content 函数 |
| `ClosedCircuitSidebar` | 直接删除（纯展示，paramMeta 已覆盖） |
| `GravityBasicSidebar` | segmented: suspendPoint 悬挂孔选择 |
| `GravitySidebar` | segmented: preset 天体系统选择 |
| `PotentialEnergySidebar` | preset: 4 个重力场预设 |
| `LightRodRopeSidebar` | segmented + 5 个 toggle |
| `FieldLinesSidebar` | segmented + 2 toggle + tip（探针重置简化为固定位置） |
| `SatelliteSidebar` | preset(速度) + action(发射/重置, setParams) + tip |

### 保留（技术阻塞，0 个）

（全部清理完成）

---

## controlMeta 支持矩阵

| controlMeta 类型 | 对应 UI 控件 | 支持的属性 |
|-----------------|-------------|-----------|
| `number` | Slider | min/max/step/unit, showIf/hideIf |
| `segmented` | SegmentedControl | options[], resetOnChange, showIf/hideIf, onChangeSideEffect |
| `toggle` | ToggleSwitch | trueValue/falseValue, resetOnChange, showIf/hideIf |
| `preset` | OptionButton(variant=preset) | params{}(支持函数式), resetOnApply/restartOnApply, showIf/hideIf |
| `tip` | TipCard | title/content(支持函数式), variant, showIf/hideIf |
| `action` | Button | label, variant, action(launch/restart/reset/setDirection/setDirectionAndRestart/resetAndRestart), directionValue, setParams, showIf/hideIf |
| `storeToggle` | ToggleSwitch | label, storeKey(toggleVectors/toggleTimeSlices/toggleDualObjects), showIf/hideIf |

**新增 action 类型**：
- `setDirectionAndRestart`: setDirection + restartAnimation 组合
- `resetAndRestart`: resetAnimation + setDirection(-1) + restartAnimation 组合

**仍不支持的能力**：
- ~~onChangeSideEffect 支持条件分支（根据选中值设置不同参数）~~ ✅ 已支持（函数式 onChangeSideEffect，2026-07-13）

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

~~剩余 1 个 SidebarExtra 可通过以下方式进一步清理：~~ ✅ 全部完成（2026-07-13）

- `UniformAccelerationSidebar` → 函数式 onChangeSideEffect + areaMode 一等参数
- `ForceMotionSidebar` → `modeGrid` 控件类型 + `buildParamMeta` 动态参数元数据
