# Lint 审计清单：9 Error + 62 Warning 逐条核查

> **审计日期**：2026-06-13
> **基线命令**：`npm run lint`（ESLint 9 flat config，`--report-unused-disable-directives --max-warnings 0`）
> **审计范围**：当前 HEAD 全量 lint 输出，不含任何代码修改
> **关联**：架构优化计划 P2-10（测试覆盖）前置条件

---

## 一、Error 清单（9 条）

### 1.1 `@typescript-eslint/no-explicit-any`（4 条）

全部集中在 `src/components/Physics/VTChart.tsx`，根因是 `physics.vtChartData` 的数据点类型未定义。

| 行号 | 上下文 | 说明 |
|------|--------|------|
| L9 | `interface VTChartProps { physics: any }` | props 定义，无数据模型约束 |
| L28 | `physics.vtChartData.map((p: any) => p.y)` | useMemo 内回调参数 |
| L49 | `physics.vtChartData.filter((p: any) => p.x <= time)` | useMemo 内回调参数 |
| L51 | `activeData.map((p: any) => ...)` | useMemo 内回调参数（同 L49 的后续链） |

**根因**：4 处 `any` 来自同一根因——`physics` prop 无类型定义，数据点结构（`{ x: number; y: number }`）未建模。

**修复方向**：定义 `VTDataPoint` 接口，将 `physics: any` 改为 `physics: { vtChartData: VTDataPoint[] }`，4 处 `any` 同时消除。

**禁止项**：不可用 `unknown` 替代后强制断言绕过；不可用 `skipLibCheck` 规避（`skipLibCheck` 只跳过声明文件，不消除源码 `any`）。

---

### 1.2 `@typescript-eslint/no-unused-vars`（5 条）

全部在测试文件。

| 文件 | 行号 | 变量 | 状态 | 处理方向 |
|------|------|------|------|----------|
| `tests/math/trigonometry.test.ts` | L11 | `EPS` | 精度常量未使用 | 优先检查文件内是否有浮点比较场景需要 `EPS`；若有则统一引用，若无则删除 |
| `tests/physics/celestial.test.ts` | L69 | `e`（偏心率） | 赋值后未断言 | 优先判断是否应校验椭圆轨道/偏心率关系；若为中间变量漏断言则补断言 |
| `tests/physics/dynamics.test.ts` | L253 | `f_max`（最大摩擦力） | 赋值后未断言 | 物理测试中此类变量通常有验证意义，优先补断言 |
| `tests/physics/kinematics.test.ts` | L17 | `VariableMotionModel` | import 从未引用 | 判断是否为旧 API 残留 import；若是则删除 |
| `tests/physics/kinematics.test.ts` | L147 | `r5` | 赋值后未断言 | 判断是否为第五组用例漏断言；若只是调试残留则删除 |

**处理原则**：测试中未使用变量，优先补断言（表达业务验证价值），确认无价值后再删除。不建议用 `_` 前缀绕过 lint。

---

## 二、Warning 清单（62 条）

### 2.1 按 rule 聚合统计

| Rule | 条数 | 风险等级 |
|------|------|----------|
| `react-hooks/exhaustive-deps` | 58 | 中 |
| `react-refresh/only-export-components` | 2 | 低 |
| 未分类 | 2 | 待核查 |

> ⚠️ lint 工具报告总数 62，逐条统计仅得 60。差额 2 条可能来自同一条 lint 输出包含多条 warning（如 `UniformAccelerationAnimation.tsx` L91:9 输出 4 条、L92:9 输出 4 条，按行计数易漏）。建议用 `npm run lint --format json` 输出结构化结果二次验证。

---

### 2.2 `react-hooks/exhaustive-deps`（58 条）按子类分类

#### 子类 A：遗漏依赖——函数未稳定化（~35 条）

函数在渲染体内定义，每次渲染引用变化，导致依赖数组中的函数引用失效。

