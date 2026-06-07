# 物理演示项目工程日志 (PROCESS_LOG)

## 2026-06-07 (9)

### 向心力与向心加速度美化、防越界矢量映射及 F-a 图像动力学联动开发（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-5-5）

**核心改动：**

1. **新建向心力 sidebar 控制组件**（`src/features/mechanics/CentripetalSidebar.tsx`）
   - 实现包含“进阶模式”开关和“显示 F-a 联动图表”显隐开关。

2. **升级动画注册表**（`src/data/animationRegistry.ts`）
   - 升级 `anim-centripetal` 参数配置，注册默认项（`advancedMode: 0`, `showWaveform: 1`），并加载 `CentripetalSidebar` 组件。

3. **重构画布并规范矢量安全长度（彻底修复越界 Bug）**（`src/features/mechanics/CentripetalAnimation.tsx`）
   - **自适应比例尺**：由 `scale = (minCanvasDim - 80) / (2 * rMax)` 动态计算比例尺，保证轨道永不越界。
   - **矢量安全映射**：对加速度和向心力引入全局最大安全像素长度限制（75px），杜绝了当加速度 $a_c$ 高达 100、向心力 $F_c$ 高达 500 时，箭头飞出画布数千像素的恶性 Bug。
   - **拟物材质与规范色彩**：小球应用 3D 渐变钢珠材质 `steelSphereGrad`。速度 $v$（经典蓝）、加速度 $a$（绿色）、向心合外力 $F$（深红）、半径 $r$（橙黄）均严格绑定主题 Token。
   - **右上角 F-a 图表卡片（画中画）**：新增毛玻璃图卡，同屏绘制斜率为质量 $m$ 的 $F = m \cdot a$ 动力学射线。当前状态游标十字在射线上实时滑动。支持通过改变 $m$ 滑块直观展示斜率变化。
   - **卡片反向交互**：支持在 $F-a$ 图表区域按压并左右拖动鼠标来反向调节线速度 $v$ 的大小。

4. **补全物理看板 quantities 插入 case**（`src/data/physicsQuantities.ts`）
   - 补齐了原缺失的 `anim-centripetal` 动画数据看板分支。
   - **基础模式**：面向初学者展示 $r, v, m, \omega, a_n$，讲解方向在变的变速运动特征。
   - **进阶模式**：面向高考展示合外力 $F_n$，补充向心力公式，并在高考考点中加入**“向心力是效果力，受力分析绝对不能额外画向心力”**的经典高频避坑要点。

5. **补全单元测试**（`tests/data/physicsQuantities.test.ts`）
   - 针对 `anim-centripetal` 的基础和进阶模式 quantities 计算精度及显隐判定补齐测试用例。

**涉及文件：**
- `src/features/mechanics/CentripetalSidebar.tsx`
- `src/features/mechanics/CentripetalAnimation.tsx`
- `src/data/animationRegistry.ts`
- `src/data/physicsQuantities.ts`
- `tests/data/physicsQuantities.test.ts`

## 2026-06-07 (8)

### 匀速圆周运动梯度教学设计、自适应等比例缩放及简谐投影波形联动开发（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-5-4）

**核心改动：**

1. **新建圆周运动 sidebar 控制组件**（`src/features/mechanics/CircularMotionSidebar.tsx`）
   - 实现包含“进阶模式”开关，以及仅在进阶模式下可见的“简谐运动投影对比”和“显示联动波形图”开关。

2. **升级动画注册表**（`src/data/animationRegistry.ts`）
   - 升级 `anim-circular-motion` 的参数配置，注册默认项（`advancedMode: 0`, `showProjection: 1`, `showWaveform: 1`），并加载对应的 `CircularMotionSidebar` 组件。

3. **重构物理演练画布实现自适应比例尺**（`src/features/mechanics/CircularMotionAnimation.tsx`）
   - **自适应比例尺**：彻底去除硬编码 `scale = 50`。通过 `scale = (minCanvasDim - 80) / (2 * rMax)` 自适应容器长宽，确保最大半径 $r=10$ 时轨迹也绝不飞出画布。
   - **拟物材质与规范色彩**：小球应用 3D 渐变钢珠材质 `steelSphereGrad`。速度矢量（经典蓝）、加速度矢量（绿色）、位移与轨道均采用物理主题色彩，完全消灭一切硬编码 Hex 颜色。
   - **角速度几何化**：用半透明弧形展示扫过角度 $\theta = \omega t$，让角速度概念更加形象具体。
   - **正交投影联动**：在进阶模式下，支持沿 $x$ 轴与 $y$ 轴方向渲染投影球，并画出主球与投影球之间的辅助虚线，清晰呈现圆周运动与简谐运动的正交映射。
   - **右上角波形卡片（画中画）**：移除了原左上角文本。新建毛玻璃卡片，同屏联动绘制简谐运动 $x-t$ 和 $y-t$ 的正弦/余弦曲线。支持在图表卡片区域按压拖动进行时间联动调速。

4. **物理看板 quantities 精细化分档**（`src/data/physicsQuantities.ts`）
   - **基础模式**：面向初学者展示 $r$, $\omega$, $v$, $T$ 及最简公式（$v = \omega r$），讲解速度方向变化的变速运动事实。
   - **进阶模式**：面向高考展示 $x, y$ 坐标和向心加速度 $a_n$，引入位置方程和向心加速度多公式，深刻剖析向心力不做功与简谐运动正交投影的高考考向。

5. **补全单元测试**（`tests/physics/kinematics.test.ts` & `tests/data/physicsQuantities.test.ts`）
   - 补充针对 `calculateCircularMotion` 旋转坐标周期性及 physics quantities 分档特性的单元测试。

**涉及文件：**
- `src/features/mechanics/CircularMotionSidebar.tsx`
- `src/features/mechanics/CircularMotionAnimation.tsx`
- `src/data/animationRegistry.ts`
- `src/data/physicsQuantities.ts`
- `tests/physics/kinematics.test.ts`
- `tests/data/physicsQuantities.test.ts`

## 2026-06-07 (7)

### 斜抛运动美化、双轴自适应比例尺及空气阻力进阶开发（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-5-3）

**核心改动：**

1. **下沉带空气阻力斜抛物理计算**（`src/physics/kinematics.ts`）
   - 新增 `precomputeObliqueThrowWithDrag` 纯函数。输入 $v_0$、角度 $\theta$、重力 $g$、阻力系数 $k$ 等，使用欧拉法对斜抛在阻力环境下的时空坐标及速度分量进行高精度采样积分，并支持真空对照组导出。

2. **新建斜抛 sidebar 控制扩展**（`src/features/mechanics/ObliqueThrowSidebar.tsx`）
   - 实现包含“进阶模式”Toggle、空气阻力 $k$ 滑块（$0 \sim 0.2$）、以及“对比真空参考轨道”开关组件。

3. **升级动画注册表**（`src/data/animationRegistry.ts`）
   - 升级 `anim-oblique-throw` 注册信息，补充进阶参数并加载 `ObliqueThrowSidebar`，以及绑定 `ObliqueThrowAnimation` 为渲染组件。

4. **重构物理演练画布**（`src/features/mechanics/ObliqueThrowAnimation.tsx`）
   - **全宽铺满式物理演练**：取消传统的左右子分区，物理区域展宽铺满中屏，使抛球拥有足够大的左右轨迹展示空间，防止飞出边界。
   - **双轴自适应比例尺**：水平与竖直方向动态计算最大物理位移比例尺，并取其最小值作为全局等比例比例尺 `scale = Math.min(scaleX, scaleY)`，确保钢球在任何参数和视口下绝不越界且保持 1:1 物理比例。
   - **双轴投影小球**：在竖直导轨和地表分别绘制实时投影球，形象解构斜抛的水平分运动与竖直分运动（竖直上抛）。
   - **拟物金属美化**：发射炮筒自适应抛射角旋转，钢珠使用 `steelSphereGrad` 3D 渐变材质。
   - **零硬编码色彩**：速度矢量采用主题预设颜色，彻底清除一切硬编码 Hex 颜色。

5. **右上角悬浮 v-t 图像联动（画中画）**（`src/features/mechanics/ObliqueThrowAnimation.tsx`）
   - 设计精致的右上角悬浮毛玻璃图表卡片，绘制水平分速度 $v_x(t)$ 与穿过零刻度线的竖直分速度 $v_y(t)$ 实际与真空对照四条曲线。支持在卡片热区直接拖拽鼠标进行三屏时间轴联动。

6. **对接 quantities 物理量面板**（`src/data/physicsQuantities.ts`）
   - 精简 quantities 物理看板数据。移除与滑块重复的参数，仅展示水平位移 $x$、竖直高度 $y$ 及实时速度 $v$（含偏角 $\theta$），补全 KaTeX 斜抛公式及高考核心要点。

7. **新增测试用例**（`tests/physics/kinematics.test.ts` & `tests/data/physicsQuantities.test.ts`）
   - 补齐针对 `precomputeObliqueThrowWithDrag` 物理规律校验及 `buildPhysicsQuantities` 的多项单元测试。

**涉及文件：**
- `src/physics/kinematics.ts`
- `src/features/mechanics/ObliqueThrowSidebar.tsx`
- `src/features/mechanics/ObliqueThrowAnimation.tsx`
- `src/data/animationRegistry.ts`
- `src/data/physicsQuantities.ts`
- `tests/physics/kinematics.test.ts`
- `tests/data/physicsQuantities.test.ts`

