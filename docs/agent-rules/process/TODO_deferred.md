# 延后处理待办事项

> 2026-06-11 评估确认需处理但暂不执行的项目。
> 每项标注：优先级、规范依据、影响范围、风险评估、当前状态。
>
> 2026-06-13 更新：清理已完成项，更新 SVG ID 冲突清单，补充断裂引用/死定义修复记录。
> 2026-06-14 更新：重新评估状态，清理已完成项（进度文案、WrongCard memo、vendor chunk、单元测试），更新行数/违规数。评估关闭 SVG ID 冲突项（架构保证不共存），新增断裂引用修复项。
> 2026-06-15 更新：重新评估颜色硬编码违规（77→10），降级为 P2；更新 store 全量解构数据（65→67 调用点，selector 使用归零）。完成 Phase 1-2 颜色治理（删除 tailwindColors、neutral[0]→neutral.white、CANVAS_COLORS 引用 colors.*）。

---

## 1. 动画组件体积过大 — 按规范拆分

**优先级**：P0（架构合规）
**规范依据**：ARCH §12.1 "单文件超 500 行应考虑拆分"
**当前状态**：暂不执行

### 影响范围

| 文件 | 当前行数 | 阈值 | 备注 |
|------|---------|------|------|
| `FreeFallAnimation.tsx` | 778 | 500 | 已提取 2 个 hook，仍需按 JSX 块拆分 |
| `UniformAccelerationCenterExtra.tsx` | 713 | 500 | 已有 5 个子组件（StroboscopicAnimation/VtChartWithArea 等），可直接搬迁 |
| `VerticalThrowAnimation.tsx` | 744 | 500 | 已提取 2 个 hook，建议先拆图表区 |
| `AccelerationCenterExtra.tsx` | 701 | 500 | IIFE 分区清晰，无提取 helper，需修复规范违反（见 §3） |

### 拆分原则

- 按渲染子组件拆分，不改 props 接口
- 子组件通过 props 接收数据，高频状态由父组件 selector 订阅后传入
- 拆分后子组件放入对应子目录，通过 barrel 导出
- ARCH §10：禁止同一目录下存在同名 `.ts` 与 `.tsx` 文件

### 前置条件

无。

---

## ~~2. 颜色硬编码清理~~ — 已完成（2026-06-15）

~~**优先级**：P2~~

| 文件 | 修复内容 |
|------|---------|
| `Block.tsx` | `#475569`×2 → `CANVAS_COLORS.labelTextLight`，`#FFFFFF` → `colors.neutral.white` |
| `SportsCar.tsx` | `#EF4444` → `PHYSICS_COLORS.acceleration`，`#3B82F6` → `PHYSICS_COLORS.velocity` |
| `LightBulb.tsx` | `#475569`×3 → `CANVAS_COLORS.labelTextLight` |
| `DialMeter.tsx` | `#475569`×2 → `CANVAS_COLORS.labelTextLight` |

组件内硬编码颜色违规：**0 次**。

> 注：此前记录的 rgba(148,163,184...)、rgba(75,85,99...)、rgba(245,158,11...) 已全部清理。

---

## ~~3. `AccelerationCenterExtra.tsx` 规范违反~~ — 已完成（2026-06-15）

| 问题 | 修复方式 |
|------|---------|
| `animate-bounce` L673,L680 | → `animate-pulse`（铁律级违反） |
| `bg-white rounded-xl shadow-sm` L687 | → `<Card className="p-2">` |
| 全量 store 解构 L35 | → 7 个 `useAnimationStore((s) => s.xxx)` 精细订阅 |
| `#3B82F6` / `#EF4444` L352,L487,L497,L502 | → `PHYSICS_COLORS.velocity` / `PHYSICS_COLORS.acceleration` |

---

## 4. ~~SVG ID 跨文件冲突~~ — 已关闭

**优先级**：P2 → **已关闭**（2026-06-14 评估）
**关闭原因**：架构保证不同动画不会同时渲染，ID 冲突不会实际发生。

评估结论：
- 应用使用单路由 `/animation/:id`，每次只渲染一个动画
- Category A CenterExtra 与父组件互斥渲染，不共存
- Category B 共存的 5 对组件已验证 ID 全部不重叠
- 通用组件（Block/Ball/LightBulb）已使用 React `useId()` 保证唯一
- 所谓"重复 ID"数字已过时（实际比记录少），且全部不会在同一页面出现

已修复项（仍保留记录）：
- 断裂引用：FrictionCenterExtra、SpringForceCenterExtra、SatelliteAnimation
- 死定义：VerticalThrowAnimation、PotentialEnergyAnimation、CentripetalAnimation
- 断裂补充：MomentumTheoremAnimation、SatelliteAnimation

---

## 5. ~~SVG 断裂引用修复~~ — 已完成（2026-06-14）

