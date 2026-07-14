/**
 * useChargeInEFieldCharts.ts — 带电粒子在匀强电场中运动：图表数据 hook
 *
 * 从 ChargeInEField.tsx 拆分：速度/能量序列数据与 Y 轴范围。
 */
import { useMemo } from 'react'
import { ChartDataSeries } from '@/components/Chart'
import {
  PLATE_GAP,
  PARTICLE_MASS,
} from './useChargeInEFieldPhysics'

// ── Hook 参数 ──

export interface ChargeInEFieldChartsParams {
  points: Array<{
    t: number; x: number; y: number
    vx: number; vy: number
    ax: number; ay: number
  }>
  v0: number
  U: number
  q: number
  freq: number
  isAC: number
  phi0: number
  useGravity: number
  tSim: number
  tEnd: number
}

// ── Hook 返回值 ──

export interface ChargeInEFieldChartsResult {
  vtPoints: Array<{ t: number; v: number }>
  vxSeries: ChartDataSeries[]
  chartYBounds: { min: number; max: number }
  energyData: {
    ekPoints: Array<{ t: number; v: number }>
    epPoints: Array<{ t: number; v: number }>
    egPoints: Array<{ t: number; v: number }>
    etotPoints: Array<{ t: number; v: number }>
  }
  energySeries: ChartDataSeries[]
  energyYBounds: { min: number; max: number }
}

export function useChargeInEFieldCharts(
  p: ChargeInEFieldChartsParams,
): ChargeInEFieldChartsResult {
  const { points, v0, U, q, freq, isAC, phi0, useGravity } = p

  // 1. 速度图像数据
  const vtPoints = useMemo(() => {
    return points.map((p) => ({ t: p.t, v: p.vy }))
  }, [points])

  const vxSeries = useMemo(() => {
    return [
      {
        points: points.map((p) => ({ t: p.t, v: p.vx })),
        domainPoints: points.map((p) => ({ t: p.t, v: p.vx })),
        label: 'vₓ (水平分速度)',
        series: 'secondary' as const,
      },
    ]
  }, [points])

  const chartYBounds = useMemo(() => {
    const vys = points.map((p) => p.vy)
    const maxV = Math.max(...vys, v0, 5)
    const minV = Math.min(...vys, -5)
    const range = maxV - minV
    return {
      min: minV - range * 0.15 - 1,
      max: maxV + range * 0.15 + 1,
    }
  }, [points, v0])

  // 2. 能量图像数据 (以毫焦 mJ 为单位)
  const energyData = useMemo(() => {
    const T = freq > 0 ? 1 / freq : 0.02
    const tStart = phi0 * T

    const ekPoints = points.map((p) => ({
      t: p.t,
      v: 0.5 * PARTICLE_MASS * (p.vx * p.vx + p.vy * p.vy) * 1000,
    }))

    const epPoints = points.map((p) => {
      const phase = isAC === 1 ? ((p.t + tStart) % T) / T : 0
      const fieldSign = isAC === 1 ? (phase < 0.5 ? 1 : -1) : 1
      const Ep = -q * 1e-6 * (U / PLATE_GAP) * fieldSign * p.y * 1000
      return { t: p.t, v: Ep }
    })

    const egPoints = points.map((p) => ({
      t: p.t,
      v: useGravity === 1 ? -PARTICLE_MASS * 9.8 * p.y * 1000 : 0,
    }))

    const etotPoints = points.map((p, idx) => ({
      t: p.t,
      v: ekPoints[idx].v + epPoints[idx].v + egPoints[idx].v,
    }))

    return { ekPoints, epPoints, egPoints, etotPoints }
  }, [points, U, q, freq, isAC, phi0, useGravity])

  const energySeries = useMemo(() => {
    const seriesList: ChartDataSeries[] = [
      {
        points: energyData.epPoints,
        domainPoints: energyData.epPoints,
        label: '电势能 Eₚ',
        series: 'secondary' as const,
      },
    ]

    if (useGravity === 1) {
      seriesList.push({
        points: energyData.egPoints,
        domainPoints: energyData.egPoints,
        label: '重力势能 E_g',
        series: 'success' as const,
      })
    }

    seriesList.push({
      points: energyData.etotPoints,
      domainPoints: energyData.etotPoints,
      label: '总能量 E_总',
      series: 'accent' as const,
    })

    return seriesList
  }, [energyData, useGravity])

  const energyYBounds = useMemo(() => {
    const vals = [
      ...energyData.ekPoints.map((p) => p.v),
      ...energyData.epPoints.map((p) => p.v),
      ...energyData.etotPoints.map((p) => p.v),
    ]
    if (useGravity === 1) {
      vals.push(...energyData.egPoints.map((p) => p.v))
    }
    const maxVal = Math.max(...vals, 1)
    const minVal = Math.min(...vals, -1)
    const range = maxVal - minVal
    return {
      min: minVal - range * 0.15 - 0.2,
      max: maxVal + range * 0.15 + 0.2,
    }
  }, [energyData, useGravity])

  return {
    vtPoints,
    vxSeries,
    chartYBounds,
    energyData,
    energySeries,
    energyYBounds,
  }
}
