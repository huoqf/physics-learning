import { useCanvasSize, physicsToCanvasWithOrigin } from '@/utils'
import React, { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateCircularMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
  FONT,
  DASH,
} from '@/theme/physics'

/** 向心加速度动画参数范围（滑块边界） */
const CENTRIPETAL_PARAM_BOUNDS = {
  rMin: 1, rMax: 5,
  vMin: 1, vMax: 10,
  mMin: 1, mMax: 5,
} as const

/** 从参数范围推导的图表物理量范围 */
const CENTRIPETAL_CHART_RANGE = {
  /** 线速度最大值 v_max (m/s) */
  vMax: CENTRIPETAL_PARAM_BOUNDS.vMax,
  /** 加速度最大值 a_max = v_max² / r_min (m/s²) */
  aMax: CENTRIPETAL_PARAM_BOUNDS.vMax ** 2 / CENTRIPETAL_PARAM_BOUNDS.rMin,
  /** 向心力最大值 F_max = m_max * a_max (N) */
  fMax: CENTRIPETAL_PARAM_BOUNDS.mMax * (CENTRIPETAL_PARAM_BOUNDS.vMax ** 2 / CENTRIPETAL_PARAM_BOUNDS.rMin),
} as const

/** 向心加速度动画布局常量 */
const CENTRIPETAL_LAYOUT = {
  /** 半径滑块物理上限 (m) */
  rMax: CENTRIPETAL_PARAM_BOUNDS.rMax,
  /** Canvas 安全余量 (px) */
  canvasPadding: 80,
  /** 矢量最大绘制长度 (px) */
  vectorMaxLength: 75,
  /** 加速度矢量垂直偏移 (px)，沿切向偏移避免与半径线重叠 */
  accelerationOffset: 10,
  /** 力矢量垂直偏移 (px)，反向偏移避免与加速度矢量重叠 */
  forceOffset: 10,
  /** 钢珠基础半径 (px) */
  steelBallBaseRadius: 12,
  /** 质量缩放半径系数 (px/kg) */
  massRadiusScale: 1.5,
  /** 波形卡片最小宽度 (px) */
  waveCardMinWidth: 220,
  /** 波形卡片最小高度 (px) */
  waveCardMinHeight: 150,
  /** 波形卡片右侧偏移 (px) */
  waveCardRightOffset: 20,
  /** 波形卡片内边距 */
  waveCardPadding: { left: 40, right: 15, top: 25, bottom: 25 },
  /** 同心参考环层数 */
  gridLayers: 4,
  /** 辐射角线间隔 (°) */
  gridAngleStep: 30,
  /** 坐标轴延伸长度 (px) */
  axisExtension: 30,
} as const

