import { useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateElevatorMotion } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { colors } from '@/theme/colors'

/** 超重与失重场景布局常量 */
const LAYOUT = {
  shaftTopOffset: 30,       // 井道顶部偏移 (px)
  shaftBottomOffset: 30,    // 井道底部偏移 (px)
  elevatorMaxWidth: 150,    // 电梯最大宽度 (px)
  elevatorWidthPadding: 40, // 电梯宽度两侧留白 (px)
  elevatorMaxHeight: 180,   // 电梯最大高度 (px)
  elevatorHeightRatio: 0.45,// 电梯高度占井道比
  travelPadding: 10,         // 行程上下留白 (px)
  floorThickness: 15,        // 电梯底板厚度 (px)
  floorSidePadding: 5,       // 底板两侧内缩 (px)
  floorHeight: 10,           // 底板高度 (px)
  scaleWidthRatio: 0.55,     // 体重计宽度占电梯比
  scaleMaxHeight: 22,        // 体重计最大高度 (px)
  scaleHeightRatio: 0.12,    // 体重计高度占电梯比
  dialMaxRadius: 9,          // 表盘最大半径 (px)
  dialRadiusRatio: 0.45,    // 表盘半径占体重计高度比
  objWidthRatio: 0.55,       // 砝码宽度占体重计比
  objMaxHeight: 32,          // 砝码最大高度 (px)
  objHeightRatio: 0.16,     // 砝码高度占电梯比
  ceilingPadding: 20,        // 天花板预留间距 (px)
  pointerMaxAngle: 90,      // 指针最大偏角 (度)
  fs: 11,                    // 标题字号 (px)
  sfs: 9,                    // 轴标签字号 (px)
}

