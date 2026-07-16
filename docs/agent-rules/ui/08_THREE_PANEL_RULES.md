# 08_THREE_PANEL_RULES — 三屏职责与侧屏组件规范

> 优先级：低于 02_UI_RULES.md，高于章节实现细节
> AI任务入口：实现或修改左侧屏、右侧屏、CenterExtra 时必须读本文件
> 最后更新：2026-07-01

---

## 1. 三屏职责边界（不可违反）

三屏职责边界表、职责分离铁律及详细说明统一定义于 `02_UI_RULES.md §5.1`，本文件不再重复。以下仅列本文件特有的补充约束：

1. 章节组件不得绕过统一 UI 组件自行实现按钮组、开关、选项卡

---

## 2. 左侧屏组件规范

### 2.1 左侧屏标准结构

```text
LeftPanel                         ← AnimationPage 左屏唯一顶层容器
  ├─ LeftPanelSection             ← 同考点模型切换 / 声明式控件分组 / 自定义分区
  ├─ ControlPanel                 ← 由 animationRegistry.controlMeta 生成（模式、开关、预设、提示等）
  ├─ ParamControl                 ← 由 animationRegistry.paramMeta 生成（连续数值型物理参数）
  └─ LeftPanelScrollArea          ← 承载复杂 SidebarExtra 长内容
```

**布局顺序**：同考点模型切换 → `controlMeta` 声明式控件 → `paramMeta` 数值参数 → 复杂 `SidebarExtra`。

> ⚠️ 注意：**布局顺序**（§2.1，从上到下排列）与 **声明式优先级**（§2.2，paramMeta 优先于 controlMeta）是两个不同维度。实现新页面时以 §2.2 优先级为准（先实现 paramMeta，再补充 controlMeta），最终视觉排列遵循本节布局顺序。

不是每章都必须全部出现，但出现时必须使用统一组件和统一样式。新页面不得重新手写左屏外层 `p-4 / border-t / rounded-xl` 容器。

### 2.2 声明式优先级（执行规范权威来源）

> 数据接口定义见 `ARCHITECTURE_RULES.md §8.1.3`，本节为 UI 执行层面的完整规范。

| 优先级 | 机制 | 适用内容 | 说明 |
|---:|------|----------|------|
| 1 | `paramMeta` → `ParamControl` | 连续数值型物理参数 | 速度、力、电阻、角度、质量等，可附带 `group/description/marks/importance/resetOnChange` |
| 2 | `controlMeta` → `ControlPanel` | 模式、开关、预设、提示、少量声明式 number | `segmented/toggle/preset/tip/number`，逐步替代简单 SidebarExtra |
| 3 | `SidebarExtra` | 真正复杂的页面专属控制 | 必须复用 `LeftPanelSection`，禁止散乱容器样式 |

### 2.3 组件使用边界

| 组件 / 协议 | 语义 | 使用场景 | 判断标准 |
|------|------|----------|----------|
| `LeftPanel` | 左屏顶层控制台容器 | AnimationPage 左侧屏 | 统一 padding、gap、定位上下文 |
| `LeftPanelSection` | 左屏分区卡片 | 模型选择、显示辅助、预设、教学提示、自定义 SidebarExtra 分区 | 替代手写 `border-t` / `bg-white rounded...` 容器 |
| `LeftPanelScrollArea` | 左屏长内容滚动区 | SidebarExtra 内容较长时 | 保证左屏滚动一致 |
| `ParamControl` | 标准数值参数组 | registry `paramMeta` | 自动支持精确输入、step 格式化、零点/mark、分组和恢复默认 |
| `ControlPanel` | 标准非数值控制组 | registry `controlMeta` | 自动渲染模式、开关、预设、提示等 |
| `Slider` | 连续参数调节 | 仅在复杂 SidebarExtra 中临时使用 | 值在 min-max 范围内连续变化；新标准参数优先迁移到 `paramMeta` |
| `SegmentedControl` | 同一维度互斥视图切换 | 复杂 SidebarExtra 中临时使用 | 简单模式切换优先迁移到 `controlMeta` |
| `OptionButton` | 参数值/预设/步进选择 | 复杂 SidebarExtra 中临时使用 | 简单预设优先迁移到 `controlMeta` |
| `ToggleSwitch` | 布尔状态开关 | 复杂 SidebarExtra 中临时使用 | 简单显示开关优先迁移到 `controlMeta` |