## 2026-06-07 (6)

### 平抛运动重构与带空气阻力进阶模式开发（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-5-2）

**核心改动：**

1. **下沉带空气阻力平抛物理计算**（`src/physics/kinematics.ts`）
   - 新增 `precomputeProjectileWithDrag` 纯函数。输入 $v_{0x}$、重力 $g$、阻力系数 $k$、下落高度 $H$。以 0.001s 步长使用欧拉法对平抛在阻力环境下的时空坐标及速度分量进行积分计算，并支持真空参考对照组导出。

2. **新建平抛 sidebar 扩展**（`src/features/mechanics/ProjectileSidebar.tsx`）
   - 实现包含“进阶模式”Toggle、空气阻力 $k$ 滑块（$0 \sim 0.2$）、以及“对比真空参考轨道”开关组件。

3. **升级动画注册表**（`src/data/animationRegistry.ts`）
   - 升级 `anim-projectile` 注册信息，补充进阶参数并加载 `ProjectileSidebar`。

4. **重构物理演练画布**（`src/features/mechanics/ProjectileAnimation.tsx`）
   - **全宽铺满式物理演练**：取消传统的左右子分区，物理区域展宽铺满中屏，让平抛小球拥有宽阔、舒展的降落演示轨迹。
   - **自适应比例尺（解决越界 Bug）**：水平与竖直方向动态计算最大物理位移比例尺，并取其最小值作为全局等比例比例尺 `scale = Math.min(scaleX, scaleY)`，既能保证小球在任何参数和视口下绝不越界，又保证了物理保真度（钢珠不变形）。
   - **双轴投影小球**：在地面和竖直导轨上分别引入水平匀速和竖直自由落体分运动投影小球，以半透明 3D 拟物材质直观呈现平抛分解。
   - **拟物金属美化**：平抛钢珠采用不锈钢 `steelSphereGrad` 3D 渐变，原点添加拉丝发射台底座。
   - **规范化色彩**：合速度 $v$（经典蓝 `#2563EB`）、水平速度 $v_x$（蓝色 `#3B82F6`）、竖直速度 $v_y$（浅蓝 `#60A5FA`），剔除全部硬编码 Hex 颜色。

5. **右上角悬浮 v-t 图像联动**（`src/features/mechanics/ProjectileAnimation.tsx`）
   - **画中画悬浮窗设计**：移除与物理区小球轨迹完全重复的 $y-x$ 图像。将 $v-t$ 图像设计为悬浮在右上角空白区的精致科学卡片，具有毛玻璃半透明底色和精细阴影。
   - **速度-时间图 (v-t 图)**：分水平与竖直方向联动。同屏绘制 $v_x(t)$ 与 $|v_y(t)|$ 实际与真空对照四条曲线，展示水平匀速到减速、竖直匀加速到饱和终端速度的非线性变化。支持在悬浮卡片上直接拖拽鼠标进行三屏时间轴联动。

6. **对接 quantities 物理量面板**（`src/data/physicsQuantities.ts`）
   - 在右侧物理量面板中仅保留 $x$、$y$ 位移及合速度 $v$ 核心数据（不与左滑块重复），留足公式和高考要点卡片空间。

7. **新增测试用例**（`tests/physics/kinematics.test.ts`）
   - 补齐了针对 `precomputeProjectileWithDrag` 函数真空解析一致性以及空气阻力下能量与位移偏折的 2 大项测试用例。

**涉及文件：**
- `src/physics/kinematics.ts`
- `src/features/mechanics/ProjectileSidebar.tsx`
- `src/features/mechanics/ProjectileAnimation.tsx`
- `src/data/animationRegistry.ts`
- `src/data/physicsQuantities.ts`
- `tests/physics/kinematics.test.ts`

## 2026-06-07 (5)

### 超重与失重 N-a 图同步修复与规范合规（归属 [M1] 力学动画）

**核心改动：**

1. **修复 N-a 图表同步 bug**
   - 暂停时 `currentA` 被硬编码为 0，导致 N-a 图游标不跟随参数滑块 → 改为始终跟随参数 `a`
   - 播放结束后调节滑块，N-a 图游标不响应 → 同上修复
   - 引入 `actualA`（电梯实际加速度，驱动矢量箭头和漂浮判定）与 `currentA`（N-a 图参数预览值）分离

2. **扩展 `calculateElevatorMotion` 支持恒定加速度模式**
   - 新增 `modelIdx = 2`（恒定加速度），接受 `a_ext` 参数
   - 普通模式播放中改用 `calculateElevatorMotion(2, m, g, t, a)` 统一计算
   - 函数签名从 `modelIdx: 0 | 1` 扩展为 `0 | 1 | 2`

3. **移除 `physicsQuantities.ts` 中超重失重的 Canvas 布局依赖**
   - 删除 `elevatorHeight=200`、`shaftTop=40`、`shaftBottom=500-60` 等硬编码
   - 改用 `calculateElevatorMotion(2, ...)` 统一计算

4. **提取布局常量**
   - `WeightlessnessAnimation.tsx`：新增 `LAYOUT` 对象，替换 `30`、`150`、`40`、`180`、`0.45`、`10`、`15`、`0.55`、`22`、`0.12`、`9`、`0.45`、`32`、`0.16`、`20`、`90`、`11`、`9` 等硬编码

5. **MiniChart 类型安全**
   - `WeightlessnessCenterExtra.tsx`：`points: any[]` → `points: Record<string, number>[]`

**涉及文件：**
- `src/physics/dynamics.ts`（扩展 calculateElevatorMotion）
- `src/features/mechanics/WeightlessnessAnimation.tsx`
- `src/features/mechanics/WeightlessnessCenterExtra.tsx`
- `src/data/physicsQuantities.ts`

## 2026-06-07 (4)

### 连接体问题物理模型修正与规范合规（归属 [M1] 力学动画）

**核心改动：**

1. **重写 `calculateConnectedBody`**（`src/physics/dynamics.ts`）
   - 修正原函数只算 m₂ 摩擦力的物理错误，改为正确计算两物体总摩擦力
   - 新增 `ConnectedBodyResult` 接口：区分运动态/静止态，返回 `isMoving`、`displayTension`、`f1Max`/`f2Max`、`staticTensionRange`
   - 静止时张力返回 0（教学展示值），但 `staticTensionRange` 提供完整范围 `max(0, F-f₂Max) ≤ T ≤ min(f₁Max, F)`
   - 完整 JSDoc + 参数单位注释 + `@category M1`

2. **新增 `calculateConnectedBodyTimeline`**（`src/physics/dynamics.ts`）
   - 纯物理函数：给定时间 t，返回 a/v/s/T 运动状态
   - 消除组件内位移计算的内联重复

3. **三处消费方统一调用 `calculateConnectedBody`**
   - `ConnectedBodiesAnimation.tsx`：删除内联物理计算，改用 `calculateConnectedBody` + `calculateConnectedBodyTimeline`
   - `ConnectedBodiesCenterExtra.tsx`：同上，删除 `g=9.8` 硬编码改用 `GRAVITY`
   - `physicsQuantities.ts`：同上，移除 Canvas 布局参数依赖（`animWidth`/`startX`/`endX` 等）

4. **修正 T-μ 和 T-F 曲线**
   - 每个采样点独立调用 `calculateConnectedBody`，加入启动阈值判定
   - T-μ 曲线标题改为"运动状态下的绳张力 T 与 μ 的关系"
   - 新增临界 μc 竖线（`staticLines`），标注启动阈值
   - T-F 曲线同理，新增临界 Fc 竖线

5. **统一坐标换算与布局常量**
   - `src/utils/coordinate.ts`：新增 `PX_PER_METER`、`metersToPx()`、`pxToMeters()`
   - `ConnectedBodiesAnimation.tsx`：提取 `LAYOUT` 布局常量对象和 `SPRING_VISUAL` 视觉参数对象
   - 替换所有硬编码数字（`80`、`65`、`0.11`、`50`、`0.13`、`6`、`0.7`、`40`、`0.12`、`0.15`、`0.85`、`11.5`、`1.6`、`11`、`15`）

6. **事件监听器 cleanup**
   - 拖拽交互从 `window.addEventListener('mousemove/mouseup')` 改为 `useEffect` + `pointermove/pointerup`，组件卸载时自动清理

7. **MiniChart 类型安全**
   - `points: any[]` → `points: Record<string, number>[]`

8. **补充纯函数测试**
   - `tests/physics/dynamics.test.ts`：新增 `calculateConnectedBody`（4 用例）和 `calculateConnectedBodyTimeline`（4 用例）

**涉及文件：**
- `src/physics/dynamics.ts`（重写 + 新增）
- `src/features/mechanics/ConnectedBodiesAnimation.tsx`
- `src/features/mechanics/ConnectedBodiesCenterExtra.tsx`
- `src/data/physicsQuantities.ts`
- `src/utils/coordinate.ts`
- `tests/physics/dynamics.test.ts`

## 2026-06-07 (3)

### 死代码清理与预留函数规范化（归属 [M2] 架构完善与全局规范）

**核心改动：**

1. **删除零引用文件**
   - `src/utils/screenshot.ts`：零 import、零测试引用、无桶 re-export
   - `src/theme/physicsColors.ts`：向后兼容层，所有消费方已迁移至 `@/theme/physics`
   - `src/utils/format.ts`：`formatPhysics` 标识符全项目零引用