export default function WeightlessnessAnimation() {
    const {params, time, showVectors, showGrid, isPlaying, setIsPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    }))
  )
  // 备用尺寸设为高瘦型电梯井尺寸
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)

  const { a = 2, g = 9.8, m = 50, advancedMode = 0, modelIdx = 0 } = params

  // ── 布局分区与自适应自顶向下计算，不要写死像素 ──
  const isWide = advancedMode !== 1 && canvasSize.width >= 500
  const animWidth = isWide ? canvasSize.width * 0.42 : canvasSize.width
  const chartWidth = isWide ? canvasSize.width * 0.52 : 0
  const chartX = isWide ? canvasSize.width * 0.46 : 0

  // currentA: N-a 图表用的参数预览值（始终跟随参数 a）
  // actualA: 电梯实际加速度（驱动矢量箭头、漂浮判定等视觉元素）
  let currentA = a
  let actualA = 0
  let currentV = 0
  let currentY = 0
  let currentN = m * (g + a)

  const tMax = advancedMode === 1 ? (modelIdx === 1 ? 6 : 10) : Infinity

  // 1. 视轨井道与行程参数动态计算
  const shaftTop = LAYOUT.shaftTopOffset
  const shaftBottom = canvasSize.height - LAYOUT.shaftBottomOffset
  const shaftHeight = shaftBottom - shaftTop

  // 电梯尺寸比例自适应
  const elevatorWidth = Math.min(LAYOUT.elevatorMaxWidth, animWidth - LAYOUT.elevatorWidthPadding)
  const elevatorHeight = Math.min(LAYOUT.elevatorMaxHeight, shaftHeight * LAYOUT.elevatorHeightRatio)
  const maxTravel = (shaftHeight - elevatorHeight) / 2 - LAYOUT.travelPadding
  const elevatorStartY = shaftTop + shaftHeight / 2 - elevatorHeight / 2

  // 恒定加速度模式下，动态推算时间终点以刚好触及边界
  const maxDisplacementTime = maxTravel > 0 && Math.abs(a) > 0.01
    ? Math.sqrt((2 * maxTravel) / Math.abs(a))
    : Infinity

  // 在渲染中计算 effectiveTime，防止物理模拟在状态更新前越界
  let effectiveTime = time
  let isMoving = false

  if (advancedMode === 1) {
    effectiveTime = Math.min(time, tMax)
    const motion = calculateElevatorMotion(modelIdx as 0 | 1, m, g, effectiveTime)
    currentA = motion.a
    actualA = motion.a
    currentV = motion.v
    currentY = motion.y
    currentN = motion.N
  } else {
    effectiveTime = maxDisplacementTime !== Infinity && time >= maxDisplacementTime ? maxDisplacementTime : time
    // 电梯运动状态：处于播放中且未达到终点
    isMoving = isPlaying && time > 0 && time < maxDisplacementTime
    // 是否已到达终点（播放结束）
    const hasReachedEnd = maxDisplacementTime !== Infinity && time >= maxDisplacementTime
    
    // currentA 始终跟随参数 a，使 N-a 图游标响应滑块调节
    currentA = a
    currentN = m * (g + a)
    if (currentN < 0) currentN = 0

    if (isMoving) {
      // 播放中：使用 calculateElevatorMotion 统一计算
      const motion = calculateElevatorMotion(2, m, g, effectiveTime, a)
      actualA = motion.a
      currentV = motion.v
      currentY = motion.y
    } else if (hasReachedEnd) {
      // 播放结束：电梯急停，实际加速度归零
      actualA = 0
      currentV = 0
      currentY = 0.5 * a * effectiveTime * effectiveTime
    } else {
      // 未播放 (time=0) 或暂停中
      actualA = 0
      currentV = 0
      currentY = 0
    }
  }

  // 使用 React 副作用机制安全控制动画自动停止，防止 Render Loop 卡死
  useEffect(() => {
    if (!isPlaying) return

    if (advancedMode === 1) {
      if (time >= tMax) {
        setIsPlaying(false)
      }
    } else {
      if (maxDisplacementTime !== Infinity && time >= maxDisplacementTime) {
        setIsPlaying(false)
      }
    }
  }, [time, tMax, maxDisplacementTime, isPlaying, advancedMode, setIsPlaying])


  // 2. 映射物理位移到电梯屏幕 Y 坐标 (比例化无像素硬编码)
  let dispY = 0
  if (advancedMode === 1) {
    if (modelIdx === 0) {
      // 变速升降：最大位移 20m 映射到 maxTravel
      dispY = - (currentY / 20) * maxTravel
    } else {
      // 自由落体：最大坠落位移 -43m 映射到 maxTravel (向下)
      dispY = - (currentY / -43) * -maxTravel
    }
  } else {
    // 恒加速模式：物理极限行程自动与电梯井像素极限行程 maxTravel 归一化
    const maxPhysicalS = Math.max(0.1, 0.5 * Math.abs(a) * maxDisplacementTime * maxDisplacementTime)
    dispY = - (currentY / maxPhysicalS) * maxTravel
    dispY = Math.min(Math.max(dispY, -maxTravel), maxTravel)
  }

  const elevatorY = elevatorStartY + dispY

  // 3. 电梯内部件及物体的位置动态计算 (全比例自适应)
  const centerX = animWidth / 2
  const floorY = elevatorY + elevatorHeight - LAYOUT.floorThickness
  
  // 体重计尺寸比例
  const scaleWidth = elevatorWidth * LAYOUT.scaleWidthRatio
  const scaleHeight = Math.min(LAYOUT.scaleMaxHeight, elevatorHeight * LAYOUT.scaleHeightRatio)
  const scaleX = centerX - scaleWidth / 2
  const scaleY = floorY - scaleHeight

  // 体重计表盘
  const dialCx = centerX
  const dialCy = scaleY + scaleHeight / 2 + 1.5
  const dialR = Math.min(LAYOUT.dialMaxRadius, scaleHeight * LAYOUT.dialRadiusRatio)

  // 砝码物体
  const objWidth = scaleWidth * LAYOUT.objWidthRatio
  const objHeight = Math.min(LAYOUT.objMaxHeight, elevatorHeight * LAYOUT.objHeightRatio)
  const objX = centerX - objWidth / 2
  const objectBaseY = scaleY

  // 漂浮动效计算 (根据完全失重与超完全失重物理状态计算)
  let floatOffset = 0
  const isWeightless = actualA <= -g + 0.1

  if (isWeightless) {
    if (advancedMode === 1) {
      if (modelIdx === 1) {
        // 自由落体情景：从 1.5s 开始起漂
        if (effectiveTime > 1.5) {
          const tFloat = Math.min(2.5, effectiveTime - 1.5)
          const baseFloat = (elevatorHeight * 0.25) * (1 - Math.exp(-tFloat * 2))
          const waveFloat = (elevatorHeight * 0.06) * Math.sin(tFloat * 3)
          floatOffset = baseFloat + waveFloat
        }
      }
    } else {
      // 普通恒定加速度模式：只有在移动中才进行漂浮
      if (isMoving) {
        if (Math.abs(a + g) < 0.1) {
          // 完全失重 (a = -g)：平滑起漂并伴随波动
          const baseFloat = (elevatorHeight * 0.25) * (1 - Math.exp(-effectiveTime * 2))
          const waveFloat = (elevatorHeight * 0.06) * Math.sin(effectiveTime * 3)
          floatOffset = baseFloat + waveFloat
        } else if (a < -g) {
          // 超完全失重 (a < -g)：受到向上相对加速度，加速撞击天花板并贴紧
          const relA = Math.abs(a) - g
          const disp = 0.5 * relA * effectiveTime * effectiveTime
          const maxFloatLimit = elevatorHeight - scaleHeight - objHeight - LAYOUT.ceilingPadding
          floatOffset = Math.min(maxFloatLimit, disp * 25)
        }
      }
    }
  } else {
    // 进阶自由落体模式的制动缓冲阶段：让重物快速且平滑地砸回秤台
    if (advancedMode === 1 && modelIdx === 1 && effectiveTime >= 4.0) {
      const peakFloat = (elevatorHeight * 0.25) + (elevatorHeight * 0.06) * Math.sin(7.5)
      floatOffset = Math.max(0, peakFloat * Math.exp(-(effectiveTime - 4.0) * 12))
    }
  }

  const objY = objectBaseY - objHeight - floatOffset
  const objCx = centerX
  const objCy = objY + objHeight / 2


  // 指针旋转偏角：支持力与重力之差映射到表盘刻度 (超重右偏，失重左偏，完全失重支持力为0时偏左 90度)
  const weight = m * g
  const pointerAngle = Math.min(Math.max(((currentN - weight) / weight) * LAYOUT.pointerMaxAngle, -LAYOUT.pointerMaxAngle), LAYOUT.pointerMaxAngle)

  // 井道背景线
  const gridLines = []
  if (showGrid) {
    const gridCount = 10
    for (let i = 0; i <= gridCount; i++) {
      const yPos = shaftTop + (i * shaftHeight) / gridCount
      gridLines.push(
        <line
          key={`grid-y-${i}`}
          x1={centerX - elevatorWidth / 2 - 20}
          y1={yPos}
          x2={centerX + elevatorWidth / 2 + 20}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
  }

  // ── 右侧 N - a 图表辅助计算与参数 ──
  const aMin = -12
  const aMax = 12
  const nMin = 0
  const nMax = m * 22

  const margin = { left: 45, right: 15, top: canvasSize.height < 320 ? 25 : 40, bottom: canvasSize.height < 320 ? 25 : 40 }
  const plotW = Math.max(10, chartWidth - margin.left - margin.right)
  const plotH = Math.max(10, canvasSize.height - margin.top - margin.bottom)

  const toChartX = (valA: number) => chartX + margin.left + ((valA - aMin) / (aMax - aMin)) * plotW
  const toChartY = (valN: number) => margin.top + plotH - ((valN - nMin) / (nMax - nMin)) * plotH

  // 字体字号用像素单位
  const fs = LAYOUT.fs
  const sfs = LAYOUT.sfs

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* 背景格线 */}
        {gridLines}

        {/* 观光电梯轨道 */}
        <line
          x1={centerX - elevatorWidth / 2 - 15}
          y1={shaftTop}
          x2={centerX - elevatorWidth / 2 - 15}
          y2={shaftBottom}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.groundLine}
        />
        <line
          x1={centerX + elevatorWidth / 2 + 15}
          y1={shaftTop}
          x2={centerX + elevatorWidth / 2 + 15}
          y2={shaftBottom}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.groundLine}
        />

        {/* 观光电梯主体外框 */}
        <rect
          x={centerX - elevatorWidth / 2}
          y={elevatorY}
          width={elevatorWidth}
          height={elevatorHeight}
          fill="url(#elevator-glass-grad)"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={6}
        />

        {/* 电梯底板 */}
        <rect
          x={centerX - elevatorWidth / 2 + 5}
          y={floorY}
          width={elevatorWidth - 10}
          height={10}
          fill="url(#elevator-metal-grad)"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={1.5}
          rx={2}
        />

        {/* 体重计底座 */}
        <rect
          x={scaleX}
          y={scaleY}
          width={scaleWidth}
          height={scaleHeight}
          fill="url(#scale-metal-grad)"
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth={1}
          rx={3}
        />

        {/* 体重计表盘 */}
        <circle
          cx={dialCx}
          cy={dialCy}
          r={dialR}
          fill={PHYSICS_COLORS.objectFillNeutral}
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth={1}
        />
        <circle cx={dialCx} cy={dialCy} r={1.2} fill={PHYSICS_COLORS.labelText} />
        <line
          x1={dialCx}
          y1={dialCy}
          x2={dialCx}
          y2={dialCy - dialR + 1.2}
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={1.5}
          strokeLinecap="round"
          transform={`rotate(${pointerAngle}, ${dialCx}, ${dialCy})`}
        />

        {/* 砝码重物 */}
        <rect
          x={objX}
          y={objY}
          width={objWidth}
          height={objHeight}
          fill="url(#weight-metal-grad)"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
          className="transition-all duration-75"
        />
        <path
          d={`M ${centerX - 6} ${objY} C ${centerX - 6} ${objY - 6}, ${centerX + 6} ${objY - 6}, ${centerX + 6} ${objY}`}
          fill="none"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={1.8}
        />
        <text
          x={centerX}
          y={objY + objHeight / 2 + 4}
          fontSize={FONT.bodySize}
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          className="select-none pointer-events-none"
        >
          {m} kg
        </text>

        {/* 矢量箭头绘制 */}
        {showVectors && (
          <g>
            {/* 重力 G (深绿) */}
            <VectorArrow
              origin={{ x: objCx, y: objCy }}
              vector={{ x: 0, y: -1 }}
              type="gravity"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={45}
            />
            <text
              x={objCx + 10}
              y={objCy + 32}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              G
            </text>

            {/* 支持力 N (青绿，完全失重时不绘制) */}
            {currentN > 0.01 && (
              <>
                <VectorArrow
                  origin={{ x: objCx, y: objCy }}
                  vector={{ x: 0, y: 1 }}
                  type="normalForce"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={45 * (currentN / weight)}
                />
                <text
                  x={objCx + 10}
                  y={objCy - 45 * (currentN / weight) + 10}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.normalForce}
                  fontWeight="bold"
                >
                  N
                </text>
              </>
            )}

            {/* 电梯加速度 a (警示红，画在左侧导轨旁，省出右侧空间) */}
            {Math.abs(actualA) > 0.01 && (
              <g transform={`translate(${centerX - elevatorWidth / 2 - 28}, ${elevatorY + elevatorHeight / 2})`}>
                <VectorArrow
                  origin={{ x: 0, y: 0 }}
                  vector={{ x: 0, y: actualA > 0 ? 1 : -1 }}
                  type="acceleration"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={Math.abs(actualA) * 10}
                />
                <text
                  x={-15}
                  y={-actualA * 5 + 4}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.acceleration}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  a
                </text>
              </g>
            )}

            {/* 电梯速度 v (经典蓝，画在左侧导轨旁) */}
            {Math.abs(currentV) > 0.01 && (
              <g transform={`translate(${centerX - elevatorWidth / 2 - 42}, ${elevatorY + elevatorHeight / 2})`}>
                <VectorArrow
                  origin={{ x: 0, y: 0 }}
                  vector={{ x: 0, y: currentV > 0 ? 1 : -1 }}
                  type="velocity"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={Math.abs(currentV) * 6}
                />
                <text
                  x={-15}
                  y={-currentV * 3 + 4}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  v
                </text>
              </g>
            )}
          </g>
        )}

        {/* ========== 右侧：支持力与加速度 (N - a) 关系图表 (仅在普通模式且宽屏下展示) ========== */}
        {advancedMode !== 1 && isWide && (
          <g>
            {/* 图表外边框 */}
            <rect
              x={chartX}
              y={margin.top - 15}
              width={chartWidth}
              height={plotH + 45}
              fill="none"
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.8}
              rx={6}
              opacity={0.3}
            />

            {/* 图表标题 */}
            <text
              x={chartX + 15}
              y={margin.top - 2}
              fontSize={fs + 1}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
            >
              视重与加速度关系 (N - a 图)
            </text>

            {/* 超重区与失重区背景填充 */}
            {/* 失重区 a ∈ [-12, 0) */}
            <rect
              x={toChartX(aMin)}
              y={margin.top}
              width={toChartX(0) - toChartX(aMin)}
              height={plotH}
              fill={PHYSICS_COLORS.velocity}
              opacity={0.03}
            />
            {/* 超重区 a ∈ (0, 12] */}
            <rect
              x={toChartX(0)}
              y={margin.top}
              width={toChartX(aMax) - toChartX(0)}
              height={plotH}
              fill={PHYSICS_COLORS.acceleration}
              opacity={0.03}
            />

            {/* 分区文字说明 */}
            <text
              x={toChartX(-6)}
              y={margin.top + 16}
              fontSize={sfs}
              fill={PHYSICS_COLORS.velocity}
              textAnchor="middle"
              fontWeight="semibold"
              opacity={0.85}
            >
              失重区 (a &lt; 0)
            </text>
            <text
              x={toChartX(6)}
              y={margin.top + 16}
              fontSize={sfs}
              fill={PHYSICS_COLORS.acceleration}
              textAnchor="middle"
              fontWeight="semibold"
              opacity={0.85}
            >
              超重区 (a &gt; 0)
            </text>

            {/* 网格线 */}
            {[0.25, 0.5, 0.75].map((ratio, idx) => {
              const gridY = margin.top + plotH * ratio
              return (
                <line
                  key={`cg-y-${idx}`}
                  x1={toChartX(aMin)}
                  y1={gridY}
                  x2={toChartX(aMax)}
                  y2={gridY}
                  stroke={PHYSICS_COLORS.grid}
                  strokeWidth={0.5}
                  strokeDasharray="2,2"
                  opacity={0.3}
                />
              )
            })}
            {[-10, -5, 5, 10].map((valA) => {
              const gridX = toChartX(valA)
              return (
                <line
                  key={`cg-x-${valA}`}
                  x1={gridX}
                  y1={margin.top}
                  x2={gridX}
                  y2={margin.top + plotH}
                  stroke={PHYSICS_COLORS.grid}
                  strokeWidth={0.5}
                  strokeDasharray="2,2"
                  opacity={0.3}
                />
              )
            })}

            {/* 坐标轴线 */}
            {/* N 轴 */}
            <line
              x1={toChartX(0)}
              y1={margin.top}
              x2={toChartX(0)}
              y2={margin.top + plotH + 5}
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={1}
            />
            {/* a 轴 */}
            <line
              x1={toChartX(aMin) - 5}
              y1={toChartY(0)}
              x2={toChartX(aMax)}
              y2={toChartY(0)}
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={1}
            />

            {/* 坐标轴标签 */}
            <text
              x={toChartX(aMax) - 6}
              y={toChartY(0) + sfs + 14}
              fontSize={sfs}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
              textAnchor="end"
            >
              a (m/s²)
            </text>
            <text
              x={toChartX(0) - 6}
              y={margin.top}
              fontSize={sfs}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
              textAnchor="end"
            >
              N (N)
            </text>

            {/* 完全失重线 a = -g */}
            <line
              x1={toChartX(-g)}
              y1={margin.top}
              x2={toChartX(-g)}
              y2={toChartY(0)}
              stroke={CHART_COLORS.reference}
              strokeWidth={0.8}
              strokeDasharray="3,3"
              opacity={0.6}
            />
            <text
              x={toChartX(-g)}
              y={margin.top + plotH - 6}
              fontSize={sfs - 1}
              fill={CHART_COLORS.reference}
              textAnchor="middle"
              fontWeight="bold"
            >
              完全失重 (a = -g)
            </text>

            {/* 实重参考线 N = mg */}
            <line
              x1={toChartX(aMin)}
              y1={toChartY(m * g)}
              x2={toChartX(aMax)}
              y2={toChartY(m * g)}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={0.8}
              strokeDasharray="3,3"
              opacity={0.6}
            />
            <text
              x={toChartX(aMin) + 6}
              y={toChartY(m * g) - 4}
              fontSize={sfs - 1}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              实重 G = mg
            </text>

            {/* 横轴 a 刻度 */}
            {[-10, -5, 0, 5, 10].map((valA) => {
              const xPos = toChartX(valA)
              return (
                <g key={`clabel-x-${valA}`}>
                  <line
                    x1={xPos}
                    y1={toChartY(0)}
                    x2={xPos}
                    y2={toChartY(0) + 3}
                    stroke={PHYSICS_COLORS.labelText}
                    strokeWidth={0.8}
                  />
                  <text
                    x={xPos}
                    y={toChartY(0) + sfs + 5}
                    fontSize={sfs - 0.5}
                    fill={PHYSICS_COLORS.labelTextLight}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {valA}
                  </text>
                </g>
              )
            })}

            {/* 纵轴 N 刻度 */}
            {[m * g, m * 10, m * 20].map((valN, idx) => {
              const yPos = toChartY(valN)
              const labelText = idx === 0 ? `mg (${(m * g).toFixed(0)})` : `${valN.toFixed(0)}`
              return (
                <g key={`clabel-y-${idx}`}>
                  <line
                    x1={toChartX(0) - 3}
                    y1={yPos}
                    x2={toChartX(0)}
                    y2={yPos}
                    stroke={PHYSICS_COLORS.labelText}
                    strokeWidth={0.8}
                  />
                  <text
                    x={toChartX(0) - 5}
                    y={yPos + sfs * 0.35}
                    fontSize={sfs - 0.5}
                    fill={PHYSICS_COLORS.labelTextLight}
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {labelText}
                  </text>
                </g>
              )
            })}

            {/* N - a 关系折线 */}
            <polyline
              points={`${toChartX(aMin)},${toChartY(0)} ${toChartX(-g)},${toChartY(0)} ${toChartX(aMax)},${toChartY(m * (g + aMax))}`}
              fill="none"
              stroke={PHYSICS_COLORS.normalForce}
              strokeWidth={2}
            />

            {/* 动态定位线与游标点 */}
            <g>
              <line
                x1={toChartX(currentA)}
                y1={toChartY(currentN)}
                x2={toChartX(currentA)}
                y2={toChartY(0)}
                stroke={PHYSICS_COLORS.labelTextLight}
                strokeWidth={0.8}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <line
                x1={toChartX(aMin)}
                y1={toChartY(currentN)}
                x2={toChartX(currentA)}
                y2={toChartY(currentN)}
                stroke={PHYSICS_COLORS.labelTextLight}
                strokeWidth={0.8}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <circle
                cx={toChartX(currentA)}
                cy={toChartY(currentN)}
                r={5.5}
                fill={PHYSICS_COLORS.normalForce}
                opacity={0.25}
              />
              <circle
                cx={toChartX(currentA)}
                cy={toChartY(currentN)}
                r={3}
                fill={PHYSICS_COLORS.normalForce}
                stroke="white"
                strokeWidth={0.8}
              />
            </g>

            {/* 悬浮数值面板 */}
            <g transform={`translate(${toChartX(currentA) + 12}, ${toChartY(currentN) - 30})`}>
              <g transform={toChartX(currentA) > chartX + chartWidth * 0.65 ? 'translate(-115, 0)' : ''}>
                <rect
                  width={100}
                  height={40}
                  fill="white"
                  stroke={PHYSICS_COLORS.normalForce}
                  strokeWidth={0.8}
                  rx={3}
                  opacity={0.92}
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                />
                <text x={8} y={14} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                  a = {currentA.toFixed(1)} m/s²
                </text>
                <text x={8} y={28} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.normalForce} fontWeight="bold">
                  N = {currentN.toFixed(0)} N
                </text>
              </g>
            </g>

            {/* 公式与状态标注框 */}
            <g transform={`translate(${chartX + 18}, ${margin.top + plotH - 52})`}>
              <rect
                width={150}
                height={38}
                fill={colors.neutral[50]}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.6}
                rx={3}
                opacity={0.8}
              />
              <text x={10} y={14} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                公式: N = m(g + a)
              </text>
              <text x={10} y={26} fontSize={sfs - 1} fill={PHYSICS_COLORS.labelTextLight}>
                状态: {currentN > m * g + 0.1 ? '超重 (N > G)' : currentN < 0.1 ? '完全失重 (N = 0)' : currentN < m * g - 0.1 ? '失重 (N < G)' : '正常'}
              </text>
            </g>
          </g>
        )}

        <defs>
          {/* 电梯金属材质 */}
          <linearGradient id="elevator-metal-grad" x1="0" y1="0" x2="1" y2="0">
            {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx) => (
              <stop
                key={`emg-${idx}`}
                offset={`${(idx / (SCENE_COLORS.materials.sliderMetalGrad.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>

          {/* 观光电梯半透明玻璃 */}
          <linearGradient id="elevator-glass-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.22" />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.06" />
          </linearGradient>

          {/* 体重计金属底座 */}
          <linearGradient id="scale-metal-grad" x1="0" y1="0" x2="0" y2="1">
            {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx) => (
              <stop
                key={`smg-${idx}`}
                offset={`${(idx / (SCENE_COLORS.materials.sliderMetalGrad.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>

          {/* 砝码不锈钢渐变 */}
          <radialGradient id="weight-metal-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
            <stop offset="85%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
