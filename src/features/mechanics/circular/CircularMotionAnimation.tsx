import { useCanvasSize, useViewport, physicsToCanvasWithOrigin } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import React, { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
  FONT,
  DASH,
} from '@/theme/physics'

const CIRCULAR_DESIGN = { width: 600, height: 600 } as const

/** 匀速圆周运动参数范围（滑块边界） */
const CIRCULAR_MOTION_PARAM_BOUNDS = {
  rMin: 1, rMax: 10,
  omegaMin: 0.1, omegaMax: 5,
} as const

/** 从参数范围推导的物理量范围 */
const CIRCULAR_MOTION_CHART_RANGE = {
  /** 线速度最大值 v_max = r_max * omega_max (m/s) */
  vMax: CIRCULAR_MOTION_PARAM_BOUNDS.rMax * CIRCULAR_MOTION_PARAM_BOUNDS.omegaMax,
  /** 向心加速度最大值 a_max = r_max * omega_max² (m/s²) */
  aMax: CIRCULAR_MOTION_PARAM_BOUNDS.rMax * CIRCULAR_MOTION_PARAM_BOUNDS.omegaMax ** 2,
} as const

/** 匀速圆周运动布局常量 */
const CIRCULAR_MOTION_LAYOUT = {
  /** 半径滑块最大物理上限 (m) */
  rMax: CIRCULAR_MOTION_PARAM_BOUNDS.rMax,
  /** Canvas 安全余量 (px) */
  canvasPadding: 80,
  /** 投影球半径 (px) */
  projectionBallRadius: 9,
  /** 钢珠半径 (px) */
  steelBallRadius: 12,
  /** 波形卡片最小宽度 (px) */
  waveCardMinWidth: 220,
  /** 波形卡片最小高度 (px) */
  waveCardMinHeight: 150,
  /** 波形卡片右侧偏移 (px) */
  waveCardRightOffset: 20,
  /** 波形卡片内边距 */
  waveCardPadding: { left: 40, right: 15, top: 25, bottom: 25 },
  /** 波形采样步数 */
  waveSteps: 100,
  /** 同心参考环层数 */
  gridLayers: 4,
  /** 辐射角线间隔 (°) */
  gridAngleStep: 30,
  /** 坐标轴延伸长度 (px) */
  axisExtension: 30,
} as const

