import { useCanvasSize, physicsToCanvas } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import React, { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion, precomputeVerticalCircularMotion, GRAVITY } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart } from '@/components/Chart'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
  DASH,
} from '@/theme/physics'

/** 向心加速度动画参数范围（滑块边界） */
const CENTRIPETAL_PARAM_BOUNDS = {
  rMin: 3, rMax: 5,
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
  waveCardMinWidth: 260,
  /** 波形卡片最小高度 (px) */
  waveCardMinHeight: 180,
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

const SIMULATION_DT = 0.002 // 2ms step for extremely smooth movement and collision

export default function CentripetalAnimation() {
  const { params, time, showVectors, setIsPlaying, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      setIsPlaying: s.setIsPlaying,
      updateParam: s.updateParam,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)

  const {
    r = 3,
    v = 3,
    v0 = 5,
    m = 1,
    advancedMode = 0,
    showWaveform = 1,
    trackType = 0,
  } = params

  const isAdvanced = advancedMode === 1
  const showFaCard = !isAdvanced && showWaveform === 1

  // ── 2. 进阶模式下的竖直圆仿真 ──────────────────────────
  const { trajectory } = useMemo(() => {
    return precomputeVerticalCircularMotion(r, v0, m, trackType)
  }, [r, v0, m, trackType])

  const currentPoint = useMemo(() => {
    if (!isAdvanced) return null
    const idx = Math.round(time / SIMULATION_DT)
    const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
    return trajectory[clamped]
  }, [isAdvanced, trajectory, time])

  const activeTrajectory = useMemo(() => {
    if (!isAdvanced) return []
    const idx = Math.round(time / SIMULATION_DT)
    const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
    return trajectory.slice(0, clamped + 1)
  }, [isAdvanced, trajectory, time])

  // 基础模式解析解
  const omega = v / r
  const a_c = (v * v) / r
  const F_c = m * a_c

  const basicMotion = useMemo(() => {
    return calculateCircularMotion(r, omega, time)
  }, [r, omega, time])

  // 当前小球物理坐标
  const x = isAdvanced && currentPoint ? currentPoint.x : basicMotion.x
  const y = isAdvanced && currentPoint ? currentPoint.y : basicMotion.y

  // ── 3. 自适应比例尺（消除越界 Bug） ──────────────────────────
  const minCanvasDim = Math.min(canvasSize.width, canvasSize.height)
  const scale = (minCanvasDim - CENTRIPETAL_LAYOUT.canvasPadding) / (2 * CENTRIPETAL_LAYOUT.rMax)

  // 统一通过 physicsToCanvas() 进行坐标转换，原点定位在画布中心
  const ballPos = physicsToCanvas(x, y, canvasSize.width, canvasSize.height, scale)
  const centerPos = physicsToCanvas(0, 0, canvasSize.width, canvasSize.height, scale)
  const centerX = centerPos.cx
  const centerY = centerPos.cy

  const sceneConfig = useMemo((): SceneConfig => {
    // 基础模式自适应基准
    const basicRefV = Math.max(v * 1.4, 4.0)
    const basicRefA = Math.max(a_c, 4.0)
    const basicRefF = Math.max(F_c, 5.0)

    // 进阶模式自适应基准 (力统一以最低点支持力大小为基准，保障比例保真)
    const advRefV = Math.max(v0 * 1.4, 6.0)
    const advRefA = Math.max((v0 * v0) / r, 10.0)
    const advRefF = Math.max(m * GRAVITY + (m * v0 * v0) / r, 15.0)

    return {
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
        velocity: isAdvanced ? advRefV : basicRefV,
        acceleration: isAdvanced ? advRefA : basicRefA,
        force: isAdvanced ? advRefF : basicRefF,
        gravity: isAdvanced ? advRefF : basicRefF,
        normalForce: isAdvanced ? advRefF : basicRefF,
        tension: isAdvanced ? advRefF : basicRefF,
      },
    }
  }, [
    canvasSize.width,
    canvasSize.height,
    centerX,
    centerY,
    scale,
    isAdvanced,
    v,
    v0,
    r,
    m,
    a_c,
    F_c,
  ])

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

  // ── 4. 右上角悬浮卡片定位 ─────────────────────
  const cardWidth = Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, canvasSize.width * 0.35)
  const cardHeight = Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, canvasSize.height * 0.3)
  const cardX = canvasSize.width - cardWidth - CENTRIPETAL_LAYOUT.waveCardRightOffset
  const cardY = 20

  const cardInnerPad = CENTRIPETAL_LAYOUT.waveCardPadding
  const cardInnerW = cardWidth - cardInnerPad.left - cardInnerPad.right

  // ── 5. RelationChart 数据：F=ma 线性曲线 ──────────────────
  const faPoints = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: CENTRIPETAL_CHART_RANGE.aMax, y: CENTRIPETAL_CHART_RANGE.aMax * m },
    ],
    [m],
  )

  // ── 6. 右上角图表手势拖拽联动 ─────────────────────────────
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

  return (
    <div ref={containerRef} className="w-full h-full relative">
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

        {/* 进阶模式下的运行轨迹残影 */}
        {isAdvanced && activeTrajectory.length > 0 && (
          <path
            d={activeTrajectory
              .map((pt, idx) => {
                const pos = physicsToCanvas(pt.x, pt.y, canvasSize.width, canvasSize.height, scale)
                return `${idx === 0 ? 'M' : 'L'} ${pos.cx} ${pos.cy}`
              })
              .join(' ')}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={STROKE.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
            opacity={0.6}
          />
        )}

        {/* 圆周运动轨道环 */}
        {(!isAdvanced || trackType === 0) ? (
          <>
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
          </>
        ) : (
          <>
            {/* 中心虚线参考轴 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={r * scale}
              fill="none"
              stroke={PHYSICS_COLORS.trackHistory}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.5}
            />
            {/* 双壁圆形槽轨道外圈 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={r * scale + (CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale)}
              fill="none"
              stroke={PHYSICS_COLORS.trackHistory}
              strokeWidth={1.5}
              opacity={0.3}
            />
            {/* 双壁圆形槽轨道内圈 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={r * scale - (CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale)}
              fill="none"
              stroke={PHYSICS_COLORS.trackHistory}
              strokeWidth={1.5}
              opacity={0.3}
            />
          </>
        )}

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

        {/* 字体尺寸统一使用 canvasSize.font() 缩放适配 */}
        <text
          x={centerX + r * scale + 20}
          y={centerY + 14}
          fontSize={canvasSize.font(12)}
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
        >
          x
        </text>
        <text
          x={centerX + 12}
          y={centerY - r * scale - 20}
          fontSize={canvasSize.font(12)}
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
        >
          y
        </text>

        {/* 半径参考线 / 实物连线 */}
        {!isAdvanced ? (
          <line
            x1={centerX}
            y1={centerY}
            x2={ballPos.cx}
            y2={ballPos.cy}
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={STROKE.reference}
            strokeDasharray={DASH.axis.join(' ')}
          />
        ) : trackType === 0 ? (
          // 绳模型：仅在轨道滑动状态下画出绳子
          currentPoint && currentPoint.state === 'on-track' && (
            <line
              x1={centerX}
              y1={centerY}
              x2={ballPos.cx}
              y2={ballPos.cy}
              stroke={SCENE_COLORS.surface.ropeColor}
              strokeWidth={1.8}
            />
          )
        ) : (
          // 杆模型：始终连着刚性杆，并在中心有销轴
          <>
            <line
              x1={centerX}
              y1={centerY}
              x2={ballPos.cx}
              y2={ballPos.cy}
              stroke={SCENE_COLORS.pendulum.rodFill}
              strokeWidth={5.5}
              strokeLinecap="round"
            />
            <line
              x1={centerX}
              y1={centerY}
              x2={ballPos.cx}
              y2={ballPos.cy}
              stroke={SCENE_COLORS.pendulum.rodStroke}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.8}
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={5}
              fill={SCENE_COLORS.pendulum.pivotFill}
              stroke={SCENE_COLORS.pendulum.pivotStroke}
              strokeWidth={1.5}
            />
          </>
        )}

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
          isAdvanced && currentPoint ? (
            <g>
              {/* 线速度 v */}
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: currentPoint.vx, y: currentPoint.vy }}
                type="velocity"
                sceneScale={sceneScale}
                label="v"
              />
              {/* 加速度 a */}
              {currentPoint.state === 'on-track' ? (
                <VectorArrow
                  origin={{ x, y }}
                  vector={{
                    x: -(currentPoint.N / m) * Math.sin(currentPoint.theta),
                    y: (currentPoint.N / m) * Math.cos(currentPoint.theta) - GRAVITY
                  }}
                  type="acceleration"
                  sceneScale={sceneScale}
                  label="a"
                />
              ) : (
                <VectorArrow
                  origin={{ x, y }}
                  vector={{ x: 0, y: -GRAVITY }}
                  type="acceleration"
                  sceneScale={sceneScale}
                  label="a"
                />
              )}
              {/* 重力 G */}
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: 0, y: -m * GRAVITY }}
                type="gravity"
                sceneScale={sceneScale}
                label="G"
              />
              {/* 轨道支持力/拉力 FN/FT */}
              {currentPoint.state === 'on-track' && (
                <VectorArrow
                  origin={{ x, y }}
                  vector={{
                    x: -currentPoint.N * Math.sin(currentPoint.theta),
                    y: currentPoint.N * Math.cos(currentPoint.theta)
                  }}
                  type={trackType === 0 ? 'tension' : 'normalForce'}
                  sceneScale={sceneScale}
                  label={trackType === 0 ? 'F_T' : 'F_N'}
                />
              )}
              {/* 合外力 F_net (效果力，虚线) */}
              <VectorArrow
                origin={{ x, y }}
                vector={{
                  x: currentPoint.state === 'on-track' ? -currentPoint.N * Math.sin(currentPoint.theta) : 0,
                  y: (currentPoint.state === 'on-track' ? currentPoint.N * Math.cos(currentPoint.theta) : 0) - m * GRAVITY
                }}
                type="force"
                sceneScale={sceneScale}
                dashed={true}
                label="F_合 (效果力)"
              />
            </g>
          ) : (
            <g>
              {/* 线速度 v */}
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: -y * (v / r), y: x * (v / r) }}
                type="velocity"
                sceneScale={sceneScale}
                label="v"
              />
              {/* 向心加速度 a */}
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: -x * (a_c / r), y: -y * (a_c / r) }}
                type="acceleration"
                sceneScale={sceneScale}
                label="a_n"
              />
              {/* 向心力 F (效果力，虚线) */}
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: -x * (F_c / r), y: -y * (F_c / r) }}
                type="force"
                sceneScale={sceneScale}
                dashed={true}
                label="F_n (效果力)"
              />
            </g>
          )
        )}

        {/* ========== 右上角：画中画悬浮 F-a 图表 (RelationChart, 仅基础模式) ========== */}
        {showFaCard && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            <rect
              width={cardWidth}
              height={cardHeight}
              fill="#FFFFFF"
              rx={8}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
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
