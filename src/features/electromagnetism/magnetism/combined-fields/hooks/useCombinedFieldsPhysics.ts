import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  PARTICLES,
  buildSpectrometerSimulation,
  buildCyclotronSimulation,
  buildDeflectSimulation,
  getPositionAt,
} from '../model/combinedFieldsModel'
import type { SpectrometerSimulation, CyclotronSimulation, DeflectSimulation, TrajectoryPoint, ParticleConstants } from '../model/combinedFieldsModel'

/** 与注册表 maxTime 一致，全局 time 范围 0~10 秒 */
export const MAX_TIME = 10

export interface CombinedFieldsPhysicsResult {
  activeStage: number
  E: number
  B1: number
  B2: number
  U: number
  showAngles: boolean
  p: ParticleConstants
  omegaAC: number
  spectrometer: SpectrometerSimulation
  cyclotron: CyclotronSimulation
  deflect: DeflectSimulation
  sim: SpectrometerSimulation | CyclotronSimulation | DeflectSimulation
  timeSec: number
  pos: TrajectoryPoint
  visibleTrajectory: TrajectoryPoint[]
  predictedPoints: { x: number; y: number }[]
  tailPoints: { x: number; y: number }[]
  historyPoints: { x: number; y: number }[]
}

export function useCombinedFieldsPhysics(): CombinedFieldsPhysicsResult {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  // ── 获取交互参数 ──
  const activeStage = params.mode ?? 0
  const E = params.electricE ?? 300
  const B1 = params.magneticB1 ?? 0.2
  const B2 = params.magneticB2 ?? 1.5
  const acFreqkHz = params.acFrequency ?? 24
  const U = (params.acVoltage ?? 5) * 1000 // kV → V
  const resonanceLock = !!(params.resonanceLock ?? 0)
  const particleType = params.particleType ?? 0
  const vParticle = params.vParticle ?? 1500
  const showAngles = !!(params.showAngles ?? 0)

  const p = PARTICLES[particleType] ?? PARTICLES[0]
  const omegaAC = 2 * Math.PI * (acFreqkHz * 1000)

  // ── 预计算仿真 ──
  const spectrometer = useMemo(() => {
    return buildSpectrometerSimulation(E, B1, B2, vParticle, particleType)
  }, [E, B1, B2, vParticle, particleType])

  const cyclotron = useMemo(() => {
    return buildCyclotronSimulation(B2, U, acFreqkHz * 1000, resonanceLock)
  }, [B2, U, acFreqkHz, resonanceLock])

  const deflect = useMemo(() => {
    return buildDeflectSimulation(E, B2, vParticle, particleType)
  }, [E, B2, vParticle, particleType])

  const sim = useMemo(() => {
    if (activeStage === 0) return spectrometer
    if (activeStage === 1) return cyclotron
    return deflect
  }, [activeStage, spectrometer, cyclotron, deflect])

  // 全局 time (0~MAX_TIME 秒) 归一化映射到物理时间 (0~sim.endTime 秒)
  const timeSec = useMemo(() => {
    return sim.endTime > 0 ? (time / MAX_TIME) * sim.endTime : 0
  }, [time, sim.endTime])

  const pos = useMemo(() => {
    return getPositionAt(sim.trajectory, timeSec)
  }, [sim.trajectory, timeSec])

  // ── 动态轨迹 ──
  const visibleTrajectory = useMemo(() => {
    return sim.trajectory.filter((pt) => pt.t <= timeSec)
  }, [sim.trajectory, timeSec])

  // 完整理论预测轨迹（全路径，用于底层虚线参考）
  const predictedPoints = useMemo(() => {
    return sim.trajectory.map((pt) => ({ x: pt.x, y: pt.y }))
  }, [sim.trajectory])

  // 短拖尾（取最近 8 个已走过的点，用于运动增强）
  const tailPoints = useMemo(() => {
    const tailLen = Math.min(8, visibleTrajectory.length)
    return visibleTrajectory.slice(-tailLen).map((pt) => ({ x: pt.x, y: pt.y }))
  }, [visibleTrajectory])

  // 历史轨迹点集（已走过的路径）
  const historyPoints = useMemo(() => {
    return visibleTrajectory.map((pt) => ({ x: pt.x, y: pt.y }))
  }, [visibleTrajectory])

  return {
    activeStage,
    E,
    B1,
    B2,
    U,
    showAngles,
    p,
    omegaAC,
    spectrometer,
    cyclotron,
    deflect,
    sim,
    timeSec,
    pos,
    visibleTrajectory,
    predictedPoints,
    tailPoints,
    historyPoints,
  }
}
