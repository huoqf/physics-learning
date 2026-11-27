/**
 * 等量电荷场线与对称轴分布模型 — 物理纯函数库（SI 单位）。
 * 无副作用，不依赖 React / DOM / window / Store。
 */

import { COULOMB_CONSTANT } from '../constants'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 探针沿对称轴扫描的默认演示总时长 (s) */
export const EQUAL_CHARGE_PLAY_DURATION = 6.0

/** 探针沿对称轴扫描的半程范围 (cm)：从 -8 cm 匀速扫至 +8 cm */
export const EQUAL_CHARGE_SCAN_HALF_CM = 8.0

/** 电荷组合类型：0=等量异种 (+Q, -Q)，1=等量同正 (+Q, +Q)，2=等量同负 (-Q, -Q) */
export type EqualChargeType = 0 | 1 | 2

/** 扫描对称轴：0=两电荷连线 (x 轴)，1=垂直平分线 (y 轴) */
export type EqualChargeAxis = 0 | 1

export interface EqualChargeConfig {
  /** 电荷组合：0=等量异种，1=等量同正，2=等量同负 */
  chargeType: number
  /** 观测轴线：0=两电荷连线，1=中垂线 */
  axis: number
  /** 单个场源电荷电量绝对值 (μC) */
  qMicroC: number
  /** 半间距 a (cm)，两电荷分别位于 x = -a 与 x = +a */
  halfSepCm: number
}

export interface EqualChargePair {
  chargeType: EqualChargeType
  axis: EqualChargeAxis
  q1C: number
  q2C: number
  aM: number
  halfSepCm: number
}

export interface EqualChargeFieldPoint {
  E1x: number
  E1y: number
  E2x: number
  E2y: number
  Ex: number
  Ey: number
  E: number
  phi: number
}

export interface EqualChargeAxisProfile {
  ePoints: Array<{ x: number; y: number }>
  phiPoints: Array<{ x: number; y: number }>
  eDomain: [number, number]
  phiDomain: [number, number]
  eComponentLabel: string
  yMaxCm: number
  eAtMidpointMV: number
  phiAtMidpointMV: number
  eAtExtremumMV: number
}

