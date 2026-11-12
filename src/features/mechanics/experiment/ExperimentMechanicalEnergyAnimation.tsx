import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart } from '@/components/Chart'
import {
  Ball,
  LabRuler,
  LabStand,
  PhysicsVectorArrow,
  TickerTimer,
} from '@/components/Physics'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { GRAVITY } from '@/physics/constants'
import { CANVAS_COLORS, PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import {
  CONSECUTIVE_INTERVAL,
  FREEFALL_MAX_M,
  buildTapeCountingDots,
  countingPeriod,
  solveTrackMotion,
  tickerPeriod,
  verifyMechanicalEnergy,
} from '@/physics/experimentMechanics'
import {
  FREEFALL_PROFILE,
  FREEFALL_PX_PER_M,
  FREEFALL_READOUT_X,
  FREEFALL_RULER_DOMAIN_CM,
  FREEFALL_RULER_LENGTH_PX,
  FREEFALL_RULER_X,
  FREEFALL_STAND_BASE_WIDTH,
  FREEFALL_STAND_BASE_Y,
  FREEFALL_STAND_CLAMP_OFFSET_Y,
  FREEFALL_STAND_HEIGHT,
  FREEFALL_STAND_X,
  FREEFALL_TAPE_TOP_Y,
  FREEFALL_TAPE_WIDTH,
  FREEFALL_TICKER_X,
  FREEFALL_TICKER_Y,
  FREEFALL_WEIGHT_OFFSET_Y,
  FREEFALL_WEIGHT_SIZE,
} from './mechanicsExperimentLayout'

/**
 * 验证机械能守恒定律实验动画（竖直自由下落打点 + ΔEₚ/ΔEₖ 逐点比对）
 */
export default function ExperimentMechanicalEnergyAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const freqNum = Number.isFinite(Number(params?.freq)) ? Number(params.freq) : 50
  const mNum = Number.isFinite(Number(params?.m)) ? Number(params.m) : 0.2
  const frictionNum = Number.isFinite(Number(params?.friction)) ? Number(params.friction) : 2
  const timeNum = Number.isFinite(Number(time)) ? Number(time) : 0

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: FREEFALL_PROFILE.preset,
  })
  const { font } = canvasSize

  const sceneScale = useSceneScale({
    vp,
    preset: FREEFALL_PROFILE.preset,
    anchor: 'custom',
    customScaleX: FREEFALL_PROFILE.pxPerMeter,
    customScaleY: FREEFALL_PROFILE.pxPerMeter,
    customOriginX: FREEFALL_PROFILE.originX,
    customOriginY: FREEFALL_PROFILE.originY,
    maxVectorLength: 64,
    refMagnitudes: { velocity: 5 },
  })

  const {
    safeX,
    safeV,
    tickerFreqHz,
    tapeDots,
    energyPoints,
    lastPoint,
    currentEp,
    currentEk,
  } = useMemo(() => {
    const frictionRatio = Math.max(0, Math.min(100, frictionNum)) / 100
    const aEffective = GRAVITY * (1 - frictionRatio)
    const motion = solveTrackMotion({
      v0: 0,
      a: aEffective,
      time: timeNum,
      xMax: FREEFALL_MAX_M,
    })
    const dots = buildTapeCountingDots({
      v0: 0,
      a: aEffective,
      time: timeNum,
      freq: freqNum,
      countInterval: CONSECUTIVE_INTERVAL,
      pxPerMeter: FREEFALL_PX_PER_M,
      xMax: FREEFALL_MAX_M,
    })
    const T = countingPeriod(freqNum, CONSECUTIVE_INTERVAL)
    const pts = verifyMechanicalEnergy({
      dotsPx: dots,
      pxPerMeter: FREEFALL_PX_PER_M,
      countingPeriodS: T,
      mass: mNum,
      gravity: GRAVITY,
    })
    const last = [...pts].reverse().find((p) => p.h <= motion.x + 1e-9)
    const periodS = tickerPeriod(freqNum)
    return {
      safeX: motion.x,
      safeV: motion.v,
      tickerFreqHz: periodS > 0 ? Math.round(1 / periodS) : 50,
      tapeDots: dots,
      energyPoints: pts,
      lastPoint: last,
      currentEp: last?.deltaEp ?? 0,
      currentEk: last?.deltaEk ?? 0,
    }
  }, [freqNum, mNum, frictionNum, timeNum])

  const epPoints = [{ x: 0, y: 0 }, ...energyPoints.map((p) => ({ x: p.h, y: p.deltaEp }))]
  const ekPoints = [{ x: 0, y: 0 }, ...energyPoints.map((p) => ({ x: p.h, y: p.deltaEk }))]
  const maxFallHeight = energyPoints.length > 0 ? energyPoints[energyPoints.length - 1].h : 0
  const maxEnergy = energyPoints.length > 0 ? energyPoints[energyPoints.length - 1].deltaEp : 0

  const fallPx = Math.max(0, safeX) * FREEFALL_PX_PER_M
  const weightCenterY =
    FREEFALL_TAPE_TOP_Y + fallPx + FREEFALL_WEIGHT_OFFSET_Y + FREEFALL_WEIGHT_SIZE / 2

  return (
    <div className="w-full h-full flex flex-row gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 左栏场景（420×650 splitH） */}
      <div
        className="order-1 w-[52%] max-w-[420px] min-w-[300px] shrink-0 h-full bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
        ref={containerRef}
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <LabStand
            x={FREEFALL_STAND_X}
            y={FREEFALL_STAND_BASE_Y}
            height={FREEFALL_STAND_HEIGHT}
            baseWidth={FREEFALL_STAND_BASE_WIDTH}
            clampY={FREEFALL_STAND_CLAMP_OFFSET_Y}
            attachment="clamp"
          />

          <TickerTimer
            x={FREEFALL_TICKER_X}
            y={FREEFALL_TICKER_Y}
            type="electromagnetic"
            isVibrating={safeX > 0}
            frequency={tickerFreqHz}
          />

          <rect
            x={FREEFALL_TICKER_X - FREEFALL_TAPE_WIDTH / 2}
            y={FREEFALL_TAPE_TOP_Y}
            width={FREEFALL_TAPE_WIDTH}
            height={fallPx + FREEFALL_WEIGHT_OFFSET_Y + 30}
            fill={SCENE_COLORS.mechanicsApparatus.tapeBg}
            stroke={SCENE_COLORS.mechanicsApparatus.tapeBorder}
            strokeWidth={1}
            rx={1}
          />

          {tapeDots.map((dotPx, i) => (
            <circle
              key={`ff-dot-${i}`}
              cx={FREEFALL_TICKER_X}
              cy={FREEFALL_TAPE_TOP_Y + dotPx}
              r={2.4}
              fill={
                i === 0
                  ? SCENE_COLORS.mechanicsApparatus.tapeDotActive
                  : SCENE_COLORS.mechanicsApparatus.tapeDotHistory
              }
            />
          ))}

          {[0, lastPoint?.index ?? -1]
            .filter((i, idx, arr) => i >= 0 && i < tapeDots.length && arr.indexOf(i) === idx)
            .map((i) => (
              <text
                key={`ff-dot-label-${i}`}
                x={FREEFALL_TICKER_X + FREEFALL_TAPE_WIDTH / 2 + 5}
                y={FREEFALL_TAPE_TOP_Y + tapeDots[i] + 3}
                fill={CANVAS_COLORS.labelTextLight}
                fontSize={font(9)}
                fontFamily="monospace"
              >
                {i}
              </text>
            ))}

          <g transform={`translate(${FREEFALL_TICKER_X}, ${weightCenterY})`}>
            <Ball cx={0} cy={0} r={FREEFALL_WEIGHT_SIZE / 2} type="steel" />
          </g>

          <PhysicsVectorArrow
            originDesign={{ x: FREEFALL_TICKER_X + 30, y: weightCenterY }}
            vector={{ x: 0, y: -safeV }}
            type="velocity"
            sceneScale={sceneScale}
            label={`v = ${safeV.toFixed(2)} m/s`}
            font={font}
          />

          <LabRuler
            x={FREEFALL_RULER_X}
            y={FREEFALL_TAPE_TOP_Y}
            length={FREEFALL_RULER_LENGTH_PX}
            height={30}
            orientation="vertical"
            domain={FREEFALL_RULER_DOMAIN_CM}
            showMagnifier
            magnifierPos={Math.min(FREEFALL_RULER_LENGTH_PX, fallPx)}
            fontFamily="monospace"
          />

          <g transform={`translate(${FREEFALL_READOUT_X}, ${FREEFALL_TAPE_TOP_Y + 36})`}>
            <text
              x={0}
              y={0}
              fill={CANVAS_COLORS.labelTextLight}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {lastPoint ? `第 ${lastPoint.index} 点  h = ${(lastPoint.h * 100).toFixed(1)} cm` : '计数点不足'}
            </text>
            <text
              x={0}
              y={18}
              fill={PHYSICS_COLORS.displacement}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {`ΔEₚ = ${currentEp.toFixed(3)} J`}
            </text>
            <text
              x={0}
              y={36}
              fill={CANVAS_COLORS.labelText}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {`ΔEₖ = ${currentEk.toFixed(3)} J`}
            </text>
          </g>
        </AnimationSvgCanvas>
      </div>

      {/* 2. 右栏图表 */}
      <div className="order-2 flex-1 min-w-0 h-full bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden">
        <RelationChart
          points={epPoints}
          additionalSeries={[
            {
              points: ekPoints,
              label: 'ΔEₖ',
              series: 'secondary',
              strokeDasharray: [5, 4],
            },
          ]}
          mainLabel="ΔEₚ"
          xDomain={[0, Math.max(0.05, maxFallHeight * 1.15)]}
          yDomain={[0, Math.max(0.01, maxEnergy * 1.15)]}
          title="验证机械能守恒：ΔEₚ 与 ΔEₖ 逐点比对"
          xLabel="下落高度 h / m"
          yLabel="能量 E / J"
        />
      </div>
    </div>
  )
}
