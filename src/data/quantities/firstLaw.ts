/**
 * 热力学第一定律物理量看板数据构建。
 */
import { calculateSandboxState, calculateCycleState } from '../../physics/firstLaw'
import { FIRST_LAW_COLORS, THERMO_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, Formula, GaokaoPoint, WarningItem } from './types'

export function buildFirstLawQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-first-law') return null

  const mode = params.mode ?? 0
  const W_input = params.W ?? 0
  const Q_input = params.Q ?? 0
  const adiabatic = params.adiabatic ?? 0

  // 1. 获取物理状态
  const state = mode === 1
    ? calculateCycleState(time)
    : calculateSandboxState(W_input, Q_input, adiabatic === 1)

  const { P, V, T, W, Q, deltaU, currentStepIndex } = state

  // 单位转换：V (m³ -> L), P (Pa -> kPa)
  const V_L = V * 1000
  const P_kPa = P / 1000

  // 2. 构造看板展示的物理量
  const quantities = [
    {
      label: '外界做功',
      symbol: 'W',
      value: W.toFixed(0),
      unit: 'J',
      color: FIRST_LAW_COLORS.work,
      highlight: W > 0 ? ('positive' as const) : W < 0 ? ('negative' as const) : ('zero' as const)
    },
    {
      label: '吸收热量',
      symbol: 'Q',
      value: Q.toFixed(0),
      unit: 'J',
      color: FIRST_LAW_COLORS.heat,
      highlight: Q > 0 ? ('positive' as const) : Q < 0 ? ('negative' as const) : ('zero' as const)
    },
    {
      label: '内能增量',
      symbol: 'ΔU',
      value: deltaU.toFixed(0),
      unit: 'J',
      color: FIRST_LAW_COLORS.internalEnergy,
      highlight: deltaU > 0 ? ('positive' as const) : deltaU < 0 ? ('negative' as const) : ('zero' as const)
    },
    {
      label: '当前压强',
      symbol: 'p',
      value: P_kPa.toFixed(1),
      unit: 'kPa',
      color: THERMO_COLORS.pressure
    },
    {
      label: '当前体积',
      symbol: 'V',
      value: V_L.toFixed(2),
      unit: 'L',
      color: THERMO_COLORS.volume
    },
    {
      label: '当前温度',
      symbol: 'T',
      value: T.toFixed(0),
      unit: 'K',
      color: THERMO_COLORS.temperature
    }
  ]

  // 3. 根据状态生成动态公式、考点与警告
  let formulas: Formula[] = [
    {
      name: '热力学第一定律',
      latex: '\\Delta U = W + Q',
      level: 'core',
      condition: '一切热力学过程均为能量守恒',
    }
  ]

  let gaokaoPoints: GaokaoPoint[] = [
    { text: '正负号铁律：外界对气体做功 W>0，气体对外界做功 W<0；气体吸热 Q>0，气体放热 Q<0；内能增加 ΔU>0，内能减少 ΔU<0。', importance: 'gaokao' },
    { text: '【高考经典母题】缓慢加热等压膨胀：气体吸热 Q=500J，膨胀对外做功 W_气=240J (W=-240J)，由 ΔU = W + Q 得内能增加 ΔU=260J。', importance: 'gaokao' },
    { text: '改变内能的两种方式：做功和热传递对改变内能是等效的。', importance: 'core' }
  ]

  let warnings: WarningItem[] = [
    { text: '公式中 W 是外界对系统做的功，若题干给出“气体克服外界做功”，代入时必须取负号！', level: 'danger' }
  ]

  if (mode === 1) {
    // 顺时针循环热机模式
    const stepsInfo: { name: string; formula: Formula; point: string; warning: string }[] = [
      {
        name: '① 等容加热升压 (A→B)',
        formula: { name: '查理定律 & 等容无功', latex: '\\frac{p}{T}=C,\\ W = 0', level: 'important', condition: '体积 V 恒定，活塞锁定' },
        point: '等容吸热过程中，因体积不变，外界做功 W = 0。吸收的热量 Q 全部用于增加气体的内能 ΔU，温度与压强急剧升高。',
        warning: '等容过程 W 严格为 0，ΔU = Q。这是计算热机吸热的第一步！'
      },
      {
        name: '② 等压膨胀做功 (B→C)',
        formula: { name: '盖-吕萨克定律 & 做功', latex: '\\frac{V}{T}=C,\\ W = -p\\Delta V', level: 'important', condition: '压强 p 保持恒定不变' },
        point: '高压等压膨胀中，气体对外界做大量正功 (外界功 W < 0)。气体继续吸收热量 (Q > 0) 并升温，这是热机对外输出机械功的核心过程。',
        warning: '等压膨胀中，气体吸收的热量一部分用于增加内能，另一部分用于对外输出做功！'
      },
      {
        name: '③ 等容冷却降压 (C→D)',
        formula: { name: '查理定律 & 等容无功', latex: '\\frac{p}{T}=C,\\ W = 0', level: 'important', condition: '体积 V 恒定，活塞锁定' },
        point: '等容降压过程中，外界做功 W = 0。气体向低温冷源放出热量 (Q < 0)，内能减少 (ΔU < 0)，温度与压强回落。',
        warning: '等容放热降压使工质回到低压状态，为下一阶段低温压缩做准备。'
      },
      {
        name: '④ 等压压缩回程 (D→A)',
        formula: { name: '盖-吕萨克定律 & 做功', latex: '\\frac{V}{T}=C,\\ W = -p\\Delta V', level: 'important', condition: '压强 p 保持恒定不变' },
        point: '低压等压压缩中，外界消耗较小的功将气体压回初态体积 (W > 0)。全循环一周：高压膨胀对外做的功大于低压压缩外界输入的功，净输出正功等于 p-V 闭合矩形面积！',
        warning: '全循环净输出正功 W_out = 100 J，全周期内能净变化 ΔU = 0，净吸热 Q_net = 100 J。'
      }
    ]

    const curStep = stepsInfo[currentStepIndex ?? 0]
    formulas.push(curStep.formula)
    gaokaoPoints.push({ text: `当前阶段【${curStep.name}】：${curStep.point}`, importance: 'gaokao' as const })
    warnings.push({ text: curStep.warning, level: 'warning' as const })

  } else {
    // 沙箱探索模式
    formulas.push({
      name: '理想气体内能',
      latex: '\\Delta U = n C_V \\Delta T',
      level: 'important',
      condition: '定容热容下温度与内能呈线性关系'
    })
    formulas.push({
      name: '沙箱过程分解',
      latex: '\\Delta U_1 = Q\\ (\\text{等容传热}),\\quad \\Delta U_2 = W\\ (\\text{绝热做功})',
      level: 'derived',
      condition: 'W、Q 先按等容换热、再按绝热做功依次施加，合计 ΔU = Q + W'
    })

    if (adiabatic === 1) {
      formulas.push({
        name: '绝热过程',
        latex: 'Q = 0 \\Rightarrow \\Delta U = W',
        level: 'important',
        condition: '绝热气缸，无热量交换'
      })
      gaokaoPoints.push({
        text: '绝热膨胀/压缩：Q = 0。外界压缩气体做功则内能增加（温度升高）；气体膨胀做功则内能减少（温度降低）。',
        importance: 'hard'
      })
      gaokaoPoints.push({
        text: '【高考图像必考辨析】绝热线比等温线更陡！过同一起点，绝热线斜率绝对值为等温线的 γ 倍 (γ=1.67)。压缩时绝热压强高于等温，膨胀时绝热压强低于等温。',
        importance: 'gaokao'
      })
      warnings.push({
        text: '绝热压缩时温度必定升高！“绝热”并不等于“等温”，这是高频易错题！',
        level: 'warning'
      })
    } else {
      gaokaoPoints.push({
        text: '结合理想气体状态方程 pV = nRT，通过判断 P、V、T 的变化，进而判定 W、Q、ΔU 的正负号。',
        importance: 'gaokao'
      })
    }
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings,
  }
}