**禁止**：新 SidebarExtra 中手写按钮组、自定义 toggle、内联开关实现、原生 `<input type="range">`。连续参数必须使用 `Slider` 或 `paramMeta`；简单模式/开关/提示必须优先使用 `controlMeta`。

### 2.4 进阶模式统一规范

| 情况 | 推荐组件 | 示例 |
|------|----------|------|
| 基础/进阶是两个完整视图（CenterExtra 接管布局） | `SegmentedControl` | Velocity、UniformAcceleration、NewtonSecond |
| 进阶只是叠加显示额外控件 | `ToggleSwitch` | Projectile（空气阻力开关） |
| 进阶模式会触发中心区域布局变化 | `SegmentedControl`，切换时调用 `animationActions.resetAnimation()` | ConnectedBodies |

### 2.5 样式 token 规则

#### 控件状态色（必须走 UI token）

| 状态 | 样式 | 禁止 |
|------|------|------|
| 选中态 | `bg-primary-50 text-primary-700 border-primary-600` | `bg-blue-100`、`bg-amber-100`、`bg-slate-100` |
| 未选中态 | `bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50` | 自定义 hover 色 |
| 禁用态 | `opacity-40 cursor-not-allowed` | `opacity-50`、`pointer-events-none` |
| 进阶模式激活 | `bg-primary-600 text-white shadow-sm` | 自定义激活色 |

#### 物理量颜色（必须走 physics token）

物理量颜色（速度蓝、加速度红、力橙等）只用于图表曲线、矢量箭头、标签点，**不得**用于控件状态色。

#### 模块标题

统一 `text-xs font-semibold text-neutral-600`。禁止使用 `uppercase tracking-wider`（中文系统不适用）。

#### 提示信息

统一使用 `TipCard` 组件。左侧屏提示应简短，只解释当前控件影响，不展开知识讲解。

#### 左屏卡片容器

左屏控制台卡片必须优先使用 `LeftPanelSection`；页面级左屏顶层必须使用 `LeftPanel`。复杂 `SidebarExtra` 内部需要分区时，也必须用 `LeftPanelSection`，禁止继续手写完整卡片样式或 `mt-4 pt-4 border-t border-neutral-200` 分隔容器。

通用内容卡片（非左屏控制台）仍可使用 `Card` 组件；`Card` 标准样式：`bg-white rounded-xl shadow-sm border border-neutral-100`。

#### 重置按钮

当页面有 SidebarExtra 但无 ParamControl（`paramMeta` 为空）时，AnimationPage 在左侧面板右上角显示"重置"按钮（`RotateCcw` 图标 + "重置"文字），功能为重置参数到默认值 + 重置时间 + 暂停播放。有 ParamControl 的页面由 ParamControl 自带重置按钮。

#### 按钮交互

统一 `active:scale-[0.97]`，与 02_UI_RULES.md §7 组件 8 态规范一致。

---

## 3. 右侧屏内容规范

### 3.1 三段式结构（不可变骨架）

```text
PhysicsPanel
  ├─ QuantitySection      ← 物理量（名称 + 符号 + 当前值 + 单位）
  ├─ FormulaSection       ← 公式（KaTeX + 适用条件 + 易错提醒）
  └─ ExamPointSection     ← 高考要点（5级重要性标签）
```

即使某些章节内容较少，也保持这三个区块，可折叠或显示"暂无"。

### 3.2 Formula 数据结构

```text
Formula
  ├─ name: string          公式名称
  ├─ latex: string         KaTeX 表达式
  ├─ condition?: string    适用条件（如"仅适用于匀变速直线运动"）
  ├─ variables?: object    变量解释
  ├─ note?: string         易错提醒
  └─ level?: string        重要性或高考频率
```