export default function CircularMotionAnimation() {
    const {params, time, showVectors, showGrid, setIsPlaying, setTime} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: CIRCULAR_DESIGN.width,
    designHeight: CIRCULAR_DESIGN.height,
  })

  const {
    r = 2,
    omega = 1,
    advancedMode = 0,
    showProjection = 1,
    showWaveform = 1,
  } = params

  const { x, y, v, a_c, period } = calculateCircularMotion(r, omega, time)

  // ── 1. 自适应等比例尺（防止出界） ──────────────────────────
  const centerX = vp.centerX
  const centerY = vp.centerY
  const rMax = CIRCULAR_MOTION_LAYOUT.rMax
  const minCanvasDim = Math.min(vp.visibleW, vp.visibleH)
  // 根据视口较短边和最大半径动态映射，四周留出安全余量
  const scale = (minCanvasDim - CIRCULAR_MOTION_LAYOUT.canvasPadding) / (2 * rMax)

  const canvasPos = physicsToCanvasWithOrigin(x, y, centerX, centerY, scale)

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: vp.visibleX,
      y: vp.visibleY,
      width: vp.visibleW - CIRCULAR_MOTION_LAYOUT.canvasPadding,
      height: vp.visibleH - CIRCULAR_MOTION_LAYOUT.canvasPadding,
    },
    originX: centerX,
    originY: centerY,
    worldWidth: (vp.visibleW - CIRCULAR_MOTION_LAYOUT.canvasPadding) / scale,
    worldHeight: (vp.visibleH - CIRCULAR_MOTION_LAYOUT.canvasPadding) / scale,
    refMagnitudes: {
      velocity: CIRCULAR_MOTION_CHART_RANGE.vMax,
      acceleration: CIRCULAR_MOTION_CHART_RANGE.aMax,
    },
  }), [vp.visibleX, vp.visibleY, vp.visibleW, vp.visibleH, centerX, centerY, rMax, scale]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ── 矢量安全映射 ─────────────

  const isAdvanced = advancedMode === 1
  const showProjBalls = isAdvanced && showProjection === 1
  const showWaveCard = isAdvanced && showWaveform === 1

  // ── 2. 右上角悬浮正余弦画中画定位 ─────────────────────────
  const cardWidth = Math.max(CIRCULAR_MOTION_LAYOUT.waveCardMinWidth, vp.visibleW * 0.35)
  const cardHeight = Math.max(CIRCULAR_MOTION_LAYOUT.waveCardMinHeight, vp.visibleH * 0.3)
  const cardX = vp.visibleX + vp.visibleW - cardWidth - CIRCULAR_MOTION_LAYOUT.waveCardRightOffset
  const cardY = vp.visibleY + 20

  const cardInnerPad = CIRCULAR_MOTION_LAYOUT.waveCardPadding
  const cardInnerW = cardWidth - cardInnerPad.left - cardInnerPad.right
  const cardInnerH = cardHeight - cardInnerPad.top - cardInnerPad.bottom

  // 波形图展示时间窗口：2 个完整周期
  const tMax = period * 2

  const toCardX = useCallback(
    (currT: number) => cardInnerPad.left + (currT / tMax) * cardInnerW,
    [tMax, cardInnerW, cardInnerPad.left]
  )

  const toCardY = useCallback(
    (val: number) => {
      // 物理值范围为 [-r, r] 映射到 [cardInnerPad.top, cardInnerPad.top + cardInnerH]
      const halfH = cardInnerH / 2
      const centerYCard = cardInnerPad.top + halfH
      return centerYCard - (val / r) * halfH
    },
    [r, cardInnerH, cardInnerPad.top]
  )

  // ── 3. 产生简谐波形路径 ──────────────────────────────────
  const waveData = useMemo(() => {
    const steps = CIRCULAR_MOTION_LAYOUT.waveSteps
    const ptsX: string[] = []
    const ptsY: string[] = []

    for (let i = 0; i <= steps; i++) {
      const currT = (i / steps) * tMax
      const px = r * Math.cos(omega * currT)
      const py = r * Math.sin(omega * currT)

      ptsX.push(`${toCardX(currT)},${toCardY(px)}`)
      ptsY.push(`${toCardX(currT)},${toCardY(py)}`)
    }

    return {
      xPath: `M ${ptsX.join(' L ')}`,
      yPath: `M ${ptsY.join(' L ')}`,
    }
  }, [omega, r, tMax, toCardX, toCardY])

  // ── 4. 时间游标手势拖拽 ──────────────────────────────────
  const isDraggingRef = useRef(false)

  const handleDragTime = useCallback(
    (clientX: number, svgRect: DOMRect) => {
      const clickX = clientX - svgRect.left - cardX - cardInnerPad.left
      const tClick = (clickX / cardInnerW) * tMax
      const currentPeriodCount = Math.floor(time / tMax)
      if (tClick >= 0 && tClick <= tMax) {
        setTime(currentPeriodCount * tMax + tClick)
        setIsPlaying(false)
      }
    },
    [cardX, cardInnerPad, cardInnerW, tMax, time, setTime, setIsPlaying]
  )

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (!isDraggingRef.current) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  const handleSvgMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      isDraggingRef.current = true
      const svg = e.currentTarget.closest('svg')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  // ── 5. 同心环与辐射网格背景 ──────────────────────────────
  const gridBackground = useMemo(() => {
    if (!showGrid) return null
    const elements: React.ReactElement[] = []
    // 绘制 4 层同心参考环
    const gridLayers = CIRCULAR_MOTION_LAYOUT.gridLayers
    for (let i = 1; i <= gridLayers; i++) {
      const radiusPhys = (rMax / gridLayers) * i
      elements.push(
        <circle
          key={`grid-circle-${i}`}
          cx={centerX}
          cy={centerY}
          r={radiusPhys * scale}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    // 绘制每 30 度的辐射角轴线
    for (let deg = 0; deg < 360; deg += CIRCULAR_MOTION_LAYOUT.gridAngleStep) {
      const rad = (deg * Math.PI) / 180
      const rayEnd = physicsToCanvasWithOrigin(rMax * Math.cos(rad), rMax * Math.sin(rad), centerX, centerY, scale)
      elements.push(
        <line
          key={`grid-ray-${deg}`}
          x1={centerX}
          y1={centerY}
          x2={rayEnd.cx}
          y2={rayEnd.cy}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    return elements
  }, [showGrid, centerX, centerY, scale])

  // ── 6. 扫过扇形角度弧 path ──────────────────────────────
  const angleSectorPath = useMemo(() => {
    // 限制在单圈 [0, 2pi) 用于扇形角度渲染
    const currentAngleRad = (omega * time) % (2 * Math.PI)
    if (currentAngleRad <= 0.02) return ''

    const startX = centerX + r * scale
    const startY = centerY
    const endPos = physicsToCanvasWithOrigin(r * Math.cos(currentAngleRad), r * Math.sin(currentAngleRad), centerX, centerY, scale)
    const endX = endPos.cx
    const endY = endPos.cy

    const largeArcFlag = currentAngleRad > Math.PI ? 1 : 0
    return `M ${centerX} ${centerY} L ${startX} ${startY} A ${r * scale} ${r * scale} 0 ${largeArcFlag} 0 ${endX} ${endY} Z`
  }, [omega, time, r, scale, centerX, centerY])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
      >
        {/* ========== defs 渐变与材质 ========== */}
        <defs>
          {/* 3D 拟物不锈钢钢珠材质 */}
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </radialGradient>

          {/* 投影虚影材质 */}
          <radialGradient id="vacuum-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[0]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[1]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[1]} />
            <stop offset="90%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[2]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[3]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[3]} />
          </radialGradient>
        </defs>

        {/* 辐射网格背景 */}
        {gridBackground}

        {/* ========== 主物理圆形演练区 ========== */}

        {/* 角度扫过扇形弧度 (微黄透明) */}
        {angleSectorPath && (
          <path d={angleSectorPath} fill={SCENE_COLORS.effects.sectorFill} stroke="none" />
        )}

        {/* 圆周运动轨道环 (轻量、清爽的高级质感) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={r * scale}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={STROKE.trackHistory}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={r * scale}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={STROKE.trackHistory + 1.5}
          opacity={0.08}
        />

        {/* 水平与垂直正交坐标轴 */}
        <line
          x1={centerX - r * scale - CIRCULAR_MOTION_LAYOUT.axisExtension}
          y1={centerY}
          x2={centerX + r * scale + CIRCULAR_MOTION_LAYOUT.axisExtension}
          y2={centerY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        <line
          x1={centerX}
          y1={centerY - r * scale - CIRCULAR_MOTION_LAYOUT.axisExtension}
          x2={centerX}
          y2={centerY + r * scale + CIRCULAR_MOTION_LAYOUT.axisExtension}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />

        <text x={centerX + r * scale + 20} y={centerY + 14} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>
        <text x={centerX + 12} y={centerY - r * scale - 20} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">y</text>

        {/* 半径参考射线 */}
        <line
          x1={centerX}
          y1={centerY}
          x2={canvasPos.cx}
          y2={canvasPos.cy}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.axis.join(' ')}
        />
        {/* 半径参数文本标注 */}
        <text
          x={(canvasPos.cx + centerX) / 2}
          y={(canvasPos.cy + centerY) / 2 - 6}
          fontSize={FONT.bodySize}
          fill={PHYSICS_COLORS.labelTextLight}
          fontWeight="bold"
          textAnchor="middle"
        >
          r
        </text>

        {/* 简谐运动正交投影辅助虚线 */}
        {showProjBalls && (
          <>
            <line
              x1={canvasPos.cx}
              y1={canvasPos.cy}
              x2={canvasPos.cx}
              y2={centerY}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.8}
              strokeDasharray="3,3"
            />
            <line
              x1={canvasPos.cx}
              y1={canvasPos.cy}
              x2={centerX}
              y2={canvasPos.cy}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.8}
              strokeDasharray="3,3"
            />
            {/* 水平 SHM 投影球 */}
            <circle
              cx={canvasPos.cx}
              cy={centerY}
              r={CIRCULAR_MOTION_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityX}
              strokeWidth={0.8}
            />
            {/* 竖直 SHM 投影球 */}
            <circle
              cx={centerX}
              cy={canvasPos.cy}
              r={CIRCULAR_MOTION_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityY}
              strokeWidth={0.8}
            />
          </>
        )}

        {/* 旋转的主钢珠小球 */}
        <circle
          cx={canvasPos.cx}
          cy={canvasPos.cy}
          r={CIRCULAR_MOTION_LAYOUT.steelBallRadius}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.sphere.steel.stroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 矢量箭头标注 (经典配色，剔除硬编码) */}
        {showVectors && v > 0 && (
          <g>
            <VectorArrow
              origin={{ x, y }}
              vector={{ x: -y * (v / r), y: x * (v / r) }}
              type="velocity"
              sceneScale={sceneScale}
            />
            <VectorArrow
              origin={{ x, y }}
              vector={{ x: -x * (a_c / r), y: -y * (a_c / r) }}
              type="acceleration"
              sceneScale={sceneScale}
            />
          </g>
        )}

        {/* ========== 右上角：画中画悬浮波形卡片 ========== */}
        {showWaveCard && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            {/* 毛玻璃浮动卡片背景 */}
            <rect
              width={cardWidth}
              height={cardHeight}
              fill={SCENE_COLORS.labels.glassPanelBg}
              rx={8}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
              filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12))"
            />
            <text
              x={cardWidth / 2}
              y={16}
              fontSize={font(8)}
              fill={CHART_COLORS.titleText}
              textAnchor="middle"
              fontWeight="bold"
            >
              简谐投影波形 (x-t / y-t)
            </text>

            {/* 坐标轴 */}
            <line
              x1={cardInnerPad.left}
              y1={cardInnerPad.top + cardInnerH}
              x2={cardInnerPad.left + cardInnerW}
              y2={cardInnerPad.top + cardInnerH}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
            />
            <line
              x1={cardInnerPad.left}
              y1={cardInnerPad.top}
              x2={cardInnerPad.left}
              y2={cardInnerPad.top + cardInnerH}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
            />

            {/* Y轴零线 */}
            <line
              x1={cardInnerPad.left}
              y1={toCardY(0)}
              x2={cardInnerPad.left + cardInnerW}
              y2={toCardY(0)}
              stroke={CHART_COLORS.zeroline}
              strokeWidth={0.6}
              strokeDasharray="2,2"
            />

            {/* Y轴刻度 */}
            {[-1, 0, 1].map((multiplier) => {
              const val = multiplier * r
              const yPos = toCardY(val)
              return (
                <g key={`y-axis-${multiplier}`}>
                  <line
                    x1={cardInnerPad.left - 3}
                    y1={yPos}
                    x2={cardInnerPad.left}
                    y2={yPos}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={0.8}
                  />
                  <text
                    x={cardInnerPad.left - 6}
                    y={yPos + 2.5}
                    fontSize={font(7)}
                    fill={CHART_COLORS.labelText}
                    textAnchor="end"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              )
            })}
            <text x={cardInnerPad.left - 5} y={cardInnerPad.top - 6} fontSize={font(7)} fill={CHART_COLORS.labelText} textAnchor="middle">位移(m)</text>

            {/* X轴刻度：周期 T 标注 */}
            {[0, 0.5, 1].map((ratio) => {
              const currT = tMax * ratio
              const xPos = toCardX(currT)
              const label = ratio === 0 ? '0' : ratio === 0.5 ? 'T' : '2T'
              return (
                <g key={`x-axis-${ratio}`}>
                  <line
                    x1={xPos}
                    y1={cardInnerPad.top + cardInnerH}
                    x2={xPos}
                    y2={cardInnerPad.top + cardInnerH + 3}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={0.8}
                  />
                  <text
                    x={xPos}
                    y={cardInnerPad.top + cardInnerH + 9}
                    fontSize={font(7)}
                    fill={CHART_COLORS.labelText}
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            {/* 绘制 x-t & y-t 简谐曲线 */}
            <path
              d={waveData.xPath}
              fill="none"
              stroke={PHYSICS_COLORS.velocityX}
              strokeWidth={1.2}
              opacity={0.8}
            />
            <path
              d={waveData.yPath}
              fill="none"
              stroke={PHYSICS_COLORS.velocityY}
              strokeWidth={1.2}
              opacity={0.8}
            />

            {/* 曲线文本标签 */}
            <text x={cardInnerPad.left + 5} y={toCardY(r) + 8} fontSize={font(7)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">x(t) 投影</text>
            <text x={cardInnerPad.left + 5} y={toCardY(-r) - 4} fontSize={font(7)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold">y(t) 投影</text>

            {/* 拖动图表热区 */}
            <rect
              x={cardInnerPad.left}
              y={cardInnerPad.top}
              width={cardInnerW}
              height={cardInnerH}
              fill="transparent"
              className="cursor-ew-resize"
              onMouseDown={handleChartMouseDown}
            />

            {/* 时间游标指示线 */}
            <g>
              <line
                x1={toCardX(time % tMax)}
                y1={cardInnerPad.top}
                x2={toCardX(time % tMax)}
                y2={cardInnerPad.top + cardInnerH}
                stroke={CHART_COLORS.reference}
                strokeWidth={0.8}
                strokeDasharray="2,1"
              />
              <circle cx={toCardX(time % tMax)} cy={toCardY(x)} r={2.5} fill={PHYSICS_COLORS.velocityX} />
              <circle cx={toCardX(time % tMax)} cy={toCardY(y)} r={2.5} fill={PHYSICS_COLORS.velocityY} />
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
