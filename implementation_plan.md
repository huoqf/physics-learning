# 第一节：电磁感应现象 课件页面开发计划

提供“磁铁插入线圈”和“双线圈回路”两种实验模式的电磁感应课件。本课件严格按照三屏布局职责分离、主题 Token、动画调度以及纯物理计算规范进行设计。

## User Review Required

> [!IMPORTANT]
> - 本节新增物理器材组件：`BarMagnet`、`Solenoid`、`Galvanometer` 和 `PrimaryCoil` 均统一放置在 `src/components/Physics/` 中，以 SVG 结构渲染，不采用 Canvas。
> - 在左侧参数控制面板，为了支持模式切换的 `SegmentedControl` 和磁感线显示的 `ToggleSwitch`，我们将在 `src/data/registries/electromagnetism-induction.ts` 中配置特异的 `SidebarExtra` 组件（`InductionSidebarExtra.tsx`），隐藏默认的 `ParamControl` 从而实现高定制的左侧栏。

## Open Questions

> [!NOTE]
> 1. **原线圈与副线圈的相对位置**：在“双线圈回路”中，原线圈与副线圈在 2D 视角下采用“并排平行放置”还是“同轴套入（通过半透明遮挡表现）”？建议采用“原线圈套在副线圈内部，但通过虚线/半透明表现”或者“左侧原线圈、右侧副线圈，磁感线在空间穿过两者”的并排方式，这在 2D 教学图解中更清晰易懂。本方案首选**并排放置**，在原线圈和副线圈之间绘制磁感线，使得磁场穿过副线圈的变化更加直观。
> 2. **自变量状态的 IndexedDB 序列化**：是否需要单独配置状态同步器，还是依靠页面刷新时利用 store 默认恢复？建议直接通过现有的 `useAnimationStore` 进行状态读取与存储，因为 parameters 已经具备了可序列化特性。

---

## Proposed Changes

### 1. 物理组件库 (Physics Component Library)

#### [NEW] [BarMagnet.tsx](file:///d:/code/physic/physics-learning/src/components/Physics/BarMagnet.tsx)
- 实现条形磁铁的水平绘制。
- 支持 `x` (中心 x 坐标), `y` (中心 y 坐标), `width`, `height`, `pole` (1 = 左S右N, -1 = 左N右S)。
- 用红色（`SCENE_COLORS.magnet.northBase`）表示 N 极，蓝色（`SCENE_COLORS.magnet.southBase`）表示 S 极。

#### [NEW] [Solenoid.tsx](file:///d:/code/physic/physics-learning/src/components/Physics/Solenoid.tsx)
- 螺线管线圈组件，使用 `SCENE_COLORS.coil.copperBase` 渲染铜线圈圈数。
- 线圈两端引出导线连接到下方的电流计接口。
- 支持 `current` 属性，当有感应电流时，在线圈前侧环绕段流动**青色**（`PHYSICS_COLORS.kineticEnergy`）光点。

#### [NEW] [Galvanometer.tsx](file:///d:/code/physic/physics-learning/src/components/Physics/Galvanometer.tsx)
- 灵敏电流计。包含表盘、标有 “G” 的中心字符，以及指向刻度盘的红色指针（使用 `SCENE_COLORS.circuit.meterNeedle`）。
- 接收 `value`（指针偏转比例，-1 到 1）作为参数，根据 `value` 动态偏转指针角度（$\theta = \text{value} \cdot 45^\circ$）。

#### [NEW] [PrimaryCoil.tsx](file:///d:/code/physic/physics-learning/src/components/Physics/PrimaryCoil.tsx)
- 原线圈。为了做视觉区分，采用绿漆漆包线颜色（`SCENE_COLORS.coil.enamelBase`）绘制，内部具有铁芯。
- 在进阶模式下，放置在副线圈（Solenoid）的左侧，通过导线与电源及滑动变阻器相连。

#### [MODIFY] [index.ts](file:///d:/code/physic/physics-learning/src/components/Physics/index.ts)
- 导出新增的四个组件：`BarMagnet`, `Solenoid`, `Galvanometer`, `PrimaryCoil`。

---

### 2. 物理公式与计算层 (Physics Calculations)

#### [MODIFY] [electromagnetism.ts](file:///d:/code/physic/physics-learning/src/physics/electromagnetism.ts)
- 新增 `calculateMagnetInduction(x: number, v: number, coilX: number, magnetPole: number)` 纯函数：
  - 基于公式 $\Phi(x) = \frac{\Phi_0}{1 + \alpha (x - x_{coil})^2}$ 计算磁通量 $\Phi$。
  - 基于导数 $d\Phi/dt = (d\Phi/dx) \cdot v$ 计算磁通量变化率 $\Delta\Phi$。
  - 计算感应电流与指针偏转角度 $\theta = k \cdot (d\Phi/dt)$。