`condition` 和 `note` 字段对后续章节至关重要：
- 机械能守恒条件、动量守恒条件
- 闭合电路欧姆定律适用条件
- 法拉第电磁感应定律方向判断
- 全反射条件

### 3.3 物理量区规范

- 每个物理量包含：名称、符号、当前值、单位
- 当前值实时联动动画状态
- 数值显示规则遵循 02_UI_RULES.md §7（正数 neutral-700、负数 danger-600、零值 neutral-400、极值 accent-600）

### 3.4 高考要点区规范

遵循 02_UI_RULES.md §6 的 5 级重要性标签体系（gaokao/hard/core/basic/extend）。

---

## 4. SidebarExtraProps 接口规范

### 4.1 接口定义

```text
SidebarExtraProps
  ├─ params: Record<string, number>           当前动画参数
  ├─ updateParam: (key, value) => void        更新单个参数
  ├─ setParams: (params) => void              批量更新参数
  ├─ disabled: boolean                        是否禁用交互
  └─ animationActions                         动画控制动作（语义化封装）
      ├─ resetAnimation: () => void           重置时间 + 暂停
      ├─ pauseAnimation: () => void            暂停播放
      └─ restartAnimation: () => void          重置时间 + 播放
```

### 4.2 SidebarExtra 布局规范

- **声明式优先**：简单模式切换、显示开关、预设按钮、提示卡必须优先迁移到 `controlMeta`；连续数值参数必须优先迁移到 `paramMeta`。
- **只承载复杂自定义控制**：仅当控件需要复杂布局、组合逻辑或动态预设时保留 `SidebarExtra`。
- **容器风格**：`SidebarExtra` 根分区或内部逻辑分区必须使用 `LeftPanelSection`；长内容由 AnimationPage 的 `LeftPanelScrollArea` 承载。
- **禁用状态**：通过 `disabled` prop 传递给各子组件，不在容器级设置 `opacity-40 pointer-events-none`。

### 4.3 禁止事项

- SidebarExtra **不得**直接访问 animation store 中的 `params`、`time`、`isPlaying` 及其更新方法
- 所需动画数据和动作必须由 AnimationPage 通过 props 注入
- 允许读取**纯 UI 环境状态**（如当前断点/主题），但仅限以下情况：读取 `useBreakpoint()`（响应式布局判断）或读取 `useAppStore` 中的 UI 模式字段（如 `mode`）。**禁止**读取 `useAnimationStore` / `useProgressStore` / `useProblemStore` 等业务 store 的任何字段。

### 4.4 animationActions 封装

`animationActions` 由 AnimationPage 从 `useAnimationStore` 中派生：

| 方法 | 底层实现 | 语义 |
|------|----------|------|
| `resetAnimation` | `setTime(0)` + `setIsPlaying(false)` | 重置到初始状态 |
| `pauseAnimation` | `setIsPlaying(false)` | 暂停播放 |
| `restartAnimation` | `setTime(0)` + `setIsPlaying(true)` | 从头开始播放 |

这样 SidebarExtra 只需知道业务语义，不依赖 store 实现细节。

---

## 5. CenterExtra 职责规范

### 5.1 允许内容

- 动画组件（AnimationComponent）
- 图表（MiniChart、SVG 图表）
- 数据表（频闪数据表等）
- 实时反馈（InfoBar、状态指示）
- 与当前图像直接绑定的短公式标注（如"斜率 = a""面积 = 位移"）

### 5.2 禁止内容

- 完整公式体系和推导过程 → 移到右侧屏 FormulaSection
- 知识讲解文本 → 移到右侧屏
- 高考考点总结 → 移到右侧屏 ExamPointSection

### 5.3 容器样式

- 卡片容器统一使用 `Card` 组件（`bg-white rounded-xl shadow-sm border border-neutral-100`）
- 禁止在 CenterExtra 中直接拼接 `rounded-xl shadow-md` 等样式

### 5.4 共享子组件

| 组件 | 职责 | 优先级 |
|------|------|--------|
| `MiniChart` | 迷你时序图表（多曲线、坐标轴、当前时刻标记、图例、响应式尺寸） | P1 |
| `InfoBar` | 顶部信息条（物理量色标 + 数值 + 单位） | P2 |

