import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { colors } from '@/theme/colors'
import { KatexFormula } from '@/components/UI'
import {
  precomputeConstantPowerTrajectory,
  precomputeConstantAccelTrajectory,
  getPowerStateAtTime,
  calculateConstantPowerParams,
  calculateConstantAccelParams,
} from '@/physics/power'
import { PowerCharts } from './PowerCharts'
import { PowerScene } from './PowerScene'

const POWER_LAYOUT = {
  chartTopRatio: 0.03,
  chartBottomRatio: 0.48,
  dividerRatio: 0.52,
  groundYRatio: 0.85,
} as const

export default function PowerAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 420 })
  const { font } = canvasSize
  const [showCriticalTip, setShowCriticalTip] = useState(false)
  const hasPausedRef = useRef(false)

  const mode = params.mode ?? 0
  const P_rated = params.P ?? 60000
  const m = params.m ?? 2000
  const f = params.f ?? 2000
  const a_target = params.a ?? 1.5
  const tMax = 30

  const trajectory = useMemo(() => {
    if (mode === 0) {
      return precomputeConstantPowerTrajectory(P_rated, m, f, tMax)
    } else {
      return precomputeConstantAccelTrajectory(P_rated, m, f, a_target, tMax).points
    }
  }, [mode, P_rated, m, f, a_target])

  const criticalInfo = useMemo(() => {
    if (mode === 0) return null
    return calculateConstantAccelParams(P_rated, m, f, a_target)
  }, [mode, P_rated, m, f, a_target])

  const state = useMemo(
    () => getPowerStateAtTime(trajectory, time),
    [trajectory, time]
  )

  useEffect(() => {
    if (time < 0.05) {
      hasPausedRef.current = false
      setShowCriticalTip(false)
    }
  }, [time])

  useEffect(() => {
    if (mode === 1 && criticalInfo && isPlaying) {
      const tc = criticalInfo.t_c
      if (time >= tc && !hasPausedRef.current) {
        hasPausedRef.current = true
        setIsPlaying(false)
        setShowCriticalTip(true)
        const timer = setTimeout(() => {
          setIsPlaying(true)
          setShowCriticalTip(false)
        }, 800)
        return () => clearTimeout(timer)
      }
    }
  }, [time, mode, criticalInfo, isPlaying, setIsPlaying])

  const maxV = mode === 0
    ? calculateConstantPowerParams(P_rated, m, f).v_max
    : calculateConstantAccelParams(P_rated, m, f, a_target).v_max

  const sMax = useMemo(() => {
    if (trajectory.length === 0) return 1
    return trajectory[trajectory.length - 1].s
  }, [trajectory])

  const padding = vp.visibleW * 0.06
  const scale = useMemo(() => {
    const trackWidth = vp.visibleW - 2 * padding - vp.visibleW * 0.08
    return sMax > 0 ? trackWidth / sMax : 1
  }, [vp.visibleW, padding, sMax])

  const getLiveFormula = () => {
    if (state.v < 0.05) return 'v=0'
    if (mode === 0) {
      return `F = \\frac{P}{v} = ${state.F.toFixed(0)}\\text{N}`
    }
    if (state.phase === 0) {
      return `F = ma + f = ${state.F.toFixed(0)}\\text{N}`
    } else if (state.phase === 1) {
      return `P = P_{\\text{额}} = ${(state.P / 1000).toFixed(0)}\\text{kW}`
    } else {
      return `F = f = ${f.toFixed(0)}\\text{N} \\quad (a=0)`
    }
  }

  const carX = Math.min(padding + state.s * scale, vp.visibleW - padding - vp.visibleW * 0.08)
  const groundY = vp.visibleH * POWER_LAYOUT.groundYRatio
  const objW = vp.visibleW * 0.08
  const objH = objW * 0.6

  const chartHeight = vp.visibleH * (POWER_LAYOUT.chartBottomRatio - POWER_LAYOUT.chartTopRatio)
  const sceneHeight = vp.visibleH * (1 - POWER_LAYOUT.dividerRatio)

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden flex flex-col">
      {showCriticalTip && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300">
          <div className="bg-accent-50 border-l-4 border-accent-500 text-accent-800 p-2.5 rounded-r shadow-md flex flex-col gap-0.5 max-w-[280px]">
            <span className="font-bold text-xs">🚀 匀加速阶段结束</span>
            <span className="text-accent-700 leading-snug" style={{ fontSize: font(9) }}>
              功率已达额定最大值！汽车开始进入恒功率变加速阶段，牵引力 F 随速度增大而变小。
            </span>
          </div>
        </div>
      )}

      {state.v > 0.05 && (
        <div
          className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
          style={{
            left: `${carX + objW * 0.5}px`,
            bottom: `${vp.visibleH - groundY + objH + 12}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <span style={{ fontSize: font(10) }}>
            <KatexFormula
              formula={getLiveFormula()}
              mode="inline"
              className="text-primary-700 font-semibold"
            />
          </span>
        </div>
      )}

      <div className="min-h-0 overflow-hidden" style={{ height: chartHeight }}>
        <PowerCharts
          trajectory={trajectory}
          currentTime={time}
          tMax={tMax}
          params={{ P: P_rated, m, f, a: a_target }}
          mode={mode as 0 | 1}
          criticalInfo={criticalInfo}
        />
      </div>

      <div className="w-full" style={{ height: 1 }}>
        <svg width={vp.visibleW} height={1}>
          <line
            x1={vp.visibleW * 0.03}
            y1={0.5}
            x2={vp.visibleW * 0.97}
            y2={0.5}
            stroke={colors.neutral[200]}
            strokeWidth={1}
          />
        </svg>
      </div>

      <div className="min-h-0" style={{ height: sceneHeight }}>
        <PowerScene
          state={state}
          params={{ P: P_rated, m, f, carType: params.carType, mode }}
          canvasSize={{ width: vp.visibleW, height: sceneHeight, font }}
          showVectors={showVectors}
          maxV={maxV}
          scale={scale}
          time={time}
        />
      </div>
    </div>
  )
}
