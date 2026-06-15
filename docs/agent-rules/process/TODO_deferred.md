# 延后处理待办事项

> 2026-06-11 评估确认需处理但暂不执行的项目。
> 每项标注：优先级、规范依据、影响范围、风险评估、当前状态。
>
> 2026-06-13 更新：清理已完成项，更新 SVG ID 冲突清单，补充断裂引用/死定义修复记录。
> 2026-06-14 更新：重新评估状态，清理已完成项（进度文案、WrongCard memo、vendor chunk、单元测试），更新行数/违规数。评估关闭 SVG ID 冲突项（架构保证不共存），新增断裂引用修复项。
> 2026-06-15 更新：重新评估颜色硬编码违规（77→10），降级为 P2；更新 store 全量解构数据（65→67 调用点，selector 使用归零）。

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

## 2. 颜色硬编码清理 — 走 theme token

**优先级**：P2（规范合规，影响范围已大幅缩小）
**规范依据**：02_UI §2 / 07_CANVAS §2.2 "禁止组件内写 HEX/rgb 颜色"
**当前状态**：暂不执行

### 影响范围（2026-06-15 重新统计）

| 硬编码类型 | 组件违规次数 | 涉及文件数 | 应替换为 |
|-----------|------------|-----------|---------|
| `#475569` | 7 | 3 | `PHYSICS_COLORS.labelText` 或新增 token |
| `#FFFFFF` | 1 | 1 | 新增 `glassHighlight` / `dataPointStroke` token |
| `#3B82F6` | 1 | 1 | `PHYSICS_COLORS.velocity` |
| `#EF4444` | 1 | 1 | `PHYSICS_COLORS.acceleration` |

**组件内硬编码颜色违规总计：10 次，涉及 4 个文件**（Block.tsx、SportsCar.tsx、LightBulb.tsx、DialMeter.tsx）。
均为 `src/components/Physics/` 下的 SVG 通用组件内联属性，替换为 token 收益较低。

> 注：此前记录的 rgba(148,163,184...)、rgba(75,85,99...)、rgba(245,158,11...) 已全部清理。

---

## 3. `AccelerationCenterExtra.tsx` 规范违反

**优先级**：P1（含铁律级违反）

| 问题 | 位置 | 规范依据 | 严重程度 |
|------|------|---------|---------|
| `animate-bounce` | L673,680 | 02_UI §1 明确禁止 bounce 动效 | 铁律 |
| 1 处 `bg-white rounded-xl shadow-sm` 直接拼写 | L687 | 08_THREE §5.3 要求使用 Card 组件 | 中 |
| 全量 store 解构 | L34 | ARCH §5.1 要求精确订阅 | 中 |
| `#3B82F6` / `#EF4444` 硬编码 | L352,487,497,502 | 02_UI §2 / 07_CANVAS §2.2 | 中 |

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
