import React, { useEffect, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { VT_CHART_COLORS, AT_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { VelocityTimeChart, BasePhysicsChart, useChartContext } from '@/components/Chart'
import { useCuttingEMFPhysics } from './hooks/useCuttingEMFPhysics'
import { CuttingEMFScene } from './components/CuttingEMFScene'

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

  const ptsStr = useMemo(() => {
    if (!safeToSvgX || !safeToSvgY) return ''
    return samplePoints
      .map((p) => `${safeToSvgX(p.t).toFixed(1)},${safeToSvgY(getVal(p)).toFixed(1)}`)
      .join(' L ')
  }, [samplePoints, getVal, safeToSvgX, safeToSvgY])

  const activePts = samplePoints.filter((p) => p.t <= time)
  const activePtsStr = useMemo(() => {
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
          <text x={toSvgX(T_max) - font(7)} y={toSvgY(v_m) - 4} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">
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
        x={plotOrigin.x + plotSize.width - font(7)}
        y={y - 4}
        fontSize={font(7)}
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
    B = 1.5,
    L = 1.0,
    v = 2.0,
    R = 2.0,
    F_ext = 2.0,
    m = 0.2,
    showForceAnalysis = 1,
  } = params

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })

  const physics = useCuttingEMFPhysics({ mode, B, L, v, R, F_ext, m }, canvasSize, time)

  useEffect(() => {
    if (isPlaying && physics.hasHitLimit) {
      setIsPlaying(false)
    }
  }, [physics.hasHitLimit, isPlaying, setIsPlaying])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-neutral-50 p-2 gap-2 relative">
      <div className="w-full shrink-0 flex items-center justify-between gap-4" style={{ height: physics.chartHeight }}>
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

      <CuttingEMFScene
        physics={physics}
        canvasSize={canvasSize}
        time={time}
        isPlaying={isPlaying}
        mode={mode}
        showForceAnalysis={showForceAnalysis}
        F_ext={F_ext}
        L={L}
        R={R}
        B={B}
      />
    </div>
  )
}
