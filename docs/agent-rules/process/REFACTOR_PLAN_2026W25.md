# 架构重构方案 — 2026-W25

> 基于 2026-06-16 架构分析报告，经规范核实与风险评估后制定。
> 状态：待执行

---

## 0. 风险总览

| 编号 | 任务 | 影响文件数 | 回归风险 | 可独立验证 |
|------|------|-----------|---------|-----------|
| P0-B | totalPathLen 依赖修复 | 1 | 极低 | 是（resize 窗口看电子位置） |
| P0-A | lifecycle 重构 + hook 拆分 | 2 | 中 | 是（所有动画页面播放/暂停/重置） |
| P1-A | AnimationStore 职责清理 | 4 | 低 | 是（motionMode 相关页面） |
| P1-C | electromagnetism.ts 拆分 | 53 | 中 | 是（tsc + 单元测试） |
| P1-B | 大组件拆分（三屏对齐） | 3 | 高 | 是（逐个页面手动验证） |
| P2 | token 体系 / 接口 / 测试 / 清理 | 12+ | 低 | 是 |

---

## 1. P0-B：totalPathLen 依赖修复

### 1.1 问题描述

[FarahDayLaw.tsx L297-305](file:///d:/code/physic/physics-learning/src/features/electromagnetism/induction/FaradayLaw.tsx#L297-L305)：`useMemo(() => {...}, [])` 空依赖，`circuitPath` 依赖 `canvasSize`（resize 可变），但 `totalPathLen` 不会响应更新，导致电子粒子定位失效。

### 1.2 修复方案

```typescript
// 1. 将 circuitPath 也用 useMemo 包裹
const circuitPath = useMemo(() => [
  { x: solenoidLeftX, y: solenoidWireY },
  { x: meterPinLeftX, y: solenoidWireY },
  // ...
], [solenoidLeftX, solenoidWireY, meterPinLeftX, meterPinY, ...])

// 2. totalPathLen 依赖 circuitPath
const totalPathLen = useMemo(() => {
  let len = 0
  for (let i = 1; i < circuitPath.length; i++) {
    const dx = circuitPath[i].x - circuitPath[i - 1].x
    const dy = circuitPath[i].y - circuitPath[i - 1].y
    len += Math.hypot(dx, dy)
  }
  return len
}, [circuitPath])
```

### 1.3 风险评估

| 维度 | 评估 |
|------|------|
| 影响范围 | 仅 FaradayLaw.tsx 1 个文件 |
| 回归风险 | 极低——只增加依赖项，不改变计算逻辑 |
| 副作用 | 无——`getElectronicPos` 依赖 `totalPathLen`，依赖修正后自动正确 |
| 验证方式 | resize 窗口，观察基础模式下电子粒子是否仍在电路回路上 |

---

## 2. P0-A：lifecycle 重构 + hook 拆分

### 2.1 问题描述

[useAnimationLifecycle.ts L96-122](file:///d:/code/physic/physics-learning/src/hooks/useAnimationLifecycle.ts#L96-L122)：

1. 硬编码 `calculateLorentzTrajectory`，非粒子动画时仍在每帧无意义计算
2. `physicsState.trajectory` 每帧追加 200 点写入全局 store，违反 §5「不保存可派生状态」
3. 单一 hook 混杂了 config 加载、发现模式、播放循环三类职责

### 2.2 修复方案

**阶段 1：引入 `updatePhysics` 回调（不改对外接口）**

```typescript
// data/types.ts — AnimationConfig 新增可选字段
interface AnimationConfig {
  // ...现有字段
  /** 可选：有物理状态需要每帧计算的动画才声明 */
  updatePhysics?: (
    params: Record<string, number>,
    t: number,
    dt: number
  ) => Partial<PhysicsState> | null
}

// hooks/useAnimationLifecycle.ts — 播放循环改为条件调用
useAnimationFrame(
  (deltaTime) => {
    currentTimeRef.current += (deltaTime / 1000) * speed
    if (currentTimeRef.current >= maxTime) {
      currentTimeRef.current = maxTime
      setTime(maxTime)
      setIsPlaying(false)
      return
    }
    const t = currentTimeRef.current
    setTime(t)
    // 只在 config 声明了 updatePhysics 时才调用
    if (config?.updatePhysics) {
      const result = config.updatePhysics(params, t, deltaTime / 1000)
      if (result) setPhysicsState((prev) => ({ ...prev, ...result }))
    }
  },
  { playing: isPlaying, speed }
)
```

**阶段 2：内部拆分为子 hook（对外接口不变）**

```typescript
// hooks/useAnimationLifecycle.ts 内部重构
function useAnimationConfig(config) { ... }    // config 加载 + store 初始化
function useDiscoveryMode(config) { ... }       // 发现模式步骤管理
function usePlaybackLoop(config, isPlaying, speed) { ... } // rAF + updatePhysics

// 对外仍导出 useAnimationLifecycle()，内部组合三个子 hook
export function useAnimationLifecycle(): AnimationLifecycleResult {
  const config = useAnimationConfig(...)
  const discovery = useDiscoveryMode(config)
  const playback = usePlaybackLoop(config, ...)
  return { config, ...discovery, ...playback }
}
```

**阶段 3（可选，后续迭代）：为 Lorentz 动画注册 updatePhysics**

```typescript
// data/registries/electromagnetism-magnetism.ts
{
  id: 'charge-in-b-field',
  updatePhysics: (params, t, dt) => {
    const { q = 1, v = 10, B = 1, m = 1 } = params
    const res = calculateLorentzTrajectory(q, m, B, v, t)
    return { position: { x: res.x, y: res.y }, velocity: { vx: res.vx, vy: res.vy } }
  }
}
```

### 2.3 风险评估

| 维度 | 评估 |
|------|------|
| 影响范围 | `useAnimationLifecycle.ts`（改）+ `AnimationPage.tsx`（仅消费返回值，不改）= 2 文件 |
| 回归风险 | 中——所有动画页面的播放/暂停/重置都经过此 hook |
| 关键风险点 | 1. `updatePhysics` 返回 null 时不更新 store，需确保现有 Lorentz 动画注册了回调；2. 阶段 1 完成后无 `updatePhysics` 的动画不再写入 `physicsState`，需确认无其他代码依赖默认的 `{x:0,y:0}` 初始值 |
| 缓解措施 | 阶段 1 先保留 `physicsState` 初始化（L66 的 `setPhysicsState({position:{x:0,y:0},...})`），只在播放循环中条件调用；阶段 2 内部拆分不改变返回值类型 |
| 验证方式 | 1. `npm run build` 零错误；2. 逐个打开动画页面测试播放/暂停/重置；3. 重点测试 Lorentz 动画（`charge-in-b-field`）轨迹是否正常 |

### 2.4 验证清单

- [ ] 所有动画页面播放/暂停/重置正常
- [ ] Lorentz 动画轨迹正确（需注册 updatePhysics 后验证）
- [ ] 非 Lorentz 动画页面不再无意义写入 physicsState
- [ ] `npm run build` 零错误
- [ ] 现有测试通过

---

## 3. P1-A：AnimationStore 职责清理

### 3.1 问题描述

[useAnimationStore.ts](file:///d:/code/physic/physics-learning/src/stores/useAnimationStore.ts) 中 `physicsState` 和 `motionMode` 超出规范定义的职责。

### 3.2 修复方案

**步骤 1：移除 `physicsState`（依赖 P0-A 阶段 1 完成）**

P0-A 引入 `updatePhysics` 后，`physicsState` 的写入由各动画 config 驱动。但 `physicsState` 仍在全局 store 中，只是不再被非粒子动画无意义写入。完全移除需要：

1. 确认无其他代码订阅 `physicsState`（当前仅 `useAnimationLifecycle` 写入，无其他读取方）
2. 从 `AnimationState` 接口中删除 `physicsState` / `setPhysicsState`
3. 从 `reset()` 中删除 `physicsState` 重置
4. 各动画的 `updatePhysics` 回调改为返回局部状态，由组件自行管理

> **注意**：完全移除 `physicsState` 意味着需要为 Lorentz 等粒子动画提供替代的状态管理方案（组件内 `useRef` 或独立 store）。这属于较大改动，建议延后到 P1-B 大组件拆分时一并处理。

**步骤 2：迁移 `motionMode` 至 `useAppStore`**

```typescript
// stores/useAppStore.ts — 新增
motionMode: MotionMode
setMotionMode: (mode: MotionMode) => void

// stores/useAnimationStore.ts — 删除
// motionMode / setMotionMode

// 受影响文件（4个）批量替换 import
```

### 3.3 风险评估

| 维度 | 评估 |
|------|------|
| 影响范围 | `motionMode`：4 文件（useAnimationStore + 3 个消费方） |
| 回归风险 | 低——`motionMode` 迁移是简单的字段搬迁 |
| 关键风险点 | `physicsState` 移除需确认无隐式依赖；建议分两步：先迁移 `motionMode`（低风险），再评估 `physicsState` 移除时机 |
| 缓解措施 | `motionMode` 迁移后立即 `npm run build` 验证 |
| 验证方式 | 1. `npm run build` 零错误；2. VelocitySidebar / LenzsLaw / electromagnetism-induction 中 motionMode 切换正常 |

### 3.4 验证清单

- [x] `motionMode` 从 `useAnimationStore` 移除（已作为死代码清理）
- [x] 消费方无需迁移（`motionMode` 仅作为动画 params key 使用，非 store 字段）
- [x] `npm run build` 零错误
- [x] motionMode 相关页面功能正常（LenzsLaw 等）

---

## 4. P1-C：electromagnetism.ts 拆分

### 4.1 问题描述

[electromagnetism.ts](file:///d:/code/physic/physics-learning/src/physics/electromagnetism.ts)（1697行，58个导出）违反 §12.1 大文件拆分阈值，且包含渲染辅助函数（`computeHandPose`）和数学工具（`normalizeAngleDeg`）。

### 4.2 修复方案

**步骤 1：按子领域拆分物理计算**

```
src/physics/
├── electrostatics.ts    # calculateCoulombPendulum, calculateThreeChargeForces,
│                        # calculateElectricField, calculateElectricPotential,
│                        # calculateCapacitor, calculateChargeInEFieldTrajectory,
│                        # calculateNonUniformEField, getChargeInEFieldTargetPlayTime,
│                        # getChargeInEFieldTimeScale
├── dcCircuit.ts         # calculateOhmLaw, calculateSeriesResistance,
│                        # calculateParallelResistance, calculateClosedCircuit
├── magnetism.ts         # calculateAmpereForce, calculateLorentzForce,
│                        # calculateChargeInMagField, calculateLorentzTrajectory,
│                        # calcParticleRadius, calcParticlePeriod,
│                        # calcTrajectoryCenter, calcParticleArcAngle,
│                        # calculateMagnetInduction, calculateCoilInduction,
│                        # calculateVelocitySelectorTrajectory,
│                        # solveBasicAmpere, solveAdvancedAmpere
├── induction.ts         # calculateFaradayEMF, calculateCuttingEMF,
│                        # simulateForceMotion, calculateLenzsLaw,
│                        # computeFaradayEmf, computeFaradayMagnetFlux,
│                        # generateUniformFaradayPoints, generateMagnetFaradayPoints,
│                        # computeRodConstants, computeRodStateAtTime
└── acCircuit.ts         # calculateTransformer, calculateACRMS,
                         # calculateTransformerWithLoad, calculatePowerTransmission
```

**步骤 2：迁出非物理计算函数**

```
src/utils/handPose.ts
  ← computeHandPose / computeCuttingEMFHandPose（渲染辅助，§3.2）

src/math/angle.ts
  ← normalizeAngleDeg / lerpAngleDeg（数学工具，§4.2）
```

**步骤 3：更新 re-export**

```typescript
// src/physics/index.ts — 改为从子模块 re-export
export * from './electrostatics'
export * from './dcCircuit'
export * from './magnetism'
export * from './induction'
export * from './acCircuit'
```

**步骤 4：更新消费方 import**

- `from '@/physics/electromagnetism'` → `from '@/physics/magnetism'` 等（2 文件：FaradayLaw、ChargeInEField）
- `from '@/physics'` → 无需改动（re-export 兼容）
- `computeHandPose` → `from '@/utils/handPose'`（2 文件：HandRule、CuttingEMFHandRule）
- `normalizeAngleDeg` → `from '@/math/angle'`（1 文件：HandRule）

### 4.3 风险评估

| 维度 | 评估 |
|------|------|
| 影响范围 | 53 个文件 import `from '@/physics'`，但 re-export 兼容，实际需改 import 的仅 5 个文件 |
| 回归风险 | 中——函数签名不变，只是文件位置变化 |
| 关键风险点 | 1. re-export 导致 tree-shaking 效果减弱（全量导出）；2. `computeHandPose` 迁出后 `@/physics` 不再导出它，需确认无通过 `@/physics` 间接引用；3. 测试文件 `tests/physics/electromagnetism.test.ts` 需同步拆分或更新 import |
| 缓解措施 | 1. 保留 `src/physics/electromagnetism.ts` 作为 re-export barrel（`export * from './electrostatics'` 等），避免一次性改 53 个文件；2. 逐步迁移消费方到子模块 import；3. `npm run build` 验证 |
| 验证方式 | 1. `npm run build` 零错误；2. 现有 `electromagnetism.test.ts` 通过；3. 各动画页面功能正常 |

### 4.4 验证清单

- [x] 5 个子文件创建完成，函数签名不变
- [x] `electromagnetism.ts` 改为 re-export barrel
- [x] `computeHandPose` 迁至 `src/utils/handPose.ts`
- [x] `normalizeAngleDeg` 迁至 `src/math/angle.ts`
- [x] 5 个消费方 import 更新（HandRule.tsx 已更新）
- [x] `npm run build` 零错误
- [ ] 现有测试通过

---

## 5. P1-B：大组件拆分（三屏对齐）

### 5.1 问题描述

| 文件 | 行数 | 阈值 | 主要问题 |
|------|------|------|---------|
| ElectricField.tsx | ~1176 | 500 | 三屏逻辑混杂，坐标映射函数内联 |
| ElectricPotential.tsx | ~1093 | 500 | 同上 |
| FaradayLaw.tsx | 941 | 500 | 三屏逻辑混杂，双模式渲染+图表+电子动画 |

### 5.2 修复方案

**FaradayLaw.tsx 拆分：**

```
features/electromagnetism/induction/
├── FaradayLaw.tsx               # 薄壳，~100行，模式分发 + 数据流
├── FaradayMagnetSandbox.tsx     # 中间屏-基础模式（磁铁+电路+电子）
├── FaradayFieldSandbox.tsx      # 中间屏-进阶模式（均变磁场）
├── FaradayChartPanel.tsx        # 中间屏-Φ-t/E-t 双图表
└── hooks/
    └── useFaradayPhysics.ts     # chartPoints / currentState / circuitPath / totalPathLen
```

**ElectricField.tsx 拆分：**

```
features/electromagnetism/electrostatics/
├── ElectricField.tsx            # 薄壳，~100行
├── ElectricFieldScene.tsx       # 中间屏-场线/等势面渲染
├── ElectricFieldChart.tsx       # 中间屏-场强图表
└── hooks/
    └── useElectricFieldState.ts # 坐标映射 / 场强计算
```

**ElectricPotential.tsx 拆分：**

```
features/electromagnetism/electrostatics/
├── ElectricPotential.tsx        # 薄壳，~100行
├── ElectricPotentialScene.tsx   # 中间屏-等势面渲染
├── ElectricPotentialChart.tsx   # 中间屏-电势图表
└── hooks/
    └── useElectricPotentialState.ts
```

### 5.3 风险评估

| 维度 | 评估 |
|------|------|
| 影响范围 | 3 个大文件拆分为 ~12 个文件 |
| 回归风险 | 高——拆分涉及 JSX 结构重组、props 传递、状态管理方式变更 |
| 关键风险点 | 1. 拆分后子组件间的数据流（props vs store vs context）需仔细设计；2. `useShallow` selector 订阅需在子组件中正确使用；3. FaradayLaw 的 `circuitPath`/`totalPathLen`/`getElectronicPos` 是基础/进阶模式共享的，拆分时需通过 props 或 hook 传递；4. 动画注册表中的 `Component` 引用需更新 |
| 缓解措施 | 1. 逐个文件拆分，每拆一个就验证对应动画页面；2. 先拆 FaradayLaw（已有 P0-B 修复基础），再拆 ElectricField/ElectricPotential；3. 薄壳组件保留原有 `useAnimationStore` selector 订阅，通过 props 下发数据给子组件 |
| 验证方式 | 1. 逐个打开动画页面，验证所有交互（参数调节、模式切换、播放控制）；2. resize 窗口验证响应式；3. `npm run build` 零错误 |

### 5.4 验证清单

- [x] FaradayLaw 拆分完成（940→135 行薄壳 + 3 子组件 + 1 hook）
- [x] ElectricField 拆分完成（1176→342 行薄壳 + 2 子组件 + 1 hook）
- [x] ElectricPotential 拆分完成（1093→211 行薄壳 + 2 子组件 + 1 hook）
- [x] 所有动画页面交互正常
- [x] resize 响应式正常
- [x] `npm run build` 零错误

---

## 6. P2：低优先级优化

### 6.1 CANVAS_STYLE.font token 响应式治理

**问题**：`CANVAS_STYLE.font.axisSize` 等是固定数字 token（如 `12`），不具响应式能力。12 个文件使用 `CANVAS_STYLE.font.*`。

**方案**：将 `CANVAS_STYLE.font.*` 的值作为 `font()` 的基准参数，即 `fontSize={font(CANVAS_STYLE.font.axisSize)}` 等价于 `fontSize={font(12)}`。全局替换 12 个文件中的 `CANVAS_STYLE.font.*` 为 `font(CANVAS_STYLE.font.*)`。

**风险**：低——`font()` 内置 clamp(7, 16)，替换后行为一致。

### 6.2 Physics 组件统一基础接口

**方案**：在 `src/components/Physics/types.ts` 定义 `PhysicsComponentBase`，各组件 Props extends 它。

**风险**：极低——纯类型变更，不影响运行时。

### 6.3 测试覆盖

**优先级**：`calculateLorentzTrajectory` 边界值（`B=0`/`q=0`/`v=0`）、二分法收敛性。

### 6.4 清理 tsc_error.txt

空文件，直接删除。

---

## 7. 执行顺序与依赖关系

```
P0-B (15min)
  │
  ▼
P0-A 阶段1: updatePhysics 回调 (1h)
  │
  ├─→ P1-A: motionMode 迁移 (30min) ──可并行──→ P1-C: electromagnetism.ts 拆分 (2h)
  │
  ▼
P0-A 阶段2: 内部 hook 拆分 (1h)
  │
  ▼
P1-B: 大组件拆分 (3-5h)
  │
  ▼
P2: token 治理 / 接口 / 测试 / 清理 (持续)
```

**关键依赖**：
- P1-A 的 `physicsState` 移除依赖 P0-A 阶段 1 完成
- P1-B 的 FaradayLaw 拆分依赖 P0-B 修复（否则拆分时需同时修依赖 bug）
- P1-C 与 P1-A 可并行，无依赖关系

---

## 8. 回滚策略

| 任务 | 回滚方式 |
|------|---------|
| P0-B | git revert 单文件 |
| P0-A | 阶段 1 可回滚（删除 updatePhysics 判断，恢复硬编码）；阶段 2 内部拆分不改变对外接口，无需回滚 |
| P1-A | `motionMode` 迁移可 git revert 4 文件 |
| P1-C | 保留 `electromagnetism.ts` 作为 barrel，子文件可删除，barrel 恢复为原实现 |
| P1-B | 每个文件独立拆分，可单独 revert |
