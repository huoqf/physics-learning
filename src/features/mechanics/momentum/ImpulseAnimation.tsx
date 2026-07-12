import { VectorArrow, PhysicsGround } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
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

import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
  CHART_COLORS,
} from '@/theme/physics'
import { RelationChart, ChartArea, useChartContext } from '@/components/Chart'

/** 冲量动画布局常量（设计坐标） */
const IMPULSE_LAYOUT = {
  /** 安全余量（设计坐标） */
  canvasPadding: 50,
  /** 地面线距设计底边的偏移（设计坐标） */
  groundOffset: 100,
  /** 滑块高度（设计坐标） */
  sliderHeight: 30,
  /** 滑块宽度（设计坐标） */
  sliderWidth: 50,
  /** 微元切割数 */
  nSlices: 16,
} as const

/**
 * 图表域默认参考值
 * 用于计算固定的 xDomain / yDomain，不随用户调参变化，
 * 确保参数修改时曲线视觉上产生变化而非坐标轴等比缩放。
 */
const DOMAIN_DEFAULTS = {
  /** 基础模式默认力 (N) */
  F_ref: 20,
  /** 基础模式默认时间 (s) */
  t_ref: 5,
  /** 进阶模式默认最大力 (N) */
  FMax_ref: 20,
  /** 进阶模式默认总时间 (s) */
  tTotal_ref: 5,
} as const

/**
 * F-t 微元切割图层
 * 用于进阶模式：在 RelationChart 内部渲染微元矩形
 */
function ImpulseSlicesLayer({
  slices,
  completedSlices,
  currentT,
  t_total,
}: {
  slices: ReturnType<typeof calculateImpulseSlices>
  completedSlices: number
  currentT: number
  t_total: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, font } = ctx

  return (
    <g>
      {slices.map((slice, i) => {
        const x0 = toSvgX(slice.tStart)
        const x1 = toSvgX(slice.tEnd)
        const yF = toSvgY(slice.FAvg)
        const y0 = toSvgY(0)
        const isCompleted = i < completedSlices
        const isCurrent = i === completedSlices && currentT < t_total
        const w = Math.max(0, x1 - x0)
        const h = Math.max(0, y0 - yF)

        if (!isCompleted && !isCurrent) return null

        return (
          <g key={`slice-${i}`}>
            <rect
              x={x0}
              y={yF}
              width={w}
              height={h}
              fill={PHYSICS_COLORS.impulse}
              opacity={isCompleted ? 0.28 : 0.14}
              stroke={PHYSICS_COLORS.impulse}
              strokeWidth={0.5}
            />
            {/* 微元切割线 */}
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
          </g>
        )
      })}
      {/* Δt 标注 */}
      {completedSlices > 0 && currentT < t_total && (
        <text
          x={toSvgX(currentT) + 5}
          y={ctx.plotOrigin.y + font(10) + 2}
          fontSize={font(10)}
          fill={PHYSICS_COLORS.velocity}
        >
          Δt
        </text>
      )}
    </g>
  )
}

/**
 * 面积标注图层（显示冲量数值）
 */
function ImpulseLabelLayer({
  currentT,
  impulseText,
  yPos,
}: {
  currentT: number
  impulseText: string
  yPos: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, font } = ctx

  // 标签放在当前时间中点
  const labelX = toSvgX(currentT / 2)
  const labelY = toSvgY(yPos)

  return (
    <text
      x={labelX}
      y={labelY}
      fontSize={font(10)}
      fill={PHYSICS_COLORS.impulse}
      fontWeight="bold"
      textAnchor="middle"
    >
      {impulseText}
    </text>
  )
}

