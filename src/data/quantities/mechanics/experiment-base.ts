import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import {
  PHOTOGATE_A_X_M,
  PHOTOGATE_B_X_M,
  TRACK_MAX_M,
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  countingPeriod,
  readPhotogate,
  solveTrackMotion,
  tickerPeriod,
  DIFF_METHOD_MIN_DOTS,
} from '@/physics/experimentMechanics'

/**
 * 力学实验基础：纸带与光电门 - 右屏物理量构建器。
 *
 * 与中屏场景共用 `@/physics/experimentMechanics` 运动学真源。
 */
export function buildMechanicsExperimentBaseQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number
): PhysicsPanelData | null {
  const mode = Number(params.mode || 0)
  const v0 = Number(params.v0 ?? 1.0)
  const a = Number(params.a ?? 1.5)
  const freq = Number(params.freq ?? 50)
  const d = Number(params.d ?? 0.01)

  // 与中屏同源的运动学解（含末端挡块钳制）
  const motion = solveTrackMotion({ v0, a, time, xMax: TRACK_MAX_M })
  const x = motion.x
  const v = motion.v

  // 到达轨道末端后的状态提示（位移/速度不再增长，避免学生误以为读数出错）
  const endWarnings = motion.reachedEnd
    ? [
        {
          text: `小车已抵达轨道末端挡块（行程 ${TRACK_MAX_M.toFixed(2)} m），位移与速度不再增长`,
          level: 'warning' as const,
        },
      ]
    : []

  if (mode === 0) {
    // 模式 0: 打点纸带分析（逐差法）
    const tickPeriod = tickerPeriod(freq)
    const countPeriod = countingPeriod(freq)
    // 以米为单位的计数点位置，交由同一逐差法函数反算加速度（pxPerMeter = 1）
    const dotsInMeters = buildTapeCountingDots({
      v0,
      a,
      time,
      freq,
      pxPerMeter: 1,
      xMax: TRACK_MAX_M,
    })
    const measuredAcceleration = calcDiffMethodAcceleration(dotsInMeters, 1, countPeriod)

    const quantities: PhysicsQuantity[] = [
      { label: '打点周期', symbol: 'T₀', value: parseFloat(tickPeriod.toFixed(3)), unit: 's' },
      { label: '计数周期', symbol: 'T', value: parseFloat(countPeriod.toFixed(3)), unit: 's' },
      { label: '实时速度', symbol: 'v', value: parseFloat(v.toFixed(2)), unit: 'm/s' },
      { label: '实时位移', symbol: 'x', value: parseFloat(x.toFixed(2)), unit: 'm' },
      { label: '设定加速度', symbol: 'a', value: parseFloat(a.toFixed(2)), unit: 'm/s²' },
    ]
    if (measuredAcceleration !== null) {
      quantities.push({
        label: '逐差法测得加速度',
        symbol: 'a测',
        value: parseFloat(measuredAcceleration.toFixed(3)),
        unit: 'm/s²',
        highlight: 'positive',
      })
    }

    return {
      quantities,
      formulas: [
        {
          name: '逐差法求加速度',
          latex: 'a = \\frac{(x_6 - x_3) - (x_3 - x_0)}{9T^2}',
          level: 'core',
          condition: '匀变速直线运动打点纸带',
          note: 'T 为计数周期（每 5 个打点取 1 个计数点，T = 5T₀ = 0.10 s），切勿代入打点周期 0.02 s',
        },
        {
          name: '中间时刻瞬时速度',
          latex: 'v_n = \\frac{x_n + x_{n+1}}{2T}',
          level: 'core',
          note: 'T 同为计数周期',
        },
      ],
      gaokaoPoints: [
        { text: '区分连续相等时间间隔内的位移差 Δx = aT²', importance: 'gaokao' },
        { text: '逐差法可减小实验偶发误差，避免首尾点测量误差放大', importance: 'gaokao' },
      ],
      warnings: [
        ...(measuredAcceleration === null
          ? [
              {
                text: `逐差法需 ${DIFF_METHOD_MIN_DOTS} 个计数点（运动时间 ≥ ${(
                  (DIFF_METHOD_MIN_DOTS - 1) * countPeriod
                ).toFixed(2)} s），当前仅 ${dotsInMeters.length} 个`,
                level: 'info' as const,
              },
            ]
          : []),
        ...endWarnings,
      ],
    }
  }

    // 光电门测速（mode === 1）
    const gateA = readPhotogate({ x, v0, a, d, gateX: PHOTOGATE_A_X_M })
    const gateB = readPhotogate({ x, v0, a, d, gateX: PHOTOGATE_B_X_M })

    return {
      quantities: [
        { label: '遮光条宽度', symbol: 'd', value: d, unit: 'm' },
        {
          label: '光电门A遮光时间',
          symbol: 'Δt₁',
          value: parseFloat(gateA.dtMs.toFixed(2)),
          unit: 'ms',
        },
        {
          label: '光电门B遮光时间',
          symbol: 'Δt₂',
          value: parseFloat(gateB.dtMs.toFixed(2)),
          unit: 'ms',
        },
        {
          label: '光电门A测得速度',
          symbol: 'v₁',
          value: parseFloat(gateA.velocity.toFixed(3)),
          unit: 'm/s',
        },
        {
          label: '光电门B测得速度',
          symbol: 'v₂',
          value: parseFloat(gateB.velocity.toFixed(3)),
          unit: 'm/s',
        },
      ],
      formulas: [
        {
          name: '极短时间平均速度替代瞬时速度',
          latex: 'v = \\frac{d}{\\Delta t}',
          level: 'core',
          condition: 'd 足够窄，使 Δt 内的平均速度近似等于遮光条中心的瞬时速度',
        },
        {
          name: '光电门测加速度',
          latex: 'v_2^2 - v_1^2 = 2as',
          level: 'core',
        },
      ],
      gaokaoPoints: [
        { text: '遮光条越窄，极短时间内的平均速度越接近瞬时速度', importance: 'gaokao' },
        { text: '光电门系统常结合气垫导轨进行速度及加速度精确测量', importance: 'gaokao' },
      ],
      warnings: endWarnings,
    }
}