| 文件 | 修复方式 |
|------|---------|
| `ProjectileAnimation.tsx` | 删除滑轨底座装饰块 + 补 `vacuum-sphere-grad` 渐变定义给投影球 |
| `VelocityAnimationStrip.tsx` | 删除气垫导轨底座（含刻度线）+ 固定架端 rect + `rail-grad` 渐变定义 |

---

## 6. 全库 store 全量解构

**优先级**：P2（系统性问题）

- **67 处**调用使用 `useAnimationStore()` 全量解构（67 个文件）
- selector 模式使用：**0 处**（此前记录的 35 处已全部回退）
- 建议分批修正：先修正高频动画组件（kinematics/energy/circular），再扩展到其余模块
- 修正时必须用 `useAnimationStore((s) => s.xxx)` 精细订阅

---

## 7. 提取重复 filter 工具

**优先级**：P2（DRY）

- `MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 2~3 个文件中重复定义
- 重复分布：WrongPage(5/5)、PracticePage(5/5)、ScoreReport(1/5)、PracticeSession(1/5)
- `src/utils/` 中无集中化版本
- 提取到 `src/utils/moduleHelpers.ts`

---

## 8. 渐变数组对象化 — 统一 gradient 结构

**优先级**：P2（开发体验）
**当前状态**：暂不执行

### 问题

`SCENE_COLORS` 中渐变使用 `string[]`，调用方依赖数组索引取色，语义不清：

```ts
// 当前：调用方必须知道 grad[0] = highlight, grad[1] = base, ...
steel.gradient[2]  // 这是 mid 还是 dark？

// 目标：语义化对象
steel.gradient.highlight  // 一目了然
```

### 影响范围

| 文件 | 渐变数组数 | 调用方数 |
|------|-----------|---------|
| `COMMON_MATERIALS` | 7 组 | ~15 处 |
| `SPHERE_COLORS` | 8 组（gradient 字段） | ~30 处 |
| `SPRING_COLORS` | 2 组（springMetalGrad/lightSpringMetalGrad） | ~5 处 |

### 迁移策略

分两步走，保留兼容层：

```ts
// Step 1: 新增结构化对象
const steelGradient = {
  highlight: '#FFFFFF',
  base: '#D1D5DB',
  mid: '#4B5563',
  dark: '#1F2937',
} as const

