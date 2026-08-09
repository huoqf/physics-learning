# 左侧面板统一风格与交互优化

## 状态：✅ 已完成

- 启动日期：2026-06-17
- 完成日期：2026-06-17
- 范围：19 个文件修改，0 个新建
- 结果：22 处原生 range → 21 处 Slider 替换 + 1 处 splitN 仅统一 className

## 追加修复（06-17）

### 布局统一：参数在上，模式切换在下
修复了 4 个 SidebarExtra 的 SegmentedControl 位置（从顶部移至底部）：
- ACGenerationSidebarExtra
- ClosedCircuitSidebar
- OhmLawSidebar
- CircuitAnalysisSidebar

### 批量重置按钮
统一放置在左侧屏右上角（AnimationPage），条件渲染：
- 有 ParamControl 的页面：ParamControl 自带重置按钮（仅重置时间）
- 无 ParamControl 但有 SidebarExtra 的页面：右上角显示"重置"按钮（重置参数到默认值 + 重置时间 + 暂停）

实现：`AnimationPage.tsx` 左侧面板容器 `relative`，右上角 `absolute` 放置重置按钮。
条件：`paramControlParams.length === 0 && config.SidebarExtra && !isDiscoveryMode`
功能：`setParams(config.defaultParams)` + `handleReset()`

---

## Step 1：增强 Slider 组件

**状态**：✅ 已完成（06-17）

**文件**：`src/components/UI/Slider.tsx`

新增 props：

```typescript
minLabel?: string          // 范围最小端文字标签
maxLabel?: string          // 范围最大端文字标签
midLabel?: string          // 范围中间文字标签（absolute 居中）
formatValue?: (v: number) => string  // 自定义值格式化
description?: string       // 值下方独立行语义说明
```

注意事项：
- `description` 渲染在 value 下方独立行（`text-right -mt-1`），不放 value 同行右侧
- `midLabel` 使用 `absolute left-1/2 -translate-x-1/2` 精确居中
- 所有新增 props 均可选，向后兼容

**验证**：`npm run lint` 无新增问题 · `npm run build` 通过

---

## Step 2：批次替换原生 range

### 批次 1 — kinematics（6 个文件，12 处替换）

| 文件 | 状态 | 替换数 | 备注 |
|------|------|--------|------|
| FreeFallSidebar.tsx | ✅ | 4 | pressure 用 description；g 值改 text-neutral-500 italic |
| VelocitySidebar.tsx | ✅ | 1 | deltaT 用 formatValue={(v) => v.toFixed(3)} |
| VerticalThrowSidebar.tsx | ✅ | 3 | sliceDensity/airResistance/targetHeight |
| ProjectileSidebar.tsx | ✅ | 1 | airResistance |
| ObliqueThrowSidebar.tsx | ✅ | 1 | airResistance |
| UniformAccelerationSidebar.tsx | ✅ | 1 替换 + 1 保留 | flashPeriod 替换，splitN 仅统一 className |

注意事项（已完成）：
- ✅ UniformAccelerationSidebar flashPeriod 替换后，TipCard 保留在 Slider 外部下方
- ✅ FreeFallSidebar pressure 用 description（与 minLabel/maxLabel 互斥）

### 批次 2 — dynamics（2 个文件，5 处替换）

| 文件 | 状态 | 替换数 | 备注 |
|------|------|--------|------|
| NewtonSecondSidebar.tsx | ✅ | 3 | k/F0/omega |
| GravityBasicSidebar.tsx | ✅ | 2 | latitude（label "纬度 φ"）/ omegaScale，均用 minLabel/maxLabel |

### 批次 3 — dc-circuits（3 个文件，5 处替换 + 容器调整）

| 文件 | 状态 | 替换数 | 备注 |
|------|------|--------|------|
| OhmLawSidebar.tsx | ✅ | 2 | U/R，数值颜色由 Slider 内部统一 |
| ClosedCircuitSidebar.tsx | ✅ | 2 + 容器 | R/r 用 midLabel；移除半卡片包裹；只读行提升为独立区块 |
| CircuitAnalysisSidebar.tsx | ✅ | 1 | R2 用 midLabel，数值颜色由 Slider 内部统一 |

注意事项（已完成）：
- ✅ ClosedCircuitSidebar 只读电动势行已提升为独立区块
- ✅ ClosedCircuit + CircuitAnalysis 的 midLabel 使用 absolute 居中方案
- ✅ 三个文件的数值颜色由 Slider 内部统一处理

---

## Step 3：ACGenerationSidebarExtra 重构

**状态**：✅ 已完成（06-17）

**文件**：`src/features/electromagnetism/induction/ACGenerationSidebarExtra.tsx`

三项变更：
1. 接口对齐：自定义 interface → `SidebarExtraProps` ✅
2. 禁用状态：移除容器级 `opacity-40 pointer-events-none`，改为子组件逐个传 `disabled` ✅
3. 容器风格：移除卡片包裹，改为线分隔（`mt-4 pt-4 border-t`）✅
4. 标题处理：h3 → SegmentedControl `label` prop / span → `text-xs font-semibold text-neutral-600` ✅

---

## Step 4：残留样式统一

**状态**：✅ 已完成（06-17）

| 文件 | 改动 | 状态 |
|------|------|------|
| FreeFallSidebar.tsx 进阶 g 值 | `text-primary-700 font-semibold` → `text-neutral-500 italic` | ✅ 批次 1 已处理 |
| UniformAccelerationSidebar splitN | 仅统一 className（已是标准样式） | ✅ 无需改动 |

---

## 验证清单

- [x] `npm run lint` 无新增错误（4 errors / 79 warnings 均为预存）
- [x] `npm run build` 构建通过
- [ ] kinematics 全部动画（6 个）滑块交互正常
- [ ] dynamics 受影响动画（2 个）联动正常
- [ ] dc-circuits 全部动画（3 个）联动正常
- [ ] ACGenerationSidebarExtra 两种模式切换 + disabled 正确
- [ ] FreeFallSidebar pressure description 语义标签动态变化
- [ ] 跨浏览器视觉对比

---

## 回归问题（用户报告）

### 1. 批量重置按钮丢失
**受影响页面**：电磁感应(ch4)、恒定电流(ch2)、交变电流(ch5)、交变电流产生与图像

**排查方向**：
- ParamControl（含批量重置）由 AnimationPage 根据 `Object.entries(config.defaultParams ?? {})` 渲染
- 检查各动画的 `defaultParams` 配置是否完整
- SidebarExtra 变更不应影响 ParamControl 渲染逻辑

### 2. 布局顺序颠倒
**问题**：ACGenerationSidebarExtra 中 SegmentedControl（模式切换）被移到了顶部
**正确顺序**：参数设置在上 → 基础/进阶切换在下
**用户原话**："大部分都是参数设置在上，基础、进阶切换在下"