2. **更新活跃桶文件**
   - `src/utils/index.ts`：移除 `export * from './format'`

3. **删除零消费桶文件**
   - `src/features/index.ts`、`src/features/mechanics/index.ts`、`src/features/electromagnetism/index.ts`：animationRegistry 通过 `lazy(() => import('@/features/.../XXX'))` 直接定位文件，不经过桶
   - `src/components/index.ts`：Layout 和 UI 各有独立入口
   - `src/data/problems/mechanics/index.ts`：problems/index.ts 直接 import 子文件

4. **更新架构文档**
   - `ARCHITECTURE_RULES.md`：移除 `physicsColors.ts` 行

5. **预留物理/数学函数规范化**（补 JSDoc + 参数单位 + 边界条件 + `@category M4`）
   - `src/physics/celestial.ts`：`calculateKeplerThird`、`calculateCentralMass`、`calculatePlanetDensity`、`calculateEscapeSpeed`
   - `src/physics/energy.ts`：`calculateWork`、`calculateGravityPotential`、`calculateImpulse`
   - `src/physics/dynamics.ts`：`calculateGravitation`
   - `src/physics/electromagnetism.ts`：`calculateTransformer`（补充参数单位 + 与 `calculateTransformerWithLoad` 的教学分层说明）
   - `src/math/vector.ts`：补 `@category M4` 模块标注（已有完整 JSDoc 和测试）
   - `src/math/trigonometry.ts`：补 `@category M4` 模块标注 + 新建 `tests/math/trigonometry.test.ts`（26 个测试用例，含恒等式验证）

## 2026-06-07 (2)

### 规范偏离修复：未批准依赖卸载、裸调 rAF 消除、纯计算下沉（归属 [M2] 架构完善与全局规范）

**问题背景：** 项目规范审查发现三项严重违规——`framer-motion` 和 `zod` 未走申报流程即安装且零引用；`useEquilibriumPhysics.ts` 裸调 `requestAnimationFrame` 违反铁律。

**核心改动：**

1. **卸载未批准依赖**
   - 从 `package.json` 移除 `framer-motion`（^12.0.5）和 `zod`（^3.24.1），两个包均零 import。
   - 需手动执行 `npm install` 同步 lock 文件。

2. **清理 `motion.ts` Framer Motion 专属预设**
   - 移除 `easing.spring`（Framer Motion 数组格式）、`transition.spring`（`type: 'spring'` 配置）、`motionConfig`（`<MotionConfig>` 专用）。
   - 同步移除 `theme/index.ts` 中 `motionConfig` 的 re-export。
   - 保留所有 CSS transition 兼容的 token（`duration`、`easing.standard/decelerate/accelerate/bounce`、`transition.fade/slide/reveal`、`canvasAnimation`）。

3. **新增 `useSimulationFrame` Hook**（`src/utils/animation.ts`）
   - 物理仿真专用帧驱动，始终运行 rAF 循环，不受全局 `isPlaying` 控制。
   - 支持 `active` 参数暂停/恢复仿真推进（rAF 不中断）。
   - 内置 `maxDeltaMs` 截断保护，防止大步长导致数值积分发散。
   - 遵循「禁止组件自行调用 rAF」铁律，统一动画入口。

4. **重构 `useEquilibriumPhysics.ts`**
   - 用 `useSimulationFrame` 替换裸调 `requestAnimationFrame` + `useEffect` 组合。
   - 删除本地 `getTheoreticalEquilibriumPos` 函数，改用 `@/physics/dynamics` 导出的 `calculateTheoreticalEquilibriumPos`。

5. **Euler-Cromer 积分纯计算下沉到 `src/physics/dynamics.ts`**
   - 新增 `EquilibriumSimState`、`EquilibriumSimInput`、`EquilibriumSimStepResult` 接口。
   - 新增 `calculateTheoreticalEquilibriumPos` 纯函数（含 JSDoc + 单位注释）。
   - 新增 `simulateEquilibriumStep` 纯函数，封装单步积分（受力计算→加速度→积分→断绳判定→边界→收敛 snap）。
   - 物理常量统一为 `UPPER_SNAKE_CASE`：`EQUIL_L`、`EQUIL_KS`、`EQUIL_KMOUSE`、`EQUIL_C_DAMPING` 等。
   - Hook 层仅做状态桥接：调用纯函数 → 写入 ref → 触发 React 渲染。

## 2026-06-07

### 全局色彩规划规范优化与硬编码颜色治理（归属 [M2] 架构完善与全局规范）

按照高中物理教材行业习惯（磁感线绿色、电场线黄色、重力深绿色、正负电荷红蓝等）及认知美学，对整个项目进行全局色彩规范的重构与优化，清除了已完成组件中的全部硬编码颜色。

**核心改动：**
- **colors.ts**：
  - 规范并统一了运动学、动力学、能量、电磁学、热力学、光学和波动学等全学科的物理量颜色映射。
  - 磁场 B 统一映射为绿色（`#10B981`），符合物理教科书磁感线用色习惯，避免与紫色（电势能、绳子张力）混淆。
  - 电流 I 统一映射为红色（`#DC2626`），电场强度 E 映射为黄色（`#D97706`），重力 mg 映射为深绿色（`#15803D`）。
- **sceneColors.ts**：
  - 新增 `COMMON_MATERIALS` 导出：钢球、真空对照球、滑轨拉丝金属、不锈钢底座等通用 3D 立体渐变色标数组，彻底解耦物理量矢量色与器材材质色。
  - 新增 `ENVIRONMENT_COLORS` 导出：用于定义真空、空气介质等实验轨道的环境及反光描边。
  - 新增 `SPECIAL_EFFECTS`、`SAFETY_PRESETS`、`LAB_LABELS` 导出：包含微积分正负面积的极光渐变、警告安全黄、科学看板背景与文字色。
- **index.ts**（theme/physics/index.ts）：
  - 聚合导出所有新增的场景属性和对应的 TypeScript 类型。
- **VerticalThrowAnimation.tsx**：
  - 彻底清除所有硬编码颜色。滑轨、小球、对照球、阻尼架条纹、看板背景和积分渐变等均通过 `SCENE_COLORS` 和 `PHYSICS_COLORS` 引用。
- **VelocityXTChart.tsx** & **VelocityVTChart.tsx**：
  - 彻底清除残留的硬编码颜色。放大镜渐变框及折射滤镜统一引用场景材质，纯白描边改用 `colors.neutral[0]` 规范。
- **project_rules.md** & **02_UI_RULES.md**：
  - 同步更新物理色彩规划蓝图及铁律，添加关于“禁止在组件中硬编码渐变色阶、填充和面板”的约束条款。

### 力的合成与分解教学改进与重构拖拽交互（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-3-4）

按照最新项目规范（新增计算型 Hook 规则、三屏联动密度上限等），对“力的合成与分解”（`anim-vector-addition`）动画进行了全面的架构重构与交互、视觉优化美化。

**核心改动：**
- **dynamics.ts**：
  - 新增并导出了 `calculateVectorAddition`（共点力合成）和 `calculateOrthogonalDecomposition`（力的正交分解）两个物理纯函数，支持模长、投影、偏角和分量的纯代数计算。
- **useVectorAdditionPhysics.ts**（新建）：
  - 严格遵循最新 **4.3 节计算型 Hook 规则**。这是一个无 JSX 的 `.ts` 状态计算 Hook，利用 `useMemo` 将 store 中的 params 参数与物理计算对接，换算并缓存包括平行四边形四个端点、三角形定则平移位置、正交分解投影轴交点以及扇形夹角弧线在内的一系列 SVG 坐标，将渲染与复杂物理三角函数彻底解耦。
  - **时间轴控制平移**：在三角形定则模式下，使用 store 中的 `time` 进度驱动平移动画（在 1.5s 播放周期内平滑平移至 $F_1$ 终点），在暂停时则直接显示完全平移状态。
- **VectorAdditionAnimation.tsx**（完全升级）：
  - **精密刻度坐标系**：绘制了带有刻度 Tick 线与力值文字标注（$-15\text{ N} \sim 15\text{ N}$）的精密坐标轴。受力中心绘制了质点圆形靶心和指示辅助虚圈。
  - **强交互手势拖动**：实现了在 Canvas 区域**直接鼠标和触控拖拽**矢量端点尖端来实时刷新力参数的交互，实现了与左侧滑块、右侧数据看板的完美双向受控绑定。
  - **精密吸附算法**：模长大小接近 $0.5\text{ N}$ 的整数倍时进行吸附（吸附阈值 $\pm 0.15\text{ N}$）；旋转角度接近 $0^\circ, 30^\circ, 45^\circ, 60^\circ, 90^\circ, 120^\circ, 150^\circ, 180^\circ$ 时进行磁性吸附（角度门槛 $\pm 2.5^\circ$）。
  - **正交分解旋转支持**：正交分解模式下，已支持拖动合力 $F$ 的尖端来手动旋转并改变其大小与方向，分力 $F_x, F_y$ 随之动态进行正交投影虚线展示。
- **physicsQuantities.ts**：
  - 补全 `anim-vector-addition` 的 case 分支。引入 KaTeX 渲染标准公式（平行四边形公式、正交分解方程组），添加“合力大小范围”及“分力大小固定时合力随夹角增大而减小”等高考星级考点标签。
- **animationRegistry.ts**：
  - 升级该动画配置，引入 `mode`（0=平行四边形, 1=三角形, 2=正交分解）参数元数据并暴露给左侧参数面板。
