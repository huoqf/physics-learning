import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateConstantImpulse,
  calculateInstantaneousForce,
  calculateAnalyticalImpulse,
  calculateImpulseSlices,
  type ForceTimeType,
} from '@/physics/impulse'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
  FONT,
} from '@/theme/physics'

/** 冲量动画布局常量 */
const IMPULSE_LAYOUT = {
  /** Canvas 安全余量 (px) */
  canvasPadding: 50,
  /** 地面线 Y 偏移 (px) */
  groundOffset: 100,
  /** 滑块高度 (px) */
  sliderHeight: 30,
  /** 滑块宽度 (px) */
  sliderWidth: 50,
  /** 推力手高度 (px) */
  pushHandHeight: 50,
  /** F-t 图表区域 */
  chart: {
    marginTop: 20,
    marginLeft: 55,
    marginRight: 30,
    marginBottom: 40,
  },
  /** 微元切割数 */
  nSlices: 16,
} as const

export default function ImpulseAnimation() {
    const {params, time, showVectors} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const {
    F = 10,
    t_duration = 3,
    FMax = 10,
    t_total = 3,
    forceType = 0,
    advancedMode = 0,
  } = params

  const isAdvanced = advancedMode === 1
  const forceTypeStr: ForceTimeType = forceType === 1 ? 'sine' : 'linear'

  const groundY = canvasSize.height - IMPULSE_LAYOUT.groundOffset

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: 0,
      y: 0,
      width: canvasSize.width - IMPULSE_LAYOUT.canvasPadding * 2,
      height: canvasSize.height - IMPULSE_LAYOUT.canvasPadding,
    },
    originX: 0,
    originY: groundY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
    refMagnitudes: {
      force: 200,
    },
  }), [canvasSize.width, canvasSize.height, groundY]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ── 基础模式：恒力 ──────────────────────────────────────────
  const currentT_basic = Math.min(time, t_duration)
  const currentImpulse_basic = calculateConstantImpulse(F, currentT_basic)

  // ── 进阶模式：变力 ──────────────────────────────────────────
  const currentT_advanced = Math.min(time, t_total)
  const currentFt = calculateInstantaneousForce(currentT_advanced, FMax, t_total, forceTypeStr)
  const totalImpulse = calculateAnalyticalImpulse(t_total, FMax, t_total, forceTypeStr)

  // 微元切片
  const slices = useMemo(
    () => calculateImpulseSlices(FMax, t_total, forceTypeStr, IMPULSE_LAYOUT.nSlices),
    [FMax, t_total, forceTypeStr]
  )

  // 当前已完成的微元数
  const dt = t_total / IMPULSE_LAYOUT.nSlices
  const completedSlices = Math.min(
    Math.floor(currentT_advanced / dt),
    IMPULSE_LAYOUT.nSlices
  )
  const cumulativeImpulseSlices = completedSlices > 0
    ? slices[completedSlices - 1].cumulativeI
    : 0

  // ── F-t 图表坐标映射 ────────────────────────────────────────
  const chartArea = {
    x: IMPULSE_LAYOUT.chart.marginLeft,
    y: IMPULSE_LAYOUT.chart.marginTop,
    w: canvasSize.width - IMPULSE_LAYOUT.chart.marginLeft - IMPULSE_LAYOUT.chart.marginRight,
    h: canvasSize.height * 0.45 - IMPULSE_LAYOUT.chart.marginTop - IMPULSE_LAYOUT.chart.marginBottom,
  }

  const fMaxRef = Math.max(F, FMax, 1) * 1.2
  const tMaxRef = Math.max(t_duration, t_total, 1) * 1.1

  const toChartX = (t: number) => chartArea.x + (t / tMaxRef) * chartArea.w
  const toChartY = (f: number) => chartArea.y + chartArea.h - (f / fMaxRef) * chartArea.h

  // ── 基础模式：F-t 曲线路径（矩形） ─────────────────────────
  const basicRectPath = useMemo(() => {
    const x0 = toChartX(0)
    const x1 = toChartX(t_duration)
    const y0 = toChartY(0)
    const yF = toChartY(F)
    return `M ${x0},${y0} L ${x0},${yF} L ${x1},${yF} L ${x1},${y0}`
  }, [F, t_duration, chartArea])

  // 基础模式：当前时间填充
  const basicFillPath = useMemo(() => {
    const x0 = toChartX(0)
    const xCur = toChartX(currentT_basic)
    const y0 = toChartY(0)
    const yF = toChartY(F)
    return `M ${x0},${y0} L ${x0},${yF} L ${xCur},${yF} L ${xCur},${y0} Z`
  }, [F, currentT_basic, chartArea])

  // ── 进阶模式：F-t 曲线路径 ─────────────────────────────────
  const advancedCurvePath = useMemo(() => {
    const points: string[] = []
    const steps = 60
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * t_total
      const f = calculateInstantaneousForce(t, FMax, t_total, forceTypeStr)
      points.push(`${toChartX(t)},${toChartY(f)}`)
    }
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`
  }, [FMax, t_total, forceTypeStr, chartArea])

  // 进阶模式：曲线下面积填充（到当前时间）
  const advancedFillPath = useMemo(() => {
    if (currentT_advanced <= 0) return ''
    const points: string[] = []
    const steps = 40
    const y0 = toChartY(0)
    points.push(`${toChartX(0)},${y0}`)
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * currentT_advanced
      const f = calculateInstantaneousForce(t, FMax, t_total, forceTypeStr)
      points.push(`${toChartX(t)},${toChartY(f)}`)
    }
    points.push(`${toChartX(currentT_advanced)},${y0}`)
    return `M ${points.join(' L ')} Z`
  }, [FMax, t_total, forceTypeStr, currentT_advanced, chartArea])

  // ── 滑块动画位置 ────────────────────────────────────────────
  const sliderTrackY = groundY - IMPULSE_LAYOUT.sliderHeight / 2

  // 基础模式滑块位移
  const sliderDisplacement_basic = currentT_basic * 15
  const sliderX_basic = IMPULSE_LAYOUT.canvasPadding + sliderDisplacement_basic

  // 进阶模式滑块位移（简化：用平均速度近似）
  const sliderDisplacement_advanced = currentT_advanced * 10
  const sliderX_advanced = IMPULSE_LAYOUT.canvasPadding + sliderDisplacement_advanced

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* ========== defs ========== */}
        <defs>
        </defs>

        {/* ========== 地面线 ========== */}
        <line
          x1={IMPULSE_LAYOUT.canvasPadding}
          y1={groundY}
          x2={canvasSize.width - IMPULSE_LAYOUT.canvasPadding}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* ========== 基础模式：恒力 + F-t 矩形 ========== */}
        {!isAdvanced && (
          <g>
            {/* 滑块 */}
            <rect
              x={sliderX_basic}
              y={sliderTrackY - IMPULSE_LAYOUT.sliderHeight / 2}
              width={IMPULSE_LAYOUT.sliderWidth}
              height={IMPULSE_LAYOUT.sliderHeight}
              rx={6}
              fill={SCENE_COLORS.materials.steelSphereGrad[1]}
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />

            {/* 推力手（箭头） */}
            {showVectors && (
              <VectorArrow
                origin={{ x: sliderX_basic - 5, y: groundY - sliderTrackY }}
                vector={{ x: -F, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
              />
            )}

            {/* F-t 图表区域 */}
            <g>
              {/* 坐标轴 */}
              <line
                x1={chartArea.x}
                y1={toChartY(0)}
                x2={chartArea.x + chartArea.w}
                y2={toChartY(0)}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={1}
              />
              <line
                x1={chartArea.x}
                y1={chartArea.y}
                x2={chartArea.x}
                y2={chartArea.y + chartArea.h}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={1}
              />

              {/* 轴标签 */}
              <text
                x={chartArea.x + chartArea.w}
                y={toChartY(0) + 15}
                fontSize={FONT.axisSize}
                fill={CHART_COLORS.labelText}
                textAnchor="end"
              >
                t (s)
              </text>
              <text
                x={chartArea.x - 8}
                y={chartArea.y - 2}
                fontSize={FONT.axisSize}
                fill={CHART_COLORS.labelText}
                textAnchor="end"
              >
                F (N)
              </text>

              {/* F-t 矩形轮廓 */}
              <path
                d={basicRectPath}
                fill="none"
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={1.5}
              />

              {/* 当前时间填充面积 */}
              <path
                d={basicFillPath}
                fill={PHYSICS_COLORS.impulse}
                opacity={0.25}
              />

              {/* 面积标注 */}
              <text
                x={toChartX(currentT_basic / 2)}
                y={toChartY(F / 2)}
                fontSize={FONT.smallSize}
                fill={PHYSICS_COLORS.impulse}
                fontWeight="bold"
                textAnchor="middle"
              >
                I = {currentImpulse_basic.toFixed(1)} N·s
              </text>

              {/* F 刻度 */}
              <line x1={chartArea.x - 4} y1={toChartY(F)} x2={chartArea.x} y2={toChartY(F)} stroke={CHART_COLORS.axisLine} strokeWidth={1} />
              <text x={chartArea.x - 6} y={toChartY(F) + 3} fontSize={FONT.smallSize} fill={CHART_COLORS.labelText} textAnchor="end">
                {F.toFixed(0)}
              </text>

              {/* t 刻度 */}
              <line x1={toChartX(t_duration)} y1={toChartY(0)} x2={toChartX(t_duration)} y2={toChartY(0) + 4} stroke={CHART_COLORS.axisLine} strokeWidth={1} />
              <text x={toChartX(t_duration)} y={toChartY(0) + 13} fontSize={FONT.smallSize} fill={CHART_COLORS.labelText} textAnchor="middle">
                {t_duration.toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* ========== 进阶模式：变力 + 微元法 ========== */}
        {isAdvanced && (
          <g>
            {/* 滑块 */}
            <rect
              x={sliderX_advanced}
              y={sliderTrackY - IMPULSE_LAYOUT.sliderHeight / 2}
              width={IMPULSE_LAYOUT.sliderWidth}
              height={IMPULSE_LAYOUT.sliderHeight}
              rx={6}
              fill={SCENE_COLORS.materials.steelSphereGrad[1]}
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />

            {/* 渐变推力臂 */}
            {showVectors && currentFt > 0 && (
              <VectorArrow
                origin={{ x: sliderX_advanced - 5, y: groundY - sliderTrackY }}
                vector={{ x: -currentFt * 2, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
              />
            )}

            {/* F-t 图表区域 */}
            <g>
              {/* 坐标轴 */}
              <line
                x1={chartArea.x}
                y1={toChartY(0)}
                x2={chartArea.x + chartArea.w}
                y2={toChartY(0)}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={1}
              />
              <line
                x1={chartArea.x}
                y1={chartArea.y}
                x2={chartArea.x}
                y2={chartArea.y + chartArea.h}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={1}
              />

              {/* 轴标签 */}
              <text
                x={chartArea.x + chartArea.w}
                y={toChartY(0) + 15}
                fontSize={FONT.axisSize}
                fill={CHART_COLORS.labelText}
                textAnchor="end"
              >
                t (s)
              </text>
              <text
                x={chartArea.x - 8}
                y={chartArea.y - 2}
                fontSize={FONT.axisSize}
                fill={CHART_COLORS.labelText}
                textAnchor="end"
              >
                F(t) (N)
              </text>

              {/* 微元切割矩形 */}
              {slices.map((slice, i) => {
                const x0 = toChartX(slice.tStart)
                const x1 = toChartX(slice.tEnd)
                const yF = toChartY(slice.FAvg)
                const y0 = toChartY(0)
                const isCompleted = i < completedSlices
                const isCurrent = i === completedSlices && currentT_advanced < t_total

                return (
                  <g key={`slice-${i}`}>
                    <rect
                      x={x0}
                      y={yF}
                      width={x1 - x0}
                      height={y0 - yF}
                      fill={isCompleted ? PHYSICS_COLORS.impulse : (isCurrent ? PHYSICS_COLORS.impulse : 'transparent')}
                      opacity={isCompleted ? 0.3 : (isCurrent ? 0.15 : 0)}
                      stroke={isCompleted || isCurrent ? PHYSICS_COLORS.impulse : CHART_COLORS.axisLine}
                      strokeWidth={0.5}
                      strokeDasharray={isCompleted || isCurrent ? 'none' : '2,2'}
                    />
                    {/* 微元切割线 */}
                    {(isCompleted || isCurrent) && (
                      <line
                        x1={x1}
                        y1={yF}
                        x2={x1}
                        y2={y0}
                        stroke={PHYSICS_COLORS.impulse}
                        strokeWidth={0.5}
                        strokeDasharray="2,2"
                        opacity={0.5}
                      />
                    )}
                  </g>
                )
              })}

              {/* 曲线下面积填充（到当前时间） */}
              <path
                d={advancedFillPath}
                fill={PHYSICS_COLORS.impulse}
                opacity={0.1}
              />

              {/* F-t 曲线 */}
              <path
                d={advancedCurvePath}
                fill="none"
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={2}
              />

              {/* 当前时间指示线 */}
              {currentT_advanced > 0 && currentT_advanced < t_total && (
                <line
                  x1={toChartX(currentT_advanced)}
                  y1={chartArea.y}
                  x2={toChartX(currentT_advanced)}
                  y2={toChartY(0)}
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={1}
                  strokeDasharray="4,3"
                />
              )}

              {/* F_max 刻度 */}
              <line x1={chartArea.x - 4} y1={toChartY(FMax)} x2={chartArea.x} y2={toChartY(FMax)} stroke={CHART_COLORS.axisLine} strokeWidth={1} />
              <text x={chartArea.x - 6} y={toChartY(FMax) + 3} fontSize={FONT.smallSize} fill={CHART_COLORS.labelText} textAnchor="end">
                {FMax.toFixed(0)}
              </text>

              {/* t_total 刻度 */}
              <line x1={toChartX(t_total)} y1={toChartY(0)} x2={toChartX(t_total)} y2={toChartY(0) + 4} stroke={CHART_COLORS.axisLine} strokeWidth={1} />
              <text x={toChartX(t_total)} y={toChartY(0) + 13} fontSize={FONT.smallSize} fill={CHART_COLORS.labelText} textAnchor="middle">
                {t_total.toFixed(1)}
              </text>

              {/* 积分标注 */}
              <text
                x={toChartX(currentT_advanced / 2)}
                y={toChartY(FMax * 0.5)}
                fontSize={FONT.smallSize}
                fill={PHYSICS_COLORS.impulse}
                fontWeight="bold"
                textAnchor="middle"
              >
                {currentT_advanced >= t_total
                  ? `I = ${totalImpulse.toFixed(1)} N·s`
                  : `∑FΔt = ${cumulativeImpulseSlices.toFixed(1)} N·s`}
              </text>

              {/* Δt 标注 */}
              {completedSlices > 0 && currentT_advanced < t_total && (
                <text
                  x={toChartX(currentT_advanced) + 5}
                  y={chartArea.y + 10}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.velocity}
                >
                  Δt
                </text>
              )}
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
