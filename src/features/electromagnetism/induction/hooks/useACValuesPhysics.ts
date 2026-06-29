import { useMemo, useCallback } from 'react'
import {
  getTheoreticalThermalState,
  checkEquivalence,
  getEffectiveCurrent,
  isNearPeriodEnd,
} from '@/physics/rmsCalculator'
import type { WaveformType } from '@/physics/rmsCalculator'

export const WAVEFORM_MAP: Record<number, WaveformType> = {
  0: 'sine',
  1: 'square',
  2: 'pulse',
  3: 'half_sine',
}

export const VISUAL_PERIOD = 2
export const INITIAL_TEMP = 20
export const MAX_TEMP = 80

export interface ACValuesParams {
  waveformIdx: number
  Im: number
  R: number
  Idc: number
  duty: number
  time: number
  isPlaying: boolean
}

export interface ACValuesPhysicsResult {
  waveformType: WaveformType
  state: ReturnType<typeof getTheoreticalThermalState>
  isSuccess: boolean
  atPeriodEnd: boolean
  iNow: number
  power_ac: number
  power_dc: number
  gaugeMax: number
  maxT: number
  iAxisRange: number
  maxQ: number
  wavePoints: Array<{ t: number; v: number }>
  getInstantaneousCurrent: (time: number) => number
}

export function useACValuesPhysics(
  params: ACValuesParams,
): ACValuesPhysicsResult {
  const { waveformIdx, Im, R, Idc, duty, time: t } = params

  const waveformType = WAVEFORM_MAP[waveformIdx] ?? 'sine'

  const state = useMemo(
    () => getTheoreticalThermalState(t, {
      type: waveformType,
      Im,
      R,
      period: VISUAL_PERIOD,
      dcCurrent: Idc,
      duty,
    }),
    [waveformType, Im, R, Idc, duty, t]
  )

  const isSuccess = checkEquivalence(Idc, state.I_eff, t, VISUAL_PERIOD)
  const atPeriodEnd = isNearPeriodEnd(t, VISUAL_PERIOD) && t > 0.1

  const getInstantaneousCurrent = useCallback(
    (time: number): number => {
      const omega = (2 * Math.PI) / VISUAL_PERIOD
      switch (waveformType) {
        case 'sine':
          return Im * Math.sin(omega * time)
        case 'square':
          return Im * (time % VISUAL_PERIOD < VISUAL_PERIOD / 2 ? 1 : -1)
        case 'pulse': {
          const D = Math.min(0.95, Math.max(0.05, duty))
          return Im * (time % VISUAL_PERIOD < D * VISUAL_PERIOD ? 1 : 0)
        }
        case 'half_sine': {
          const tRem = time % VISUAL_PERIOD
          return tRem < VISUAL_PERIOD / 2 ? Im * Math.sin(omega * time) : 0
        }
        default:
          return 0
      }
    },
    [waveformType, Im, duty]
  )

  const iNow = getInstantaneousCurrent(t)
  const power_ac = iNow * iNow * R
  const power_dc = Idc * Idc * R

  const gaugeMax = useMemo(() => {
    const I_eff = getEffectiveCurrent({
      type: waveformType, Im, R, period: VISUAL_PERIOD, dcCurrent: Idc, duty,
    })
    return Math.max(I_eff * I_eff * R * 2 * VISUAL_PERIOD, 1)
  }, [waveformType, Im, R, duty, Idc])

  const maxT = Math.max(t, VISUAL_PERIOD * 2)
  const iAxisRange = Math.max(Im * 1.25, Math.abs(Idc) * 1.25, 1)

  const maxQ = useMemo(() => {
    const currentMax = Math.max(state.Q_ac, state.Q_dc, 1)
    return Math.max(currentMax * 1.2, gaugeMax * 0.05)
  }, [state.Q_ac, state.Q_dc, gaugeMax])

  const wavePoints = useMemo(() => {
    const samples = 240
    return Array.from({ length: samples + 1 }, (_, i) => {
      const ti = (maxT * i) / samples
      return { t: ti, v: getInstantaneousCurrent(ti) }
    })
  }, [maxT, getInstantaneousCurrent])

  return {
    waveformType,
    state,
    isSuccess,
    atPeriodEnd,
    iNow,
    power_ac,
    power_dc,
    gaugeMax,
    maxT,
    iAxisRange,
    maxQ,
    wavePoints,
    getInstantaneousCurrent,
  }
}
