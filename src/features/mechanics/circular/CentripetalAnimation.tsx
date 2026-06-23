import { useCanvasSize, physicsToCanvasWithOrigin } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import React, { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart } from '@/components/Chart'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
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
    const {params, time, showVectors, showGrid, setIsPlaying, updateParam} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    setIsPlaying: s.setIsPlaying,
    updateParam: s.updateParam,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)
  // canvasSize.font removed: chart text now handled by RelationChart

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

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: 0,
      y: 0,
      width: canvasSize.width - CENTRIPETAL_LAYOUT.canvasPadding,
      height: canvasSize.height - CENTRIPETAL_LAYOUT.canvasPadding,
    },
    originX: centerX,
    originY: centerY,
    worldWidth: (canvasSize.width - CENTRIPETAL_LAYOUT.canvasPadding) / scale,
    worldHeight: (canvasSize.height - CENTRIPETAL_LAYOUT.canvasPadding) / scale,
    refMagnitudes: {
      velocity: CENTRIPETAL_CHART_RANGE.vMax,
      acceleration: CENTRIPETAL_CHART_RANGE.aMax,
      force: CENTRIPETAL_CHART_RANGE.fMax,
    },
  }), [canvasSize.width, canvasSize.height, centerX, centerY, rMax, scale]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  const isAdvanced = advancedMode === 1
  const showFaCard = isAdvanced && showWaveform === 1

  // ── 3. 右上角悬浮 F-a 画中画卡片定位 ─────────────────────
  const cardWidth = Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, canvasSize.width * 0.35)
  const cardHeight = Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, canvasSize.height * 0.3)
  const cardX = canvasSize.width - cardWidth - CENTRIPETAL_LAYOUT.waveCardRightOffset
  const cardY = 20

  const cardInnerPad = CENTRIPETAL_LAYOUT.waveCardPadding
  const cardInnerW = cardWidth - cardInnerPad.left - cardInnerPad.right

  // ── 4. RelationChart 数据：F=ma 线性曲线 ──────────────────
  const faPoints = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: CENTRIPETAL_CHART_RANGE.aMax, y: CENTRIPETAL_CHART_RANGE.aMax * m },
    ],
    [m],
  )

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
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </radialGradient>

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

        {/* 旋转的拟物钢球 */}
        <circle
          cx={ballPos.cx}
          cy={ballPos.cy}
          r={CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.sphere.steel.stroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 矢量箭头标注 */}
        {showVectors && (
          <g>
            {/* 线速度矢量 v */}
            <VectorArrow
              origin={{ x, y }}
              vector={{ x: -y * (v / r), y: x * (v / r) }}
              type="velocity"
              sceneScale={sceneScale}
            />
            {/* 向心加速度 a */}
            <VectorArrow
              origin={{ x, y }}
              vector={{ x: -x * (a_c / r), y: -y * (a_c / r) }}
              type="acceleration"
              sceneScale={sceneScale}
            />
            {/* 向心合外力 F (仅进阶模式) */}
            {isAdvanced && (
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: -x * (F_c / r), y: -y * (F_c / r) }}
                type="force"
                sceneScale={sceneScale}
              />
            )}
          </g>
        )}

        {/* ========== 右上角：画中画悬浮 F-a 图表（RelationChart） ========== */}
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

            {/* RelationChart 主体 */}
            <foreignObject
              x={4} y={4}
              width={cardWidth - 8} height={cardHeight - 8}
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ width: '100%', height: '100%' }}>
                <RelationChart
                  points={faPoints}
                  xDomain={[0, CENTRIPETAL_CHART_RANGE.aMax]}
                  yDomain={[0, CENTRIPETAL_CHART_RANGE.fMax]}
                  xLabel="a (m/s²)"
                  yLabel="F (N)"
                  title={`动力学联动 (F_c = m · a_c)  m=${m.toFixed(1)}kg`}
                  color={PHYSICS_COLORS.appliedForce}
                  strokeWidth={1.5}
                  cursorX={a_c}
                  cursorLabel={(_x, f) => `F=${f.toFixed(1)}N`}
                  markers={[]}
                />
              </div>
            </foreignObject>

            {/* 拖动图表热区 */}
            <rect
              x={0}
              y={0}
              width={cardWidth}
              height={cardHeight}
              fill="transparent"
              className="cursor-ew-resize"
              onMouseDown={handleChartMouseDown}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