- 新增 `calculateCoilInduction(R: number, dR_dt: number, E: number)` 纯函数：
  - 原线圈电流 $I_1 = E / R$。
  - 副线圈磁通量 $\Phi = \frac{k_0 \cdot E}{R}$。
  - 磁通量变化率 $d\Phi/dt = -\frac{k_0 \cdot E}{R^2} \cdot \frac{dR}{dt}$。
  - 计算感应电流与指针偏转角度 $\theta \propto d\Phi/dt$。
- 为新增函数添加完整 JSDoc、参数及返回值单位说明。

---

### 3. 数据层与动画注册 (Data & Registry)

#### [MODIFY] [electromagnetism.ts](file:///d:/code/physic/physics-learning/src/data/quantities/electromagnetism.ts)
- 新增 `anim-electromagnetic-induction` case：
  - 根据参数 `mode`，分别读取“磁铁运动”或“双线圈回路”的物理计算结果。
  - 返回因变量：磁通量 $\Phi$、磁通量变化率 $\Delta\Phi$。
  - 返回高考核心公式：$\Delta\Phi = \Phi_{末} - \Phi_{初}$ 及 $E = N \frac{\Delta\Phi}{\Delta t}$。
  - 提供关于“闭合回路中磁通量发生变化是产生感应电流的充要条件”的高考考点。

#### [MODIFY] [electromagnetism-induction.ts](file:///d:/code/physic/physics-learning/src/data/registries/electromagnetism-induction.ts)
- 注册 `anim-electromagnetic-induction` 动画：
  - 配置 `title`: "第一节：电磁感应现象"
  - 配置 `defaultParams` 和 `paramMeta`。
  - 关联主场景组件：`lazy(() => import('@/features/electromagnetism/induction/InductionPhenomenon'))`
  - 关联左侧栏特异组件：`lazy(() => import('@/features/electromagnetism/induction/InductionSidebarExtra'))`

---

### 4. 业务场景与控制层 (Feature Views)

#### [NEW] [InductionSidebarExtra.tsx](file:///d:/code/physic/physics-learning/src/features/electromagnetism/induction/InductionSidebarExtra.tsx)
- 左屏（自变量与控制）。
- 使用项目统一 UI 组件：
  - `SegmentedControl`：切换实验模式 `[基础: 磁铁运动]` 和 `[进阶: 双线圈回路]`。
  - `ToggleSwitch`：控制 `[磁感线显示]`。
  - `Slider`：
    - 基础模式下控制磁铁速度 $v$（在播放时决定运动速度，或通过手动拖拽控制）。
    - 进阶模式下控制滑动变阻器阻值 $R$。
- 不显示任何因变量结果，且颜色、圆角等统一引自主题 Token。

#### [NEW] [InductionPhenomenon.tsx](file:///d:/code/physic/physics-learning/src/features/electromagnetism/induction/InductionPhenomenon.tsx)
- 中屏（动画反馈与交互）。
- 单画布居中（纯 SVG 结构，利用 viewBox 动态自适应）。
- 绘制物体：
  - 基础模式：`BarMagnet`、`Solenoid`、`Galvanometer`，以及两根连线。
  - 进阶模式：`PrimaryCoil`（含滑动变阻器与电源回路）、`Solenoid`、`Galvanometer`。
- 动态颜色与反馈：
  - 速度 $v$：蓝色（`PHYSICS_COLORS.velocity`）箭头，使用统一 `VectorArrow` 并通过 `SceneConfig.refMagnitudes` 归一化。
  - 磁感线：绿色系（`PHYSICS_COLORS.magneticField`），根据磁场强度 $B$ 计算线圈处的疏密程度。
  - 电流：当有感应电流时，电流计指针左右偏转，线圈和连线上流动青色光点。
- 动画调度：
  - 拖拽和滑块移动通过 `useAnimationFrame`（借助 `src/utils/animation.ts` 调度）来实现磁铁位移 $\Delta x = v \cdot \Delta t$，并在速度停止时让偏转角指针通过 `ease-out` (复用 `src/theme/motion.ts` token) 回弹至 0。

---

## Verification Plan

### Automated Tests
- 运行 `npm run test` 或 `vitest` 验证新增纯物理计算函数的正确性。
- 通过 TypeScript 编译校验（`npm run build` 或 `tsc`）确保无类型报错。

### Manual Verification
1. 打开网页，进入“电磁感应现象”课件。
2. 基础模式下：
   - 拖动磁铁速度滑块，或直接在中屏鼠标拖拽磁铁。观察磁铁右端插入线圈时，电流计指针右偏；拔出时指针左偏。
   - 磁铁静止时，指针平滑地 ease-out 回弹归零。
   - 勾选“磁感线显示”开关，观察磁感线的穿过状态和疏密情况。
3. 进阶模式下：
   - 拖动变阻器滑块改变电阻。阻值变小时，磁感线变密；在拖动瞬间，电流计指针发生偏转。
   - 阻值停止改变时，指针回弹归零。
4. 检查右屏：物理量只回显因变量（如 $\Delta\Phi$ 和电流计指针状态），公式和高考考点渲染排版优雅美观。