| 文件 | 行号 | 缺失依赖 | 说明 |
|------|------|----------|------|
| `VTChart.tsx` | L53 | `vtToChartX`, `vtToChartY` | 坐标转换函数在渲染体内定义 |
| `FrictionCenterExtra.tsx` | L38, L59 | `originX`, `originY`, `plotH`, `plotW` | 布局参数未稳定 |
| `SpringForceCenterExtra.tsx` | L36 | `toSvgX`, `toSvgY` | SVG 坐标转换 |
| `ConnectedBodiesCenterExtra.tsx` | L158 | `g`, `m2` | 物理常量 |
| `ImpulseAnimation.tsx` | L128, L137, L149, L165 | `toChartX`, `toChartY` | 图表坐标转换 |
| `MomentumAnimation.tsx` | L236, L243 | `toCardX`, `toCardY` | 卡片坐标转换 |
| `MomentumTheoremAnimation.tsx` | L187 | `canvasSize.width` | 画布尺寸 |
| `AccelerationCenterExtra.tsx` | L136 | `effectiveMaxTime` | 有效最大时间 |
| `ObliqueThrowAnimation.tsx` | L88, L297 | `trajectory`, `originX` | 轨迹数据、原点 |
| `ProjectileAnimation.tsx` | L84, L296 | `trajectory`, `originX` | 同上 |
| `UniformAccelerationCenterExtra.tsx` | L514 | `physics.flashPoints.length` | 闪光点数量 |
| `CentripetalAnimation.tsx` | L222 | `rMax` | 最大半径 |
| `CircularMotionAnimation.tsx` | L238 | `rMax` | 同上 |
| `HandRule.tsx` | L94 | `middleDir`, `thumbDir` | 手指方向向量 |
| `useEquilibriumPhysics.ts` | L125 | `physState.brokenLine`, `physState.isDragging` | 物理状态字段 |

**修复方向**：先用 `useCallback` 稳定函数引用，或提取到组件外作为纯函数；布局/状态参数若为派生值，用 `useMemo` 包裹。

---

#### 子类 B：引用不稳定——对象/函数每次渲染重建（~15 条）

对象或函数在渲染体内创建，导致依赖它的 hook 每次重渲染。

| 文件 | 行号 | 不稳定引用 | 影响 |
|------|------|-----------|------|
| `UniformAccelerationAnimation.tsx` | L91 (×4), L92 (×4) | `toChartX`, `toChartY` 函数 | 8 条 warning，影响 4 个 useMemo |
| `UniformAccelerationCenterExtra.tsx` | L427 (×3), L428 (×3) | `toX`, `toY` 函数 | 6 条 warning，影响 3 个 useMemo |
| `VelocityVTChart.tsx` | L54, L55 | `toSvgX`, `toSvgY` 函数 | 2 条 warning |
| `ObliqueThrowAnimation.tsx` | L146 | `vtInnerPad` 对象 | 间接影响 L154, L157 |
| `ProjectileAnimation.tsx` | L145 | `vtInnerPad` 对象 | 间接影响 L156, L157 |

**修复方向**：将对象用 `useMemo` 包裹、函数用 `useCallback` 包裹，稳定引用后再重新评估依赖数组。

---

#### 子类 C：不必要依赖（~8 条）

依赖数组中包含不影响计算结果的项。

| 文件 | 行号 | 多余依赖 |
|------|------|----------|
| `Spring.tsx` | L67 | `x2`, `y2` |
| `CentripetalAnimation.tsx` | L104 | `rMax` |
| `CircularMotionAnimation.tsx` | L99 | `rMax` |
| `AccelerationCenterExtra.tsx` | L191 | `deltaX0`, `vA` |
| `useEquilibriumPhysics.ts` | L371 | `theta1`, `theta2` |
| `useVerticalThrowChartLayout.ts` | L131 | `vtInnerH` |
| `UniformAccelerationCenterExtra.tsx` | L206 | `originX` |

**修复方向**：直接从依赖数组移除。

---

#### 特殊 case：`FreeFallAnimation.tsx` L165 / L173

```
React Hook useEffect has a missing dependency: 'time'
```

需先确认 effect 的设计意图：
- 若 effect 目的是响应 `time` 变化（如更新某个状态）→ 将 `time` 加入依赖
- 若 effect 不应随 `time` 重跑（如一次性初始化）→ effect 内不应闭包读取 `time`，改用 `ref` 或拆分 effect
- 只有在确认是有意设计且无更好结构时，才加 `eslint-disable-next-line` 并写明原因

