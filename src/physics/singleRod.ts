/**
 * 电磁感应单杆模型解析计算。
 *
 * 约定：导体棒沿光滑水平导轨向右运动，匀强磁场垂直纸面向里。
 * 本文件只包含纯物理计算，无 React/DOM/window 依赖，返回普通可序列化对象。
 */

import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

export type SingleRodMode = 'constantForce' | 'initialVelocity'

export interface SingleRodParams {
  /** 启动方式：恒力启动 / 初速度释放 */
  mode: SingleRodMode
  /** 恒定外力，单位：N，仅 constantForce 有效 */
  driveForce: number
  /** 初速度，单位：m/s，仅 initialVelocity 有效 */
  initialVelocity: number
  /** 磁感应强度，单位：T */
  magneticB: number
  /** 导轨间距/导体棒有效长度，单位：m */
  railSpacing: number
  /** 回路总电阻，单位：Ω */
  resistance: number
  /** 导体棒质量，单位：kg */
  rodMass: number
}

export interface SingleRodState {
  /** 时间，单位：s */
  time: number
  /** 位移，单位：m */
  x: number
  /** 速度，单位：m/s */
  v: number
  /** 加速度，单位：m/s² */
  a: number
  /** 动生电动势，单位：V */
  emf: number
  /** 感应电流，单位：A */
  current: number
  /** 安培力大小，单位：N，方向阻碍运动 */
  ampereForce: number
  /** 外力，单位：N */
  externalForce: number
  /** 电荷量，单位：C */
  charge: number
  /** 外力做功，单位：J */
  workExternal: number
  /** 焦耳热，单位：J */
  jouleHeat: number
  /** 动能，单位：J */
  kineticEnergy: number
  /** 收尾速度，单位：m/s；初速度释放模式为 0 */
  terminalVelocity: number
  /** 电磁阻尼系数 k = B²L²/R，单位：N·s/m */
  dampingK: number
}

const EPS = 1e-9

function safePositive(value: number, fallback: number): number {
  return value > EPS ? value : fallback
}

/**
 * 计算电磁感应单杆在指定时刻的解析状态。
 *
 * @param params 单杆模型参数，单位见 SingleRodParams
 * @param time 时间，单位：s
 * @returns 指定时刻的运动、电磁与能量状态
 */
export function getSingleRodState(params: SingleRodParams, time: number): SingleRodState {
  const t = Math.max(0, time)
  const B = safePositive(Math.abs(params.magneticB), 0.1)
  const L = safePositive(params.railSpacing, 0.1)
  const R = safePositive(params.resistance, 0.1)
  const m = safePositive(params.rodMass, 0.01)
  const dampingK = (B * B * L * L) / R
  const tauFactor = dampingK / m

  let v = 0
  let x = 0
  let a = 0
  let externalForce = 0
  let terminalVelocity = 0
  let charge = 0
  let workExternal = 0
  let jouleHeat = 0

  if (params.mode === 'constantForce') {
    externalForce = Math.max(0, params.driveForce)
    terminalVelocity = externalForce / dampingK
    const decay = Math.exp(-tauFactor * t)
    v = terminalVelocity * (1 - decay)
    x = terminalVelocity * t - (terminalVelocity / tauFactor) * (1 - decay)
    a = (externalForce - dampingK * v) / m
    charge = B * L * x / R
    workExternal = externalForce * x
    const kineticEnergy = 0.5 * m * v * v
    jouleHeat = Math.max(0, workExternal - kineticEnergy)
  } else {
    const v0 = Math.max(0, params.initialVelocity)
    const decay = Math.exp(-tauFactor * t)
    v = v0 * decay
    x = (v0 / tauFactor) * (1 - decay)
    a = -(dampingK * v) / m
    terminalVelocity = 0
    charge = (m * (v0 - v)) / (B * L)
    workExternal = 0
    const initialKineticEnergy = 0.5 * m * v0 * v0
    const kineticEnergy = 0.5 * m * v * v
    jouleHeat = Math.max(0, initialKineticEnergy - kineticEnergy)
  }

  const emf = B * L * v
  const current = emf / R
  const ampereForce = dampingK * v
  const kineticEnergy = 0.5 * m * v * v

  return {
    time: t,
    x,
    v,
    a,
    emf,
    current,
    ampereForce,
    externalForce,
    charge,
    workExternal,
    jouleHeat,
    kineticEnergy,
    terminalVelocity,
    dampingK,
  }
}

/**
 * 电磁感应单杆模型（anim-induction-single-rod）临界时刻列表：
 * 给出弛豫时间常数 τ 与基本收尾稳态 3τ（v 完成 95% 演化）。
 */
export function getSingleRodCriticalTimes(
  params: Record<string, number>,
  maxTime = 12,
): CriticalTimePoint[] {
  const B = safePositive(Math.abs(params.magneticB ?? 1.2), 0.1)
  const L = safePositive(params.railSpacing ?? 0.8, 0.1)
  const R = safePositive(params.resistance ?? 1.5, 0.1)
  const m = safePositive(params.rodMass ?? 0.2, 0.01)

  const k = (B * B * L * L) / R
  const tau = m / k
  const isConstForce = (params.startMechanism ?? 0) === 0
  const events: CriticalTimePoint[] = []

  const t1 = alignCriticalTime(tau, 'nearest')
  if (t1 > 0 && t1 <= maxTime) {
    events.push({
      time: t1,
      label: '特征时间 τ（演化 63.2%）',
      variant: 'info',
      autoPause: false,
    })
  }
  const t3 = alignCriticalTime(3 * tau, 'nearest')
  if (t3 > t1 && t3 <= maxTime) {
    events.push({
      time: t3,
      label: isConstForce ? '⚡ 基本达收尾速度 (3τ)' : '⚡ 阻尼基本停稳 (3τ)',
      variant: 'critical',
      autoPause: false,
    })
  }
  return events
}