export default function CentripetalAnimation() {
  const { params, time, showVectors, showGrid, setIsPlaying, updateParam } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 600, height: 600 })

  const {
    r = 2,
    v = 3,
    m = 1,
    advancedMode = 0,
    showWaveform = 1,
  } = params

  const omega = v / r
  const a_c = (v * v) / r
  const F_c = m * a_c

  const { x, y } = calculateCircularMotion(r, omega, time)

  // ── 1. 自适应比例尺（消除越界 Bug） ──────────────────────────
  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2
  const rMax = CENTRIPETAL_LAYOUT.rMax
  const minCanvasDim = Math.min(canvasSize.width, canvasSize.height)
  const scale = (minCanvasDim - CENTRIPETAL_LAYOUT.canvasPadding) / (2 * rMax)

  const ballPos = physicsToCanvasWithOrigin(x, y, centerX, centerY, scale)

  const isAdvanced = advancedMode === 1
  const showFaCard = isAdvanced && showWaveform === 1

  // ── 2. 矢量安全映射长度（杜绝飞出屏幕 Bug） ─────────────────
  const R_ball = CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale
  const vArrowLen = R_ball + (v / CENTRIPETAL_CHART_RANGE.vMax) * (CENTRIPETAL_LAYOUT.vectorMaxLength - R_ball)
  const aArrowLen = R_ball + (a_c / CENTRIPETAL_CHART_RANGE.aMax) * (CENTRIPETAL_LAYOUT.vectorMaxLength - R_ball)
  const fArrowLen = R_ball + (F_c / CENTRIPETAL_CHART_RANGE.fMax) * (CENTRIPETAL_LAYOUT.vectorMaxLength - R_ball)

  // 动态自适应线宽与箭头尺寸自适应缩放（最小为 1.5px）
  const vStrokeWidth = Math.max(1.5, CANVAS_STYLE.stroke.vectorMain * (v / CENTRIPETAL_CHART_RANGE.vMax))
  const aStrokeWidth = Math.max(1.5, CANVAS_STYLE.stroke.vectorMain * (a_c / CENTRIPETAL_CHART_RANGE.aMax))
  const fStrokeWidth = Math.max(1.5, CANVAS_STYLE.stroke.vectorMain * (F_c / CENTRIPETAL_CHART_RANGE.fMax))

  // ── 3. 右上角悬浮 F-a 画中画卡片定位 ─────────────────────
  const cardWidth = Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, canvasSize.width * 0.35)
  const cardHeight = Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, canvasSize.height * 0.3)
  const cardX = canvasSize.width - cardWidth - CENTRIPETAL_LAYOUT.waveCardRightOffset
  const cardY = 20

  const cardInnerPad = CENTRIPETAL_LAYOUT.waveCardPadding
  const cardInnerW = cardWidth - cardInnerPad.left - cardInnerPad.right
  const cardInnerH = cardHeight - cardInnerPad.top - cardInnerPad.bottom

  const toCardX = useCallback(
    (acc: number) => cardInnerPad.left + (acc / CENTRIPETAL_CHART_RANGE.aMax) * cardInnerW,
    [cardInnerW, cardInnerPad.left]
  )

  const toCardY = useCallback(
    (force: number) => {
      const bottomY = cardInnerPad.top + cardInnerH
      return bottomY - (force / CENTRIPETAL_CHART_RANGE.fMax) * cardInnerH
    },
    [cardInnerH, cardInnerPad.top]
  )

  // ── 4. 卡片 F=ma 动态射线路径 ─────────────────────────────
  const lineFmaD = useMemo(() => {
    const x1 = toCardX(0)
    const y1 = toCardY(0)
    const x2 = toCardX(CENTRIPETAL_CHART_RANGE.aMax)
    const y2 = toCardY(CENTRIPETAL_CHART_RANGE.aMax * m)
    return `M ${x1},${y1} L ${x2},${y2}`
  }, [m, toCardX, toCardY])

  // ── 5. 右上角图表手势拖拽联动 ─────────────────────────────
  const isDraggingRef = useRef(false)

  const handleDragTime = useCallback(
    (clientX: number, svgRect: DOMRect) => {
      const clickX = clientX - svgRect.left - cardX - cardInnerPad.left
      const accClick = (clickX / cardInnerW) * CENTRIPETAL_CHART_RANGE.aMax
      if (accClick >= 0 && accClick <= CENTRIPETAL_CHART_RANGE.aMax) {
        const vTarget = Math.sqrt(accClick * r)
        const clampedV = Math.max(CENTRIPETAL_PARAM_BOUNDS.vMin, Math.min(CENTRIPETAL_PARAM_BOUNDS.vMax, vTarget))
        updateParam('v', parseFloat(clampedV.toFixed(2)))
        setIsPlaying(false)
      }
    },
    [cardX, cardInnerPad, cardInnerW, r, updateParam, setIsPlaying]
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

  // ── 6. 辐射网格背景 ──────────────────────────────────────
  const gridBackground = useMemo(() => {
    if (!showGrid) return null
    const elements: React.ReactElement[] = []
    const gridLayers = CENTRIPETAL_LAYOUT.gridLayers
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
    for (let deg = 0; deg < 360; deg += CENTRIPETAL_LAYOUT.gridAngleStep) {
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
          {/* 3D 渐变钢珠材质 */}
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>

          {/* 投影半透明虚影 */}
          <radialGradient id="vacuum-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} stopOpacity={0.95} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} stopOpacity={0.60} />
            <stop offset="90%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} stopOpacity={0.05} />
          </radialGradient>

          <marker id="arrowhead-cp-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-cp-a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrowhead-cp-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>

        {/* 辐射网格背景 */}
        {gridBackground}

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
          x1={centerX - r * scale - CENTRIPETAL_LAYOUT.axisExtension}
          y1={centerY}
          x2={centerX + r * scale + CENTRIPETAL_LAYOUT.axisExtension}
          y2={centerY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        <line
          x1={centerX}
          y1={centerY - r * scale - CENTRIPETAL_LAYOUT.axisExtension}
          x2={centerX}
          y2={centerY + r * scale + CENTRIPETAL_LAYOUT.axisExtension}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />

        <text x={centerX + r * scale + 20} y={centerY + 14} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>
        <text x={centerX + 12} y={centerY - r * scale - 20} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">y</text>

        {/* 半径参考线 */}
        <line
          x1={centerX}
          y1={centerY}
          x2={ballPos.cx}
          y2={ballPos.cy}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.axis.join(' ')}
        />
        {/* 半径参数文本标注 */}
        <text
          x={(ballPos.cx + centerX) / 2}
          y={(ballPos.cy + centerY) / 2 - 6}
          fontSize={FONT.bodySize}
          fill={PHYSICS_COLORS.labelTextLight}
          fontWeight="bold"
          textAnchor="middle"
        >
          r
        </text>

        {/* 旋转的拟物钢球 */}
        <circle
          cx={ballPos.cx}
          cy={ballPos.cy}
          r={CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 动态漂浮的质量标签 */}
        <text
          x={ballPos.cx}
          y={ballPos.cy - (16 + m * CENTRIPETAL_LAYOUT.massRadiusScale)}
          fontSize={FONT.axisSize}
          fill={PHYSICS_COLORS.labelTextLight}
          textAnchor="middle"
          fontWeight="bold"
        >
          m = {m.toFixed(1)} kg
        </text>

        {/* 矢量箭头标注 (防出界安全映射) */}
        {showVectors && (
          <g>
            {/* 线速度矢量 v (经典蓝，动态线宽与自适应缩放) */}
            <line
              x1={ballPos.cx}
              y1={ballPos.cy}
              x2={ballPos.cx + (-y / r) * vArrowLen}
              y2={ballPos.cy + (-x / r) * vArrowLen}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={vStrokeWidth}
              markerEnd="url(#arrowhead-cp-v)"
            />
            <text
              x={ballPos.cx + (-y / r) * vArrowLen - 12}
              y={ballPos.cy + (-x / r) * vArrowLen - 5}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>

            {/* 向心加速度 a (红色，从球心指向圆心，动态线宽) */}
            <line
              x1={ballPos.cx}
              y1={ballPos.cy}
              x2={ballPos.cx - (x / r) * aArrowLen}
              y2={ballPos.cy + (y / r) * aArrowLen}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={aStrokeWidth}
              markerEnd="url(#arrowhead-cp-a)"
            />
            <text
              x={ballPos.cx - (x / r) * aArrowLen + 8}
              y={ballPos.cy + (y / r) * aArrowLen + 12}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>

            {/* 向心合外力 F (橙色，仅进阶模式) */}
            {isAdvanced && (
              <>
                <line
                  x1={ballPos.cx}
                  y1={ballPos.cy}
                  x2={ballPos.cx - (x / r) * fArrowLen}
                  y2={ballPos.cy + (y / r) * fArrowLen}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={fStrokeWidth}
                  markerEnd="url(#arrowhead-cp-f)"
                />
                <text
                  x={ballPos.cx - (x / r) * fArrowLen + 8}
                  y={ballPos.cy + (y / r) * fArrowLen - 4}
                  fontSize={FONT.bodySize}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  F
                </text>
              </>
            )}
          </g>
        )}

        {/* ========== 右上角：画中画悬浮 F-a 图表 ========== */}
        {showFaCard && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            {/* 毛玻璃卡片背景 */}
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
              fontSize={8}
              fill={CHART_COLORS.titleText}
              textAnchor="middle"
              fontWeight="bold"
            >
              动力学联动 (F_c = m · a_c)
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

            {/* X轴刻度：加速度 a_c */}
            {[0, 50, 100].map((val) => {
              const xPos = toCardX(val)
              return (
                <g key={`fa-x-${val}`}>
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
                    fontSize={7}
                    fill={CHART_COLORS.labelText}
                    textAnchor="middle"
                  >
                    {val}
                  </text>
                </g>
              )
            })}
            <text x={cardInnerPad.left + cardInnerW} y={cardInnerPad.top + cardInnerH + 8} fontSize={7} fill={CHART_COLORS.labelText} textAnchor="start"> a (m/s²)</text>

            {/* Y轴刻度：力 F_c */}
            {[0, 250, 500].map((val) => {
              const yPos = toCardY(val)
              return (
                <g key={`fa-y-${val}`}>
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
                    fontSize={7}
                    fill={CHART_COLORS.labelText}
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              )
            })}
            <text x={cardInnerPad.left - 5} y={cardInnerPad.top - 6} fontSize={7} fill={CHART_COLORS.labelText} textAnchor="middle">F (N)</text>

            {/* 绘制 F = ma 斜率射线 */}
            {lineFmaD && (
              <path
                d={lineFmaD}
                fill="none"
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={1.5}
              />
            )}
            <text
              x={toCardX(85)}
              y={toCardY(85 * m) - 5}
              fontSize={7}
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              m = {m.toFixed(1)}kg
            </text>

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

            {/* 当前向心加速度与力的联动定位游标 */}
            <g>
              <line
                x1={toCardX(a_c)}
                y1={cardInnerPad.top}
                x2={toCardX(a_c)}
                y2={cardInnerPad.top + cardInnerH}
                stroke={CHART_COLORS.reference}
                strokeWidth={0.8}
                strokeDasharray="2,1"
              />
              <line
                x1={cardInnerPad.left}
                y1={toCardY(F_c)}
                x2={cardInnerPad.left + cardInnerW}
                y2={toCardY(F_c)}
                stroke={CHART_COLORS.reference}
                strokeWidth={0.8}
                strokeDasharray="2,1"
              />
              {/* 十字交叉点圆圈 */}
              <circle cx={toCardX(a_c)} cy={toCardY(F_c)} r={3} fill={PHYSICS_COLORS.forceNet} />
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
