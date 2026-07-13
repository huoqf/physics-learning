# COMPONENT_REGISTRY — 公共组件速查索引

> 新增或修改动画场景前必须查阅。示例均来自 `src/features/` 真实调用。
> 详细说明（禁止写法、派生数据、渲染层级）→ [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)
> 最后更新：2026-07-13

---

## Physics（`@/components/Physics`）

| 组件 | 用途 | 必需 props | 最小调用 |
|------|------|-----------|---------|
| `VectorArrow` | 矢量箭头 | `origin`, `vector`, `type`, `sceneScale` | `<VectorArrow origin={pos} vector={v} type="velocity" sceneScale={ss} />` |
| `Ball` | 质点/小球 | `cx`, `cy`, `r` | `<Ball cx={x} cy={y} r={14} type="steel" />` |
| `Block` | 滑块/木块 | `x`, `y`, `width`, `height` | `<Block x={x} y={y} width={48} height={24} type="metal" />` |
| `PhysicsGround` | 地面/斜面 | `x`, `y`, `width` | `<PhysicsGround x={0} y={groundY} width={dw} fontFamily={font} />` |
| `Incline` | 斜面体 | `x0`, `y0`, `width`, `height` | `<Incline x0={cx} y0={gy} width={W} height={H} />` |
| `Pulley` | 定滑轮 | `cx`, `cy` | `<Pulley cx={px} cy={py} r={12} hangerTopY={py - 45} />` |
| `SportsCar` | 运动小车 | `x`, `y` | `<SportsCar x={carX} y={groundY - 26} width={56} height={26} />` |
| `Spring` | 弹簧 | `x1`, `y1`, `x2`, `y2` | `<Spring x1={ox} y1={oy} x2={bx} y2={oy} coils={8} amplitude={12} />` |
| `EnergyBars` | 能量柱状图 | `items` | `<EnergyBars items={[{ key:'Ek', label:'Ek', value:state.Ek, color:COLORS.kineticEnergy }]} />` |
| `ParticleTrajectory` | 粒子轨迹(SVG) | `historyPoints`, `predictedPoints`, `tailPoints`, `isFocus`, `chargeSign` | `<ParticleTrajectory historyPoints={hp} predictedPoints={pp} tailPoints={tp} isFocus chargeSign="+" />` |
| `ParticleEmitter` | 粒子发射源 | `x`, `y` | `<ParticleEmitter x={lx} y={ly} active={isPlaying} chargeSign={q} />` |
| `CapacitorPlates` | 平行板电容器 | `x`, `y`, `width`, `gap` | `<CapacitorPlates x={px} y={cy} width={wp} gap={gp} chargeSign={E > 0.01 ? 1 : 0} />` |
| `ConductingRod` | 导体棒 | `type` | `<ConductingRod type="horizontal" x={rx} spacing={sp} width={w} height={h} currentDir="in" />` |
| `DCSource` | 直流电源 | `type` | `<DCSource type="instrument" x={420} y={250} voltage={U} polarity="right-positive" />` |
| `Galvanometer` | 灵敏电流计（thin wrapper，内部使用 MeterPointer 渲染指针） | `value` | `<Galvanometer x={gx} y={gy} value={emf * 10 / 45} />` |
| `CoilBase` | 通用线圈基座（Solenoid / PrimaryCoil 共享渲染逻辑） | `x`, `y`, `width`, `height`, `turns` | `<CoilBase x={cx} y={cy} width={160} height={80} turns={5} current={I} time={t} />` |
| `Solenoid` | 螺线管（thin wrapper，内部使用 CoilBase，铜线样式） | `x`, `y`, `width`, `height`, `turns` | `<Solenoid x={cx} y={cy} width={160} height={80} turns={5} current={I} time={t} />` |
| `PrimaryCoil` | 原线圈（thin wrapper，内部使用 CoilBase，漆包绿线样式） | `x`, `y`, `width`, `height`, `turns` | `<PrimaryCoil x={cx} y={cy} width={120} height={66} turns={4} current={I} time={t} />` |
| `MeterPointer` | 仪表指针通用组件（DialMeter / Galvanometer 共享指针渲染） | `angle`, `length`, `color` | `<MeterPointer angle={-30} length={21} color={themeColor} />` |
| `DialMeter` | 理想电表盘（内部使用 MeterPointer 渲染指针） | `type`, `value`, `x`, `y` | `<DialMeter type="V" value={U} x={dx} y={dy} />` |
| `BarMagnet` | 条形磁铁 | `pole` | `<BarMagnet x={mx} y={cy} width={120} height={36} pole={-1} />` |
| `HandRule` | 手指定则 | `mode`, `thumbDir`, `indexDir`, `middleDir`, `cx`, `cy` | `<HandRule mode="left" thumbDir={td} indexDir={id} middleDir={md} cx={171} cy={175} />` |
| `VectorDefs` | 箭头 marker 定义 | — | `<VectorDefs />`（放在 `<svg>` 内） |
| `SkeletonHand` | 骨骼手 | `pose` | `<SkeletonHand cx={cx} cy={cy} pose="open" />` |