- **TypeScript 编译修复**：
  - 移除了 `physicsQuantities.ts` 中多余未使用的 `BASE_CENTER`、`F_normal`、`f_max`、`f_slip` 等 unused locales，并在函数末尾增加了兜底 return，消除 `TS2366` 编译隐患。

**测试验证：**
- **dynamics.test.ts**：
  - 追加了 5 项针对力的合成与分解底层计算函数的单元测试（涵盖 3-4-5 经典直角三角形合成、同向/反向力合成及特殊角度正交分解），测试一次性通过。目前全套动力学测试用例已增至 14 项且全部通过。
*   **生产环境构建**：运行 `npm run build` 打包构建 100% 成功，所有产物生成正常。

### 共点力平衡教学改进与重构拖拽交互（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-3-5）

按照最新项目规范，对“共点力平衡”（`anim-equilibrium`）动画进行了全面物理和交互重构，重塑为“双绳悬挂重物受力平衡实验仪”。

**核心改动：**
- **dynamics.ts**：
  - 新增并导出了 `calculateEquilibriumTension` 物理纯函数，支持双绳受拉力大小、重物重力的纯代数平衡推演，并设计了防除零的安全保护。
- **useEquilibriumPhysics.ts**（新建）：
  - 严格遵循计算型 Hook 规范（不含 JSX，使用 `.ts` 后缀）。订阅 store 参数并通过 `useMemo` 缓存包括挂点坐标、砝码球心 Canvas 坐标、绳子路径、张力/重力/等效合力起止点，以及模式二“封闭三力三角形”首尾接应矢量点的全部几何数据，将复杂物理三角关系与 React 渲染解耦。
- **EquilibriumAnimation.tsx**（完全升级）：
  - **精密实验仪视觉**：绘制了带有网网梁的天花板、不锈钢细绳、以及右上光源车削不锈钢高光渐变的金属砝码，带有精细十字靶线。
  - **直接拖动交互**：用鼠标或触摸直接拖拽重物砝码即可任意改变其空间位置。拖拽中，系统实时反向解出当前的两个挂角 $\theta_1, \theta_2$ 并限制在安全范围 $[10^\circ, 85^\circ]$，同步更新 Zustand store 参数，实现无延迟双向绑定。
  - **断裂过载指示**：当绳子承受的张力超过安全阈值 $35\text{ N}$ 时，过载的挂绳和拉力箭头会触发霓虹亮红色高亮闪烁警示，帮助学生直观建立张力极限思维。
  - **三力封闭三角形**：提供模式二“三力封闭多边形”展示。在右下方框内实时渲染平移后的 G、T1、T2 矢量，展现受力平衡时三力矢量完全闭合的几何状态。
- **physicsQuantities.ts**：
  - 补全 `anim-equilibrium` case 分支。引入平衡方程组和张力解析解的 KaTeX 标准公式，添加“共点力平衡条件”及“大夹角趋近180度拉力趋向无穷大”的高考考点。
  - 移除了未使用的 `mode` 变量，消除 TS6133 警告。
- **animationRegistry.ts**：
  - 更新该动画项配置，注入 `mode` 及质量 `m` 控制参数元数据。

**测试验证：**
- **dynamics.test.ts**：
  - 追加了 3 项针对共点力平衡计算函数的单元测试（涵盖对称悬挂、单绳竖直极限悬挂以及角度极小时的断裂保护），测试全数通过。动力学单元测试用例目前增至 17 项。
*   **生产环境构建**：运行 `npm run build` 打包构建成功，修复了组件中未定义 `forceScale` 的 Bug，生成产物完全正常。

## 2026-06-06

### 新增“重力与重心”教学演示动画（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-3-1）

按照高中物理教学大纲与高考考纲难度，全新开发并集成了“重力与重心”大课物理教学交互动画（`anim-gravity-basic`），并将本章“重力与弹力”知识点进行了合理的模块化解耦与重分配。

**核心改动：**
- **dynamics.ts**：
  - 新增并导出了 `calculateEarthGravity` 纯物理计算函数，精确计算物体在地球不同纬度表面的万有引力、重力、自转向心力矢量大小、分量及偏角关系。
- **GravityBasicAnimation.tsx**（新建）：
  - **模式一：地球自转重力分解**。绘制高质感不锈钢质感自转地球剖面模型，挂载可调节纬度研究小球。基于平行四边形定则精密渲染万有引力（指心）、向心力（指轴）和重力三力分解矢量，并在中纬度指示和显示了重力偏角 θ。
  - **模式二：悬挂法重心实验**。绘制高强度不规则金属板，带有 3 个独立悬挂孔。实现了绕悬挂点阻尼正弦衰减的真实物理晃动旋转动画。静止时垂直悬挂方向向下画铅垂垂线。支持在板上开启配重滑块，调整配重相对质量和本地坐标，实时使用质心物理公式更新系统新重心 C。
- **GravityBasicSidebar.tsx**（新建）：
  - 提供地球重力分解与重心实验的双模式一键切换。提供挂载点 A1-A3 切换（点击自动清零动画时间以重新触发晃动收敛过程）及铅垂线显隐 Toggle 开关。
- **animationRegistry.ts**：
  - 注册并配置 `anim-gravity-basic` 动画条目。配置纬度、向心力放大倍数、配重物质量和本地坐标等滑块，并全部支持条件显示（`showIf` 过滤）。
- **physicsQuantities.ts**：
  - 补全 `anim-gravity-basic` 的 case。当地球自转时输出引力/向心力/重力数据及 KaTeX 矢量关系式；当重心实验时输出配重参数与本地重心 $(x, y)$ 坐标。配置高考要点“重力与引力偏角及赤道/两极极值”、“悬挂法物理条件及配重改变重心”等卡片。
- **knowledgeTree.ts**：
  - 进行知识点与动画绑定的重新解耦对齐：`mechanics-3-1`（重力与弹力）绑定 `anim-gravity-basic` ；`mechanics-3-2`（弹力）绑定 `anim-spring-force`。

**测试验证：**
- **dynamics.test.ts**（新建）：
  - 编写了 5 项单元测试，充分验证了 `calculateElasticForce` 和 `calculateEarthGravity` 在极点（无向心力）、赤道（向心力最大）及中纬度（存在偏角，重力大小介于极点与赤道间）的物理计算正确性。全数通过。
- **静态校验与构建**：`npx tsc --noEmit` 编译零错误，且 `npm run build` 打包构建 100% 顺利通过。
- **交互验证**：使用浏览器代理启动本地开发服务，对两个新模式 of 重力与重心交互和物理计算进行了全流程跑测，截图并保存了验证视频。

### 摩擦力物理教学改进及双模式重构美化（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-3-3）

对摩擦力演示页面进行了深度的教学细节重构与实验仪美化，支持水平拉力和斜面倾斜双模式，并将物理计算整合为纯函数库。

**核心改动：**
- **dynamics.ts**：
  - 新增并导出了 `calculateFrictionPullModel`（水平拉力摩擦力模型）和 `calculateFrictionInclineModel`（斜面倾斜摩擦力模型）两个纯物理计算函数，计算包括最大静摩擦力突变、滑动摩擦、加速度、合外力及临界角度值。
- **FrictionAnimation.tsx**（完全升级）：
  - 移除 Canvas 左上角所有硬编码的 `<text>` 公式与说明文字，完全收拢到右侧 KaTeX 物理面板中，满足黄金法则。
  - 引入 `calculateFrictionPullModel` 和 `calculateFrictionInclineModel` 纯函数重构了主画布中的物理逻辑。
  - **模式一**：渲染了高金属质感的滑轨和木箱。处于滑动状态时，背景地线滚动，且箱体后方自动喷射阻力灰尘粒子。
  - **模式二**：木箱与斜面使用旋转矩阵 `<g transform="rotate(-angle)">` 在局部坐标系下统一绘制。力的矢量方向（垂直向下的重力 $G$、垂直斜面向上的支持力 $F_N$、沿斜面向上的实际摩擦力 $f$）以及其偏角弧线通过旋转矩阵精确绘制，消除了位置和方向上的偏差。
- **FrictionCenterExtra.tsx**（完全升级）：
  - 导入摩擦力纯函数，在上方实时绘制精密科学图表。
  - 模式一下绘制 $f-F$ 摩擦力-外力折线图（直观折射出最大静摩擦力的临界突变）。
  - 模式二下根据计算出的临界角绘制 $f-\theta$ 的正弦（静止）与余弦（下滑）拼接曲线图，圆点游标和虚线引线随滑块无延迟滑动。
- **FrictionSidebar.tsx**（新建）：
  - 实现了拉力模型与斜面模型的双模式一键式切换按钮组，切换时自动重置动画时间和播放状态。
- **animationRegistry.ts**：
  - 升级 `anim-friction` 注册项，增加 `mode`、`F_applied`（条件显示：拉力模式）、`angle`（条件显示：斜面模式）等控制参数，挂载 `FrictionSidebar` 与 `FrictionCenterExtra` 页面扩展。
- **physicsQuantities.ts**：
  - 增加 `anim-friction` 的双模式 case 逻辑，实时输出双模式下的重力、拉力/分力、支持力、实际摩擦力与最大静摩擦力、合力、运动加速度及高考要点考点卡片。