// Step 2: 保留数组兼容导出（供旧调用方渐进迁移）
const steelGradientStops = [
  steelGradient.highlight,
  steelGradient.base,
  steelGradient.mid,
  steelGradient.dark,
] as const
```

### 风险

- Canvas/SVG 渲染代码若依赖数组顺序 `gradient.forEach(...)`，改对象后需同步修改
- TypeScript `as const` 类型推导变化可能影响下游类型

### 前置条件

无。

---

## 9. SCENE_COLORS 拆分 — 降低文件复杂度

**优先级**：P3（可读性）
**当前状态**：暂不执行

### 问题

`sceneColors.ts` 464 行，承载材质、器材、球体、发光效果、状态色等多重职责。

### 拆分方案

```
sceneColors.ts（聚合导出）
├── materialColors.ts    — COMMON_MATERIALS + SPHERE_COLORS（合并见 §10）
├── sceneEquipment.ts    — MAGNET/COIL/SPRING/SURFACE/PENDULUM/CIRCUIT
├── glowEffects.ts       — BULB_GLOW_COLORS（从器材外观分离为渲染特效）
└── sceneColors.ts       — ENVIRONMENT/SPECIAL_EFFECTS/SAFETY/LAB_LABELS + 聚合导出
```

### `BULB_GLOW_COLORS` 归属调整

当前放在 `SCENE_COLORS.bulb` 下，但它是"发光渐变效果"（radialGradient 色阶），不是器材固有外观。移到 `SPECIAL_EFFECTS` 或独立 `glowEffects.ts` 更准确。

保留兼容别名：

```ts
export const SCENE_COLORS = {
  ...
  bulb: BULB_GLOW_COLORS, // deprecated → 迁移到 glowEffects
}
```

### 风险

- 引用路径变更需同步修改调用方
- 拆分后 barrel 导出需保持 `import { SCENE_COLORS } from '@/theme/physics'` 不变

### 前置条件

§8 渐变对象化完成后再拆分，避免两次大规模改动。

---

## 10. COMMON_MATERIALS / SPHERE_COLORS 合并 — 统一材质体系

**优先级**：P3（架构清晰度）
**当前状态**：暂不执行

### 问题

两套体系职责重叠：

- `COMMON_MATERIALS`：通用材质渐变（steelSphereGrad、vacuumSphereGrad…）
- `SPHERE_COLORS`：球体预设（gradient + stroke + shadow + glow + specular）

很多球体渐变直接引用材质渐变，导致调用方不知从哪里取色。

### 合并方案

```ts
export const MATERIAL_PRESETS = {
  steel: {
    gradient: { highlight: '#FFFFFF', base: '#D1D5DB', mid: '#4B5563', dark: '#1F2937' },
    stroke: '#334155',
    shadow: 'rgba(15, 23, 42, 0.18)',
    glow: 'rgba(148, 163, 184, 0.16)',
    specular: 'rgba(255, 255, 255, 0.55)',
  },
  // ...
} as const
```

职责分离：
- `MATERIAL_PRESETS.xxx.gradient` → 表面颜色（材质属性）
- `MATERIAL_PRESETS.xxx.stroke/shadow/glow` → 渲染参数（几何属性）

### 风险

- 命名迁移成本高，现有 `SCENE_COLORS.materials.steelSphereGrad` 和 `SCENE_COLORS.sphere.steel.gradient` 都要改
- 建议先引入新结构，旧结构标记 deprecated，分批迁移

### 前置条件

§8 渐变对象化 + §9 SCENE_COLORS 拆分完成后再合并。

---

## 11. 命名规范统一 — 3D 拟物层命名一致性

**优先级**：P3（一致性）
**当前状态**：暂不执行

### 问题

各分组的 3D 拟物明暗层命名不统一：

| 分组 | 命名模式 | 层级数 |
|------|---------|--------|
| MAGNET_COLORS | `Light/Base/Mid/Dark/Shadow/Stroke` | 6 |
| SPRING_COLORS | `Light/Base/Dark/Stroke` + 状态色 | 4+状态 |
| CIRCUIT_COLORS | `wire/wireActive/wireBroken`（状态前缀） | 状态式 |
| SPHERE_COLORS | 对象 `{ gradient, stroke, shadow, glow, specular }` | 5 |
| HAND_COLORS | `Light/Base/Mid/Dark/Shadow` + 骨骼 | 5 |

大小写也不统一：`Stroke` vs `stroke`、`Light` vs `light`。

### 目标规范

```ts
// 统一为：{Part}{Layer}
magnet: {
  north: {
    light: '',
    base: '',
    mid: '',
    dark: '',
    shadow: '',
    stroke: '',
  }
}
```

如果当前已大量使用 `{Part}Base` 扁平命名，可先统一大小写，不强行改嵌套结构。

### 风险

- 大量 breaking changes，涉及组件、测试、快照
- 建议新旧并存迁移，旧 key 标记 deprecated

### 前置条件

§9 SCENE_COLORS 拆分完成后再统一命名。

---

## 已完成项（2026-06-11）

| 项目 | 完成内容 |
|------|---------|
| 网格纸底纹移除 | 5 个文件 |
| 无用 import 清理 | 3 个文件的 `OPACITY` import |
| 死代码确认 | tsc --noEmit 零错误 |

## 已完成项（2026-06-13）

| 项目 | 完成内容 |
|------|---------|
| SVG 断裂引用修复 | FrictionCenterExtra、SpringForceCenterExtra、SatelliteAnimation |
| SVG 死定义清理 | VerticalThrowAnimation、PotentialEnergyAnimation、CentripetalAnimation |
| SVG 断裂引用补充 | MomentumTheoremAnimation、SatelliteAnimation |
| 摩擦力方向修复 | FrictionAnimation Mode 1 摩擦力箭头方向+起点修正 |
| 摩擦力重力起点修复 | FrictionAnimation Mode 1 重力起点旋转投影修正 |
| 摩擦力页面颜色清理 | 删除 3 处 `#FFFFFF` 高光描边 |
| ContentWithKatex memo | AnalysisPage.tsx `React.memo` 包裹 |
| buildPhysicsQuantities 降频 | AnimationPage.tsx 播放时 0.1s 精度 |
| VelocityCenterExtra 死代码清理 | 删除 `isLandscape` + 35 行不可达分支 |
| SHM 动画自动暂停 | 到达 chartTMax 时自动暂停，展示完整波形 |
| SHM 图表窗口锁定 | 数据结束时锁定窗口在 0~tMax，消除右侧空白 |
| 进度文案修复 | HomePage.tsx "力学模块" → "全部模块" |

## 已完成项（2026-06-14）

| 项目 | 完成内容 |
|------|---------|
| 进度文案 bug 确认 | HomePage.tsx:74 已为"全部模块" |
| WrongCard memo | WrongPage.tsx:52 已提取 `React.memo(WrongCard)` 组件 |
| vendor chunk 拆分 | vite.config.ts 已配置 `vendor-react` / `vendor-katex` |
| 单元测试 | kinematics.test.ts (467行) + dynamics.test.ts (432行) |

## 已完成项（2026-06-15）

| 项目 | 完成内容 |
|------|---------|
| 删除 tailwindColors | colors.ts + theme/index.ts 移除死代码（Tailwind v4 用 CSS 变量） |
| neutral[0] → neutral.white | 17 个文件 64 处引用更新 |
| CANVAS_COLORS 引用 colors.* | 8 个 neutral 映射色从硬编码 hex 改为 `colors.neutral[*]` |
| 颜色硬编码清理 | 4 个 Physics 通用组件 10 处违规全部修复（§2 完成） |
| AccelerationCenterExtra 规范违反 | animate-bounce→pulse、Card 组件、selector 订阅、颜色 token（§3 完成） |