---

## Layout（`@/components/Layout`）

| 组件 | 用途 | 必需 props | 最小调用 |
|------|------|-----------|---------|
| `AnimationSvgCanvas` | SVG 画布容器 | `containerRef`, `transform` | `<AnimationSvgCanvas containerRef={ref} transform={vp.transform}><Scene /></AnimationSvgCanvas>` |
| `ThreePanel` | 三栏布局 | `left`, `center`, `right` | `<ThreePanel left={<LeftPanel />} center={<Canvas />} right={<Panel />} />` |

---

## UI（`@/components/UI`）

| 组件 | 用途 | 必需 props | 最小调用 |
|------|------|-----------|---------|
| `LeftPanel` / `LeftPanelSection` | 左屏控制台 | — | `<LeftPanel><LeftPanelScrollArea><LeftPanelSection title="参数">...</LeftPanelSection></LeftPanelScrollArea></LeftPanel>` |
| `ParamControl` | 参数滑块 | `params`, `onParamChange` | `<ParamControl params={[{ key:'m', label:'质量', value:params.m, min:0.1, max:10, step:0.1, unit:'kg' }]} onParamChange={updateParam} />` |
| `ControlPanel` | 声明式控件 | `controls`, `params`, `updateParam`, `setParams`, `resetAnimation`, `restartAnimation` | `<ControlPanel controls={mc} params={params} updateParam={updateParam} setParams={setParams} resetAnimation={handleReset} restartAnimation={handleRestart} />` |
| `PhysicsPanel` | 右屏公式面板 | `quantities` | `<PhysicsPanel quantities={[{ label:'质量', value:params.m, unit:'kg' }]} formulas={[{ name:'F=ma', latex:'F=ma', level:'core' }]} />` |
| `AnimationControls` | 播放控制条 | `isPlaying`, `speed`, `time`, `maxTime`, `onPlayPause`, `onReset`, `onSpeedChange`, `onTimeChange` | `<AnimationControls isPlaying={p} speed={s} time={t} maxTime={tMax} onPlayPause={toggle} onReset={reset} onSpeedChange={setSpeed} onTimeChange={setTime} />` |
| `Button` / `SegmentedControl` / `ToggleSwitch` | 基础控件 | — | 详见源码 interface |
| `Slider` | 数值范围选择 | `value`, `min`, `max`, `onChange` | `<Slider value={v} min={0} max={10} step={0.1} onChange={setV} label="质量" unit="kg" fillAnchor={0} />` |

---

## Chart（`@/components/Chart`）

| 组件 | 用途 | 必需 props | 最小调用 |
|------|------|-----------|---------|
| `BasePhysicsChart` | 图表原子容器 | `xDomain`, `yDomain`, `xLabel`, `yLabel` | `<BasePhysicsChart xDomain={[0,tMax]} yDomain={[yMin,yMax]} xLabel="t/s" yLabel="v/(m/s)"><ChartCursor x={t} /></BasePhysicsChart>` |
| `TimeSeriesChart` | 通用时间序列图（v-t / x-t / a-t 共享基座，拥有 VTStage / ChartDataSeries / TSPoint 类型） | `points`, `currentTime`, `tMax` | `<TimeSeriesChart points={vt} currentTime={t} tMax={15} title="v-t" yLabel="v/(m/s)" />` |
| `VelocityTimeChart` | v-t 图（thin wrapper，内部使用 TimeSeriesChart） | `points` | `<VelocityTimeChart points={vt} currentTime={t} tMax={15} title="v-t" series="primary" />` |
| `DisplacementTimeChart` | x-t 图（thin wrapper，内部使用 TimeSeriesChart） | `points` | `<DisplacementTimeChart points={xt} currentTime={t} tMax={15} title="x-t" />` |
| `AccelerationTimeChart` | a-t 图（thin wrapper，内部使用 TimeSeriesChart） | `points` | `<AccelerationTimeChart points={at} currentTime={t} tMax={15} title="a-t" />` |
| `RelationChart` | 通用关系图 Y=f(X) | `points`, `xDomain`, `yDomain` | `<RelationChart points={pts} xDomain={[0,30]} yDomain={[0,yMax]} title="v²-x" xLabel="x(m)" yLabel="v²(m²/s²)" />` |
| `ChartCursor` | 游标十字线 | `x`, `dataPoints` | `<ChartCursor x={time} dataPoints={[{ y: v, label: 'v', series: 'primary' }]} />` |
| `ChartLine` | 折线插件 | `points` | `<ChartLine points={pts} series="primary" />` |