---

## 6. 新章节验收检查清单

每个新章节实现完成后，必须通过以下检查：

| 检查项 | 标准 |
|--------|------|
| 左侧屏是否只包含控制类内容 | 是 |
| 参数是否通过 `paramMeta → ParamControl` 或 `controlMeta → ControlPanel` 生成 | 是 |
| 连续参数是否优先使用 `paramMeta`，复杂例外才使用 `Slider` | 是 |
| 模式切换是否优先使用 `controlMeta.segmented`，复杂例外才手写 `SegmentedControl` | 是 |
| 状态切换是否优先使用 `controlMeta.toggle`，复杂例外才手写 `ToggleSwitch` | 是 |
| 预设选择是否优先使用 `controlMeta.preset`，复杂例外才手写 `OptionButton` | 是 |
| SidebarExtra 是否仅保留复杂自定义控制 | 是 |
| SidebarExtra 是否复用 `LeftPanelSection`，无手写分隔/卡片容器 | 是 |
| 是否存在硬编码控件状态色（bg-blue-*、bg-amber-* 等） | 否 |
| SidebarExtra 是否直接访问 animation store 的 params/time/isPlaying | 否 |
| 右侧屏是否包含物理量、公式、高考要点三段 | 是 |
| 公式是否包含适用条件（condition） | 是（如适用） |
| CenterExtra 是否避免重复展示右侧知识内容 | 是 |
| 卡片容器是否使用 Card 组件 | 是 |
| 模块标题是否使用统一格式 | 是 |

---

## 7. 底部播放控制器（AnimationControls）规范

中间屏动画区域底部统一由 `AnimationControls` 组件渲染，行为由 `AnimationConfig.controlsMode` 控制。**不得在动画组件内部自行渲染播放按钮或速度控件**。

### 7.1 模式定义

controlsMode 的完整定义（`timed` / `loop` / `param` 三种模式的选择标准、典型示例、注意事项）见 `ARCHITECTURE_RULES.md §8.1.4`，本文件不再重复。

### 7.2 布局约束

- 三种模式底部控制区的**高度应保持一致**（`param` 信息条的 padding 应与完整控制栏齐高），避免页面切换时产生跳变
- 控制区只能出现在 `AnimationCenter` 内部，**不得**由 `SidebarExtra` 或动画组件自行渲染额外的播放/暂停控件
- `'loop'` 型仍可通过速度选择器改变 `speed`，只是隐藏了无意义的暂停按钮

---

## 8. 扩展预留

当前左侧屏组件体系覆盖了力学和电磁学基础参数类型。后续章节如需以下扩展，应先更新本规范再实现：

| 扩展组件 | 适用场景 | 预计章节 |
|----------|----------|----------|
| `DirectionSelector` | 方向选择（电场方向、磁场方向、速度方向） | 电磁学 |
| `VectorToggleGroup` | 多矢量显示/隐藏 | 力学、电磁学 |
| `StructureSelector` | 电路结构、光学器件结构 | 电路、光学 |
| `PresetCard` | 复杂情境预设（标题+描述+参数预览） | 电磁感应、光学 |
| `UnitNumberInput` | 精确数值输入（不适合 slider 的参数） | 电路、原子物理 |

---

## 9. 相关文档索引

| 需要查询 | 查阅位置 |
|---------|----------|
| UI 视觉铁律、token 引用 | `ui/02_UI_RULES.md` |
| Canvas/SVG/图表规范 | `ui/07_CANVAS_SVG_CHART_RULES.md` |
| 动效时长/easing | `ui/03_MOTION_RULES.md` |
| 架构细则 | `core/ARCHITECTURE_RULES.md` |
| 物理量颜色完整表 | `src/theme/physics/colors.ts` |
| 动画注册表 | `src/data/animationRegistry.ts` |
| 底部控制器模式（controlsMode） | `core/ARCHITECTURE_RULES.md §8.1.4` + 本文件 §7 |
