---
feature: brownian-motion
status: delivered
specs: []
plans:
  - docs/compose/plans/1781788065603-misty-river.md
---

# 布朗运动动画 — Final Report

## What Was Built

新增热学模块的第一个交互动画：**分子热运动与布朗运动**。采用 Langevin 方程随机力模型（非刚体碰撞检测），在 SVG 中高频渲染花粉微粒在液体中的无规则运动。

支持两种模式：
- **基础模式**：仅展示花粉微粒的宏观无规则运动 + 追踪轨迹
- **进阶模式**：显示液体分子碰撞 + 瞬时合力矢量箭头 + 追踪轨迹

左侧控制面板提供温度 T（273-373K）、微粒直径 d（1-10μm）滑块，以及模式切换和显示开关。中心区域上方展示麦克斯韦-玻尔兹曼速率分布图（MiniChart），下方为 SVG 动画。右侧物理量面板自动显示温度、平均动能、公式、高考要点和易错警示。

## Architecture

### 新建文件（7个）

| 文件 | 用途 |
|------|------|
| `src/physics/brownianMotion.ts` | 纯物理函数库：Langevin 方程积分、MB 分布、平均动能计算 |
| `src/features/thermodynamics/kinematics/BrownianMotion.tsx` | 主动画组件（SVG 渲染） |
| `src/features/thermodynamics/kinematics/BrownianMotionSidebar.tsx` | 左侧边栏（模式切换 + 开关） |
| `src/features/thermodynamics/kinematics/BrownianMotionCenterExtra.tsx` | 中心区域扩展（图表容器） |
| `src/features/thermodynamics/kinematics/MaxwellBoltzmannChart.tsx` | MB 分布图（MiniChart 包装） |
| `src/data/registries/thermodynamics-kinematics.ts` | 动画注册子表 |
| `src/data/quantities/thermodynamics.ts` | 物理量看板数据构建 |

### 修改文件（5个）

| 文件 | 修改 |
|------|------|
| `src/data/knowledgeTree.ts` | 追加 thermodynamics-1-1、thermodynamics-1-2 知识节点 |
| `src/data/animationRegistry.ts` | 导入并展开 thermodynamicsKinematicsAnimations |
| `src/data/physicsQuantities.ts` | 追加 buildThermodynamicsQuantities 注册 + BuilderName |
| `src/physics/index.ts` | 追加 export * from './brownianMotion' |

### 数据流

```
用户调节滑块 → Zustand store (params)
  ↓
useAnimationFrame 每帧回调
  ↓ stepBrownianMotion()
useRef 存储粒子状态 (x, y, vx, vy) + 合力 (FnetX, FnetY)
  ↓ setTick() 触发 SVG 重绘
SVG 渲染: 液体背景 → 轨迹折线 → 分子粒子 → 花粉微粒 → 合力箭头
```

### 设计决策

- **Langevin 方程而非刚体碰撞**：花粉微粒受大量分子碰撞，逐一检测碰撞不现实。Langevin 模型用随机热力 + 粘滞阻力等效模拟，物理正确且性能可控。
- **useRef 存储高频状态**：粒子状态每帧更新，存入 useRef 避免触发 React re-render，仅通过 setTick 触发 SVG 重绘。
- **SVG 而非 Canvas**：与项目其他动画保持一致，便于声明式渲染和主题集成。

## Usage

运行 `npm run dev`，在首页知识树点击「热学」模块 → 「分子热运动与布朗运动」。

### 交互方式

| 控件 | 作用 |
|------|------|
| 温度滑块 T | 调节液体温度，温度越高分子运动越剧烈 |
| 直径滑块 d | 调节花粉微粒大小，越小布朗运动越明显 |
| 模式切换 | 基础/进阶模式 |
| 显示轨迹 | 开关追踪折线 |
| 显示分子 | 仅进阶模式：开关液体分子可视化 |

## Verification

- **TypeScript 构建**：`npm run build` 通过，无错误
- **Lint**：`npm run lint` 通过，仅 1 个来自新代码的 warning（已修复），其余为预存问题
- **测试**：`npm run test` 243/251 通过，8 个失败均为预存的 electromagnetism 测试问题，与本次变更无关

## Journey Log

- [lesson] CANVAS_STYLE.FONT 无 color 属性，需从 colors 导入文本颜色
- [lesson] useShallow 返回的是 `{ params: Record<string, number> }` 对象，需用 `params.params.temperature` 访问
