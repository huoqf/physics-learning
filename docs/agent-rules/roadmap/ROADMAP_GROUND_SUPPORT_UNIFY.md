# 地面/支撑组件统一方案

> **目标**：将散落在 22+ 个动画文件中的内联地面/刻度/墙体绘制，统一收敛到 `PhysicsGround` 组件，消除重复代码，保证视觉一致性。
>
> **边界约束**：PhysicsGround 最多支持 4 种 type（ground / platform / wall / bracket），不再扩展。墙体和支架属于"支撑面附属结构"而非独立组件族，如果后续出现新的支撑类型（如滑轮支架、弹簧底座），优先通过 `children` 组合而非继续加 type。

---

## 一、现状盘点

### A. 已使用 PhysicsGround 的文件（8处，零改动）

| 文件 | 模块 | 用法 |
|------|------|------|
| MomentumScene.tsx | 动量碰撞 | ground + ruler |
| FreeFallScene.tsx | 自由落体 | ground + hatch |
| ElasticScene.tsx | 弹性势能 | ground |
| GravityScene.tsx | 重力势能 | ground |
| FrictionAnimation.tsx | 摩擦力 | ground ×2 |
| ForceMotionSandbox.tsx | 力与运动沙盒 | ground + ruler |
| WorkAnimation.tsx | 功 | ground + ruler |
| KineticEnergyScene.tsx | 动能 | ground |

### B. 内联 `<line>` 画地面（14处，需迁移）

