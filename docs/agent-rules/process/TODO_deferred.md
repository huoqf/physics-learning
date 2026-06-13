# 延后处理待办事项

> 2026-06-11 评估确认需处理但暂不执行的项目。
> 每项标注：优先级、规范依据、影响范围、风险评估、当前状态。
>
> 2026-06-13 更新：清理已完成项，更新 SVG ID 冲突清单，补充断裂引用/死定义修复记录。

---

## 1. 动画组件体积过大 — 按规范拆分

**优先级**：P0（架构合规）
**规范依据**：ARCH §12.1 "单文件超 500 行应考虑拆分"
**当前状态**：暂不执行，待 SVG ID 冲突修复后启动

### 影响范围

| 文件 | 当前行数 | 阈值 | 备注 |
|------|---------|------|------|
| `FreeFallAnimation.tsx` | ~821 | 500 | 无预定义子组件，需按 JSX 块拆分 |
| `UniformAccelerationCenterExtra.tsx` | ~719 | 500 | 已有 4 个子组件，可直接搬迁 |
| `VerticalThrowAnimation.tsx` | ~750 | 500 | 已提取 2 个 hook，建议先只拆图表区 |
| `AccelerationCenterExtra.tsx` | ~716 | 500 | IIFE 分区清晰，需修复规范违反（见 §3.1） |

### 拆分原则

- 按渲染子组件拆分，不改 props 接口
- 子组件通过 props 接收数据，高频状态由父组件 selector 订阅后传入
- 拆分后子组件放入对应子目录，通过 barrel 导出
- ARCH §10：禁止同一目录下存在同名 `.ts` 与 `.tsx` 文件

### 前置条件

SVG ID 冲突修复（§3.3）完成后执行。

---

## 2. 颜色硬编码清理 — 全部走 theme token

**优先级**：P1（规范合规）
**规范依据**：02_UI §2 / 07_CANVAS §2.2 "禁止组件内写 HEX/rgb 颜色"
**当前状态**：暂不执行

### 影响范围

| 硬编码类型 | 出现文件数 | 总次数 | 应替换为 |
|-----------|-----------|--------|---------|
| `#FFFFFF`（材质高光/数据点描边） | 7 | 14 | 新增 `glassHighlight` / `dataPointStroke` token |
| `rgba(148, 163, 184, ...)` | 4 | 6 | `PHYSICS_COLORS.grid` + opacity |
| `rgba(75, 85, 99, ...)` | 3 | 3 | `VT_CHART_COLORS.slopeTangent` |
| `rgba(245, 158, 11, ...)` | 1 | 1 | 对应 theme token |
| `#3B82F6` / `#EF4444` | 1 | 6 | `PHYSICS_COLORS.velocity` / `.acceleration` |
| `#475569` | 2 | 10 | `PHYSICS_COLORS.labelText` 或新增 token |

---

## 3. 其他延后项

### 3.1 `AccelerationCenterExtra.tsx` 规范违反

**优先级**：P1（含铁律级违反）

| 问题 | 位置 | 规范依据 | 严重程度 |
|------|------|---------|---------|
| `animate-bounce` | L688,695 | 02_UI §1 明确禁止 bounce 动效 | 铁律 |
| 1 处 `bg-white rounded-xl shadow-sm` 直接拼写 | L702 | 08_THREE §5.3 要求使用 Card 组件 | 中 |
| 全量 store 解构 | L34 | ARCH §5.1 要求精确订阅 | 中 |
| `#3B82F6` / `#EF4444` 硬编码 | L353,488,498,503,616,617 | 02_UI §2 / 07_CANVAS §2.2 | 中 |

### 3.2 全库 store 全量解构

**优先级**：P2（系统性问题）

- 61 处文件使用 `useAnimationStore()` 全量解构
- 建议分批修正：先修正高频动画组件（kinematics/energy/circular），再扩展到其余模块
- 修正时必须用 selector 精细订阅

### 3.3 SVG ID 跨文件冲突

**优先级**：P2（预防性修复，当前无实际 bug）

#### 渐变 ID 重复

| ID | 定义文件数 | 类型一致 |
|----|-----------|---------|
| `steel-sphere-grad` | 8 | 一致 |
| `vacuum-sphere-grad` | 4 | 一致 |
| `glass-tube-grad` | 2 | 一致 |
| `wheel-grad` | 2 | **不一致**（linear vs radial） |
| `slider-metal` | 2 | 一致 |
| `slider-metal-grad` | 2 | 一致 |
| `block-grad` | 2 | 一致 |

#### 已修复项

- 断裂引用：FrictionCenterExtra、SpringForceCenterExtra、SatelliteAnimation
- 死定义：VerticalThrowAnimation、PotentialEnergyAnimation、CentripetalAnimation
- 断裂补充：MomentumTheoremAnimation、SatelliteAnimation

#### 推荐修复方案：`useSvgId` hook

迁移顺序：`glass-tube-grad`(2) → `slider-metal`(2) → `block-grad`(2) → `slider-metal-grad`(2) → `vacuum-sphere-grad`(4) → `wheel-grad`(2) → `steel-sphere-grad`(8) → VectorDefs(23)

### 3.5 进度文案 bug

**优先级**：P1（面向用户的错误信息）
**当前状态**：已完成（2026-06-13）

- `HomePage.tsx:74` 显示"力学模块"，但统计的是全部模块
- 已改为"全部模块"

### 3.6 WrongCard memo 优化

**优先级**：P1（性能）

- `WrongPage.tsx` 的 `renderCard` 内联函数是典型反模式
- 提取为 `React.memo(WrongCard)` 组件

### 3.9 提取重复 filter 工具

**优先级**：P2（DRY）

- `MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 WrongPage、PracticePage、ScoreReport 三处重复
- 提取到 `src/utils/moduleHelpers.ts`

### 3.10 vendor chunk 拆分

**优先级**：P4（工程化）

- `vite.config.ts` 的 `manualChunks` 中添加 vendor 分组

### 3.11 单元测试

**优先级**：P4（代码质量）

- 分批进行：第一批覆盖核心公式（kinematics.ts / dynamics.ts），第二批边界条件，第三批工具函数

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
