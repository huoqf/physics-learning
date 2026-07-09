import { useEffect, useMemo, useRef } from 'react'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow } from '@/components/Physics'
import { BasePhysicsChart, useChartContext, ChartCursor } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE, DASH, SCENE_COLORS } from '@/theme/physics'
import { createSceneScaleFromViewport } from '@/scene'
import { EARTH_RADIUS } from '@/physics/constants'
import {
  computeHohmannElements,
  computeTransferState,
  isNearApoapsis,
  megaMetersToMeters,
  sampleTransferSpeedHistory,
  type OrbitTransferPhase,
} from '@/physics/orbitTransfer'
import { EarthSvg, SatelliteSvg } from './SatelliteShapes'

/** square 设计坐标 */
const DW = 650
const DH = 650
/** store.time → 物理时间缩放因子；maxTime=120，覆盖低轨一圈+转移半程 */
const TIME_SCALE = 50
/** 右下角画中画图表尺寸 */
const PIP_CHART = {
  width: 360,
  height: 210,
} as const

function SpeedPath({ points }: { points: { t: number; v: number }[] }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.v).toFixed(1)}`).join(' L ')
  return (
    <path
      d={d}
      fill="none"
      stroke={PHYSICS_COLORS.velocity}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  )
}

function RefLine({ y, color, label }: { y: number; color: string; label: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgY, plotOrigin, plotSize } = ctx
  const yy = toSvgY(y)
  return (
    <g opacity={0.55}>
      <line
        x1={plotOrigin.x}
        y1={yy}
        x2={plotOrigin.x + plotSize.width}
        y2={yy}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text x={plotOrigin.x + plotSize.width - 4} y={yy - 3} textAnchor="end" fill={color} fontSize={9}>
        {label}
      </text>
    </g>
  )
}

export default function OrbitTransferAnimation() {
  const { params, time, updateParam, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      updateParam: s.updateParam,
      showVectors: s.showVectors,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.square,
  })
  const { font } = canvasSize

  // r 以 ×10⁶ m 为单位
  const r1mm = params.r1 ?? 7.0
  const r3mm = params.r3 ?? 14.0
  const phase = (params.phase ?? 0) as OrbitTransferPhase
  const tBurn1 = params.tBurn1 ?? 0
  const tBurn2 = params.tBurn2 ?? -1
  const showEllipse = (params.showEllipse ?? 1) === 1
  const showGravity = (params.showGravity ?? 1) === 1
  const requestBurn = params.requestBurn ?? 0
  const burnFlash = params.burnFlash ?? 0

  const r1 = megaMetersToMeters(Math.min(r1mm, r3mm - 0.2))
  const r3 = megaMetersToMeters(Math.max(r3mm, r1mm + 0.2))
  const hohmann = useMemo(() => computeHohmannElements({ r1, r3 }), [r1, r3])

  // store.time (0~120) → 物理时间
  const physTime = time * TIME_SCALE
  const physTBurn1 = tBurn1 * TIME_SCALE
  const physTBurn2 = tBurn2 >= 0 ? tBurn2 * TIME_SCALE : null
  const state = useMemo(
    () => computeTransferState({ r1, r3 }, phase, physTime, physTBurn1, physTBurn2),
    [r1, r3, phase, physTime, physTBurn1, physTBurn2],
  )

  // 远地点门控 → canBurn2
  const canBurn2 =
    phase === 1 && isNearApoapsis(state.trueAnomaly, 0.18) ? 1 : 0
  useEffect(() => {
    if ((params.canBurn2 ?? 0) !== canBurn2) {
      updateParam('canBurn2', canBurn2)
    }
  }, [canBurn2, params.canBurn2, updateParam])

  // 消费 requestBurn 脉冲
  const handlingBurn = useRef(false)
  useEffect(() => {
    if (!requestBurn || handlingBurn.current) return
    handlingBurn.current = true
    const store = useAnimationStore.getState()
    if (requestBurn === 1 && (store.params.phase ?? 0) === 0) {
      store.updateParam('phase', 1)
      store.updateParam('tBurn1', store.time)
      store.updateParam('burnFlash', 1)
      store.setIsPlaying(true)
    } else if (
      requestBurn === 2 &&
      (store.params.phase ?? 0) === 1 &&
      (store.params.canBurn2 ?? 0) === 1
    ) {
      store.updateParam('phase', 2)
      store.updateParam('tBurn2', store.time)
      store.updateParam('burnFlash', 1)
      store.setIsPlaying(true)
    }
    store.updateParam('requestBurn', 0)
    window.setTimeout(() => {
      useAnimationStore.getState().updateParam('burnFlash', 0)
      handlingBurn.current = false
    }, 400)
  }, [requestBurn])

  // r1/r3 变化：回到低轨
  const prevR = useRef({ r1mm, r3mm })
  useEffect(() => {
    if (prevR.current.r1mm !== r1mm || prevR.current.r3mm !== r3mm) {
      prevR.current = { r1mm, r3mm }
      updateParam('phase', 0)
      updateParam('tBurn1', 0)
      updateParam('tBurn2', -1)
      updateParam('canBurn2', 0)
      updateParam('requestBurn', 0)
      updateParam('burnFlash', 0)
    }
  }, [r1mm, r3mm, updateParam])

  // 像素比例：正方形画布，轨道整体左移给图表留空间
  const cx = DW / 2 - 40
  const cy = DH / 2
  const maxR = Math.max(r3, r1) * 1.15
  const scale = Math.min((DW * 0.46) / maxR, (DH * 0.46) / maxR)
  const earthPx = Math.max(18, EARTH_RADIUS * scale)

  const sceneScale = useMemo(() => {
    const base = createSceneScaleFromViewport(vp, 'centerScale', {
      designWidth: DW,
      designHeight: DH,
      worldWidth: maxR * 2.4,
      worldHeight: maxR * 2.4,
      refMagnitudes: {
        velocity: hohmann.vp || 8000,
        gravity: 1,
      },
      maxVectorLength: 48,
    })
    base.originX = cx
    base.originY = cy
    base.scaleX = scale
    base.scaleY = scale
    return base
  }, [vp, maxR, scale, hohmann.vp, cx, cy])

  const satX = cx + state.x * scale
  const satY = cy - state.y * scale
  const angleRad = Math.atan2(state.vy, state.vx)

  // 椭圆路径
  const ellipsePath = useMemo(() => {
    if (hohmann.a <= 0) return ''
    const a = hohmann.a
    const e = hohmann.e
    const b = a * Math.sqrt(Math.max(0, 1 - e * e))
    const steps = 96
    const pts: string[] = []
    for (let i = 0; i <= steps; i++) {
      const E = (2 * Math.PI * i) / steps
      const x = a * (Math.cos(E) - e)
      const y = b * Math.sin(E)
      const px = cx + x * scale
      const py = cy - y * scale
      pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
    }
    return pts.join(' ') + ' Z'
  }, [hohmann.a, hohmann.e, scale, cx, cy])

  const flashOn = burnFlash === 1
  const speedMag = Math.hypot(state.vx, state.vy) || 1
  const thrDir = { x: -state.vx / speedMag, y: -state.vy / speedMag }

  const r1px = r1 * scale
  const r3px = r3 * scale

  // ── 画中画图表数据（物理时间轴） ──
  const chartPoints = useMemo(
    () =>
      sampleTransferSpeedHistory(
        { r1, r3 },
        phase,
        Math.max(physTime, 1),
        physTBurn1,
        physTBurn2,
        100,
      ),
    [r1, r3, phase, physTime, physTBurn1, physTBurn2],
  )
  const vNow = chartPoints.length ? chartPoints[chartPoints.length - 1].v : hohmann.v1 / 1000
  const tMax = Math.max(physTime, hohmann.halfTransferTime * 1.2, 50)
  const v1k = hohmann.v1 / 1000
  const v3k = hohmann.v3 / 1000
  const yMax = Math.max(v1k, hohmann.vp / 1000, 1) * 1.15

  return (
    <div className="w-full h-full relative">
      <AnimationSvgCanvas
        containerRef={containerRef}
        transform={vp.transform}
        className="bg-slate-50 rounded-lg shadow-inner"
      >
        <defs>
          <radialGradient id="orbit-earth-ocean-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.earthOceanGrad[0]} />
            <stop offset="55%" stopColor={SCENE_COLORS.materials.earthOceanGrad[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.earthOceanGrad[2]} />
          </radialGradient>
          <radialGradient id="earth-ocean-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.earthOceanGrad[0]} />
            <stop offset="55%" stopColor={SCENE_COLORS.materials.earthOceanGrad[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.earthOceanGrad[2]} />
          </radialGradient>
        </defs>

        {/* 高圆轨 3 */}
        <circle
          cx={cx}
          cy={cy}
          r={r3px}
          fill="none"
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.trackHistory?.join?.(' ') ?? '4 4'}
          opacity={0.55}
        />
        <text
          x={cx + r3px * 0.72}
          y={cy - r3px * 0.72}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(9)}
        >
          轨 3
        </text>

        {/* 低圆轨 1 */}
        <circle
          cx={cx}
          cy={cy}
          r={r1px}
          fill="none"
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.axis}
          opacity={0.75}
        />
        <text
          x={cx + r1px * 0.75}
          y={cy - r1px * 0.55}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(9)}
        >
          轨 1
        </text>

        {/* 转移椭圆 */}
        {showEllipse && ellipsePath && (
          <path
            d={ellipsePath}
            fill="none"
            stroke={PHYSICS_COLORS.wavelength}
            strokeWidth={STROKE.objectThin}
            strokeDasharray="5 3"
            opacity={phase === 0 ? 0.45 : 0.9}
          />
        )}
        {showEllipse && (
          <text
            x={cx - hohmann.a * scale * 0.35}
            y={cy + 14}
            fill={PHYSICS_COLORS.wavelength}
            fontSize={font(9)}
          >
            轨 2 椭圆
          </text>
        )}

        {/* 近/远地点标记 */}
        <circle cx={cx + r1px} cy={cy} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.8} />
        <text x={cx + r1px + 6} y={cy + 4} fill={CANVAS_COLORS.labelText} fontSize={font(8)}>
          P
        </text>
        <circle cx={cx - r3px} cy={cy} r={3} fill={PHYSICS_COLORS.wavelength} opacity={0.8} />
        <text x={cx - r3px - 14} y={cy + 4} fill={CANVAS_COLORS.labelText} fontSize={font(8)}>
          A
        </text>

        <EarthSvg centerX={cx} centerY={cy} earthRadiusPx={earthPx} />

        {/* 飞船 */}
        <g transform={`translate(${satX}, ${satY})`}>
          {flashOn && (
            <g>
              <polygon
                points={`0,0 ${thrDir.x * 16},${-thrDir.y * 16} ${thrDir.x * 8 - thrDir.y * 4},${-thrDir.y * 8 - thrDir.x * 4}`}
                fill={PHYSICS_COLORS.forceNet}
                opacity={0.85}
              />
              <line
                x1={0}
                y1={0}
                x2={thrDir.x * 18}
                y2={-thrDir.y * 18}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={2}
                opacity={0.7}
              />
            </g>
          )}
          <SatelliteSvg angleRad={angleRad} scale={0.7} />
        </g>

        {/* 矢量 */}
        {(showVectors || showGravity) && (
          <g>
            {showGravity && (
              <VectorArrow
                origin={{ x: state.x, y: state.y }}
                vector={{ x: -state.x, y: -state.y }}
                type="gravity"
                sceneScale={sceneScale}
                label="F引"
                font={font}
              />
            )}
            {showVectors && (
              <VectorArrow
                origin={{ x: state.x, y: state.y }}
                vector={{ x: state.vx, y: state.vy }}
                type="velocity"
                sceneScale={sceneScale}
                label="v"
                font={font}
                color={PHYSICS_COLORS.velocity}
              />
            )}
          </g>
        )}

        {/* 阶段提示 */}
        {phase === 1 && canBurn2 === 1 && (
          <text x={12} y={22} fill={PHYSICS_COLORS.forceNet} fontSize={font(9)} fontWeight={600}>
            已到远地点 — 可再次点火
          </text>
        )}
      </AnimationSvgCanvas>

      {/* 画中画 v-t 图（右下角） */}
      <div
        className="absolute bottom-4 right-4 rounded-lg shadow-md border border-neutral-200/60 overflow-hidden z-10"
        style={{ backgroundColor: SCENE_COLORS.labels.glassPanelBg }}
      >
        <div className="flex items-center justify-between px-2.5 pt-1.5 pb-0.5">
          <span className="text-xs font-semibold text-neutral-600">v–t 曲线</span>
          <span className="text-[10px] text-neutral-400">
            {phase === 0 ? '低轨' : phase === 1 ? '转移' : '高轨'}
          </span>
        </div>
        <svg width={PIP_CHART.width} height={PIP_CHART.height}>
          <BasePhysicsChart
            xDomain={[0, tMax]}
            yDomain={[0, yMax]}
            xLabel=""
            yLabel=""
            variant="mini"
            fixedSize={{ width: PIP_CHART.width, height: PIP_CHART.height }}
          >
            <RefLine y={v1k} color={CANVAS_COLORS.labelTextLight} label="v₁" />
            <RefLine y={v3k} color={PHYSICS_COLORS.wavelength} label="v₃" />
            <SpeedPath points={chartPoints} />
            <ChartCursor
              x={time}
              dataPoints={[{ y: vNow, label: 'v', series: 'primary' as const }]}
            />
          </BasePhysicsChart>
        </svg>
      </div>
    </div>
  )
}