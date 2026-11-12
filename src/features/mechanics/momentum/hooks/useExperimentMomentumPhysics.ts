/**
 * useExperimentMomentumPhysics.ts
 * 气垫导轨验证动量守恒实验动画 view model：时空计算、图表采样与动量条映射
 *
 * 零 JSX，物理计算严格复用 @/physics/experimentMomentum（单一真源）
 */
import { useMemo } from 'react'
import { getPointsUpToTime } from '@/utils'
import {
  computeMomentumExperiment,
  momentumExperimentInputFromParams,
  experimentDurationFromResult,
  computeTrackSlidersAtTime,
} from '@/physics/experimentMomentum'

const EXP_MOMENTUM_BAR_MAX_LENGTH = 120

export function useExperimentMomentumPhysics(params: Record<string, number>, time: number) {
  const {
    m1_exp = 0.4,
    m2_exp = 0.2,
    v1_exp = 0.8,
    plateWidth_mm = 20.0,
    collisionType_exp = 0,
    timing_err = 0.0,
  } = params

  const experiment = useMemo(
    () =>
      computeMomentumExperiment(
        momentumExperimentInputFromParams({
          m1_exp,
          m2_exp,
          v1_exp,
          plateWidth_mm,
          collisionType_exp,
          timing_err,
        }),
      ),
    [m1_exp, m2_exp, v1_exp, plateWidth_mm, collisionType_exp, timing_err],
  )

  const expTMax = useMemo(() => experimentDurationFromResult(experiment), [experiment])

  const trackSliders = useMemo(
    () => computeTrackSlidersAtTime(time, experiment),
    [time, experiment],
  )

  const chartData = useMemo(() => {
    const expTCol = experiment.t_collision

    const currentDomainVtPoints1 = [
      { t: 0, v: experiment.v1 },
      { t: Math.max(0, expTCol - 0.001), v: experiment.v1 },
      { t: Math.min(expTMax, expTCol + 0.001), v: experiment.v1_after },
      { t: expTMax, v: experiment.v1_after },
    ]
    const currentDomainVtPoints2 = [
      { t: 0, v: 0 },
      { t: Math.max(0, expTCol - 0.001), v: 0 },
      { t: Math.min(expTMax, expTCol + 0.001), v: experiment.v2_after },
      { t: expTMax, v: experiment.v2_after },
    ]
    const currentDomainPtPoints1 = currentDomainVtPoints1.map((p) => ({
      t: p.t,
      v: experiment.m1 * p.v,
    }))
    const currentDomainPtPoints2 = currentDomainVtPoints2.map((p) => ({
      t: p.t,
      v: experiment.m2 * p.v,
    }))
    const currentDomainPtPointsTotal = [
      { t: 0, v: experiment.p_total_before },
      { t: expTMax, v: experiment.p_total_after },
    ]

    return {
      currentDomainVtPoints1,
      currentDomainVtPoints2,
      currentDomainPtPoints1,
      currentDomainPtPoints2,
      currentDomainPtPointsTotal,
      currentVtPoints1: getPointsUpToTime(currentDomainVtPoints1, time),
      currentVtPoints2: getPointsUpToTime(currentDomainVtPoints2, time),
      currentPtPoints1: getPointsUpToTime(currentDomainPtPoints1, time),
      currentPtPoints2: getPointsUpToTime(currentDomainPtPoints2, time),
      currentPtPointsTotal: getPointsUpToTime(currentDomainPtPointsTotal, time),
    }
  }, [experiment, expTMax, time])

  const p1 = time <= experiment.t_collision ? experiment.p1_before : experiment.p1_after_measured
  const p2 = time <= experiment.t_collision ? 0 : experiment.p2_after_measured
  const pTotal = experiment.p_total_before_measured
  const mapMomentumBar = (p: number) => (Math.abs(p) / 1.5) * EXP_MOMENTUM_BAR_MAX_LENGTH

  return {
    experiment,
    trackSliders,
    chartData,
    p1,
    p2,
    pTotal,
    tMax: expTMax,
    mapMomentumBar,
  }
}