| 文件 | 附加特征 |
|------|---------|
| NewtonSecondAnimation.tsx | 左侧挡板 |
| SpringForceAnimation.tsx | 平行细线 + 墙体 |
| ConnectedBodiesAnimation.tsx | url(#ground-pattern) 粗糙面 |
| MomentumTheoremAnimation.tsx | 支架斜线纹理 |
| MomentumConservationAnimation.tsx | — |
| ImpulseAnimation.tsx | — |
| CollisionAnimation.tsx | — |
| VerticalThrowAnimation.tsx | — |
| FreeFallDripAnimation.tsx | 玻璃管内刻度 |
| EnergyConservationAnimation.tsx | 悬挂支架 |
| GravityBasicAnimation.tsx | 支架横梁 |
| PowerScene.tsx | 平行细线 |
| PowerAnimation.tsx | — |
| WeightlessnessAnimation.tsx | 电梯轨道(竖线) |

### C. 内联带刻度尺的地面（8处，收益最大）

| 文件 | 刻度写法 |
|------|---------|
| VelocityAnimation.tsx | 手算 landmarks → tick + text |
| VelocityAnimationStrip.tsx | 手算 groundTicks → tick + text |
| UniformAccelerationAnimation.tsx | 手算 landmarks → tick + text |
| UniformAccelerationCenterExtra.tsx | Array.from 循环 tick |
| AccelerationAnimation.tsx | 两组轨道各自手写刻度 |
| AccelerationCenterExtra.tsx | roadY + 手写刻度 |
| ProjectileAnimation.tsx | axis + 标注 |
| ObliqueThrowAnimation.tsx | axis + 标注 |

### D. 墙体/支架等特殊支撑（6处，含 Weightlessness，Rails.tsx 排除）

| 文件 | 结构 | 归类 |
|------|------|------|
| SpringForceAnimation.tsx | 墙体 rect + 8条hatch | wall |
| ElasticScene.tsx | 墙体(已在PhysicsGround旁) | wall |
| MomentumTheoremAnimation.tsx | 固定支架矩形 + 斜线 | bracket |
| GravityBasicAnimation.tsx | 支架横梁 | bracket |
| EnergyConservationAnimation.tsx | 悬挂支架 | bracket |
| WeightlessnessAnimation.tsx | 电梯轨道(竖线) | **wall**（语义偏移，见§2说明） |
| Rails.tsx | 导轨支撑柱 | **不迁移**（已有独立组件，含3D渲染） |

---

## 二、组件设计方案

### 核心原则

1. **不新建组件**，在 PhysicsGround 内扩展 type
2. **type 封顶 4 个**：`ground | platform | wall | bracket`，不再增加
3. **尺寸语义统一**：所有 type 共用顶层 `x/y/width/height`，含义如下：

| type | x | y | width | height |
|------|----|----|-------|--------|
| ground | 左端 x | 地面线 y | 地面宽度 | 无(仅线) |
| platform | 左端 x | 平台顶边 y | 平台宽度 | `appearance.thickness` |
| wall | 左端 x | 墙顶 y | 墙宽 | 由外部 `height` prop 控制 |
| bracket | 左端 x | 横梁 y | 横梁宽度 | 无(仅线) |

### Props 定义

```typescript
export interface PhysicsGroundProps {
  // === 基础位置（所有 type 共用） ===
  x: number;
  y: number;
  width: number;

  // === 类型 ===
  type?: 'ground' | 'platform' | 'wall' | 'bracket';

  // === 通用视觉 ===
  appearance?: {
    thickness?: number;       // platform: 平台厚度 (默认 20)
    color?: string;           // 覆盖线框色
    fillColor?: string;       // platform 填充色 / wall 填充色
    showHatch?: boolean;      // 斜线纹理 (ground/wall 通用)
    showBaseShadow?: boolean; // 平行细线 (向后兼容)
  };

  // === wall 专属 ===
  wall?: {
    height: number;           // 墙体高度 (必填)
    hatchCount?: number;      // hatch 斜线数量 (默认 8)
    hatchSide?: 'left' | 'right'; // hatch 朝向 (默认 'right')
  };

  // === 标尺（ground/platform 通用） ===
  ruler?: {
    position?: 'top' | 'bottom';
    domain: [number, number];
    pixelPerUnit?: number;
    tickInterval?: number;
    minorTicks?: number;
    unit?: string;
    showAxisLine?: boolean;
    showAxisArrow?: boolean;
    axisLabel?: string;
    axisOffset?: number;
  };

  children?: ReactNode;
}
```

### 关键设计决策

**1. wall 的 `height` 为什么不放顶层？**

顶层 `height` 在 ground/bracket 模式下无意义，强制传入会误导。wall 是唯一需要显式高度的 type，所以放在 `wall.height` 子对象中，使用时语义清晰。

**2. WeightlessnessAnimation 的电梯轨道归为 wall 而非 rail？**

电梯轨道本质是两面竖直墙体，渲染为矩形 + 竖线。命名为 `rail` 会引入第 5 种 type，违反边界约束。保持 `wall` 类型，通过 `wall.hatchSide` 控制 hatch 方向。

**3. ConnectedBodiesAnimation 的 pattern 替换**

原实现用 `url(#ground-pattern)` SVG pattern 填充粗糙面。迁移后用 `appearance.fillColor` + `appearance.showHatch` 替代。**视觉差异风险**：pattern 是密集点阵，hatch 是斜线。建议迁移时先截图对比，如果视觉差异不可接受，保留该文件不迁移。

### wall 渲染逻辑

```tsx
if (type === 'wall') {
  if (!wall) {
    console.error('PhysicsGround: type="wall" requires wall prop')
    return null
  }
  const { height: h, hatchCount = 8, hatchSide = 'right' } = wall
  const fill = appearance?.fillColor || PHYSICS_COLORS.objectFillNeutral
  const stroke = appearance?.color || PHYSICS_COLORS.axis

  return (
    <g>
      {/* 矩形主体 */}
      <rect x={x} y={y} width={width} height={h}
        fill={fill} stroke={stroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />

      {/* 斜线 hatch */}
      {appearance?.showHatch && Array.from({ length: hatchCount }).map((_, i) => {
        const step = h / hatchCount
        // left: 左下→右上 (/)  |  right: 左上→右下 (\)
        const x1 = hatchSide === 'left' ? x : x
        const y1 = hatchSide === 'left' ? y + i * step + step : y + i * step
        const x2 = hatchSide === 'left' ? x + width : x + width
        const y2 = hatchSide === 'left' ? y + i * step : y + i * step + step
        return (
          <line key={i}
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke={stroke} strokeWidth={1.5} opacity={0.4} />
        )
      })}
    </g>
  )
}
```

### bracket 渲染逻辑

```tsx
if (type === 'bracket') {
  const stroke = appearance?.color || PHYSICS_COLORS.axis
  return (
    <g>
      {/* 横梁主线 */}
      <line x1={x} y1={y} x2={x + width} y2={y}
        stroke={stroke} strokeWidth={STROKE.groundLine} />

      {/* 可选平行细线（粗糙面效果） */}
      {appearance?.showBaseShadow && (
        <line x1={x} y1={y + 3} x2={x + width} y2={y + 3}
          stroke={stroke} strokeWidth={1} opacity={0.3} />
      )}

      {/* 可选斜线纹理（MomentumTheoremAnimation 支架样式） */}
      {/* NOTE: showHatch 的默认布局 (y-80, 8条线) 为 MomentumTheoremAnimation 兼容，
          如遇更复杂支架结构，优先用 children 组合而非继续加 props */}
      {appearance?.showHatch && (
        <g opacity={0.4}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i}
              x1={x} y1={y - 80 + i * 15}
              x2={x + width} y2={y - 80 + i * 15 + 15}
              stroke={stroke} strokeWidth={1.5} />
          ))}
        </g>
      )}
    </g>
  )
}
```

---

## 三、迁移计划（分四阶段）

### Phase 0：组件扩展 + 测试（先于所有迁移）

**改动文件**：`PhysicsGround.tsx` + `PhysicsGround.test.ts`

1. 扩展 PhysicsGroundProps 接口（新增 `wall` / `bracket` type）
2. 实现 wall / bracket 渲染分支
3. 补充单元测试：
   - wall: 默认 hatch 数量、hatchSide 方向、fillColor 覆盖
   - bracket: 横梁线渲染、showBaseShadow 平行线、showHatch 斜线纹理
   - 向后兼容：不传 wall/bracket prop 时行为不变
4. `npm run typecheck` + `npm run lint` 通过

**验收**：现有 8 处 PhysicsGround 调用零改动，所有测试通过。

> **bracket 复杂度说明**：MomentumTheoremAnimation 的支架包含矩形+斜线纹理，复杂度高于纯横线。Phase 1 迁移时需重点验证 bracket 能否完全还原原效果，如差距过大则保留原内联写法。

### Phase 1：墙体/支架迁移（6处）

| 文件 | 改动 | 验证方式 |
|------|------|---------|
| SpringForceAnimation.tsx | rect+hatch → `type="wall"` | 运行动画，对比墙体外观 |
| ElasticScene.tsx | 墙体部分 → `type="wall"` | 同上 |
| MomentumTheoremAnimation.tsx | 支架 → `type="bracket"` | 对比支架线位置 |
| GravityBasicAnimation.tsx | 横梁 → `type="bracket"` | 对比横梁线 |
| EnergyConservationAnimation.tsx | 悬挂支架 → `type="bracket"` | 对比支架线 |
| WeightlessnessAnimation.tsx | 电梯轨道 → `type="wall"` ×2 | 对比轨道竖线位置 |

**每文件迁移步骤**：
1. 截图改前状态（动画播放到中间帧）
2. 替换内联 SVG 为 PhysicsGround
3. 截图改后状态，肉眼对比
4. 确认无差异后继续下一个

**注意**：WeightlessnessAnimation 的轨道是纯竖线，不含 hatch，迁移时不传 `appearance.showHatch`（默认 false）。

### Phase 2：简单地面线迁移（13处）

将 `<line x1={} y1={groundY} ... />` 替换为：

```tsx
<PhysicsGround x={leftX} y={groundY} width={rightX - leftX} />
```

| 文件 | 特殊处理 |
|------|---------|
| NewtonSecondAnimation.tsx | 挡板保留为独立 `<line>`，不纳入 PhysicsGround |
| SpringForceAnimation.tsx | 地面线部分（墙体已在 Phase 1 迁移） |
| ConnectedBodiesAnimation.tsx | **待定**：pattern → hatch 视觉差异需截图确认，如不可接受则跳过 |
| MomentumTheoremAnimation.tsx | — |
| MomentumConservationAnimation.tsx | — |
| ImpulseAnimation.tsx | — |
| CollisionAnimation.tsx | — |
| VerticalThrowAnimation.tsx | — |
| FreeFallDripAnimation.tsx | 玻璃管保留为独立元素，只迁移底部地面线 |
| EnergyConservationAnimation.tsx | — |
| GravityBasicAnimation.tsx | — |
| PowerScene.tsx | `showBaseShadow: true` 替代平行细线 |
| PowerAnimation.tsx | — |

**验证**：每文件改后运行动画，确认地面线位置/颜色/粗细一致。

### Phase 3：带刻度尺的地面迁移（8处，核心收益）

每个文件的手写刻度逻辑替换为 `ruler` prop。

**迁移模板（以 VelocityAnimation 为例）：**

```tsx
// 改前：~20行手写刻度
<line x1={pad} y1={groundY} x2={w-pad} y2={groundY} ... />
{landmarkLabels.map(lm => (
  <g>
    <line x1={lm.x} y1={groundY} x2={lm.x} y2={groundY+6} ... />
    <text x={lm.x} y={groundY+fontSize+6} ...>{lm.text}</text>
  </g>
))}

// 改后：~8行组件调用
<PhysicsGround
  x={pad} y={groundY} width={w - 2*pad}
  ruler={{
    domain: [xRange.min, xRange.max],
    tickInterval: (xRange.max - xRange.min) / 8,
    unit: 'm',
    showAxisLine: true,
  }}
/>
```

**8个文件逐一迁移：**

| 文件 | 原刻度逻辑 | 迁移要点 |
|------|-----------|---------|
| VelocityAnimation | landmarkLabels 数组 | `ruler.domain` 取 xRange |
| VelocityAnimationStrip | groundTicks 数组 | 同上 |
| UniformAccelerationAnimation | landmarks 数组 | `tickInterval` 按 20m 步长 |
| UniformAccelerationCenterExtra | Array.from 循环 | `ruler + showAxisLine` |
| AccelerationAnimation | 两组轨道刻度 | 拆为两个 PhysicsGround，各自独立 ruler |
| AccelerationCenterExtra | roadY 循环 | `ruler.domain` 按 road 范围 |
| ProjectileAnimation | axis 线 | `ruler.showAxisLine + showAxisArrow` |
| ObliqueThrowAnimation | axis 线 | 同上 |

**每文件迁移步骤**：
1. 截图改前状态（动画播放到中间帧，确保刻度可见）
2. 提取原 domain/tickInterval 值（从手写逻辑中反推）
3. 替换为 PhysicsGround + ruler
4. 截图改后状态，逐刻度对比位置和标注
5. 运行动画确认无渲染异常

**关键风险**：`domain/tickInterval` 换算偏移。原手写刻度可能从非零起点开始，迁移时必须保证 `ruler.domain[0]` 与原刻度起点一致。

---

## 四、兼容性保证

1. **PhysicsGround 保持向后兼容**：所有现有 props 不变，只新增 `type/wall/bracket` 相关可选 props
2. **旧调用方零改动**：已用 PhysicsGround 的 8 处文件无需任何修改
3. **createRulerTicks 工具函数**：已有完整测试覆盖，迁移后复用
4. **index.ts 导出不变**：`export { PhysicsGround }` 保持不变

---

## 五、验收标准

- [ ] Phase 0：PhysicsGround 扩展后 `typecheck + lint + 所有测试通过`
- [ ] Phase 1：6 个文件的墙体/支架渲染与改前截图视觉一致
- [ ] Phase 2：13 个文件的地面线渲染一致（颜色、粗细、位置）
- [ ] Phase 3：8 个文件的刻度尺渲染一致（刻度间距、标注格式）
- [ ] 所有迁移后文件的动画播放正常（物理逻辑不受影响）
- [ ] ConnectedBodiesAnimation：如迁移则附截图对比，如跳过则记录原因
- [ ] 全量 `npm run lint` + `npm run typecheck` 通过

---

## 六、工作量估算

| 阶段 | 文件数 | 单文件耗时 | 总耗时 |
|------|--------|-----------|--------|
| Phase 0 组件扩展+测试 | 1+1 | 40min | ~1.5h |
| Phase 1 墙体/支架 | 6 | 10min | ~1h |
| Phase 2 简单地面 | 13 | 5min | ~1h |
| Phase 3 带刻度尺 | 8 | 15min | ~2.5h |
| **合计** | **29** | — | **~6h** |

---

*创建时间：2026-06-24 | 基于全量代码搜索分析*
*修订：2026-06-24 | 修正 wall.hatchSide 反向 hatch 逻辑、bracket 测试描述、showHatch 兼容性注释*
