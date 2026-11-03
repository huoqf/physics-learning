import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { GRAVITY } from '@/physics/constants'
import {
  CONSECUTIVE_INTERVAL,
  PHOTOGATE_A_X_M,
  PHOTOGATE_B_X_M,
  SPRING_NATURAL_M,
  SPRING_MAX_MEASURABLE_EXTENSION_M,
  TRACK_MAX_M,
  FREEFALL_MAX_M,
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  countingPeriod,
  hookeSeries,
  isZeroInitialVelocityTape,
  readPhotogate,
  solveHooke,
  solveTrackMotion,
  tickerPeriod,
  verifyMechanicalEnergy,
  DIFF_METHOD_MIN_DOTS,
} from '@/physics/experimentMechanics'

/**
 * 高考力学实验基础 - 右屏物理量构建器。
 *
 * 与中屏场景（useMechanicsExperimentPhysics）共用 `@/physics/experimentMechanics`
 * 的运动学真源：小车行程受轨道末端挡块钳制，逐差法结果由纸带计数点反算，
 * 光电门读数口径与场景完全一致。
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
  const k = Number(params.k ?? 100)
  const m = Number(params.m ?? 0.2)

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

  if (mode === 1) {
    // 模式 1: 光电门测速（与中屏共用 readPhotogate，口径完全一致）
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
        { text: '光电门系统常结合气垫导轨进行动量守恒与动能定理验证', importance: 'gaokao' },
      ],
      warnings: endWarnings,
    }
  }

  // 模式 3: 验证机械能守恒（竖直自由下落打点）
  if (mode === 3) {
    const frictionPercent = Math.max(0, Math.min(100, Number(params.friction ?? 2)))
    const frictionRatio = frictionPercent / 100
    const aEffective = GRAVITY * (1 - frictionRatio)
    // 人教版口径：本实验取【连续打点】，T = T₀ = 0.02 s（不是逐差法的 5T₀）。
    // 选带判据「第 1、2 点间距≈2 mm = ½gT₀²」只有在 T₀ 下成立，两者必须同源。
    const countPeriod = countingPeriod(freq, CONSECUTIVE_INTERVAL)

    // 以米为单位生成纸带计数点（pxPerMeter = 1），与逐差法/中间时刻速度同源
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

    const fallHeight = solveTrackMotion({ v0: 0, a: aEffective, time, xMax: FREEFALL_MAX_M }).x
    // 选带判据直接取纸带上第 1、2 两个点的实测间距——与数据表同源。
    // （计数点即连续打点，故它就是课本说的「第 1、2 点间距」，无需另用 ½gT₀² 解析值兜底。）
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
        {
          label: '比对点序号',
          symbol: 'n',
          value: current.index,
          unit: '',
        },
        {
          label: '该点下落高度',
          symbol: 'hₙ',
          value: parseFloat(current.h.toFixed(3)),
          unit: 'm',
        },
        {
          label: '该点速度',
          symbol: 'vₙ',
          value: parseFloat(current.v.toFixed(3)),
          unit: 'm/s',
        },
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
        }
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
          note: '本实验取连续打点，T = T₀ = 0.02 s——与「第 1、2 点间距≈2 mm = ½gT₀²」的选带判据同源；求某一点的速度必须用它，逐差法求的是全程平均加速度，代不进这一点',
        },
        {
          name: '重力势能减少量',
          latex: '\\Delta E_p = mgh_n',
          level: 'core',
          note: 'hₙ 以纸带首点为零势能参考点，由纸带实测间距累加，不是按 ½gt² 算出来的',
        },
        {
          name: '动能增加量',
          latex: '\\Delta E_k = \\frac{1}{2}mv_n^2',
          level: 'core',
        },
      ],
      gaokaoPoints: [
        {
          text: '因纸带与限位孔摩擦、空气阻力，实测 a < g，故 ΔEₖ 恒略小于 ΔEₚ；差额即阻力做的功',
          importance: 'gaokao',
        },
        {
          text: '选带条件：第 1、2 点间距约 2 mm（= ½gT₀²），说明打首点时重物初速为零',
          importance: 'gaokao',
        },
        {
          text: '重物质量 m 在 ΔEₚ 与 ΔEₖ 中同时出现、可约去，故本实验不需要测质量',
          importance: 'gaokao',
        },
        {
          text: '本实验的计数点就是连续打点（T = 0.02 s），不要套用测加速度时「每 5 点取 1 个」的 0.1 s',
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
                text: `重物已落至 ${FREEFALL_MAX_M.toFixed(1)} m 处停止，纸带随之停止打点；末个计数点必早于落地点（真实实验同样如此）`,
                level: 'info' as const,
              },
            ]
          : []),
        ...(frictionPercent === 0
          ? [
              {
                text: '阻力已调为 0：这是理想工况，ΔEₖ 与 ΔEₚ 严格相等。真实纸带因摩擦必然略小，请对照预设「真实纸带」',
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

  // 模式 2: 胡克定律探究
  const hooke = solveHooke(m, k)
  // 与中屏图线同一口径：依次挂 1…6 个钩码，超出竖尺量程的后续点不画
  const hookeData = hookeSeries(m, k, 6, SPRING_MAX_MEASURABLE_EXTENSION_M)
  const measurableCount = hookeData.length

  return {
    quantities: [
      { label: '钩码重力', symbol: 'F', value: parseFloat(hooke.force.toFixed(2)), unit: 'N' },
      { label: '钩码质量', symbol: 'm', value: m, unit: 'kg' },
      { label: '弹簧劲度系数', symbol: 'k', value: k, unit: 'N/m' },
      {
        label: '弹簧伸长量',
        symbol: 'Δx',
        value: parseFloat(hooke.extension.toFixed(3)),
        unit: 'm',
      },
      { label: '弹簧自然长度', symbol: 'L₀', value: SPRING_NATURAL_M, unit: 'm' },
      {
        label: '弹簧总长',
        symbol: 'L',
        value: parseFloat((SPRING_NATURAL_M + hooke.extension).toFixed(3)),
        unit: 'm',
      },
      {
        label: '图线可测点数',
        symbol: 'N',
        value: measurableCount,
        unit: '个',
        highlight: measurableCount >= 3 ? 'positive' : undefined,
      },
    ],
    formulas: [
      {
        name: '胡克定律',
        latex: 'F = k \\Delta x',
        level: 'core',
        condition: '弹性限度内',
        note: '竖直悬挂时 F 取钩码重力 mg，Δx 为伸长量（不是弹簧总长 L）',
      },
      {
        name: '总长与伸长量的关系',
        latex: 'L = L_0 + \\Delta x = L_0 + \\frac{F}{k}',
        level: 'derived',
        note: '作图若用 L 作横轴，图线不过原点——横轴截距才是 L₀，斜率仍是 1/k',
      },
    ],
    gaokaoPoints: [
      { text: 'F-Δx 图线的斜率即为弹簧的劲度系数 k', importance: 'gaokao' },
      { text: '注意区分弹簧的总长度 L 与伸长量 Δx = L - L₀', importance: 'gaokao' },
      {
        text: '逐次增加钩码、多次测量后作图，比单次代入 F = kΔx 求 k 更能减小偶然误差',
        importance: 'gaokao',
      },
      {
        text: '图中每个数据点都是一次独立测量（挂 1、2、3… 个钩码）；场景演示挂单个钩码的那一次',
        importance: 'basic',
      },
    ],
    warnings: [
      ...(measurableCount < 3
        ? [
            {
              text: `当前 k = ${k} N/m、m = ${m} kg 下，挂到第 ${measurableCount + 1} 个钩码就会超出竖尺量程（${(SPRING_MAX_MEASURABLE_EXTENSION_M * 100).toFixed(1)} cm），图线只剩 ${measurableCount} 个点；减小钩码质量或增大 k 才能作出多点图线`,
              level: 'info' as const,
            },
          ]
        : []),
    ],
  }
}
