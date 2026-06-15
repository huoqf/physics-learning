# 延后处理待办事项

> 每项标注：优先级、规范依据、影响范围、风险评估、当前状态。
> 2026-06-15 精简：删除已完成/已关闭项，仅保留未完成项。

---

## 1. 动画组件体积过大 — 按规范拆分

**优先级**：P0（架构合规）
**规范依据**：ARCH §12.1 "单文件超 500 行应考虑拆分"
**当前状态**：暂不执行

| 文件 | 当前行数 | 阈值 | 备注 |
|------|---------|------|------|
| `FreeFallAnimation.tsx` | 778 | 500 | 已提取 2 个 hook，仍需按 JSX 块拆分 |
| `UniformAccelerationCenterExtra.tsx` | 713 | 500 | 已有 5 个子组件，可直接搬迁 |
| `VerticalThrowAnimation.tsx` | 744 | 500 | 已提取 2 个 hook，建议先拆图表区 |
| `AccelerationCenterExtra.tsx` | 701 | 500 | 无提取 helper，需修复规范违反（见 §3） |

拆分原则：按渲染子组件拆分，不改 props 接口；子组件通过 props 接收数据；ARCH §10 禁止同目录同名 `.ts`/`.tsx`。

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

`SCENE_COLORS` 中渐变使用 `string[]`，调用方依赖数组索引取色（`grad[2]` 语义不清）。目标改为语义化对象（`grad.mid`）。

影响：`COMMON_MATERIALS` 7 组、`SPHERE_COLORS` 8 组、`SPRING_COLORS` 2 组，共 ~50 处调用。

策略：新增结构化对象 + 保留数组兼容导出，分批迁移。

---

## 9. SCENE_COLORS 拆分 — 降低文件复杂度

**优先级**：P3（可读性）

`sceneColors.ts` 464 行，承载材质/器材/球体/发光效果/状态色。拆分为 `materialColors.ts`、`sceneEquipment.ts`、`glowEffects.ts`。

`BULB_GLOW_COLORS` 归属调整：当前在 `SCENE_COLORS.bulb`，实为渲染特效，应移到 `glowEffects.ts`。

前置条件：§8 渐变对象化完成后再拆分。

---

## 10. COMMON_MATERIALS / SPHERE_COLORS 合并 — 统一材质体系

**优先级**：P3（架构清晰度）

两套体系职责重叠，合并为 `MATERIAL_PRESETS`：`gradient` 表面颜色 + `stroke/shadow/glow` 渲染参数。

前置条件：§8 + §9 完成后再合并。

---

## 11. 命名规范统一 — 3D 拟物层命名一致性

**优先级**：P3（一致性）

各分组明暗层命名不统一（`Light/Base/Mid/Dark/Shadow/Stroke` 大小写不一致）。目标统一为 `{Part}{Layer}` 小写。

风险：大量 breaking changes，建议新旧并存迁移。

前置条件：§9 完成后再统一命名。

---

## 12. 响应式缩放体系统一

**优先级**：P1（跨章节高影响）
**规范依据**：无硬编码像素散落在 40+ 文件中，缺少统一缩放入口
**当前状态**：第 0+1+2 步已完成 ✅，A+B+C 类违规已修复 ✅，电磁学 Ch4/Ch5 违规已修复 ✅
**影响范围**：力学 Ch1-8（不含 5.5）、电磁学 Ch1-3，共 ~40 个动画组件

### 问题本质

不是"消灭所有 px"，而是建立统一的画布尺寸、比例尺、字体和物体尺寸派生体系。动画项目中像素值可作为设计基准存在，但必须通过统一缩放函数派生，不应散落在各文件中。

### 第 0 步：基础设施（必须先做）

**目标**：让后续迁移有统一入口可用。

1. **~~`useCanvasSize` 增加缩放能力~~** ✅

   `CanvasSize` 接口已扩展 `scale` / `px()` / `font()`，向后兼容。`initial` 参数简化为 `{ width, height }`。
   - `scale = Math.min(width / initial.width, height / initial.height)`
   - `font()` 内置 clamp(7, 16) 保证可读性
   - 58 个调用方无需修改

2. **~~定义 `CANVAS_PRESETS`~~** ✅

   `src/theme/spacing.ts` 新增 6 个预设：`tall`(700×450)、`standard`(700×420)、`mediumTall`(650×450)、`wide`(700×400)、`square`(600×600)、`extraWide`(800×440)。覆盖 35/57 个调用方。

3. **~~定义动画 UI token~~** ✅

   `src/theme/animationTokens.ts` 新建，含 `ANIM_FONT`、`ANIM_SHADOW`、`ANIM_PANEL`、`CHART_PAD` / `CHART_PAD_FREEFALL` / `CHART_PAD_VERT` 三组图表内边距。已通过 `@/theme` 统一导出。

4. **~~布局常量去重~~** ✅

   `vtInnerPad` 三种变体已提取为 `CHART_PAD`（40/15/22/25）、`CHART_PAD_FREEFALL`（50/40/35/40）、`CHART_PAD_VERT`（45/30/30/35）。后续组件迁移时替换。

**风险**：低。纯新增，不改现有行为。
**工作量**：~2h（已完成）。

### 第 1 步：物理比例尺响应化（高影响） ✅

**目标**：物理→像素比例尺不再写死，改为基于画布可用区域 + 物理世界范围计算。

**已完成**：

