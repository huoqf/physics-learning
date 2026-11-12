import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { GRAVITY } from '@/physics/constants'
import {
  CONSECUTIVE_INTERVAL,
  FREEFALL_MAX_M,
  buildTapeCountingDots,
  countingPeriod,
  isZeroInitialVelocityTape,
  solveTrackMotion,
  verifyMechanicalEnergy,
} from '@/physics/experimentMechanics'

/**
 * 验证机械能守恒定律实验 —— 右屏物理量构建器
 */
export function buildExperimentMechanicalEnergyQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData {
  const freq = Number(params.freq ?? 50)
  const m = Number(params.m ?? 0.2)
  const frictionPercent = Math.max(0, Math.min(100, Number(params.friction ?? 2)))
  const frictionRatio = frictionPercent / 100
  const aEffective = GRAVITY * (1 - frictionRatio)
  const countPeriod = countingPeriod(freq, CONSECUTIVE_INTERVAL)

  const dotsInMeters = buildTapeCountingDots({
    v0: 0,
    a: aEffective,
    time,
    freq,
    countInterval: CONSECUTIVE_INTERVAL,
    pxPerMeter: 1,
    xMax: FREEFALL_MAX_M,
  })
  const points = verifyMechanicalEnergy({
    dotsPx: dotsInMeters,
    pxPerMeter: 1,
    countingPeriodS: countPeriod,
    mass: m,
    gravity: GRAVITY,
  })

  const fallHeight = solveTrackMotion({
    v0: 0,
    a: aEffective,
    time,
    xMax: FREEFALL_MAX_M,
  }).x
  const firstGapM = dotsInMeters.length >= 2 ? dotsInMeters[0] - dotsInMeters[1] : 0
  const firstTickerGapMm = firstGapM * 1000
  const zeroVelTape = dotsInMeters.length >= 2 && isZeroInitialVelocityTape(firstGapM)
  const current = [...points].reverse().find((p) => p.h <= fallHeight + 1e-9)

  const quantities: PhysicsQuantity[] = [
    { label: '计数周期', symbol: 'T', value: parseFloat(countPeriod.toFixed(3)), unit: 's' },
    {
      label: '纸带计数点数',
      symbol: 'N',
      value: dotsInMeters.length,
      unit: '个',
      highlight: dotsInMeters.length >= 3 ? 'positive' : undefined,
    },
    {
      label: '纸带实测加速度',
      symbol: 'a测',
      value: parseFloat(aEffective.toFixed(2)),
      unit: 'm/s²',
      highlight: frictionPercent > 0 ? 'positive' : undefined,
    },
    {
      label: '首打点间距',
      symbol: 's₁',
      value: dotsInMeters.length >= 2 ? parseFloat(firstTickerGapMm.toFixed(2)) : 0,
      unit: 'mm',
    },
    {
      label: '自由下落高度上限',
      symbol: 'H',
      value: FREEFALL_MAX_M,
      unit: 'm',
    },
  ]
  if (current) {
    quantities.push(
      { label: '比对点序号', symbol: 'n', value: current.index, unit: '' },
      { label: '该点下落高度', symbol: 'hₙ', value: parseFloat(current.h.toFixed(3)), unit: 'm' },
      { label: '该点速度', symbol: 'vₙ', value: parseFloat(current.v.toFixed(3)), unit: 'm/s' },
      {
        label: '重力势能减少',
        symbol: 'ΔEₚ',
        value: parseFloat(current.deltaEp.toFixed(4)),
        unit: 'J',
      },
      {
        label: '动能增加',
        symbol: 'ΔEₖ',
        value: parseFloat(current.deltaEk.toFixed(4)),
        unit: 'J',
      },
      {
        label: '相对偏差',
        symbol: 'δ',
        value: parseFloat((current.relDeviation * 100).toFixed(2)),
        unit: '%',
        highlight: Math.abs(current.relDeviation) < 1e-6 ? 'positive' : undefined,
      },
    )
  }

  return {
    quantities,
    formulas: [
      {
        name: '中间时刻瞬时速度',
        latex: 'v_n = \\frac{s_n + s_{n+1}}{2T}',
        level: 'core',
        condition: '匀变速直线运动中，某段时间中间时刻的瞬时速度等于该段平均速度',
        note: '本实验取连续打点，T = T₀ = 0.02 s，与「第 1、2 点间距≈2 mm = ½gT₀²」选带判据同源',
      },
      {
        name: '重力势能减少量',
        latex: '\\Delta E_p = mgh_n',
        level: 'core',
        note: 'hₙ 以纸带首点为零势能参考点，由纸带实测间距累加测量',
      },
      {
        name: '动能增加量',
        latex: '\\Delta E_k = \\frac{1}{2}mv_n^2',
        level: 'core',
      },
    ],
    gaokaoPoints: [
      {
        text: '因纸带与限位孔摩擦及空气阻力，实测 a < g，故 ΔEₖ 恒略小于 ΔEₚ；差额即阻力做的功',
        importance: 'gaokao',
      },
      {
        text: '选带条件：第 1、2 点间距约 2 mm（= ½gT₀²），说明打首点时重物初速度为零',
        importance: 'gaokao',
      },
      {
        text: '重物质量 m 在 ΔEₚ 与 ΔEₖ 中同时出现可约去，故验证实验无需用天平测量重物质量',
        importance: 'gaokao',
      },
      {
        text: '本实验采用连续打点计数周期 T = 0.02 s，注意与逐差法每 5 点取 1 个计数点 (T = 0.1 s) 区分',
        importance: 'gaokao',
      },
    ],
    warnings: [
      ...(zeroVelTape || dotsInMeters.length < 2
        ? []
        : [
            {
              text: `首打点间距 ${firstTickerGapMm.toFixed(2)} mm 偏离 2 mm 容差，该纸带不满足「初速为零」的选带条件`,
              level: 'info' as const,
            },
          ]),
      ...(fallHeight >= FREEFALL_MAX_M - 1e-9
        ? [
            {
              text: `重物已落至 ${FREEFALL_MAX_M.toFixed(1)} m 处停止，纸带随之停止打点`,
              level: 'info' as const,
            },
          ]
        : []),
      ...(frictionPercent === 0
        ? [
            {
              text: '阻力已调为 0（理想无阻工况），ΔEₖ 与 ΔEₚ 严格相等；真实实验因摩擦阻力 ΔEₖ 略小于 ΔEₚ',
              level: 'info' as const,
            },
          ]
        : []),
      ...(points.length === 0
        ? [
            {
              text: '计数点不足 3 个，暂无法逐点比对（需至少 3 个点才能求中间点的瞬时速度）',
              level: 'info' as const,
            },
          ]
        : []),
    ],
  }
}
