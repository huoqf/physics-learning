# SidebarExtra 收敛状态

> 最后更新：2026-07-01 | 完成记录：[2026-W27.md](./logs/2026-W27.md)

---

## 当前状态

| 指标 | 数值 |
|------|------|
| SidebarExtra 总数 | 61 → 29（减少 52%） |
| 完全删除 | 24 |
| 部分精简 | 8 |
| 保留不动 | 29 |

---

## 保留不动的 29 个 SidebarExtra 及原因

### 含 useAnimationStore 直接调用（2 个）
- `FrictionSidebar` — `toggleVectors`（已部分迁移：Segmented 已提取到 controlMeta）
- `KinematicsAdvancedSidebar` — `toggleVectors`（已部分迁移）

### 含自定义 action 按钮（4 个）
- `VelocitySelectorSidebar` — 发射粒子按钮 + 重新筛选按钮
- `SatelliteSidebar` — 发射/重置按钮
- `VelocitySidebar` — 多层嵌套 OptionButton grid（Δt 档位 + 运动模型）
- `AccelerationSidebar` — 自定义 preset 按钮（restartAnimation 而非 resetAnimation）

### 含复杂预设网格（8 个）
- `PowerSidebar` — 4 preset × 5 参数 + mode 联动重置
- `KineticEnergySidebar` — 2 preset × 5 参数 + mode 联动重置
- `PotentialEnergySidebar` — 双场景预设（2+2 个）+ 多参数重置
- `EnergyConservationSidebar` — 双场景预设（4+3 个）+ 多参数重置
- `SpringBlocksSidebar` — 4 preset Button（setParams 多参数）
- `ManBoatSidebar` — 4 preset Button + 键盘操作提示
- `ForceMotionSidebar` — 外部 config 依赖（FORCE_MOTION_MODES/PARAM_CONFIGS）
- `UniformAccelerationSidebar` — 自定义 `<input type="range">` + preset grid

### 含 onChange 联动逻辑（5 个）
- `FirstLawSidebar` — toggle 联动 updateParam('Q', 0)
- `SpringCompositeSidebar` — segmented 联动 updateParam('time', 0)
- `GasLawsSidebar` — slider 参数动态切换 key/min/max（mode 0→V, mode 1→T）
- `FieldLinesSidebar` — segmented 需重置探针位置（多参数 setParams）
- `ElectricPotentialSidebar` — toggle 需额外重置 runTime

### 含 AnimationPage 专有 props（1 个）
- `FreeFallSidebar` — 使用 showTimeSlices / toggleTimeSlices（非 params 驱动）

### 完全自定义布局（7 个）
- `InductionSidebarExtra` — 多分区（参数/回路/辅助/模式）+ 自定义 heading
- `LenzsLawSidebarExtra` — 四步探究法动态 TipCard + 自定义分区
- `CuttingEMFSidebarExtra` — Card 包装 + 多参数 Slider
- `FaradaySidebarExtra` — Card 包装 + 模态切换 + 多 Slider
- `ACGenerationSidebarExtra` — 自定义 Slider + Toggle 布局
- `ACValuesSidebarExtra` — useState 计算逻辑 + Auto 按钮
- `PowerTransmissionSidebarExtra` — 步进按钮 + 场景预设 + 稳压补偿

---

## controlMeta 支持矩阵

| controlMeta 类型 | 对应 UI 控件 | 支持的属性 |
|-----------------|-------------|-----------|
| `number` | Slider | min/max/step/unit, showIf/hideIf |
| `segmented` | SegmentedControl | options[], resetOnChange, showIf/hideIf |
| `toggle` | ToggleSwitch | trueValue/falseValue, resetOnChange, showIf/hideIf |
| `preset` | OptionButton(variant=preset) | params{}, resetOnApply/restartOnApply |
| `tip` | TipCard | title/content, variant, showIf/hideIf |

**不支持的能力**：
- onChange 联动（如切换模式时重置特定参数）
- 访问 useAnimationStore（非 params 驱动的状态）
- 动态内容（如 TipCard 文本随参数变化）
- 多按钮预设网格（一次设置 4+ 参数）
- 自定义 action 按钮（launch/restart/setDirection）

---

## 未来推进方向

若需进一步收敛，需先扩展 controlMeta 协议：
1. `preset` 支持动态 params 函数（而非静态对象）
2. 新增 `action` 类型（支持 launch/restart/setDirection 等语义按钮）
3. `tip` 支持动态 content 函数（根据 params 返回不同文本）
4. 新增 `storeToggle` 类型（桥接 useAnimationStore 的 boolean toggle）