**测试验证：**
- **dynamics.test.ts**：追加了 4 项针对摩擦力计算纯函数的单元测试（涵盖拉力模式和斜面模式下的静摩擦、最大静摩擦、滑动状态、加速度和下滑状态临界点判断），测试一次性通过。目前全套动力学测试用例已增至 9 项且全部通过。
- **静态校验与构建**：清理了 `FrictionAnimation.tsx` 中未使用的 `STROKE` 变量导入，`npx tsc --noEmit` 编译零错误，且 `npm run build` 打包构建 100% 顺利通过。
- **浏览器跑测**：开启 Vite 端口后，由浏览器子代理进行水平拉力状态（F=10N静止, F=25N匀加速滑行）和斜面倾斜状态（12°静止, 30°加速下滑）的跑测，验证了图表、公式面板、高考考点和 Canvas 受力分析箭头的科学对应性。抓取了 4 张典型截图和 1 份完整的交互动图视频。

### 重力与弹力物理教学改进及优化、美化（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-6-2/mechanics-3-2）

对重力（万有引力定律）与弹力（胡克定律）物理交互动画进行了全面的教学改进与精密学术美化。

**核心改动：**
- **physicsQuantities.ts**：
  - 增加了 `anim-gravity` 的 case，提供详细的物理量列表、KaTeX 公式的 LaTeX 定义以及高考“万有引力与重力本源关系”、“质点模型条件”等考点。
  - 增加了 `anim-spring-force` 的 case，计算形变量 $x$、弹力 $F$ 和弹性势能 $E_p$，输出对应的 KaTeX 公式和“F-x 图像物理含义”等高考考点卡片。
- **SpringForceCenterExtra.tsx**（新建）：
  - 实现了精密的 $F-x$ 物理图像组件。坐标系以科学仪性质感设计，当滑块振动时，实时点在斜率为 $-k$ 的胡克定律直线上同步滑动。
  - 在图像中绘制并填充了淡紫色的动态三角形阴影，实时表示并计算系统的弹性势能 $E_p = \frac{1}{2}kx^2$，将物理面积积分直观化。
- **SpringForceAnimation.tsx**（完全升级）：
  - 移除 Canvas 左上角所有硬编码的 `<text>` 公式与段落文字，完全收拢到右侧面板。
  - 将粗糙的三角形折线弹簧重构为三维螺旋线（Helix）投影曲线，并使用平滑包络线对两端进行收拢过渡，展现拉伸与压缩下的圆滑高拉丝钢体质感。
  - 重构了物理定位，消除了原有弹簧长度为负、覆盖墙体的逻辑 Bug；并在振子下方加入了带有双向指示箭头的形变量 $\Delta x$ 尺寸线。
  - 严格限制 Canvas 内部标注文字数量 ≤ 5 个，达成 Canvas 黄金法则规范。
- **GravityAnimation.tsx**（完全升级）：
  - 移除 Canvas 左上角所有硬编码的 `<text>` 公式与段落文字，完全收拢到右侧面板。
  - 小球重构为金属质感的 `<radialGradient>` 径向渐变球体；并在物体外围渲染出随质量和距离动态干涉的淡蓝色同心圆“引力场涟漪”，直观展示了万有引力场的存在与强度。
  - 规范化引力矢量长度，采用对数映射防止大数值溢出，并重构为以 `physicsToCanvas` 进行物理坐标换算的单向依赖体系。
- **animationRegistry.ts**：
  - 为 `anim-spring-force` 动态挂载 `CenterExtra`。

**测试验证：**
- **静态校验**：移除 `GravityAnimation.tsx` 中的未使用变量 `STROKE` 导入，`npx tsc --noEmit` 编译零错误。
- **打包验证**：`npm run build` 打包构建 100% 成功，生成的 JS/CSS 运行效率极高。
- **交互验证**：开启本地服务器使用浏览器代理分别验证了两个场景，各项参数联动、图表展示与物理量看板显示完全准确且无报错。

### 竖直上抛运动物理教学改进与视觉美化（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-2-3）

对竖直上抛运动演示页面的物理教学细节进行了系统化优化，并大幅提升了实验仪性质感。

**核心改动：**
- **kinematics.ts**：升级了 `precomputeVerticalThrowTrajectory` 函数，使之同步计算并返回真空轨道对比点集（包含 vacuumPoints 和各自的 peakTimeVac、landTimeVac、maxHeightVac 等物理关键量），提供了一致的离线插值源。
- **VerticalThrowSidebar.tsx**：在空气阻力大于 0 且处于进阶模式时，增加了一键“对比真空参考轨道”的 Toggle 开关，使用户能自主控制对照组的显隐。
- **VerticalThrowAnimation.tsx**（完全升级）：
  - **真空双轨对比**：实现了物理演练区的双轨对比模式（左侧轨道运行“实际有阻力实体球”，右侧轨道运行“真空对照虚影球”）。
  - **实验设备材质美化**：导轨重构为带有镜面渐变高光的金属发射架，并雕刻了实验室刻度标尺。底部绘制了带冷蓝色弹射指示灯的电磁起抛台座，顶部增设了带有黄黑警示条纹的防撞回收架。小球重构为右上光源的高逼真度三维拉丝钢珠，对照球为淡蓝色半透明光晕球。
  - **最高点认知强化**：在小球到达最高点 $v=0$ 自动暂停时，弹出悬浮科学看板（明确给出受力 $F_{net}=mg$ 向下，及加速度 $a=-g$），并且 $v-t$ 图象上过零点处实时高亮绘制此时的切线，直观呈现切线斜率非零。
  - **双解问题联动**：在经过目标高度线 $t_1$（上升段）和 $t_2$（下落段）时，小球旁弹出对应气泡标注（展示实时速度 $v_1$ 和 $v_2$），且 $v-t$ 图表上以水平虚线高亮投影，若有阻力，可显著看出 $|v_1| > |v_2|$ 的能耗不对称。
  - **微元法连线**：在物理小球与 $v-t$ 图象的切片矩形之间，以动画帧进度同步渲染半透明蓝色/红色激光段，将微位移累加过程可视化。
  - **图像极光渐变着色与科学网格**：图表引入冷白细密坐标网格底图；曲线加上霓虹渐变发光；时间游标升级为发光精密针与靶标圈；$v-t$ 积分面积填充升级为正位移（半透明极光蓝）与负位移（半透明极光红）渐变着色。

**测试验证：**
- **kinematics.test.ts**：追加了 2 项 `precomputeVerticalThrowTrajectory` 测试用例，分别覆盖无阻力一致性与空气阻力耗散下高度和时间的偏斜规律，32 项测试全部通过。
- **physicsQuantities.test.ts**：18 项测试均全绿通过。
- **静态校验**：`npx tsc --noEmit` 编译零错误。

### 速度概念教学页面重构优化与视觉美化（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-1-3）

对速度演示页面（包括基础版生活场景、进阶版图表与运动带）进行了深度的性能优化重构与高品质视觉美化。

**核心改动：**
- **kinematics.ts**：新增并导出了 `precomputeVariableMotion` 纯函数。采用 0.001s 细粒度步长，对变加速、简谐振动（SHM）及往返多阶段运动进行物理状态积分，离线预计算位置、速度、加速度及累计路程 $s$，并将 $O(N)$ 重计算优化为 $O(1)$ 查表插值。
- **useVelocityPhysics.ts**（新建）：封装了 `useVelocityPhysics` Hook，通过 $O(1)$ 线性插值器 `getVariablePhysicsAtTime` 对预计算数组进行插值，将物理计算与帧渲染完美解耦。
- **VelocityAnimation.tsx**（重构与美化）：
  - 公交车：使用对角折射率金属车窗和拉丝车轮，精化刹车指示灯，并添加了尾灯红色发光效果。
  - 短跑运动员：重构为步伐交替、科幻光流半透明剪影的飞奔小人。
  - 打点轨迹：新增淡灰色科学网格底图，将打点轨迹美化为带外围衰减晕染的发光印记。
- **VelocityAnimationStrip.tsx**（重构与美化）：
  - 气垫导轨：设计了深灰拉丝铝合金导轨，带有白色厘米刻度尺标与高对比度测速标记。
  - 立体弹簧：通过前后分层绘制后半圈（暗灰描边）与前半圈（高光不锈钢渐变），并在中间渲染振动小球，实现了精美的三维立体穿过环绕效果。
  - 滑块小车：设计为高光拉丝不锈钢滑块小车，并安装了高对比度闪烁测速指示灯。
- **VelocityXTChart.tsx** & **VelocityVTChart.tsx**（重构与美化）：
  - 剔除了绘制曲线时每帧 $O(N)$ 的重计算，由游标 clipPath 进行动态同步裁剪展示。
  - 坐标轴：改用科学精细冷白坐标网格图底，切线与割线增加发光光晕及高亮交点焦点指示。
  - 积分面积：v-t 图增加随时间动态滑动的半透明渐变位移积分面积着色填充。
  - 偏光镜：放大镜镜框升级为拉丝金属材质，并加入了淡蓝色折射偏光透镜光效。

**测试验证：**
- **kinematics.test.ts**：在末尾追加 `precomputeVariableMotion` 测试套件，覆盖变加速、SHM 以及多阶段运动累计路程 $s$ 的数值积分精度验证，30项测试全部绿灯通过。
- **physicsQuantities.test.ts**：修复了因 buildPhysicsQuantities 返回格式变更导致的 TypeScript 类型定义和旧 Label 匹配失效，测试完全通过。
- **静态校验**：`npx tsc --noEmit` 编译零错误，未引入任何类型漏洞或负面副作用。

