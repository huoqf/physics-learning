import { useCanvasSize, physicsToCanvasWithOrigin, useViewport } from '@/utils'
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
  colors,
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
  DASH,
} from '@/theme'

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
    showAcceleration = 1,
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

  const cardWidth = isAdvanced
    ? Math.max(290, canvasSize.width * 0.38)
    : Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, canvasSize.width * 0.35)

  // 依据右侧图表卡片或受力特写卡片宽度，使用 Viewport 架构自动进行比例定位和原点避让计算
  const isLeftShifted = showFaCard || isAdvanced
  const vp = useViewport(canvasSize, {
    designWidth: 600,
    designHeight: 600,
    overlayRight: isLeftShifted ? Math.round(cardWidth) : 0,
  })

  const centerX = vp.centerX
  const centerY = vp.centerY

  // 统一通过 physicsToCanvasWithOrigin() 自定义原点进行坐标转换
  const ballPos = physicsToCanvasWithOrigin(x, y, centerX, centerY, scale)

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
  const cardHeight = isAdvanced
    ? Math.max(340, canvasSize.height * 0.55)
    : Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, canvasSize.height * 0.3)
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
                const pos = physicsToCanvasWithOrigin(pt.x, pt.y, centerX, centerY, scale)
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
          // 绳模型：始终画出绳子；松弛时用虚线表示，绷紧后提供约束冲量/拉力
          currentPoint && (
            <line
              x1={centerX}
              y1={centerY}
              x2={ballPos.cx}
              y2={ballPos.cy}
              stroke={SCENE_COLORS.surface.ropeColor}
              strokeWidth={1.8}
              strokeDasharray={currentPoint.state === 'flying' ? DASH.axis.join(' ') : undefined}
              opacity={currentPoint.state === 'flying' ? 0.55 : 1}
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
              {showAcceleration === 1 && (currentPoint.state === 'on-track' ? (
                <VectorArrow
                  origin={{ x, y }}
                  vector={{
                    x: -(currentPoint.N / m) * Math.sin(currentPoint.theta),
                    y: (currentPoint.N / m) * Math.cos(currentPoint.theta) - GRAVITY
                  }}
                  type="acceleration"
                  sceneScale={sceneScale}
                  label="a_合"
                />
              ) : (
                <VectorArrow
                  origin={{ x, y }}
                  vector={{ x: 0, y: -GRAVITY }}
                  type="acceleration"
                  sceneScale={sceneScale}
                  label="a_合"
                />
              ))}
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
              {showAcceleration === 1 && (
                <VectorArrow
                  origin={{ x, y }}
                  vector={{ x: -x * (a_c / r), y: -y * (a_c / r) }}
                  type="acceleration"
                  sceneScale={sceneScale}
                  label="a_向"
                />
              )}
              {/* 向心力 F (效果力，虚线) */}
              <VectorArrow
                origin={{ x, y }}
                vector={{ x: -x * (F_c / r), y: -y * (F_c / r) }}
                type="force"
                sceneScale={sceneScale}
                dashed={true}
                label="F_向 (效果力)"
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

        {/* ========== 右上角：画中画悬浮受力正交分解卡片 (仅进阶模式) ========== */}
        {isAdvanced && currentPoint && (() => {
          // 基于特写卡片宽高的自适应缩放因子，完全避免像素硬编码
          const zoom = Math.min(cardWidth / 290, (cardHeight * 0.45) / 153)
          
          const ballCX = cardWidth * 0.50
          const ballCY = cardHeight * 0.28 // 向上微调以匹配自适应尺寸
          
          const theta = currentPoint.theta
          const thetaDeg = (theta * 180) / Math.PI
          
          // 径向（朝外）和切向（前进）单位像素向量
          const dx_out = Math.sin(theta)
          const dy_out = Math.cos(theta)
          const dx_tangent = Math.cos(theta)
          const dy_tangent = -Math.sin(theta)
          
          const gLen = 75 * zoom // 自适应重力投影长度
          const advRefF = Math.max(m * GRAVITY + (m * v0 * v0) / r, 15.0)
          const F_constraint_val = currentPoint.state === 'flying' ? 0 : currentPoint.N
          
          // 约束力小箭头长度（基于 zoom 缩放）
          const nForceLen = currentPoint.state === 'flying' ? 0 : Math.max(25 * zoom, Math.min(80 * zoom, (Math.abs(F_constraint_val) / advRefF) * 80 * zoom)) * (F_constraint_val >= 0 ? 1 : -1)
          const px_N = nForceLen * (-dx_out)
          const py_N = nForceLen * (-dy_out)
          
          // 重力分量投影大小
          const Gn_val_abs = Math.abs(m * GRAVITY * Math.cos(theta))
          const Gt_val_abs = Math.abs(m * GRAVITY * Math.sin(theta))
          
          const px_G_n = gLen * Math.cos(theta) * Math.sin(theta)
          const py_G_n = gLen * Math.cos(theta) * Math.cos(theta)
          const px_G_t = -gLen * Math.sin(theta) * Math.cos(theta)
          const py_G_t = gLen * Math.sin(theta) * Math.sin(theta)
          
          const F_xiang_val = currentPoint.state === 'on-track'
            ? m * r * currentPoint.omega * currentPoint.omega
            : 0
          const G_val = m * GRAVITY

          // 局部受力箭头绘制辅助函数（粗细与尺寸基于 zoom 缩放）
          const renderCloseUpArrow = (
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            color: string,
            dashed = false
          ) => {
            const dx = x2 - x1
            const dy = y2 - y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 1.5) return null

            const ux = dx / len
            const uy = dy / len

            const headLen = 10 * zoom
            const headWidth = 8 * zoom

            const lineEndX = x2 - ux * headLen
            const lineEndY = y2 - uy * headLen

            const perpX = -uy
            const perpY = ux

            const p1X = lineEndX + perpX * (headWidth / 2)
            const p1Y = lineEndY + perpY * (headWidth / 2)
            const p2X = lineEndX - perpX * (headWidth / 2)
            const p2Y = lineEndY - perpY * (headWidth / 2)

            return (
              <g key={`${x2}-${y2}-${color}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke={color}
                  strokeWidth={Math.max(1.2, 2.2 * zoom)} // 保证最小线宽
                  strokeLinecap="round"
                  {...(dashed ? { strokeDasharray: '3 2' } : {})}
                />
                <polygon
                  points={`${p1X},${p1Y} ${x2},${y2} ${p2X},${p2Y}`}
                  fill={color}
                />
              </g>
            )
          }
          
          return (
            <g transform={`translate(${cardX}, ${cardY})`}>
              <rect
                width={cardWidth}
                height={cardHeight}
                fill={colors.neutral.white}
                rx={8}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={0.8}
              />
              
              {/* === 上半部：局部受力分解示意图 === */}
              {/* 局部法向轴 (n) */}
              <line
                x1={ballCX - dx_out * 90 * zoom} // 尺寸基于 zoom 动态计算
                y1={ballCY - dy_out * 90 * zoom}
                x2={ballCX + dx_out * 90 * zoom}
                y2={ballCY + dy_out * 90 * zoom}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.6}
              />
              <text
                x={ballCX - dx_out * 96 * zoom}
                y={ballCY - dy_out * 96 * zoom + 3}
                fontSize={canvasSize.font(Math.max(8, 10 * zoom))}
                fill={PHYSICS_COLORS.labelTextLight}
                textAnchor="middle"
              >
                n
              </text>
              
              {/* 局部切向轴 (τ) */}
              <line
                x1={ballCX - dx_tangent * 90 * zoom}
                y1={ballCY - dy_tangent * 90 * zoom}
                x2={ballCX + dx_tangent * 90 * zoom}
                y2={ballCY + dy_tangent * 90 * zoom}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.6}
              />
              <text
                x={ballCX + dx_tangent * 96 * zoom}
                y={ballCY + dy_tangent * 96 * zoom + 3}
                fontSize={canvasSize.font(Math.max(8, 10 * zoom))}
                fill={PHYSICS_COLORS.labelTextLight}
                textAnchor="middle"
              >
                τ
              </text>
              
              {/* 重力分解投影线 */}
              <line
                x1={ballCX + px_G_n}
                y1={ballCY + py_G_n}
                x2={ballCX + px_G_n + px_G_t}
                y2={ballCY + py_G_n + py_G_t}
                stroke={PHYSICS_COLORS.gravity}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.4}
              />
              <line
                x1={ballCX + px_G_t}
                y1={ballCY + py_G_t}
                x2={ballCX + px_G_t + px_G_n}
                y2={ballCY + py_G_t + py_G_n}
                stroke={PHYSICS_COLORS.gravity}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.4}
              />
              
              {/* 绘制局部受力箭头 */}
              {renderCloseUpArrow(ballCX, ballCY, ballCX + px_G_n, ballCY + py_G_n, PHYSICS_COLORS.gravity, true)}
              {renderCloseUpArrow(ballCX, ballCY, ballCX + px_G_t, ballCY + py_G_t, PHYSICS_COLORS.gravity, true)}
              {renderCloseUpArrow(ballCX, ballCY, ballCX + px_N, ballCY + py_N, trackType === 0 ? PHYSICS_COLORS.tension : PHYSICS_COLORS.normalForce)}
              {renderCloseUpArrow(ballCX, ballCY, ballCX, ballCY + gLen, PHYSICS_COLORS.gravity)}
              
              {/* 局部中心受力小球（半径基于 zoom 自适应） */}
              <circle
                cx={ballCX}
                cy={ballCY}
                r={12 * zoom}
                fill="url(#steel-sphere-grad)"
                stroke={SCENE_COLORS.sphere.steel.stroke}
                strokeWidth={1}
              />
              
              {/* === 下半部：解题辅助公式与实时计算文本 === */}
              <foreignObject x={15} y={cardHeight * 0.52} width={cardWidth - 30} height={cardHeight * 0.44}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontFamily: 'sans-serif',
                  fontSize: canvasSize.font(10.5),
                  color: colors.neutral[600],
                  lineHeight: '1.4'
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: canvasSize.font(11),
                    color: colors.neutral[800],
                    borderBottom: '1px solid ' + colors.neutral[200],
                    paddingBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>受力正交分解</span>
                    <span>θ = {thetaDeg.toFixed(0)}°</span>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '6px 16px', 
                    margin: '5px 0' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>法向 G<sub>n</sub>=mg|cosθ|:</span>
                      <span style={{ fontWeight: 'bold', color: PHYSICS_COLORS.gravity }}>{Gn_val_abs.toFixed(1)} N</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{trackType === 0 ? '绳拉力 F_T' : '约束力 F_N'}:</span>
                      <span style={{ fontWeight: 'bold', color: trackType === 0 ? PHYSICS_COLORS.tension : PHYSICS_COLORS.normalForce }}>
                        {(trackType === 0 ? Math.max(0, F_constraint_val) : F_constraint_val).toFixed(1)} N
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>切向 G<sub>t</sub>=mg|sinθ|:</span>
                      <span style={{ fontWeight: 'bold', color: PHYSICS_COLORS.gravity }}>{Gt_val_abs.toFixed(1)} N</span>
                    </div>
                    <div></div>
                  </div>
                  
                  {currentPoint.state === 'flying' ? (
                    <div style={{
                      borderTop: '1px solid ' + colors.neutral[200],
                      paddingTop: '4px',
                    }}>
                      <div style={{ fontSize: canvasSize.font(9), color: colors.danger[600], fontWeight: 'bold' }}>绳松弛：抛体运动，绳再次绷紧会消除径向速度:</div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        color: PHYSICS_COLORS.appliedForce,
                        fontSize: canvasSize.font(11.5),
                        marginTop: '2px'
                      }}>
                        <span>F<sub>合</sub> = G:</span>
                        <span>{G_val.toFixed(1)} N</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      borderTop: '1px solid ' + colors.neutral[200],
                      paddingTop: '4px',
                    }}>
                      <div style={{ fontSize: canvasSize.font(9), color: colors.neutral[500] }}>
                        向心方向合力 (
                        {Math.cos(theta) > 0.001 ? (
                          <>
                            F<sub>向</sub> = {trackType === 0 ? 'F_T' : 'F_N'} - G<sub>n</sub>
                          </>
                        ) : Math.cos(theta) < -0.001 ? (
                          <>
                            F<sub>向</sub> = {trackType === 0 ? 'F_T' : 'F_N'} + G<sub>n</sub>
                          </>
                        ) : (
                          <>
                            F<sub>向</sub> = {trackType === 0 ? 'F_T' : 'F_N'}
                          </>
                        )}
                        ):
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        color: PHYSICS_COLORS.appliedForce,
                        fontSize: canvasSize.font(11.5),
                        marginTop: '2px'
                      }}>
                        <span>F<sub>向</sub>:</span>
                        <span>{F_xiang_val.toFixed(1)} N</span>
                      </div>
                    </div>
                  )}
                </div>
              </foreignObject>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
