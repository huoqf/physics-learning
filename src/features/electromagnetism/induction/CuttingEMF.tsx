import React, { useEffect, useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS } from '@/theme/physics'
import { VT_CHART_COLORS, AT_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { VelocityTimeChart, BasePhysicsChart, useChartContext } from '@/components/Chart'
import { VectorDefs } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { calculateCuttingEMF } from '@/physics'
import { refFromPeak } from '@/utils/vectorRefs'
import { useCuttingEMFPhysics } from './hooks/useCuttingEMFPhysics'
import { CuttingEMFScene } from './components/CuttingEMFScene'

/** 滑杆默认值（与 registry defaultParams 一致；力矢量基准也以它为锚） */
const CUTTING_EMF_DEFAULTS = { B: 1.5, L: 1.0, v: 2.0, R: 2.0, F_ext: 2.0 } as const
/** 滑杆量程（与 registry paramMeta 一致） */
const CUTTING_EMF_BOUNDS = { v: [-5, 5], F_ext: [0, 5] } as const

interface ChartSVGProps {
  title: string
  yLabel: string
  curveColor: string
  samplePoints: { t: number; v: number; a: number }[]
  getVal: (p: { t: number; v: number; a: number }) => number
  yMax: number
  curVal: number
  isVelocity: boolean
  time: number
  T_max: number
  chartW: number
  chartH: number
  mode: number
  v_m: number
}

function ChartSVGContent({
  samplePoints, getVal, curVal, isVelocity, time, T_max, curveColor, mode, v_m,
}: Omit<ChartSVGProps, 'chartW' | 'chartH' | 'title' | 'yLabel' | 'yMax'>) {
  const ctx = useChartContext()
  const safeToSvgX = ctx?.toSvgX
  const safeToSvgY = ctx?.toSvgY

  const ptsStr = React.useMemo(() => {
    if (!safeToSvgX || !safeToSvgY) return ''
    return samplePoints
      .map((p) => `${safeToSvgX(p.t).toFixed(1)},${safeToSvgY(getVal(p)).toFixed(1)}`)
      .join(' L ')
  }, [samplePoints, getVal, safeToSvgX, safeToSvgY])

  const activePts = samplePoints.filter((p) => p.t <= time)
  const activePtsStr = React.useMemo(() => {
    if (!safeToSvgX || !safeToSvgY || activePts.length < 2) return ''
    return 'M ' + activePts.map((p) => `${safeToSvgX(p.t).toFixed(1)},${safeToSvgY(getVal(p)).toFixed(1)}`).join(' L ')
  }, [activePts, getVal, safeToSvgX, safeToSvgY])

  if (!ctx) return null

  const { toSvgX, toSvgY, font } = ctx
  const curPtX = toSvgX(time)
  const curPtY = toSvgY(curVal)

  return (
    <g>
      {isVelocity && mode === 1 && (
        <g>
          <line
            x1={toSvgX(0)}
            y1={toSvgY(v_m)}
            x2={toSvgX(T_max)}
            y2={toSvgY(v_m)}
            stroke={CHART_COLORS.asymptote}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <text x={toSvgX(T_max) - font(9)} y={toSvgY(v_m) - 4} fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="end">
            收尾速度 v_m = {v_m.toFixed(2)} m/s
          </text>
        </g>
      )}

      {isVelocity && (
        <line
          x1={toSvgX(0)}
          y1={toSvgY(0)}
          x2={toSvgX(T_max)}
          y2={toSvgY(0)}
          stroke={CHART_COLORS.tickMark}
          strokeWidth={0.6}
          strokeDasharray="2,2"
          opacity={0.65}
        />
      )}

      <path d={`M ${ptsStr}`} fill="none" stroke={curveColor} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />

      {activePtsStr && (
        <path d={activePtsStr} fill="none" stroke={curveColor} strokeWidth={1.8} />
      )}

      {time <= T_max && (
        <g>
          <circle cx={curPtX} cy={curPtY} r={3} fill={curveColor} />
          <circle cx={curPtX} cy={curPtY} r={6} fill="none" stroke={curveColor} strokeWidth={0.8} opacity={0.6}>
            <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </g>
  )
}

const ChartSVG = React.memo(function ChartSVG({
  title, yLabel, curveColor, samplePoints, getVal, yMax, curVal,
  isVelocity, time, T_max, chartW, chartH, mode, v_m,
}: ChartSVGProps) {
  const yDomain: [number, number] = isVelocity ? [-yMax, yMax] : [0, yMax]

  return (
    <BasePhysicsChart
      xDomain={[0, T_max]}
      yDomain={yDomain}
      xLabel="t / s"
      yLabel={yLabel}
      title={title}
      variant="standard"
      initialSize={{ width: chartW, height: chartH }}
      gridCount={{ x: 4, y: isVelocity ? 4 : 3 }}
      yBaseline={isVelocity ? 0 : undefined}
    >
      <ChartSVGContent
        samplePoints={samplePoints}
        getVal={getVal}
        curVal={curVal}
        isVelocity={isVelocity}
        time={time}
        T_max={T_max}
        curveColor={curveColor}
        mode={mode}
        v_m={v_m}
      />
    </BasePhysicsChart>
  )
})

function TerminalVelocityReference({ v_m }: { v_m: number }) {
  const ctx = useChartContext()
  if (!ctx || !Number.isFinite(v_m)) return null

  const { toSvgY, plotOrigin, plotSize, font } = ctx
  const y = toSvgY(v_m)

  return (
    <g>
      <line
        x1={plotOrigin.x}
        y1={y}
        x2={plotOrigin.x + plotSize.width}
        y2={y}
        stroke={CHART_COLORS.asymptote}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <text
        x={plotOrigin.x + plotSize.width - font(9)}
        y={y - 4}
        fontSize={font(9)}
        fill={CHART_COLORS.tickLabel}
        textAnchor="end"
      >
        收尾速度 v_m = {v_m.toFixed(2)} m/s
      </text>
    </g>
  )
}

export default function CuttingEMF() {
  const { params, time, isPlaying, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const {
    mode = 0,
    B = CUTTING_EMF_DEFAULTS.B,
    L = CUTTING_EMF_DEFAULTS.L,
    v = CUTTING_EMF_DEFAULTS.v,
    R = CUTTING_EMF_DEFAULTS.R,
    F_ext = CUTTING_EMF_DEFAULTS.F_ext,
    m = 0.2,
    showForceAnalysis = 1,
  } = params

  const { containerRef, canvasSize, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize

  // 场景独立的 viewport（基于 splitV 设计空间）
  const { containerRef: sceneRef, vp: sceneVp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })

  /**
   * 力矢量基准（N）—— F_外 / F_安 / F_合 三个箭头共用。
   *
   * 恒速切割（mode 0）：F_安 = B²L²v/R。用「单滑杆极值扫描」只在**切割速度**这一条滑杆上取
   * 量程上界（B、L、R 保持默认值）：
   * - 全角点（B=3、L=2、R=0.5）是默认帧的 160 倍，据此定基准会把默认帧压成 0.6px 的亚像素点；
   * - B、L 各带平方，即便按单滑杆扫描也各有 4 倍，四条滑杆一起扫仍是默认帧的 16 倍。
   * 选 v 作扫描轴是因为它是本页的**主教学变量**（「改 v 看 F_安变化」），其余三条滑杆
   * 的调节只会让箭头在 2.5 倍处撞上满量程截断，而数值标签始终给出精确值。
   *
   * 自由释放（mode 1）：F_安 从 0 单调趋近 F_外，峰值就是 F_外 的量程上界，无需扫描。
   */
  const forceRef = useMemo(() => {
    if (mode === 0) {
      const res = calculateCuttingEMF(
        CUTTING_EMF_DEFAULTS.B, CUTTING_EMF_DEFAULTS.L, CUTTING_EMF_BOUNDS.v[1],
        CUTTING_EMF_DEFAULTS.R, 90, 0, 0,
      )
      return refFromPeak(Math.abs(res.F_ampere))
    }
    return refFromPeak(CUTTING_EMF_BOUNDS.F_ext[1])
  }, [mode])

  // 场景 sceneScale
  const sceneScale = useSceneScale({
    vp: sceneVp, preset: CANVAS_PRESETS.splitV,
    anchor: 'design',
    physicsWidth: 12,
    physicsHeight: 3,
    originSource: 'custom',
    originX: 70,
    originY: 160,
    refMagnitudes: {
      velocity: 3.0,
      acceleration: 10.0,
      force: 5.0,
      appliedForce: forceRef,
      lorentzForce: forceRef,
    },
    intentionalNonUniformScale: true,
  })

  const physics = useCuttingEMFPhysics({ mode, B, L, v, R, F_ext, m }, sceneScale, preset, font, time)

  useEffect(() => {
    if (isPlaying && physics.hasHitLimit) {
      setIsPlaying(false)
    }
  }, [physics.hasHitLimit, isPlaying, setIsPlaying])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-neutral-50 p-2 relative">
      <div className="w-full flex-1 flex items-center justify-between gap-4 min-h-0">
        <VelocityTimeChart
          mode="animated"
          points={physics.vtPoints}
          domainPoints={physics.vtPoints}
          referencePoints={physics.vtPoints}
          currentTime={Math.min(time, physics.T_max)}
          tMax={physics.T_max}
          vRange={[-physics.vYMax, physics.vYMax]}
          title="速度－时间图像 (v-t 图)"
          xLabel="t / s"
          yLabel="v / (m·s⁻¹)"
          series="primary"
          showCursor={time <= physics.T_max}
          showReferenceLine
          referenceColor={VT_CHART_COLORS.velocityCurve}
          referenceOpacity={0.4}
        >
          {mode === 1 && <TerminalVelocityReference v_m={physics.v_m} />}
        </VelocityTimeChart>
        <ChartSVG
          title="加速度－时间图像 (a-t 图)"
          yLabel="a / (m·s⁻²)"
          curveColor={AT_CHART_COLORS.accelCurve}
          samplePoints={physics.samplePoints}
          getVal={(p) => p.a}
          yMax={physics.aYMax}
          curVal={physics.finalA}
          isVelocity={false}
          time={time}
          T_max={physics.T_max}
          chartW={physics.chartW}
          chartH={physics.chartH}
          mode={mode}
          v_m={physics.v_m}
        />
      </div>

      <div className="w-full flex-shrink-0" style={{ height: '50%' }}>
        <AnimationSvgCanvas containerRef={sceneRef} transform={sceneVp.transform}>
          <defs>
            <VectorDefs colors={[
              PHYSICS_COLORS.velocity,
              PHYSICS_COLORS.acceleration,
              PHYSICS_COLORS.forceNet,
              PHYSICS_COLORS.appliedForce,
              PHYSICS_COLORS.lorentzForce
            ]} />
          </defs>
          <CuttingEMFScene
            physics={physics}
            sceneScale={sceneScale}
            font={(v: number) => Math.max(7, Math.min(16, v))}
            vpScale={sceneVp.scale}
            time={time}
            isPlaying={isPlaying}
            mode={mode}
            showForceAnalysis={showForceAnalysis}
            F_ext={F_ext}
            L={L}
            R={R}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