---

### 2.3 `react-refresh/only-export-components`（2 条）

| 文件 | 行号 | 说明 |
|------|------|------|
| `VectorDefs.tsx` | L3 | 组件文件同时导出了非组件内容（常量或工具函数） |
| `SkeletalHand.tsx` | L198 | 同上 |

**修复方向**：优先拆分——将非组件导出移到同目录的 `*.utils.ts` 或 `*.constants.ts`。只有当拆分造成更差设计时才加 disable 注释。

---

### 2.4 未分类 Warning（2 条）

lint 报告总数 62，逐条统计只得 60。建议用 `npm run lint --format json` 做二次验证，确认差额来源。

可能原因：
- 同一条 lint 输出包含多条 warning（如 `UniformAccelerationAnimation.tsx` L91:9 输出 4 条 warning），按行计数时漏计
- lint 输出格式中某些行的 rule name 被截断

---

## 三、修复优先级

| 优先级 | 问题 | 数量 | 处理策略 |
|--------|------|------|----------|
| 🔴 高 | `no-explicit-any` in VTChart | 4 | 定义 `VTDataPoint` 类型，改 props |
| 🔴 高 | `no-unused-vars` in tests | 5 | 优先补断言，确认无价值后删除 |
| 🟡 中 | `exhaustive-deps` 子类 A（遗漏依赖） | ~35 | 稳定函数/对象引用后再补依赖 |
| 🟡 中 | `exhaustive-deps` 子类 B（引用不稳定） | ~15 | 用 `useCallback`/`useMemo` 包裹 |
| 🟡 中 | `exhaustive-deps` 子类 C（不必要依赖） | ~8 | 直接从数组移除 |
| 🟢 低 | `only-export-components` | 2 | 拆分非组件导出 |
| ⚪ 待核查 | 未分类 Warning | 2 | 用 `--format json` 二次验证 |

---

## 四、按文件分组（Hook 问题成组处理建议）

同一文件内的多个 warning 通常来自同一组坐标转换函数或布局对象，应成组处理而非逐条孤立修。

| 文件 | warning 数 | 主要问题 | 建议处理顺序 |
|------|-----------|----------|-------------|
| `UniformAccelerationAnimation.tsx` | 8 | `toChartX`/`toChartY` 不稳定 | 1 |
| `UniformAccelerationCenterExtra.tsx` | 8 | `toX`/`toY` 不稳定 | 2 |
| `FreeFallAnimation.tsx` | 7 | `vtToX`/`vtToY` + `time` 依赖 | 3 |
| `ObliqueThrowAnimation.tsx` | 5 | `vtInnerPad` 对象 + `trajectory` | 4 |
| `ProjectileAnimation.tsx` | 5 | 同上 | 5 |
| `ImpulseAnimation.tsx` | 4 | `toChartX`/`toChartY` | 6 |
| `FreeFallDripAnimation.tsx` | 2 | `vtToX`/`vtToY` | 7 |
| `VelocityVTChart.tsx` | 2 | `toSvgX`/`toSvgY` | 8 |
| `MomentumAnimation.tsx` | 2 | `toCardX`/`toCardY` | 9 |
| 其余单条 warning 文件 | 各 1-2 | 各异 | 按依赖关系穿插处理 |

---

## 五、处理原则总结

1. **Error 先行**：9 个 Error 影响 CI 门禁，优先处理
2. **按文件成组**：Hook warning 不逐条孤立修，按文件内的公共函数/对象分组
3. **先稳定引用再补依赖**：子类 A 和 B 的根因是引用不稳定，先用 `useCallback`/`useMemo` 稳定，再评估依赖数组
4. **慎用 disable**：`eslint-disable-next-line` 仅在确认是有意设计且无更好结构时使用，必须写明原因
5. **测试变量先补断言**：不默认删除，先判断是否有业务验证价值
6. **未分类 warning 必须二次验证**：用 `--format json` 确认差额来源