export interface EqualChargeSnapshot {
  sCm: number
  xM: number
  yM: number
  point: EqualChargeFieldPoint
  eSignedMV: number
  phiMV: number
  yMaxCm: number
  eAtMidpointMV: number
  phiAtMidpointMV: number
  eAtExtremumMV: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** 归一化电荷配置并返回 SI 单位电荷对 */
export function getEqualChargePair(config: EqualChargeConfig): EqualChargePair {
  const chargeType = (config.chargeType === 1 || config.chargeType === 2 ? config.chargeType : 0) as EqualChargeType
  const axis = (config.axis === 1 ? 1 : 0) as EqualChargeAxis
  const qMicroC = Math.max(0.5, config.qMicroC ?? 5)
  const halfSepCm = clamp(config.halfSepCm ?? 3, 1.5, 5.0)
  const aM = halfSepCm * 0.01
  const q1C = (chargeType === 2 ? -qMicroC : qMicroC) * 1e-6
  const q2C = (chargeType === 0 || chargeType === 2 ? -qMicroC : qMicroC) * 1e-6
  return { chargeType, axis, q1C, q2C, aM, halfSepCm }
}

/** 计算平面任意点 (xM, yM) 的分场强、合场强与电势（无穷远为零电势，标准物理系 y↑） */
export function evaluateEqualChargePoint(
  config: EqualChargeConfig,
  xM: number,
  yM: number,
  minDistM = 0.005,
): EqualChargeFieldPoint {
  const { q1C, q2C, aM } = getEqualChargePair(config)

  const dx1 = xM + aM
  const dy1 = yM
  const r1Raw = Math.hypot(dx1, dy1)
  const r1 = Math.max(minDistM, r1Raw)
  const ux1 = r1Raw > 1e-12 ? dx1 / r1Raw : 1
  const uy1 = r1Raw > 1e-12 ? dy1 / r1Raw : 0
  const e1Mag = (COULOMB_CONSTANT * Math.abs(q1C)) / (r1 * r1)
  const dir1 = q1C >= 0 ? 1 : -1
  const E1x = e1Mag * dir1 * ux1
  const E1y = e1Mag * dir1 * uy1

  const dx2 = xM - aM
  const dy2 = yM
  const r2Raw = Math.hypot(dx2, dy2)
  const r2 = Math.max(minDistM, r2Raw)
  const ux2 = r2Raw > 1e-12 ? dx2 / r2Raw : 1
  const uy2 = r2Raw > 1e-12 ? dy2 / r2Raw : 0
  const e2Mag = (COULOMB_CONSTANT * Math.abs(q2C)) / (r2 * r2)
  const dir2 = q2C >= 0 ? 1 : -1
  const E2x = e2Mag * dir2 * ux2
  const E2y = e2Mag * dir2 * uy2

  const Ex = E1x + E2x
  const Ey = E1y + E2y
  const E = Math.hypot(Ex, Ey)
  const phi = (COULOMB_CONSTANT * q1C) / r1 + (COULOMB_CONSTANT * q2C) / r2

  return { E1x, E1y, E2x, E2y, Ex, Ey, E, phi }
}

/**
 * 采样沿连线（axis=0）或中垂线（axis=1）的场强分量与电势分布曲线。
 * 单位：场强 MV/m（10⁶ N/C），电势 MV（10⁶ V）。
 */
export function sampleEqualChargeAxisProfile(
  config: EqualChargeConfig,
  samples = 160,
): EqualChargeAxisProfile {
  const { chargeType, axis, q1C, aM, halfSepCm } = getEqualChargePair(config)
  const qAbsC = Math.abs(q1C)
  const eRefMV = (COULOMB_CONSTANT * qAbsC) / (aM * aM) / 1e6
  const phiRefMV = (COULOMB_CONSTANT * qAbsC) / aM / 1e6

  const eCap = axis === 0 ? Math.max(20, 4.0 * eRefMV) : Math.max(4, 2.4 * eRefMV)
  const phiCap = axis === 0 ? Math.max(5, 3.6 * phiRefMV) : Math.max(2, 2.4 * phiRefMV)

  const ePoints: Array<{ x: number; y: number }> = []
  const phiPoints: Array<{ x: number; y: number }> = []

  for (let i = 0; i <= samples; i++) {
    const sCm = -EQUAL_CHARGE_SCAN_HALF_CM + (2 * EQUAL_CHARGE_SCAN_HALF_CM * i) / samples
    if (axis === 0) {
      const pt = evaluateEqualChargePoint(config, sCm * 0.01, 0, 0.0045)
      ePoints.push({ x: sCm, y: clamp(pt.Ex / 1e6, -eCap, eCap) })
      phiPoints.push({ x: sCm, y: clamp(pt.phi / 1e6, -phiCap, phiCap) })
    } else {
      const pt = evaluateEqualChargePoint(config, 0, sCm * 0.01, 0.005)
      const eCompMV = (chargeType === 0 ? pt.Ex : pt.Ey) / 1e6
      ePoints.push({ x: sCm, y: clamp(eCompMV, -eCap, eCap) })
      phiPoints.push({ x: sCm, y: clamp(pt.phi / 1e6, -phiCap, phiCap) })
    }
  }

  const maxAbsE = Math.max(1e-3, ...ePoints.map((p) => Math.abs(p.y)))
  let eDomain: [number, number]
  if (axis === 1 && chargeType === 0) {
    eDomain = [0, +(maxAbsE * 1.15).toFixed(2)]
  } else {
    const bound = +(maxAbsE * 1.1).toFixed(2)
    eDomain = [-bound, bound]
  }

  const maxAbsPhi = Math.max(1e-3, ...phiPoints.map((p) => Math.abs(p.y)))
  let phiDomain: [number, number]
  if (axis === 1 && chargeType === 0) {
    phiDomain = [-1, 1]
  } else if (chargeType === 1) {
    phiDomain = [0, +(maxAbsPhi * 1.15).toFixed(2)]
  } else if (chargeType === 2) {
    phiDomain = [+(-maxAbsPhi * 1.15).toFixed(2), 0]
  } else {
    const bound = +(maxAbsPhi * 1.1).toFixed(2)
    phiDomain = [-bound, bound]
  }

  const yMaxCm = halfSepCm * Math.SQRT1_2
  const midPt = evaluateEqualChargePoint(config, 0, 0, 0.005)
  const extPt = evaluateEqualChargePoint(config, 0, yMaxCm * 0.01, 0.005)

  const eComponentLabel =
    axis === 0
      ? 'Eₓ / (MV/m)'
      : chargeType === 0
        ? 'Eₓ / (MV/m)'
        : 'Eᵧ / (MV/m)'

  return {
    ePoints,
    phiPoints,
    eDomain,
    phiDomain,
    eComponentLabel,
    yMaxCm,
    eAtMidpointMV: midPt.E / 1e6,
    phiAtMidpointMV: midPt.phi / 1e6,
    eAtExtremumMV: extPt.E / 1e6,
  }
}

/** 计算给定播放时刻 t ∈ [0, 6] s 的探针坐标、场强与电势快照 */
export function computeEqualChargeSnapshot(
  config: EqualChargeConfig,
  time: number,
): EqualChargeSnapshot {
  const { chargeType, axis, halfSepCm } = getEqualChargePair(config)
  const frac = clamp(time, 0, EQUAL_CHARGE_PLAY_DURATION) / EQUAL_CHARGE_PLAY_DURATION
  const sCm = -EQUAL_CHARGE_SCAN_HALF_CM + 2 * EQUAL_CHARGE_SCAN_HALF_CM * frac
  const xM = axis === 0 ? sCm * 0.01 : 0
  const yM = axis === 1 ? sCm * 0.01 : 0

  const point = evaluateEqualChargePoint(config, xM, yM, 0.0045)
  const eSignedMV =
    axis === 0
      ? point.Ex / 1e6
      : chargeType === 0
        ? point.Ex / 1e6
        : point.Ey / 1e6
  const phiMV = point.phi / 1e6

  const yMaxCm = halfSepCm * Math.SQRT1_2
  const midPt = evaluateEqualChargePoint(config, 0, 0, 0.005)
  const extPt = evaluateEqualChargePoint(config, 0, yMaxCm * 0.01, 0.005)

  return {
    sCm,
    xM,
    yM,
    point,
    eSignedMV,
    phiMV,
    yMaxCm,
    eAtMidpointMV: midPt.E / 1e6,
    phiAtMidpointMV: midPt.phi / 1e6,
    eAtExtremumMV: extPt.E / 1e6,
  }
}

/** 计算等量电荷场线模型的关键播放时刻（严格落在 0.01s 网格上且严格升序） */
export function getEqualChargeCriticalTimes(
  params: Record<string, number> = {},
): CriticalTimePoint[] {
  const chargeType = params.chargeType ?? 0
  const axis = params.axis ?? 0
  const halfSepCm = clamp(params.halfSepCm ?? 3, 1.5, 5.0)

  const tMid = alignCriticalTime(EQUAL_CHARGE_PLAY_DURATION / 2, 'nearest')
  const tEnd = alignCriticalTime(EQUAL_CHARGE_PLAY_DURATION, 'before')

  if (axis === 0) {
    return [
      { time: tMid, label: '经过连线中点 O', variant: 'info' },
      { time: tEnd, label: '到达右端终点', variant: 'critical', autoPause: true },
    ]
  }

  if (chargeType === 0) {
    return [
      { time: tMid, label: '经过中点 O（场强最大）', variant: 'info' },
      { time: tEnd, label: '到达上端终点', variant: 'critical', autoPause: true },
    ]
  }

  const yExt = clamp(halfSepCm * Math.SQRT1_2, 0.5, 7.0)
  const tLow = alignCriticalTime(
    (EQUAL_CHARGE_PLAY_DURATION * (-yExt + EQUAL_CHARGE_SCAN_HALF_CM)) /
      (2 * EQUAL_CHARGE_SCAN_HALF_CM),
    'nearest',
  )
  const tHigh = alignCriticalTime(
    (EQUAL_CHARGE_PLAY_DURATION * (yExt + EQUAL_CHARGE_SCAN_HALF_CM)) /
      (2 * EQUAL_CHARGE_SCAN_HALF_CM),
    'nearest',
  )

  return [
    { time: tLow, label: '下侧场强极大点', variant: 'info' },
    { time: tMid, label: '中点 O（合场强为 0）', variant: 'warning' },
    { time: tHigh, label: '上侧场强极大点', variant: 'info' },
    { time: tEnd, label: '到达上端终点', variant: 'critical', autoPause: true },
  ]
}
