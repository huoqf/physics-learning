/**
 * 能量守恒定律与能源 —— 右屏看板数据构建。
 *
 * 与中屏共用 `@/physics/energyFlow` 的同一批纯函数：账本口径、效率定义、
 * 势能换算全部同源，禁止在此处再写一遍公式。
 */
import { ENERGY_COLORS } from '@/theme/physics'
import {
  dispatchStorageDay,
  hydraulicEnergyJ,
  pumpedStorageCycle,
  type StorageDispatchResult,
} from '@/physics/energyFlow'
import type { PhysicsPanelData } from './types'

const GJ = 1e9

export function buildEnergyConservationQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-energy-flow') return null

  const mode = params.scene ?? 0
  const pvPeakKW = params.pv ?? 200
  const loadPeakKW = params.load ?? 90
  const capacityKWh = params.cap ?? 400
  const headM = params.head ?? 120
  const volumeWanM3 = params.vol ?? 8
  const fuelEff = (params.fuelEff ?? 30) / 100
  const evEff = (params.evEff ?? 85) / 100

  if (mode === 1) {
    const cycle = pumpedStorageCycle({
      volumeM3: volumeWanM3 * 1e4,
      headM,
      pumpEfficiency: 0.88,
      turbineEfficiency: 0.9,
    })
    return {
      quantities: [
        { label: '上下库落差', symbol: 'h', value: headM.toFixed(0), unit: 'm' },
        { label: '单次提升水量', symbol: 'V', value: volumeWanM3.toFixed(1), unit: '万m³' },
        {
          label: '上库重力势能',
          symbol: 'Eₚ',
          value: (cycle.potentialJ / GJ).toFixed(2),
          unit: 'GJ',
          color: ENERGY_COLORS.potentialEnergy,
        },
        {
          label: '抽水耗电',
          symbol: 'W抽',
          value: (cycle.pumpInputJ / GJ).toFixed(2),
          unit: 'GJ',
          color: ENERGY_COLORS.work,
        },
        {
          label: '发电输出',
          symbol: 'W发',
          value: (cycle.turbineOutputJ / GJ).toFixed(2),
          unit: 'GJ',
          color: ENERGY_COLORS.kineticEnergy,
        },
        {
          label: '往返效率',
          symbol: 'η',
          value: (cycle.roundTripEfficiency * 100).toFixed(1),
          unit: '%',
          color: ENERGY_COLORS.heatLoss,
          highlight: cycle.roundTripEfficiency < 0.8 ? 'positive' : undefined,
        },
      ],
      formulas: [
        {
          name: '上库储存的重力势能',
          latex: 'E_p = \\rho V g h',
          level: 'core',
          condition: '水体整体提升 h，忽略管道内水头损失',
        },
        {
          name: '往返效率（抽水 × 发电）',
          latex: '\\eta = \\eta_1 \\eta_2 = \\dfrac{W_发}{W_抽}',
          level: 'core',
          condition: '同一循环内进出水量相同，不含蒸发与渗漏',
        },
        {
          name: '抽水耗电（注意除以 η）',
          latex: 'W_抽 = \\dfrac{\\rho V g h}{\\eta_1}',
          level: 'important',
          condition: 'η₁ 为电能转势能的效率，效率小于 1 时耗电必然大于势能增量',
        },
      ],
      gaokaoPoints: [
        {
          text: '抽水蓄能是"电能 ⇄ 重力势能"的储能方式：把谷电变成势能存起来，峰时再发回电网，本质是能量的时间搬运。',
          importance: 'gaokao',
        },
        {
          text: '往返效率约 70%~80%：用 4 度电只能发回约 3 度。它不"造能"，价值在于削峰填谷、调频备用与消纳新能源。',
          importance: 'gaokao',
        },
        {
          text: '算耗电时效率要"除以"而不是"乘以"：W_抽 = Eₚ/η₁，写反是最常见的失分点。',
          importance: 'hard',
        },
      ],
      warnings: [
        {
          text: '常见错误：把 η 乘在耗电上。效率 < 1 时，耗电一定【大于】势能增量，乘上去反而让耗电变小，量纲对了物理错了。',
          level: 'danger',
        },
        {
          text: '抽水蓄能不违反能量守恒，也不违反热力学第二定律——它消耗了电能（做功），才把水"搬"回高处。',
          level: 'warning',
        },
      ],
    }
  }

  if (mode === 2) {
    const INPUT_MJ = 100
    const fuelUseful = INPUT_MJ * fuelEff
    const evUseful = INPUT_MJ * evEff
    return {
      quantities: [
        { label: '燃油车有用效率', symbol: 'η燃', value: (fuelEff * 100).toFixed(0), unit: '%' },
        {
          label: '电动车有用效率',
          symbol: 'η电',
          value: (evEff * 100).toFixed(0),
          unit: '%',
          color: ENERGY_COLORS.kineticEnergy,
        },
        {
          label: '燃油车有用功',
          symbol: 'W燃',
          value: fuelUseful.toFixed(0),
          unit: 'MJ',
          color: ENERGY_COLORS.mechanicalEnergy,
        },
        {
          label: '电动车有用功',
          symbol: 'W电',
          value: evUseful.toFixed(0),
          unit: 'MJ',
          color: ENERGY_COLORS.mechanicalEnergy,
        },
        {
          label: '燃油车废热',
          symbol: 'Q放',
          value: (INPUT_MJ - fuelUseful).toFixed(0),
          unit: 'MJ',
          color: ENERGY_COLORS.heatLoss,
          highlight: 'positive',
        },
        {
          label: '同样输入的功差',
          symbol: 'ΔW',
          value: (evUseful - fuelUseful).toFixed(0),
          unit: 'MJ',
          color: ENERGY_COLORS.power,
        },
      ],
      formulas: [
        {
          name: '能量守恒（两种车都成立）',
          latex: 'E_{入} = W_{有用} + Q_{废热}',
          level: 'core',
          condition: '封闭系统，输入能量全部转化为有用功与耗散的热',
        },
        {
          name: '效率定义',
          latex: '\\eta = \\dfrac{W_{有用}}{E_{入}} \\times 100\\%',
          level: 'core',
          condition: '有用功与输入能量取同一时间段',
        },
        {
          name: '燃油车效率链',
          latex: '\\eta = \\eta_{发动机} \\cdot \\eta_{传动}',
          level: 'important',
          condition: '串联环节的效率相乘，任一环节差都会拖累总效率',
        },
      ],
      gaokaoPoints: [
        {
          text: '能量守恒定律是自然界最普遍的规律：能量既不会消灭也不会创生，只会从一种形式转化为另一种形式。两种车都遵守它。',
          importance: 'gaokao',
        },
        {
          text: '电动车效率高（约 80%~90%），燃油车只有 25%~35%——差别不在"守恒不守恒"，而在"有用功占多大比例"。',
          importance: 'gaokao',
        },
        {
          text: '"省油"与"省能"是两个概念：效率高不等于总能耗低，还要看电能本身是怎么发出来的（火电仍要烧煤）。',
          importance: 'hard',
        },
      ],
      warnings: [
        {
          text: '陷阱：认为"电动车效率高所以不守恒"或"燃油车效率低所以能量消失了"。效率低只是废热多，总能量一分不少。',
          level: 'danger',
        },
        {
          text: '本页的损失分配（排气 45%、冷却 30%、摩擦 25%）是示意比例，不是实测标定；真实数值随工况大幅变化。',
          level: 'info',
        },
      ],
    }
  }

  const day: StorageDispatchResult = dispatchStorageDay({
    pvPeakKW,
    loadPeakKW,
    capacityKWh,
    chargeEfficiency: 0.95,
    dischargeEfficiency: 0.95,
    initialSOC: 0.2,
  })
  const potential = hydraulicEnergyJ(volumeWanM3 * 1e4, headM)

  return {
    quantities: [
      { label: '光伏峰值功率', symbol: 'P峰', value: pvPeakKW.toFixed(0), unit: 'kW', color: ENERGY_COLORS.power },
      { label: '负荷峰值功率', symbol: 'P负', value: loadPeakKW.toFixed(0), unit: 'kW' },
      {
        label: '光伏日发电量',
        symbol: 'E光',
        value: day.pvEnergyKWh.toFixed(0),
        unit: 'kWh',
        color: ENERGY_COLORS.power,
      },
      {
        label: '全天负荷用电',
        symbol: 'E负',
        value: day.loadEnergyKWh.toFixed(0),
        unit: 'kWh',
        color: ENERGY_COLORS.kineticEnergy,
      },
      {
        label: '电网补电量',
        symbol: 'E网',
        value: day.gridImportKWh.toFixed(0),
        unit: 'kWh',
        color: ENERGY_COLORS.work,
      },
      {
        label: '弃光量',
        symbol: 'E弃',
        value: day.curtailKWh.toFixed(0),
        unit: 'kWh',
        color: ENERGY_COLORS.heatLoss,
        highlight: day.curtailKWh > 1 ? 'positive' : 'zero',
      },
      {
        label: '充放电损耗',
        symbol: 'E损',
        value: day.lossKWh.toFixed(0),
        unit: 'kWh',
        color: ENERGY_COLORS.heatLoss,
      },
      {
        label: '新能源自给率',
        symbol: 'η自',
        value: (day.selfSufficiency * 100).toFixed(0),
        unit: '%',
        color: ENERGY_COLORS.potentialEnergy,
      },
    ],
    formulas: [
      {
        name: '能量守恒（一日账本）',
        latex: 'E_{光伏} + E_{电网} = E_{负荷} + E_{弃光} + E_{损耗} + \\Delta E_{储能}',
        level: 'core',
        condition: '统计时段内进出系统的每一支都要落账，缺一支账就不平',
      },
      {
        name: '储能往返效率',
        latex: '\\eta = \\eta_{充} \\cdot \\eta_{放}',
        level: 'core',
        condition: '一次完整充放循环，锂电池电站典型值约 90%',
      },
      {
        name: '抽水蓄能的理论上限',
        latex: 'E_p = \\rho V g h',
        level: 'supplementary',
        condition: `本页参数对应的势能约 ${(potential / GJ).toFixed(2)} GJ，用于理解"储能存的是能量不是功率"`,
      },
    ],
    gaokaoPoints: [
      {
        text: '光伏出力随日照变化、负荷有早晚双峰，两者天然错配——这是新型电力系统必须配储能的原因，也是"能量守恒"在工程中的直接体现。',
        importance: 'gaokao',
      },
      {
        text: '储能不产生能量，只搬运能量：充电、放电各有一次损耗，往返效率必然小于 1。',
        importance: 'gaokao',
      },
      {
        text: '弃光同样是能量守恒的一部分：没被利用的光伏电能变成了环境中的内能，不是"消失"了。',
        importance: 'hard',
      },
      {
        text: '能量守恒定律的普适性：从机械运动到电磁、热、化学、核反应，无一例外。',
        importance: 'core',
      },
    ],
    warnings: [
      {
        text: '陷阱：把"储能装机容量（kWh）"和"充放功率（kW）"混为一谈。容量决定能存多少，功率决定充放多快。',
        level: 'danger',
      },
      {
        text: '自给率不是效率：它衡量的是"负荷里有多少由新能源供上"，与充放电效率是两个不同的口径。',
        level: 'warning',
      },
      {
        text: day.curtailKWh > 1
          ? `当前参数下弃光 ${day.curtailKWh.toFixed(0)} kWh：电池容量不足，富余光伏无处可存。调大容量即可看到弃光归零。`
          : '当前参数下几乎不弃光：储能容量足以吸纳午间富余。把容量调小可复现"弃光"现象。',
        level: 'info',
      },
    ],
  }
}
