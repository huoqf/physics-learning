import { calculateOhmLaw, calculateClosedCircuit } from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function handleDcCircuits(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-ohm-law': {
      const mode = params.mode ?? 0 // 0=定值电阻, 1=小灯泡
      const U = params.U ?? 2
      const R = params.R ?? 10 // 仅在定值电阻模式有效

      let I = 0
      let P = 0
      let R_eff = R

      if (mode === 0) {
        // 定值电阻模式
        const res = calculateOhmLaw(U, R)
        I = res.I
        P = U * I
        R_eff = R
      } else {
        // 小灯泡模式：R = 5 + 2 * U
        R_eff = 5 + 2 * U
        I = U / R_eff
        P = U * I
      }

      return {
        quantities: [
          ...base,
          {
            label: '瞬时电流 I',
            symbol: 'I',
            value: I.toFixed(3),
            unit: 'A',
            color: PHYSICS_COLORS.electricCurrent, // 电流红
            highlight: 'extreme',
          },
          {
            label: '元件电功率 P',
            symbol: 'P',
            value: P.toFixed(3),
            unit: 'W',
            color: PHYSICS_COLORS.power, // 功率黄
            highlight: 'extreme',
          },
        ],
        formulas: [
          {
            name: '欧姆定律',
            latex: 'I = \\frac{U}{R}',
            level: 'core',
            condition: '适用于纯电阻电路',
          },
          {
            name: '电功率公式',
            latex: 'P = UI',
            level: 'core',
          },
        ],
        gaokaoPoints: [
          {
            text: '【斜率的物理意义】伏安特性曲线（U-I图）的斜率物理意义：在 U-I 图中（y轴为U，x轴为I），斜率 k = R；而在 I-U 图中（y轴为I，x轴为U），斜率 k = 1/R。在做题时务必看清坐标轴。',
            importance: 'gaokao',
          },
          {
            text: '【非线性元件分析】小灯泡是典型的非线性元件。随着电压升高，钨丝温度升高，其电阻值也随之增大。在 I-U 图中，图线会向电压轴弯曲（斜率减小，即阻值增大）。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '易错点：误认为小灯泡在电压为 0 时电阻为 0。实际上，灯泡在不通电时仍具有"冷态电阻"（本例中约为 5 Ω）。',
            level: 'warning',
          },
          {
            text: '易错点：混淆"工作点与原点连线的斜率"与"切线斜率"。对于非线性元件，某状态下的电阻值（静阻值） R = U/I 只能通过该点与原点的连线斜率计算，不能用切线斜率（动态电阻）代替。',
            level: 'danger',
          },
        ],
      }
    }
    case 'anim-circuit-analysis': {
      const U = params.U ?? 12
      const R1 = params.R1 ?? 20 // 定值电阻 R1
      const R2 = params.R2 ?? 10 // 滑动变阻器 R2
      const R3 = params.R3 ?? 30 // 并联定值电阻 R3 (仅混联有效)
      
      const mode = params.mode ?? 0 // 0=基础, 1=进阶
      const subMode = params.subMode ?? 0 // 0=串联, 1=并联 (仅基础有效)

      let Rtotal = 0
      let Itotal = 0
      let U1 = 0
      let U2 = 0 // 电压表测量 R2 两端电压
      let I1 = 0
      let I2 = 0
      let I3 = 0 // 混联模式下 R3 电流

      let topoName = ''

      if (mode === 0) {
        // ── 基础模式 ──
        if (subMode === 0) {
          // 串联电路
          topoName = '基础：串联电路'
          Rtotal = R1 + R2
          Itotal = Rtotal > 0 ? U / Rtotal : 0
          I1 = I2 = Itotal
          U1 = I1 * R1
          U2 = I2 * R2
        } else {
          // 并联电路
          topoName = '基础：并联电路'
          // 避免除以 0，当 R2 = 0 时视为短路 (用 0.01 欧姆近似)
          const R2_eff = R2 > 0 ? R2 : 0.01
          Rtotal = (R1 * R2_eff) / (R1 + R2_eff)
          Itotal = U / Rtotal
          I1 = U / R1
          I2 = U / R2_eff
          U1 = U2 = U
        }
      } else {
        // ── 进阶混联模式 ──
        // R1 串联在干路，R2 与 R3 并联
        topoName = '进阶：混联电路'
        const R2_eff = R2 > 0 ? R2 : 0.001
        const R_parallel = (R2_eff * R3) / (R2_eff + R3)
        Rtotal = R1 + R_parallel
        Itotal = U / Rtotal
        U1 = Itotal * R1
        U2 = U - U1 // 并联部分分压
        I3 = U2 / R3
        I2 = R2 > 0 ? U2 / R2 : Itotal // 短路时电流全过变阻器
        I1 = Itotal
      }

      return {
        quantities: [
          ...base,
          { label: '当前拓扑', value: topoName, unit: '' },
          { 
            label: '等效总电阻', 
            symbol: 'R_总', 
            value: Rtotal, 
            unit: 'Ω', 
            highlight: R2 === 100 ? 'extreme' : (R2 === 0 && mode === 0 && subMode === 1 ? 'zero' : undefined)
          },
          { 
            label: '干路总电流', 
            symbol: 'I_总', 
            value: Itotal, 
            unit: 'A', 
            color: PHYSICS_COLORS.electricCurrent,
            highlight: R2 === 0 ? 'extreme' : undefined
          },
          { 
            label: '电压表读数', 
            symbol: 'U_V', 
            value: U2, 
            unit: 'V', 
            color: PHYSICS_COLORS.electricPotential,
            highlight: R2 === 0 ? 'zero' : (R2 === 100 ? 'extreme' : undefined)
          },
          { label: 'R₁ 两端电压', symbol: 'U₁', value: U1, unit: 'V' },
          { label: 'R₁ 流经电流', symbol: 'I₁', value: I1, unit: 'A' },
          { label: 'R₂ 流经电流', symbol: 'I₂', value: I2, unit: 'A' },
          ...(mode === 1 ? [{ label: 'R₃ 流经电流', symbol: 'I₃', value: I3, unit: 'A' }] : []),
        ],
        formulas: [
          {
            name: '欧姆定律',
            latex: 'I = \\frac{U}{R}',
            level: 'core' as const,
            condition: '适用于纯电阻电路',
          },
          ...(mode === 0 && subMode === 0 ? [
            {
              name: '串联分压比例',
              latex: '\\frac{U_1}{U_2} = \\frac{R_1}{R_2}',
              level: 'core' as const,
              condition: '串联电路中电流相等',
            }
          ] : []),
          ...(mode === 0 && subMode === 1 ? [
            {
              name: '并联分流比例',
              latex: '\\frac{I_1}{I_2} = \\frac{R_2}{R_1}',
              level: 'core' as const,
              condition: '并联电路中电压相等',
            }
          ] : []),
          ...(mode === 1 ? [
            {
              name: '混联总电阻',
              latex: 'R_{总} = R_1 + \\frac{R_2 R_3}{R_2 + R_3}',
              level: 'core' as const,
              condition: 'R1与并联部分串联',
            }
          ] : []),
        ],
        gaokaoPoints: [
          {
            text: '【秒杀核心：串反并同】与变化的电阻串联的元件，其电流/电压变化相反；并联的元件则相同。',
            importance: 'gaokao',
          },
          {
            text: '【动态分析基本链条】局部电阻变化 → 总电阻变化 → 干路电流变化 → 定值电阻分压变化 → 支路分配变化。',
            importance: 'gaokao',
          },
          {
            text: '【极限思维法】将变阻器阻值置于两端（0 或 100Ω），可以快速推导电表读数的极值和定性偏转趋势。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '易错点：在并联或混联中，滑动变阻器电阻 R₂ 增大时，盲目认为总电阻减小。切记：任何一个电阻增大，总等效电阻必定增大。',
            level: 'danger',
          },
          {
            text: '易错点：孤立看待局部支路。混联中 R₂ 增大导致干路电流减小，使得 R₁ 分压减小，从而把更多的电压"让给"并联支路，导致电压表读数增大。',
            level: 'warning',
          },
        ],
        mnemonic: '串反并同，整体到局部，极限秒杀',
      }
    }
    case 'anim-closed-circuit': {
      const EMF = params.EMF ?? 6
      const r = params.r ?? 2
      const R = params.R ?? 10
      const { I, U_terminal, P_output, P_total, eta } = calculateClosedCircuit(EMF, r, R)
      const U_internal = I * r
      const P_internal = I * I * r

      return {
        quantities: [
          ...base,
          {
            label: '电动势',
            symbol: 'E',
            value: EMF.toFixed(1),
            unit: 'V',
            color: PHYSICS_COLORS.emf,
          },
          {
            label: '干路电流',
            symbol: 'I',
            value: I.toFixed(3),
            unit: 'A',
            color: PHYSICS_COLORS.electricCurrent,
            highlight: 'extreme',
          },
          {
            label: '路端电压',
            symbol: 'U外',
            value: U_terminal.toFixed(2),
            unit: 'V',
            color: PHYSICS_COLORS.electricPotential,
          },
          {
            label: '内电压',
            symbol: 'U内',
            value: U_internal.toFixed(2),
            unit: 'V',
            color: PHYSICS_COLORS.positiveCharge,
          },
          {
            label: '输出功率',
            symbol: 'P出',
            value: P_output.toFixed(2),
            unit: 'W',
            color: PHYSICS_COLORS.power,
            highlight: R === r ? 'extreme' : undefined,
          },
          {
            label: '内耗功率',
            symbol: 'P内',
            value: P_internal.toFixed(2),
            unit: 'W',
            color: PHYSICS_COLORS.internalEnergy,
          },
          {
            label: '总功率',
            symbol: 'P总',
            value: P_total.toFixed(2),
            unit: 'W',
            color: PHYSICS_COLORS.mechanicalEnergy,
          },
          {
            label: '电源效率',
            symbol: 'η',
            value: (eta * 100).toFixed(1),
            unit: '%',
            color: PHYSICS_COLORS.work,
            highlight: R === r ? 'extreme' : undefined,
          },
        ],
        formulas: [
          {
            name: '闭合电路欧姆定律',
            latex: 'I = \\frac{E}{R + r}',
            level: 'core',
            condition: '适用于含有内阻的闭合单回路纯电阻电路',
          },
          {
            name: '路端电压关系',
            latex: 'U_{\\text{外}} = E - Ir',
            level: 'core',
          },
          {
            name: '电源输出功率',
            latex: 'P_{\\text{出}} = I^2 R = \\frac{E^2 R}{(R + r)^2}',
            level: 'core',
          },
          {
            name: '能量分配守恒',
            latex: 'P_{\\text{总}} = P_{\\text{出}} + P_{\\text{内}} \\implies EI = UI + I^2r',
            level: 'core',
          },
        ],
        gaokaoPoints: [
          {
            text: '【U-I 图像几何性质】路端电压与电流关系图像中，纵轴截距为电动势 E，横轴截距为短路电流 I_短 = E/r，斜率绝对值即为电源内阻 r。',
            importance: 'gaokao',
          },
          {
            text: '【电源输出功率极值】当外电阻 R 等于内电阻 r 时，电源的输出功率达到最大值 P_max = E² / (4r)，此时电源的传输效率刚好为 50%。',
            importance: 'gaokao',
          },
          {
            text: '【波峰平移验证规律】当电源内阻 r 增大时，P_出-R 图像的最大输出功率波峰将向右移动且峰值变小；内阻 r 减小时波峰向左移动且峰值变大。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '易错点：极易混淆电源总功率（EI）、输出功率（UI）和内耗热功率（I²r）。分析功与能转化时，务必先分清是"电源内部"还是"外电路"。',
            level: 'danger',
          },
          {
            text: '易错点：误认为外电阻 R 越大，电源输出功率就越大。实际上，当 R > r 时，输出功率随 R 的增大而减小；只有在 R < r 时，输出功率才随 R 的增大而增大。',
            level: 'warning',
          },
        ],
      }
    }
  }
  return null
}