| 文件 | 原写死值 | 改为 |
|------|---------|------|
| `SpringForceAnimation.tsx` | `scale = 160` | `computeScale(w, h, WORLD, 80)` + 世界范围 ±0.6m |
| `NewtonSecondAnimation.tsx` | `scale = 15` | `computeScale(w-280, h, {0..15, 0..5})` |
| `VectorAdditionAnimation.tsx` | `scale = 15` | `computeScale(w, h, {-10..10}) * 0.6` |
| `GravityAnimation.tsx` | `scale = 26` | `computeScale(w*0.65, h, {-6..6, -4..4})` |
| `FrictionAnimation.tsx` | `35`/`25` px/m | `computeScale()` 按模式分别计算 |
| `useEquilibriumPhysics.ts` | `forceScale = 4.5` | `computeScale(w, h, {-3..3}) * 0.4` + arcR/textR 响应化 |
| `ElectricField.tsx` | `PX_PER_CM = 35` | `pxPerCm = w / 20`（700px 时 = 35） |
| `FieldLines.tsx` | `M_PER_PX = 0.005` | `mPerPx = 0.8 / separation` + separation 响应化 |
| `EnergyConservationAnimation.tsx` | `R_pix = 101` | `animAreaHeight * 0.7`（420px 时 ≈ 97） |

**工具函数**：`computeScale(canvasW, canvasH, world, padding?)` 已加入 `src/utils/coordinate.ts`。

**风险**：中。物理视觉表现会变化，需逐个动画验证。
**工作量**：~6h（已完成）。

### 第 2 步：字体 + 面板尺寸 token 化（中影响） ✅

**目标**：字体大小和面板/标签尺寸通过统一函数派生。

**已完成**：

- **31 个动画文件**的 SVG `fontSize={N}` 改为 `fontSize={font(N)}`（264 处）
- **13 个画布内文件**的 Tailwind `text-[Npx]` 改为 `style={{ fontSize: font(N) }}`（~38 处）
- 侧边栏组件（不在画布内）的 Tailwind 字体暂不迁移，留待后续按需处理

**风险**：低。纯视觉微调。
**工作量**：~4h（已完成）。

### 第 3 步：视觉细节清理（低影响，可选）

- `drop-shadow` 滤镜封装为 `ANIM_SHADOW.glow(color)`
- SVG marker 尺寸 token 化
- Tailwind arbitrary values（`max-w-[280px]`、`h-[150px]`）清理
- `useCanvasSize` 回退值统一引用 `CANVAS_PRESETS`

**风险**：极低。
**工作量**：~2h。

### 剩余违规（审计发现 114 处）

第 0-2 步迁移后审计发现以下未覆盖的文件：

**A 类：SVG fontSize 裸值（68 处，9 文件）**

| 文件 | 处数 | 值 |
|------|------|-----|
| `KeplerAnimation.tsx` | 22 | {7,8,9,10,11,12,15} |
| `SatelliteAnimation.tsx` | 10 | {6,7,8,9} |
| `FaradayLaw.tsx` | 9 | {9} |
| `CircularMotionAnimation.tsx` | 6 | {7,8} |
| `CentripetalAnimation.tsx` | 6 | {7,8} |
| `PowerTransmission.tsx` | 7 | {6,8,9} |
| `Transformer.tsx` | 3 | {9} |
| `CuttingEMF.tsx` | 3 | {8,9.5} |
| `ACGeneration.tsx` | 2 | {9.5,28} |

**B 类：硬编码物理比例尺（已全部修复 ✅）**

| 文件 | 写死值 | 状态 |
|------|--------|------|
| `magnetism/components/ForcePolygon.tsx` | `scale = 5.5` | ✅ 已改为 `computeScale()` |
| `magnetism/components/InclineForceDiagram.tsx` | `forceScale = 6.5` | ✅ 已改为 `computeScale()` |
| `electrostatics/FieldLines.tsx` | `DESIGN_M_PER_PX = 0.005` | ✅ 运行时已响应化 |
| `induction/CuttingEMF.tsx` | `scale={0.78}` | ✅ 已改为 `canvasSize.width / 900` |

**C 类：Tailwind text-[Npx] 画布内（16 处，3 文件）**

| 文件 | 处数 |
|------|------|
| `dc-circuits/CircuitAnalysis.tsx` | 4 |
| `dc-circuits/OhmLawCenterExtra.tsx` | 4 |
| `dc-circuits/ClosedCircuitCenterExtra.tsx` | 8 |

**D 类：useCanvasSize 应用 CANVAS_PRESETS（27 处，25 文件）**

所有匹配 CANVAS_PRESETS 的 `{ width, height }` 字面量应替换为预设常量。

### 执行约束

- 每步完成后跑 `npm run build` + `npm run lint` 验证
- 物理比例尺变更（第 1 步）需逐个动画截图对比，确保视觉比例不变
- 不改 props 接口，不改动画物理模型，只改渲染层的尺寸派生方式
- `viewBox` 固定值（如 `0 0 700 420`）配合 `preserveAspectRatio="xMidYMid meet"` 可保留，无需全部改为动态

### 总工作量估算

| 步骤 | 工作量 | 影响 |
|------|--------|------|
| 第 0 步：基础设施 | ~2h | 建立统一入口 |
| 第 1 步：物理比例尺 | ~6h | 9 个高危文件 |
| 第 2 步：字体 + 面板 | ~4h | 30+ 文件 |
| 第 3 步：视觉细节 | ~2h | 可选 |
| **合计** | **~14h** | |
