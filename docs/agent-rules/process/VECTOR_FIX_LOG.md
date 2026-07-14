# 矢量标注位置修复记录

> 日期：2026-07-14
> 触发：Phase 6 origin→originPixel 迁移后，部分页面矢量位置偏离

---

## 问题根因

Phase 6 将 VectorArrow 的 `origin` prop 统一迁移为 `originPixel`，并去掉 Y 取负。但存在两类 bug：

1. **originPixel 用了物理坐标**：`originPixel` 期望设计坐标（像素），但部分文件将物理坐标（米）直接传入
2. **renderVectorArrow 定位失效**：`originPixel={{ x: 0, y: 0 }}` 覆盖了 sceneScale 的 originX/Y，导致矢量从 SVG 原点出发而非从粒子位置

## forces.ts 纯函数验证

`lorentzForceDir` / `electricForceDir` / `centripetalForceDir` / `ampereForceDir` 返回物理坐标系(y↑正)单位方向向量。经确认，VectorArrow 的 `vector` prop 内部通过 `lineEndY = y1 - dir.y * lineLen` 已处理 Y 轴翻转，**物理坐标系方向可直接传入 vector prop，无需额外取负**。

## 修复清单

### 动量模块

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| BulletBlockScene | 动量-子弹打木块 | 4 处 originPixel 从物理坐标改为设计坐标：`state.bulletX` → `bulletCenterX`，`BB_LAYOUT.bulletRadius/scaleY` → `bulletCenterY - bulletRadius - 2` 等 |

### 万有引力模块

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| OrbitTransferAnimation | 万有引力-轨道转移 | 2 处 originPixel 改回 origin（state.x/y 是物理坐标，origin 自动转换） |

### 电磁学模块

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| renderVectorArrow | 组合场-通用矢量渲染 | 移除 originPixel prop，让 sceneScale 的 originX/Y 生效（修复所有组合场矢量定位） |

### 无需修改的页面

| 页面 | 原因 |
|------|------|
| SingleRodAnimation | ampereForceDir 返回物理坐标方向，pixelVector 已正确 Y 取负 |
| DeflectScene | electricForceDir/centripetalForceDir 返回物理坐标方向，VectorArrow vector prop 内部已处理 Y 翻转 |
| SpectrometerScene | 同 DeflectScene |
| ChargeInEField | originPixel 使用设计坐标，vector 方向手动处理正确 |
| ElevatorShaft | originPixel={{x:0,y:0}} 配合 IDENTITY_SCENE_SCALE + g translate 定位，正确 |
| NewtonSecondAnimation | 同 ElevatorShaft |
| FaradayFieldSandbox | 同 ElevatorShaft |

---

## 第二轮修复（2026-07-14）

> 触发：用户反馈安培力页面矢量不可见/位置偏离，扩展检查弹力、正交分解法等页面

### 安培力 F=BIL 模块

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| BasicAmpereScene | 电磁学-安培力（基础模式） | 移除 2 处 originPixel prop（安培力箭头、电流方向箭头），originPixel={{x:0,y:0}} 覆盖了 localScale 的 originX=rodX/originY=cy，导致矢量从 SVG 原点绘制而不可见 |
| InclinedForceVectors | 电磁学-安培力（进阶斜面3D场景） | 移除 8 处 originPixel prop（电流、安培力、重力、支持力、摩擦力、合力、速度、滑动趋势），originPixel 覆盖了 localScale 的 originX/Y（导体棒中心），导致矢量出现在区域左上角 |
| InclineForceVectors | 电磁学-安培力（2D侧视受力图） | 移除 5 处 originPixel prop（重力、支持力、安培力、摩擦力、合力），originPixel 覆盖了 localScale 的 originX=px/originY=py（导体棒侧视截面位置） |

### 弹力模块

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| SpringCompositeAnimation | 力学-弹力（弹簧振子复合动画） | 修复双重缩放：originPixel={{x:centerX*s, y:ballY*s}} 在 `<g transform="scale(s)">` 内部导致实际渲染在 centerX*s²，移除 `* s` 改为 originPixel={{x:centerX, y:ballY}} |
| SpringForceHookeLawScene | 力学-弹力（胡克定律场景） | 添加 pixelLength={Math.abs(springForce*0.4)}，原使用 IDENTITY_SCENE_SCALE 无 pixelLength 导致箭头长度固定 14px 不随力大小变化 |
| SpringForceCutRopeScene | 力学-弹力（绳与弹簧瞬时切割） | 为 10 个力矢量添加 pixelLength={Math.abs(force*FORCE_ARROW_SCALE)}，同上问题 |

### 方法论模块

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| OrthogonalDecompositionAnimation | 力学-正交分解法 | canvasWidth/Height 从 vp.visibleW/H（容器像素）改为 preset.width/height（设计坐标），原在 `<g transform={vp.transform}>` 内使用容器像素导致坐标偏移；拖拽处理增加容器像素→设计坐标转换 |
| VectorAdditionAnimation | 力学-矢量合成 | 同 OrthogonalDecompositionAnimation 修复模式 |
| useVectorDrag | 力学-矢量拖拽 Hook | 更新接口支持容器像素→设计坐标转换 |

### 电磁学-圆周运动几何模型

| 页面 | 知识树 | 修复内容 |
|------|--------|---------|
| CircularGeometryModel | 电磁学-圆周运动几何模型 | 移除入射切线速度矢量的 originPixel={{x:0,y:0}}，该值覆盖了 sceneScale 的 customOriginX/Y，导致矢量从 SVG 原点绘制 |
