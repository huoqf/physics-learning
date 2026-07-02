import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { colors } from '@/theme/colors'
import {
  precomputeConstantKETrajectory,
  precomputeCurvedTrackTrajectory,
  getKEStateAtTime,
} from '@/physics/kineticEnergy'
import { KineticEnergyCharts } from './KineticEnergyCharts'
import { KineticEnergyScene } from './KineticEnergyScene'

const KE_LAYOUT = {
  chartTopRatio: 0.03,
  chartBottomRatio: 0.48,
  dividerRatio: 0.52,
  groundYRatio: 0.85,
} as const

export default function KineticEnergyAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 400 })
  const { font } = canvasSize
  const [showCriticalTip, setShowCriticalTip] = useState(false)
  const hasPausedRef = useRef(false)

  const mode = params.mode ?? 0
  const m = params.m ?? 2
  const v0 = params.v0 ?? 0
  const F_pull = params.F ?? 15
  const s_target = params.s ?? 6
  const R = params.R ?? 5
  const mu = params.mu ?? 0.15
  const tMax = 15

  const { points: trajectory, t_c, v_c, x_max, scale } = useMemo(() => {
    const paddingVal = vp.visibleW * 0.06
    const rightPadding = vp.visibleW * 0.048
    const gY = vp.visibleH * KE_LAYOUT.groundYRatio
    const max_pixel_dist = vp.visibleW - paddingVal - rightPadding
    const max_pixel_height = gY - vp.visibleH * KE_LAYOUT.dividerRatio - 24

    if (mode === 0) {
      const x_end = s_target * 1.6
      const scaleVal = max_pixel_dist / x_end
      const res = precomputeConstantKETrajectory(m, v0, F_pull, s_target, x_end)
      return { points: res.points, t_c: res.t_c, v_c: res.v_c, x_max: x_end, scale: scaleVal }
    } else {
      const scaleVal = max_pixel_height / R
      const x_end = R * 2.0
      const res = precomputeCurvedTrackTrajectory(m, v0, R, mu, x_end)
      return { points: res.points, t_c: res.t_c, v_c: res.v_c, x_max: x_end, scale: scaleVal }
    }
  }, [mode, m, v0, F_pull, s_target, R, mu, vp.visibleW, vp.visibleH])

  const state = useMemo(
    () => getKEStateAtTime(trajectory, time),
    [trajectory, time]
  )

  useEffect(() => {
    if (time < 0.05) {
      hasPausedRef.current = false
      setShowCriticalTip(false)
    }
  }, [time])

  useEffect(() => {
    if (isPlaying && t_c > 0.1) {
      if (time >= t_c && !hasPausedRef.current) {
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
  }, [time, t_c, isPlaying, setIsPlaying])

  const chartHeight = vp.visibleH * (KE_LAYOUT.chartBottomRatio - KE_LAYOUT.chartTopRatio)
  const sceneHeight = vp.visibleH * (1 - KE_LAYOUT.dividerRatio)

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden flex flex-col">
      {showCriticalTip && (
        <div
          className="absolute bg-accent-50 border border-accent-200 rounded px-3 py-2 shadow-sm pointer-events-none z-10"
          style={{
            left: '50%',
            top: '20%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '320px',
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-accent-800">
              {mode === 0 ? '🚀 恒力加速作用结束' : '🎢 物块已滑至水平面'}
            </span>
            <span className="text-accent-700 leading-snug" style={{ fontSize: font(9) }}>
              {mode === 0
                ? '拉力已撤去！累计做的拉力功刚好完全等于物块增加的动能（W = ΔEk）。此后物块做匀速运动。'
                : '物块已到达圆弧底端！重力做的正功与摩擦力做的负功之和（合力总功）刚好完全等于物块动能的变化量（W总 = ΔEk）。此后做匀速运动。'}
            </span>
          </div>
        </div>
      )}

      <div className="min-h-0 overflow-hidden" style={{ height: chartHeight }}>
        <KineticEnergyCharts
          trajectory={trajectory}
          currentTime={time}
          tMax={tMax}
          xMax={x_max}
          mode={mode as 0 | 1}
          params={{ m, F: F_pull, s: s_target, R }}
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
        <KineticEnergyScene
          state={state}
          params={{ m, v0, F: F_pull, s: s_target, R, mu, mode }}
          canvasSize={{ width: vp.visibleW, height: sceneHeight, font }}
          showVectors={showVectors}
          v_c={v_c}
          scale={scale}
          time={time}
        />
      </div>
    </div>
  )
}