### 自由落体运动重构优化与视觉美化（归属 [M1] 力学动画 与 [M2] 架构完善 · 知识点 mechanics-2-2）

优化了自由落体演示页面的计算开销和分层架构，并大幅升级了演示动画与科学图表的学术仪性质感。

**核心改动：**
- **kinematics.ts**：下沉了 Somigliana 纬度重力修正公式（`calcGByLatitude`）和海拔重力修正公式（`calcGByAltitude`）；新增 `precomputeFreeFallWithDrag` 纯物理数值积分函数，将物体的位置、速度、阻力以 0.01s 步长预计算出来，并在其中加入了羽毛物理正弦偏角（`swayAngle`）与水平偏量（`swayDx`）的离线模拟计算，严格对齐铁律 3。
- **useFreeFallPhysics.ts**（重构）：实现了高精度的 $O(1)$ 离线轨迹数据线性插值器 `getPhysicsAtTime`，并封装成自定义 Hook `useFreeFallPhysics`。通过将物理计算从渲染周期中抽离，彻底解决播放后期单帧多达数千次数值积分造成的 CPU 瓶颈。
- **FreeFallAnimation.tsx**：应用 `useFreeFallPhysics` 进行数据插值读取。视觉体验与布局全面提升：
  - 牛顿管改造为带有左右线性高光、白色反光壁的晶莹立体玻璃气缸，加入淡灰色毫米级科学实验室标尺网格背景。
  - **排版去冲突化**：将中轴大标题“牛顿管（气压…）”在垂直方向上提至 `tubeTop - 25`，将两侧铁球/羽毛的文字标签下移至 `originY - 18` 处，彻底解决大标题与两侧物体标签重合挤占的排版问题。
  * 铁球改用高精度右上光源金属拉丝径向渐变；硬币升级为红铜多层轮廓币面；羽毛改用高画质 SVG 贝塞尔曲线精描，下落时叠加阻力偏角与水平摆动，呈现逼真的飘落美感。
  * 重力与空气阻力箭头增加冷光特效，附带 LaTeX 公式和实时数值标注。
  * $v-t$ 图表加入淡蓝色半透明渐变**积分位移面积**动态填充（直观揭示速度曲线下积分面积等于位移的教学原理），并在图表上增加了时间垂直线游标与交点焦点指示圈。
- **FreeFallDripAnimation.tsx**：物理逻辑全部切换为下沉后的重力修正计算和轨迹插值。视觉特效与布局重构：
  - 水龙头增加了镜面渐变与立体阴影；水滴在断开滴下瞬间叠加垂直伸展撕裂形变。
  - **排版优化**：将管标题“滴水法测 g”在垂直方向上提至 `tubeTopY - 38` 处以避开龙头出水阀的遮挡。
  - 水花溅射不再为硬直的散点，重构为受重力下坠的**抛物线物理飞射轨迹**，水珠颗粒的大小和透明度随时间指数级消失衰减。
  - $v-t$ 图像同步增加了位移面积着色阴影和追踪游标。

**测试验证：**
- **kinematics.test.ts**：新增 4 项单元测试，充分覆盖纬度/海拔 g 修正算法和带阻力物理预计算算法。27项测试全部顺利通过。
- **静态校验**：`npx tsc --noEmit` 编译零错误，未引入任何负面影响。

## 2026-06-05

### 速度动画进阶版重构（归属 [M1] 力学动画 · 知识点 mechanics-1-3）

原始速度动画为单一匀速运动页面，升级为基础版+进阶版双模式教学页面。

**基础版改动：**
- **VelocityAnimation.tsx**：保持原有 Canvas 动画（7元素+5标注），参数面板 Δt 步进器绑定 `updateParam('deltaT')` 修复无反应问题
- **VelocitySidebar.tsx**：新增进阶模式 toggle 按钮（竖直上抛风格），进阶模式隐藏生活场景；Δt 步进器改为 `updateParam('deltaT')` 统一入口

**进阶版新增：**
- **kinematics.ts**：新增5个纯函数（`calculateAverageVelocity`/`calculateVariableAcceleration`/`calculateSecantSlope`/`calculateTangentSlope`/`calculateInstantaneousVelocity`）；`calculateVariableAcceleration` 支持三种模型：变加速(a=kt)、简谐振动(x=Asinωt)、往返多阶段5段式
- **VelocityCenterExtra.tsx**（新建）：进阶版三合一布局容器，landscape 时图表左右并列在上动画在下；包含信息条（割线/切线斜率+残差）+ 动画控制栏
- **VelocityXTChart.tsx**（新建）：x-t 图象独立组件（SVG viewBox），7元素：坐标系/曲线/P点/割线/切线/直角三角形/放大镜；支持滑动窗口（SHM 2周期+自动平移）；曲线随动画同步逐步绘制
- **VelocityVTChart.tsx**（新建）：v-t 图象独立组件，6元素：坐标系/v(t)曲线/当前点/速度水平线/Δt面积/平均速度v̄水平线；同上滑动窗口+同步绘制
- **VelocityAnimationStrip.tsx**（新建）：进阶版运动动画带（SVG），三种模型渲染不同动画：变加速小车+加速度箭头/简谐振动弹簧+小球/往返多阶段小车+A/B标志+路程/位移指示
- **physicsQuantities.ts**：`anim-velocity` 分支重写为基础版6行+2卡片 / 进阶版8行+3卡片；多阶段专属看板（当前阶段/加速度/速度/位移/路程/平均速度/平均速率/核心对比）
- **animationRegistry.ts**：`anim-velocity` 新增 `SidebarExtra`/`CenterExtra`，defaultParams 扩展进阶版参数（advancedMode/modelIdx/modelK~modelA5 共15个）
- **colors.ts**：新增5个 token（averageVelocity/secantLine/tangentLine/deltaHighlight/magnifier）

**Bug 修复：**
- VelocityCenterExtra 缺少 `speed`/`setTime`/`setSpeed` 解构导致进阶版崩溃（"该内容暂时无法显示"）
- VelocityAnimationStrip `toPixelX`/`scale` 定义在 useMemo 外部导致非响应式
- SHM 的 xRange 用 tMax 时刻单点值计算导致范围极小且不对称，改为用振幅 A 对称计算
- SHM 图表 tMax=30 导致9.5个周期挤成粗线，改为2个周期+滑动窗口自动平移
- x-t 图曲线颜色用 velocity 蓝色与 v-t 图混淆，改为 displacement 靛蓝色
- 切换运动模型时动画时间不重置，VelocitySidebar 切换时增加 `setTime(0)`+`setIsPlaying(false)`
- 进阶版重置按钮只改 store time 不改 AnimationPage 的 currentTimeRef，播放从旧位置继续；AnimationPage 新增 useEffect 同步
- x-t/v-t 图进入页面就显示全曲线，改为只绘制到当前动画时间 t0，y轴范围仍用全范围预计算避免跳动

**测试：**
- **kinematics.test.ts**（新建）：23个测试覆盖5个纯函数+5段式多阶段模型

### 竖直上抛运动三屏联动重构 + 进阶模式（归属 [M1] 力学动画）

原始 VerticalThrowAnimation 为简单单区 SVG（小球+速度箭头+公式文字叠加），不符合三屏联动设计。完全重写为中屏双核布局（物理演练区 + 图象联动区），并新增进阶模式。

**基础模式改动：**
- **VerticalThrowAnimation.tsx**（完全重写）：中屏左区物理演练（竖直轨道+小球+速度/加速度矢量+频闪点+目标高度线），右区图象联动（v-t 图穿轴零线+正负区域着色+时间悬标线 + y-t 图抛物线+最高点标注）
- **physicsQuantities.ts**：`anim-vertical-throw` 分支从 4 个物理量增至动态结构（PhysicsPanelData），精简为 3 个动态量（速度v/位移y/运动阶段）+ 2 个内联公式 + 高考要点卡片；最高点时追加"v=0，但 a≠0！"警告
- **PhysicsPanel.tsx**：公式区从 block 模式改为 inline 左对齐，去掉灰色背景容器，行间距收紧；支持 `formulas` 和 `gaokaoPoints` props
- **AnimationPage.tsx**：传递 `formulas`/`gaokaoPoints` 给 PhysicsPanel

**Bug 修复：**
- 最高点自动暂停后无法继续播放：用 `hasPausedAtPeakRef` 记录已暂停过，仅首次经过时暂停，再次点击播放可正常继续

**进阶模式改动：**
- **VerticalThrowSidebar.tsx**（新建）：进阶模式 toggle 按钮 + 条件显示的三个高级滑块（微元切片密度/空气阻力k/目标高度线）
- **animationRegistry.ts**：`anim-vertical-throw` 新增 `SidebarExtra` 指向 VerticalThrowSidebar，从 paramMeta 移除进阶参数
- **types.ts**：`ParamMeta` 新增 `showIf` 可选字段（条件显示参数）
- **kinematics.ts**：新增 `calculateVerticalThrowWithDrag`（欧拉法数值求解含空气阻力的竖直上抛）和 `precomputeVerticalThrowTrajectory`（预计算完整轨迹，避免渲染时重复欧拉积分）
- **VerticalThrowAnimation.tsx** 进阶功能：
  - 微元切片：v-t 图阶梯矩形 + 交叉线/斜线 SVG 图案 + 物理区频闪点
  - 空气阻力：使用预计算轨迹 + 线性插值，v-t 曲线变弧线
  - 目标高度双解：物理区水平虚线 + y-t 图双交点 t₁/t₂ 标注
  - 面积数值：v-t 图右上角 S⁺/S⁻/y 实时显示
  - 时间悬标拖拽：鼠标拖拽时间线，三屏联动