export default function ImpulseAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })

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

  // 地面线 Y（设计坐标，从设计底边向上偏移）
  const groundY = preset.height - IMPULSE_LAYOUT.groundOffset

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    refMagnitudes: { force: 200 },
    maxVectorLength: Math.min(preset.width, preset.height) * 0.3,
  })

  // ── 基础模式：恒力 ──────────────────────────────────────────
  const currentT_basic = Math.min(time, t_duration)
  const currentImpulse_basic = calculateConstantImpulse(F, currentT_basic)

  // ── 进阶模式：变力 ──────────────────────────────────────────
  const currentT_advanced = Math.min(time, t_total)
  const currentFt = calculateInstantaneousForce(
    currentT_advanced,
    FMax,
    t_total,
    forceTypeStr
  )
  const totalImpulse = calculateAnalyticalImpulse(
    t_total,
    FMax,
    t_total,
    forceTypeStr
  )

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
  const cumulativeImpulseSlices =
    completedSlices > 0 ? slices[completedSlices - 1].cumulativeI : 0

  // ── F-t 数据点（RelationChart 用） ─────────────────────────
  // 完整曲线（用于 ChartArea 面积填充，内部已按 xRange 裁剪）
  const basicFtPointsAll = useMemo(
    () => [
      { x: 0, y: F },
      { x: t_duration, y: F },
    ],
    [F, t_duration]
  )

  const advancedFtPointsAll = useMemo(() => {
    const steps = 60
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * t_total
      const f = calculateInstantaneousForce(t, FMax, t_total, forceTypeStr)
      pts.push({ x: t, y: f })
    }
    return pts
  }, [FMax, t_total, forceTypeStr])

  // 渐进绘制：基础模式只有 2 个端点，filter 会退化为 1 点导致不渲染；
  // 直接用 currentT 构造末端点，保证始终有 2 个点可成线
  const basicFtPoints = useMemo(
    () => [{ x: 0, y: F }, { x: currentT_basic, y: F }],
    [F, currentT_basic]
  )

  const advancedFtPoints = useMemo(
    () => advancedFtPointsAll.filter((p) => p.x <= currentT_advanced + 1e-9),
    [advancedFtPointsAll, currentT_advanced]
  )

  // ── 滑块动画位置（设计坐标） ──────────────────────────────────
  const sliderTrackY = groundY - IMPULSE_LAYOUT.sliderHeight / 2

  // 基础模式滑块位移
  const sliderDisplacement_basic = currentT_basic * 15
  const sliderX_basic = IMPULSE_LAYOUT.canvasPadding + sliderDisplacement_basic

  // 进阶模式滑块位移（简化：用平均速度近似）
  const sliderDisplacement_advanced = currentT_advanced * 10
  const sliderX_advanced = IMPULSE_LAYOUT.canvasPadding + sliderDisplacement_advanced

  // ── 图表域（基于默认参考值固定，不随用户调参变化） ────────
  const basicXDomain: [number, number] = [0, DOMAIN_DEFAULTS.t_ref * 1.1]
  const basicYDomain: [number, number] = [0, DOMAIN_DEFAULTS.F_ref * 1.25]

  const advancedXDomain: [number, number] = [0, DOMAIN_DEFAULTS.tTotal_ref * 1.05]
  const advancedYDomain: [number, number] = [0, DOMAIN_DEFAULTS.FMax_ref * 1.25]

  return (
    <div className="w-full h-full flex flex-col bg-neutral-50 gap-2 p-2">
      {/* ========== F-t 图表区域（顶部） ========== */}
      <div className="w-full" style={{ height: '48%' }}>
        {!isAdvanced ? (
          /* 基础模式：恒力 F-t */
          <RelationChart
            points={basicFtPoints}
            xDomain={basicXDomain}
            yDomain={basicYDomain}
            xLabel="t (s)"
            yLabel="F (N)"
            title="F-t 图像（冲量 = 面积）"
            cursorX={Math.min(currentT_basic, basicXDomain[1])}
            cursorLabel={() => null}
            series="primary"
            color={PHYSICS_COLORS.forceNet}
            showGrid
            underlay={
              <ChartArea
                points={basicFtPointsAll}
                xRange={[0, currentT_basic]}
                baseline={0}
                variant="impulse"
                intensity="normal"
              />
            }
            children={
              <ImpulseLabelLayer
                currentT={currentT_basic}
                impulseText={`I = ${currentImpulse_basic.toFixed(1)} N·s`}
                yPos={F / 2}
              />
            }
          />
        ) : (
          /* 进阶模式：变力 F-t + 微元法 */
          <RelationChart
            points={advancedFtPoints}
            xDomain={advancedXDomain}
            yDomain={advancedYDomain}
            xLabel="t (s)"
            yLabel="F(t) (N)"
            title="F-t 图像（微元法求冲量）"
            cursorX={Math.min(currentT_advanced, advancedXDomain[1])}
            cursorLabel={() => null}
            series="primary"
            color={PHYSICS_COLORS.forceNet}
            showGrid
            underlay={
              <ChartArea
                points={advancedFtPointsAll}
                xRange={[0, currentT_advanced]}
                baseline={0}
                variant="impulse"
                intensity="subtle"
              />
            }
            children={
              <>
                <ImpulseSlicesLayer
                  slices={slices}
                  completedSlices={completedSlices}
                  currentT={currentT_advanced}
                  t_total={t_total}
                />
                <ImpulseLabelLayer
                  currentT={currentT_advanced}
                  impulseText={
                    currentT_advanced >= t_total
                      ? `I = ${totalImpulse.toFixed(1)} N·s`
                      : `∑FΔt = ${cumulativeImpulseSlices.toFixed(1)} N·s`
                  }
                  yPos={FMax * 0.5}
                />
              </>
            }
          />
        )}
      </div>

      {/* ========== 物理动画区域（底部） ========== */}
      <AnimationSvgCanvas
        containerRef={containerRef}
        transform={vp.transform}
        className="flex-1 rounded-lg shadow-inner overflow-hidden bg-white"
      >
        {/* 地面线 */}
        <PhysicsGround
          x={IMPULSE_LAYOUT.canvasPadding}
          y={groundY}
          width={preset.width - 2 * IMPULSE_LAYOUT.canvasPadding}
          appearance={{ color: PHYSICS_COLORS.labelText }}
        />

        {!isAdvanced ? (
          /* 基础模式滑块 */
          <g>
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
            {showVectors && (
              <VectorArrow
                originPixel={{ x: sliderX_basic - 5, y: sliderTrackY }}
                vector={{ x: -F, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
              />
            )}
            {/* 冲量数值标注 */}
            <text
              x={sliderX_basic + IMPULSE_LAYOUT.sliderWidth / 2}
              y={sliderTrackY - IMPULSE_LAYOUT.sliderHeight / 2 - 12}
              fontSize={canvasSize.font(10)}
              fill={PHYSICS_COLORS.impulse}
              textAnchor="middle"
              fontWeight="bold"
            >
              I = {currentImpulse_basic.toFixed(1)} N·s
            </text>
            <text
              x={sliderX_basic + IMPULSE_LAYOUT.sliderWidth / 2}
              y={sliderTrackY - IMPULSE_LAYOUT.sliderHeight / 2 + 35}
              fontSize={canvasSize.font(10)}
              fill={CHART_COLORS.labelText}
              textAnchor="middle"
            >
              t = {currentT_basic.toFixed(2)} s
            </text>
          </g>
        ) : (
          /* 进阶模式滑块 */
          <g>
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
            {showVectors && currentFt > 0 && (
              <VectorArrow
                originPixel={{ x: sliderX_advanced - 5, y: sliderTrackY }}
                vector={{ x: -currentFt * 2, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
              />
            )}
            {/* 冲量数值标注 */}
            <text
              x={sliderX_advanced + IMPULSE_LAYOUT.sliderWidth / 2}
              y={sliderTrackY - IMPULSE_LAYOUT.sliderHeight / 2 - 12}
              fontSize={canvasSize.font(10)}
              fill={PHYSICS_COLORS.impulse}
              textAnchor="middle"
              fontWeight="bold"
            >
              {currentT_advanced >= t_total
                ? `I = ${totalImpulse.toFixed(1)}`
                : `∑FΔt = ${cumulativeImpulseSlices.toFixed(1)}`}{' '}
              N·s
            </text>
            <text
              x={sliderX_advanced + IMPULSE_LAYOUT.sliderWidth / 2}
              y={sliderTrackY - IMPULSE_LAYOUT.sliderHeight / 2 + 35}
              fontSize={canvasSize.font(10)}
              fill={CHART_COLORS.labelText}
              textAnchor="middle"
            >
              F = {currentFt.toFixed(1)} N · t = {currentT_advanced.toFixed(2)} s
            </text>
          </g>
        )}
      </AnimationSvgCanvas>
    </div>
  )
}