- **physicsQuantities.ts** 进阶公式：位移方程/求根公式/Δy=gT² + 双解拦截索 + 落地对称性结论

## 2026-06-04

### AnimationPage 规范合规重构（归属 [M2] 架构完善）

原始 AnimationPage 773 行，违反 §3.1 薄页面原则、§8.1 动画注册表唯一入口、§9 不得硬编码动画组件引用、§5 useAppStore 不得与业务状态混写等 5 条规范。重构后 275 行，通过 registry 驱动，新增动画只需改 registry 一处。

- **types.ts**：新增 `ParamMeta`（参数控件元数据）、`SidebarExtraProps`（侧边栏扩展 props）类型；`AnimationConfig` 扩展 `paramMeta`/`supportsDiscovery`/`DiscoveryComponent`/`discoverySteps`/`SidebarExtra`/`CenterExtra` 可选字段
- **animationRegistry.ts**：所有动画条目增加 `paramMeta`（原页面层 paramConfigs 230 行合并至此）；`anim-uniform-acceleration` 增加 `supportsDiscovery`/`DiscoveryComponent`/`discoverySteps`/`CenterExtra`；`anim-free-fall` 增加 `supportsDiscovery`/`DiscoveryComponent`/`discoverySteps`/`SidebarExtra`
- **AnimationPage.tsx**：773→275 行，移除硬编码 paramConfigs/discoverySteps/特异 UI，通过 registry 可选字段驱动渲染，切换动画时重置 mode
- **FreeFallSidebar.tsx**（新建）：自由落体特异 UI（环境预设/时间切片/牛顿管按钮组），从页面层下沉到 features/
- **UniformAccelerationCenterExtra.tsx**（新建）：匀变速动画模式中心区域扩展（公式面板 + VT 图），从页面层下沉到 features/
- **UniformAccelerationDiscoverySteps.tsx**（新建）：匀变速发现模式 6 步骤定义，从页面层下沉到 features/
- **FreeFallDiscoverySteps.tsx**（新建）：自由落体发现模式 5 步骤定义，从页面层下沉到 features/
- **useAppStore.ts**：新增 `discoveryMaxStep`/`setDiscoveryMaxStep`，修复 `nextDiscoveryStep` 硬编码步数上限

### 自由落体牛顿管实验逻辑修正（归属 [M1] 力学动画）

原始实现 `isDual = showDualObjects && dragK > 0`，导致真空模式（dragK=0）下无法展示双物体同时落地——而这正是牛顿管实验的核心教学场景。同时存在羽毛缺少重力加速度箭头、v-t 曲线落地后未截断、阻力参数量级偏大等问题。

- **FreeFallAnimation.tsx**：①`isDual` 判断改为仅 `showDualObjects`，与 `dragK` 解耦 ②牛顿管标注根据 `dragK` 值显示「真空」/「k=…」③新增羽毛重力加速度 g 箭头 ④羽毛 v-t 曲线落地后截断并添加零速水平线段
- **FreeFallSidebar.tsx**：牛顿管按钮不再强制设 `dragK=0.5`，仅切换 `showDualObjects`；「空气阻力」预设值 `0.5` → `0.02`
- **animationRegistry.ts**：`dragK` 参数范围 `0~2` → `0~0.2`，步长 `0.05` → `0.01`（对齐羽毛实际阻力量级）

### 项目规范整合至 .trae/rules/project_rules.md

原规范散布在 AGENT.md + docs/agent-rules/core/ + docs/agent-rules/ui/ 多处，每次需手动查找。整合至 Trae IDE 默认加载位置，自动生效。

- **.trae/rules/project_rules.md**（新建）：整合 AGENT.md + ARCHITECTURE_RULES + UI 规范核心内容（17 节），Trae IDE 每次任务自动加载
- **AGENT.md**：精简为按需加载索引，指向 .trae/rules/project_rules.md 为自动加载入口
- **ARCHITECTURE_RULES.md**：添加 .trae/rules/project_rules.md 引用说明

## 2026-06-03

### 三屏布局响应式改造
- **spacing.ts**：新增 `BREAKPOINT`（mobile 1024 / tablet 1280 / desktop 1440）和 `PANEL`（左右面板宽度配置，含 standard/compact/min/max）；`LAYOUT` 值改为引用 `PANEL`/`BREAKPOINT` 保持向后兼容
- **ThreePanel.tsx**：从死代码重写为响应式组件（132 行），内置 `useBreakpoint` Hook，4 级断点自动切换：standard(≥1440) / compact(1280-1439) / tablet(1024-1279) / mobile(<1024)；tablet/mobile 左侧面板变抽屉（translateX 动画 + 遮罩层 + PanelLeftOpen/Close 切换按钮）；mobile 右侧面板下移至 Canvas 下方
- **AnimationPage.tsx**：从手动 flex 布局 + `style={{ width: LAYOUT.leftPanelWidth }}` 迁移到 `<ThreePanel>` 组件，移除 `LAYOUT` import
- **02_UI_RULES.md §5**：从固定像素描述更新为 4 级断点表格，引用 `BREAKPOINT`/`PANEL`/`ThreePanel`
- **AGENT.md**：import 速查表新增 `BREAKPOINT`/`PANEL`

### CuttingEMF 物理量看板修复
- **physicsQuantities.ts**：`anim-cutting-emf` 分支改用 `calculateCuttingEMF` 纯函数，消除硬编码公式（原 `B*L*v` → `BLv·sinθ`，`EMF/R` → `EMF/(R+r)`）；看板新增 `θ` / `内阻 r` 显示项，EMF/I 取 `Math.abs()` 展示大小
- **对齐组件**：与 `CuttingEMF.tsx` 组件物理计算保持一致，避免参数调节时画面与看板数据矛盾
- **构建验证**：`tsc --noEmit` + `vite build` 零错误

### 颜色治理 — Token 一致性专项
- **1a 统一 import 策略**：50 个文件从 `@/theme/physicsColors` / `@/theme` / 相对路径迁移至子模块入口（`@/theme/physics`、`@/theme/colors`、`@/theme/motion`）；更新 AGENT.md / ARCHITECTURE_RULES.md / 02_UI_RULES.md 规范文档
- **1b A 类硬编码清理**：6 个文件 34 处替换（`#fff` → `colors.neutral[0]`、`#E2E8F0` → `PHYSICS_COLORS.grid` 等）
- **1c B 类颜色语义归属**：3 处（`#1e3a8a` → `DYNAMICS_COLORS.forceComponent`、`#f97316` → `PHYSICS_COLORS.electricForce`、`#c2410c` → `PHYSICS_COLORS.forceNetArrow`）
- **1d C 类场景色替换**：ACGeneration(20+)、FaradayLaw(8)、SkeletalHand(11) — 引入 `SCENE_COLORS` token
- **1e 魔法数字替换**：18 个文件 210 处（strokeWidth/fontSize/strokeDasharray → `STROKE`/`FONT`/`DASH` token）
- **规范变更**：删除"导入必须显式写出后缀"规则（与 Vite/TS bundler 模式冲突）；import 路径改为"子模块优先，统一入口仍可用"

## 2026-06-02

### 右手定则手性认知偏差修正
- **架构重构**：废弃 `SkeletalHand.tsx` 中基于 `mirrorX` 的对称几何镜像逻辑，改为解耦的独立手性骨骼模型体系
- **视觉修正**：`Palm` 组件根据物理驱动状态 (`isBack`) 动态渲染掌心/手背文字标注
- **逻辑对齐**：磁场方向 (`B_out`) 与手掌渲染状态精准映射（⊗→掌心，⊙→手背）
- **架构升级**：`SkeletonHand` props 引入 `isBack` 属性，实现物理层驱动视觉渲染的无状态架构

### 右手定则手部姿态偏斜修复
- 重构 `computeHandPose` 算法，切换旋转参考系
- 从"以拇指为基准对齐"更改为"以四指平面（中指指向）为基准对齐"
- 验证修正对 `chirality` 判定逻辑的物理无损性

## 2026-05-31

### M4-1 磁场组件审查修复（10 项）
- 🔴 P0：负电荷力方向修正 / transform 插值修复
- 🟡 P1：fontSize/strokeWidth token 化 / 电荷颜色语义修正 / 粒子内文字 fill token 化 / 速度箭头视觉增强
- 🟡 P1：LorentzForce angle 参数无视觉反映（新增 θ 弧线标注 + sinθ 数值显示）、力的线段长度随 F 大小正确变化
- 🟡 P1：AmpereForce 力/电流箭头颜色混淆（electricCurrent 从 #C2410C 改为 #059669 翡翠绿）
- 🔵 P2：水平网格线 / F=0 隐藏箭头

### M4-1 电磁感应组件审查修复（10 项）
- 🔴 严重：①LenzsLaw 感应磁场线方向反转 ②CuttingEMF EMF 方向箭头反转
- 🟡 中等：③N/S极硬编码颜色→PHYSICS_COLORS token ④硬编码 strokeWidth→CANVAS_STYLE token ⑤FaradayLaw Mode1 dΦ/dt omega 修正 ⑥线圈不随角度旋转→椭圆投影 ⑦删除未使用变量
- 🔵 轻微：⑧移除未使用 m 参数 ⑨导体棒 ping-pong 往复运动 ⑩physicsQuantities omega 同步修正

### UI 主题一致性优化（归属 [M2]）
- ①进度条撞色：慢放 secondary-500→secondary-400，新增速度文字标签
- ②光晕 token 统一：shadow.ts 新增 `glowRing` 对象，旧 masteredGlow/focusGlow 标记 deprecated
- ③动效分类体系：motion.ts 新增 celebration/stateChange/feedback 时长 token，03_MOTION_RULES 新增 §6 动效分类定义表
- ④分析页信息密度：04_ANALYSIS 新增 §2.3 单步内容上限

## 2026-05-30

### M4-1 电磁学纯函数库
- src/physics/electromagnetism.ts 实现 13 个纯函数（电场/电势/电容/欧姆/串并联/闭合电路/安培力/洛伦兹力/磁场圆周/法拉第/变压器/交流有效值），库仑力复用 dynamics.ts；新增 16 项单测

### M4-1 静电场组件
- CoulombLaw / ElectricField / ChargeInEField / Capacitor 四个 SVG 动画 + 知识点 electricity-1-1~1-4 + 全接线

### M4-1 恒定电流组件
- OhmLaw / CircuitAnalysis / ClosedCircuit 三个 SVG 动画 + 知识点 electricity-2-1~2-3 + 注册表 + 参数面板 + 物理量看板全接线

### M4-1 磁场组件
- AmpereForce / LorentzForce / ChargeInBField 三个 SVG 动画 + 知识点 electricity-3-1~3-3 + animationRegistry + 参数面板 + 物理量看板全接线

### M4-1 静电场（续）
- FieldLines（电场线+等势面）/ ElectricPotential（电势分布）；知识点 electricity-1-5~1-6

### M4-1 电磁感应组件
- FaradayLaw / LenzsLaw / CuttingEMF 三个 SVG 动画 + 知识点 electricity-4-1~4-3 + animationRegistry + 参数面板 + 物理量看板全接线

### 质量闸门治理（归属 [M2]）
- ESLint 9 flat config 迁移（#BUG-005，`npm run lint` 恢复并 0 警告）
- 动画注册表单一数据源重构（#BUG-006，消除 componentPath/animationComponents 双映射与 anim-impulse 错配）
- 动画懒加载分包（#PERF-007，主 bundle 676→596kB）

### 架构改进六项（归属 [M2]/[M3]）
- 路由级代码分割+vendor manualChunks（#PERF-008，主 bundle 596→191.89kB）
- ErrorBoundary 错误边界（#BUG-009）
- useAnimationFrame 按实例动画 Hook（#REFACTOR-010）
- useCanvasSize 消除 24 动画样板（#REFACTOR-011）
- 物理量计算下沉至 data/physicsQuantities + physics/constants 消除硬编码 g（#REFACTOR-012）
- PracticePage/WrongPage 接线激活题库与 useWrongStore 死代码（#BUG-013，完成 M3-4 错题本主体）
- 新增 15 项测试（共 48）

### M3-4 错题管理系统
- 按 ui/05_WRONGBOOK_RULES 重写 useWrongStore（WrongRecord 四态 + IndexedDB 持久化 hydrate）
- WrongPage 完整实现（统计面板/三类筛选/三种排序/已掌握折叠/右键菜单/删除二次确认/笔记 Modal/空态）
- AnalysisPage 集成加入错题本入口；新增 8 项测试（共 56）

### M3-1~M3-3 真题训练系统
- M3-1：创建 analysisRegistry.ts 题目解析注册表、problems/ 目录结构（6 个分类 22 道力学真题）
- M3-2：AnalysisPage 完整实现（题干区/分步解析区/知识链路区/步骤导航）
- M3-3：KatexFormula 组件改用 mode 属性，KaTeX CSS 与字体全部离线打包验证通过；填充 knowledgeTree.ts 力学 8 章共 35 个知识节点

### M3-5 练习与测试模式
- PracticeSession（练习/测试双模式、计时器、提示、揭示解析、自评联动 useWrongStore 自动判错判对）
- PracticePage 入口 + ScoreReport 成绩报告 + usePracticeStore（成绩历史 IndexedDB 持久化）
- 新增 4 项测试（共 60）；**[M3] 全部完成**

## 2026-06-02

### M4-1 交变电流模块（[M4-1] 收官）
- ACGeneration（3D 旋转线圈 + e-t 图像 + 中性面/最大值面切换）
- ACValues（有效值与峰值对比 + 热效应演示）
- Transformer（理想变压器匝数比 + 功率守恒验证）
- PowerTransmission（远距离输电全流程 + 线路损耗演示）
- 知识树新增 electricity-5-1~5-4，animationRegistry 新增 4 条，physicsQuantities 补 4 个 case

### M4-1.x CuttingEMF 增强
- [PR 1] 参数扩展+物理真实化 ✅
- [PR 1.1] 视觉同步修复 ✅
- [PR 2] 交互模式三态 ✅
- [PR 3] PiP 放大镜+真实右手 SVG（手性与掌心掌背逻辑彻底纠偏）✅
- [PR 4] 探索任务卡 ⏳ 待开始

## 2026-06-07

### 牛顿第二定律物理教学优化与重构（归属 [M2] 完善任务）

针对 `anim-newton-second` 模块进行全面优化与合规化重构，实现多物理受力分析及变力进阶工作台模式：

- **dynamics.ts**：新增 `calculateNewtonSecondVariableMotion` 纯函数，支持计算线性递增力 $F(t) = k\cdot t$ 及光滑正弦力 $F(t) = F_0\sin(\omega t)$ 的解析物理模型状态，提供精确的加速度、速度和位移，新增 3 项对应的单元测试并通过。
- **physicsQuantities.ts**：新增 `case 'anim-newton-second'` 物理看板数据，包含拉力、阻力、合力、加速度及速度的显示，挂载牛二定律核心公式与高考三大要点（瞬时性、矢量性、同体性），并将原本硬编码在 Canvas 的公式完全分离至右屏展示。
- **animationRegistry.ts**：扩展默认参数支持 `advancedMode` 与变力控制，并注册 `NewtonSecondSidebar` 及 `NewtonSecondCenterExtra`。
- **NewtonSecondAnimation.tsx**：重构并美化 Canvas（SVG）界面，使用精致的不锈钢金属渐变材质滑块，完善了受力分析图（增添重力 $G$ 和支持力 $F_N$ 箭头，各力的颜色均遵循全局 token 规划），并在车顶上方动态呈现速度 $v$ 与加速度 $a$ 的矢量箭头。
- **NewtonSecondSidebar.tsx**（新建）：支持普通与进阶模式切换，在进阶模式下提供线性与正弦变力切换及对应参数（力增加斜率 $k$、幅值 $F_0$、频率 $\omega$）的滑动调节。
- **NewtonSecondCenterExtra.tsx**（新建）：实现进阶变力工作台，上端展示图表，下端展示滑块动画，中间包含 $F-t$（拉力、摩擦力及合外力）、$a-t$（加速度）及 $v-t$ (速度) 三条动态曲线，且图表网格与游标已完全消除硬编码颜色并使用规范的物理量色彩。
- **布局微调**：按反馈将 `NewtonSecondCenterExtra` 的内部布局调整为“图表在上，动画在下”，提升了曲线读取的直观性。

### 超重与失重物理教学重构与合规化治理（归属 [M2] 完善任务）

针对 `anim-weightlessness` 模块进行重构与美化，消除 Canvas 公式，升级为变速升降与坠落漂浮的进阶多联动图表工作台模式：

- **dynamics.ts**：新增 `calculateElevatorMotion` 纯函数，支持电梯变速升降模型与钢索坠落缓冲模型，提供精确的加速度、速度、位移和视重变化物理计算，新增 2 项对应的单元测试并通过。
- **physicsQuantities.ts**：新增 `case 'anim-weightlessness'` 物理看板分支，挂载质量、重力、视重、速度、状态等数据展示，绑定核心 LaTeX 公式与高考超失重两大核心考点，将公式与数据完全剥离至右屏展示。
- **animationRegistry.ts**：为 `anim-weightlessness` 注册 `SidebarExtra`、`CenterExtra` 组件以及进阶参数。
- **WeightlessnessAnimation.tsx**：重构并美化 Canvas：① 绘制精美体重秤并配置表盘指针旋转偏角（偏角与视重大小动态对齐，超重向右，失重向左，失重为零时偏左 90 度）② 在完全失重段增加砝码由于失重导致的悬浮在半空中的漂浮简谐动效 ③ 补充重力、支持力的作用点至重心，优化加速度与速度的指示箭头 ④ 彻底消除原硬编码的 rgba 色值，使用 `PHYSICS_COLORS`/`SCENE_COLORS` token。
- **WeightlessnessSidebar.tsx**（新建）：支持普通与进阶模式切换，在进阶模式下提供“变速升降”和“钢索坠落”两个真实力学环境的切选。
- **WeightlessnessCenterExtra.tsx**（新建）：实现图表在上、动画在下的进阶工作台模式，绘制 $a-t$、$N-t$（内含 $mg$ 重力对比水平线）以及 $v-t$ 同步联动曲线，完美展示“失重、超重状态下，重力大小不变仅支持力（视重）在变化”的物理本质。



