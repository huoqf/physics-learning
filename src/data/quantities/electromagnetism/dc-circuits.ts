import {
  calculateOhmLaw,
  calculateClosedCircuit,
  calculateMeterExpansion,
  calculateOhmmeter,
  calculateExperimentEr,
  calculateMotorCircuit
} from '../../../physics'
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
      const mode = params.mode ?? 0 // 0=伏安特性, 1=改装电压表, 2=改装电流表
      const meterMode = params.meterMode ?? 0 // 0=定值电阻, 1=小灯泡
      const U = params.U ?? 2
      const R = params.R ?? 10
      const Rs = params.Rs ?? 1400
      const Rp = params.Rp ?? 0.5
      const Rg = params.Rg ?? 100
      const Ig = params.Ig ?? 0.001

      let quantitiesList: PhysicsQuantity[] = [...base]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let formulasList: any[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let gaokaoPointsList: any[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let warningsList: any[] = []

      if (mode === 0) {
        let I = 0
        let P = 0
        let R_eff = R
        if (meterMode === 0) {
          const res = calculateOhmLaw(U, R)
          I = res.I
          P = U * I
          R_eff = R
        } else {
          R_eff = 5 + 2 * U
          I = U / R_eff
          P = U * I
        }

        quantitiesList.push(
          { label: '加在两端电压 U', symbol: 'U', value: U.toFixed(2), unit: 'V', color: PHYSICS_COLORS.electricPotential },
          { label: '瞬时电流 I', symbol: 'I', value: I.toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent, highlight: 'extreme' },
          { label: '等效电阻 R', symbol: 'R', value: R_eff.toFixed(1), unit: 'Ω', color: PHYSICS_COLORS.appliedForce },
          { label: '消耗电功率 P', symbol: 'P', value: P.toFixed(3), unit: 'W', color: PHYSICS_COLORS.power, highlight: 'extreme' }
        )

        formulasList = [
          { name: '部分电路欧姆定律', latex: 'I = \\frac{U}{R}', level: 'core', condition: '适用于纯电阻部分电路' },
          { name: '电功率公式', latex: 'P = UI', level: 'core' }
        ]

        gaokaoPointsList = [
          { text: '【斜率的物理意义】在 U-I 图像中（y轴为U，x轴为I），图线上各点与原点连线的斜率 k = R；而在 I-U 图像中（y轴为I，x轴为U），斜率 k = 1/R。', importance: 'gaokao' },
          { text: '【小灯泡伏安特性】小灯泡是典型非线性元件，随温度（电压）升高，电阻增大。在 I-U 图中，图线会向电压轴弯曲（斜率减小，阻值增大）。', importance: 'core' }
        ]

        warningsList = [
          { text: '易错点：小灯泡在电压为 0 时仍具有"冷态电阻"（本例中约为 5 Ω），阻值不为 0。', level: 'warning' },
          { text: '易错点：对于非线性元件，某状态下的电阻值只能用工作点与原点连线的斜率 R = U/I 计算，绝不能用切线斜率（动态电阻）代替。', level: 'danger' }
        ]
      } else if (mode === 1) {
        const res = calculateMeterExpansion(1, U, Rg, Ig, Rs, Rp)
        const totalRV = Rg + Rs
        const Um = Ig * totalRV
        const deviationPct = res.ratio * 100

        quantitiesList.push(
          { label: '表头满偏电流 Ig', symbol: 'Ig', value: (Ig * 1000).toFixed(1), unit: 'mA', color: PHYSICS_COLORS.electricCurrent },
          { label: '表头内阻 Rg', symbol: 'Rg', value: Rg.toFixed(0), unit: 'Ω' },
          { label: '串联分压电阻 Rs', symbol: 'Rs', value: Rs.toFixed(0), unit: 'Ω', color: PHYSICS_COLORS.appliedForce },
          { label: '改装后总内阻 RV', symbol: 'R_V', value: totalRV.toFixed(0), unit: 'Ω' },
          { label: '改装电压表量程 Um', symbol: 'U_m', value: Um.toFixed(1), unit: 'V', color: PHYSICS_COLORS.electricPotential, highlight: 'extreme' },
          { label: '表头电流实际值 I_g\'', symbol: 'I_g\'', value: (res.I_g_meas * 1000).toFixed(3), unit: 'mA', color: PHYSICS_COLORS.electricCurrent },
          { label: '指针满偏偏转百分比', value: deviationPct.toFixed(1), unit: '%', color: PHYSICS_COLORS.work, highlight: 'extreme' }
        )

        formulasList = [
          { name: '电表改装（电压表）', latex: 'U_m = I_g(R_g + R_s)', level: 'core', condition: '串联电阻分压' },
          { name: '分压电阻阻值公式', latex: 'R_s = \\frac{U_m}{I_g} - R_g', level: 'core' }
        ]

        gaokaoPointsList = [
          { text: '【改装原理：串联分压】表头 G 能承受的电压极小，通过串联一个较大的电阻 Rs 来分担大部分电压，从而使得整体能测量较大的电压。', importance: 'gaokao' }
        ]

        warningsList = [
          { text: '易错点：改装后的电压表满偏时，通过表头 G 的电流仍动载为满偏电流 Ig，绝不能超过此值。', level: 'danger' }
        ]
      } else {
        const res = calculateMeterExpansion(2, U, Rg, Ig, Rs, Rp)
        const totalRA = (Rg * Rp) / (Rg + Rp)
        const Im = (Ig * Rg) / Rp + Ig
        const deviationPct = res.ratio * 100

        quantitiesList.push(
          { label: '表头满偏电流 Ig', symbol: 'Ig', value: (Ig * 1000).toFixed(1), unit: 'mA', color: PHYSICS_COLORS.electricCurrent },
          { label: '表头内阻 Rg', symbol: 'Rg', value: Rg.toFixed(0), unit: 'Ω' },
          { label: '并联分流电阻 Rp', symbol: 'Rp', value: Rp.toFixed(2), unit: 'Ω', color: PHYSICS_COLORS.appliedForce },
          { label: '改装后总内阻 RA', symbol: 'R_A', value: totalRA.toFixed(3), unit: 'Ω' },
          { label: '改装电流表量程 Im', symbol: 'I_m', value: Im.toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent, highlight: 'extreme' },
          { label: '表头分流实际值 I_g\'', symbol: 'I_g\'', value: (res.I_g_meas * 1000).toFixed(3), unit: 'mA', color: PHYSICS_COLORS.electricCurrent },
          { label: '指针满偏偏转百分比', value: deviationPct.toFixed(1), unit: '%', color: PHYSICS_COLORS.work, highlight: 'extreme' }
        )

        formulasList = [
          { name: '电表改装（电流表）', latex: 'I_m R_A = I_g R_g', level: 'core', condition: '并联电阻分流' },
          { name: '分流电阻阻值公式', latex: 'R_p = \\frac{I_g R_g}{I_m - I_g}', level: 'core' }
        ]

        gaokaoPointsList = [
          { text: '【改装原理：并联分流】表头 G 能承受的电流极小，通过并联一个较小的电阻 Rp 来分担绝大部分干路电流，从而实现测量大电流。', importance: 'gaokao' }
        ]

        warningsList = [
          { text: '易错点：并联分流电阻 Rp 阻值一般非常小（通常为几欧姆甚至零点几欧姆），切忌将其错算成大电阻。', level: 'warning' }
        ]
      }

      return {
        quantities: quantitiesList,
        formulas: formulasList,
        gaokaoPoints: gaokaoPointsList,
        warnings: warningsList
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

      // 动态推导链 KaTeX 构造
      const isUp = R2 >= 10
      const arrow = isUp ? '\\uparrow' : '\\downarrow'
      const arrowOpp = isUp ? '\\downarrow' : '\\uparrow'
      let chainLatex = ''
      if (mode === 0) {
        if (subMode === 0) {
          chainLatex = `R_2 ${arrow} \\implies R_{\\text{总}} ${arrow} \\implies I ${arrowOpp} \\implies U_1 ${arrowOpp} \\implies U_2 ${arrow}`
        } else {
          chainLatex = `R_2 ${arrow} \\implies R_{\\text{总}} ${arrow} \\implies I_2 ${arrowOpp} \\quad (U_{\\text{外}} = U, I_1 \\text{ 恒定}, I_{\\text{总}} ${arrowOpp})`
        }
      } else {
        chainLatex = `R_2 ${arrow} \\implies R_{\\text{并}} ${arrow} \\implies R_{\\text{总}} ${arrow} \\implies I_{\\text{总}} ${arrowOpp} \\implies U_1 ${arrowOpp} \\implies U_2 ${arrow} \\implies I_3 ${arrow} \\implies I_2 ${arrowOpp}`
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
          // 注入元件功率与总功率
          { label: 'R₁ 消耗功率', symbol: 'P₁', value: I1 * U1, unit: 'W' },
          { label: 'R₂ 消耗功率', symbol: 'P₂', value: I2 * U2, unit: 'W' },
          ...(mode === 1 ? [{ label: 'R₃ 消耗功率', symbol: 'P₃', value: I3 * U2, unit: 'W' }] : []),
          { label: '总输出功率', symbol: 'P_总', value: Itotal * U, unit: 'W', highlight: 'extreme' },
        ],
        formulas: [
          {
            name: '电路动态因果链 (串反并同)',
            latex: chainLatex,
            level: 'derived' as const,
            condition: isUp ? '滑动变阻器阻值调大' : '滑动变阻器阻值调小',
            note: '根据"串反并同"口诀：与变阻器串联的元件其电流/电压变化相反；与其并联的相同。',
          },
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
    case 'anim-multimeter-ohm': {
      const opMode = params.opMode ?? 0 // 0=短接调零, 1=阻值测量
      const multiplier = params.multiplier ?? 1
      const R_adjust = params.R_adjust ?? 199
      const Rx = params.Rx ?? 1500
      const E = 1.5
      const Rg = 100
      const r = 1
      const Ig = 0.001

      const res = calculateOhmmeter(E, Rg, r, R_adjust, Rx, multiplier, Ig)
      const R_internal = res.R_internal
      const I_mA = res.I * 1000
      const deviationPct = res.ratio * 100

      let quantitiesList: PhysicsQuantity[] = [
        ...base,
        { label: '电源电动势 E', symbol: 'E', value: E.toFixed(1), unit: 'V', color: PHYSICS_COLORS.emf },
        { label: '表头满偏电流 Ig', symbol: 'Ig', value: (Ig * 1000).toFixed(1), unit: 'mA', color: PHYSICS_COLORS.electricCurrent },
        { label: '表头内阻 Rg', symbol: 'Rg', value: Rg.toFixed(0), unit: 'Ω' },
        { label: '当前挡位倍率', value: `×${multiplier}`, unit: '' },
        { label: '调零变阻器阻值 R_Ω', symbol: 'R_Ω', value: R_adjust.toFixed(0), unit: 'Ω', color: PHYSICS_COLORS.appliedForce },
        { label: '欧姆表总内阻 R_内', symbol: 'R_内', value: R_internal.toFixed(0), unit: 'Ω' }
      ]

      if (opMode === 1) {
        quantitiesList.push(
          { label: '待测电阻 Rx', symbol: 'R_x', value: Rx.toFixed(0), unit: 'Ω', color: PHYSICS_COLORS.appliedForce, highlight: 'extreme' },
          { label: '表头测量电流 I', symbol: 'I', value: I_mA.toFixed(3), unit: 'mA', color: PHYSICS_COLORS.electricCurrent },
          { label: '指针偏转百分比', value: deviationPct.toFixed(1), unit: '%', color: PHYSICS_COLORS.work, highlight: 'extreme' }
        )
      } else {
        quantitiesList.push(
          { label: '表头短路电流 I_短', symbol: 'I_短', value: I_mA.toFixed(3), unit: 'mA', color: PHYSICS_COLORS.electricCurrent, highlight: res.isZeroed ? 'extreme' : undefined },
          { label: '欧姆调零状态', value: res.isZeroed ? '已满偏 (调零成功)' : '未满偏 (需调节R_Ω)', unit: '', color: res.isZeroed ? PHYSICS_COLORS.work : PHYSICS_COLORS.electricCurrent }
        )
      }

      return {
        quantities: quantitiesList,
        formulas: [
          {
            name: '欧姆表测量电流公式',
            latex: 'I = \\frac{E}{R_{\\text{内}} + R_x}',
            level: 'core' as const,
            condition: '全电路欧姆定律的变形应用',
          },
          {
            name: '欧姆中值电阻',
            latex: 'R_{\\text{中}} = R_{\\text{内}} = \\frac{E}{I_g}',
            level: 'core' as const,
            note: '当 Rx 等于中值电阻时，指针恰好指向表盘中央半偏处',
          }
        ],
        gaokaoPoints: [
          {
            text: '【非均匀欧姆刻度】因为 I 与 Rx 呈非线性反比关系，故欧姆表盘刻度不均匀，呈现"左密右疏"、"从右向左递增"的特点。',
            importance: 'gaokao',
          },
          {
            text: '【红进黑出】欧姆表内部电池的正极与外部的黑表笔相连，负极与红表笔相连。测量时，电流从黑表笔流出、经过待测电阻后从红表笔流入多用电表。',
            importance: 'gaokao',
          }
        ],
        warnings: [
          {
            text: '易错点：每次换挡（即改变 multiplier 倍率）后，由于内部等效分流电阻改变，必须重新进行欧姆调零！',
            level: 'danger',
          },
          {
            text: '使用完毕后：必须将选择开关旋转至交流电压最高挡或"OFF"挡，以防表笔短接导致电池耗尽或烧毁电表。',
            level: 'warning',
          }
        ]
      }
    }
    case 'anim-experiment-er': {
      const wiring = params.wiring ?? 0
      const R_slider = params.R_slider ?? 10
      const E_real = 6.0
      const r_real = 2.0
      const RV = 10.0
      const RA = 1.5

      const res = calculateExperimentEr(E_real, r_real, R_slider, wiring, RV, RA)
      const E_meas = wiring === 0 ? E_real / (1 + r_real / RV) : E_real
      const r_meas = wiring === 0 ? r_real / (1 + r_real / RV) : r_real + RA

      return {
        quantities: [
          ...base,
          { label: '真实电动势 E_真', symbol: 'E_真', value: E_real.toFixed(1), unit: 'V', color: PHYSICS_COLORS.emf },
          { label: '真实内阻 r_真', symbol: 'r_真', value: r_real.toFixed(1), unit: 'Ω' },
          { label: '电压表读数 U', symbol: 'U', value: res.U_meas.toFixed(3), unit: 'V', color: PHYSICS_COLORS.electricPotential },
          { label: '电流表读数 I', symbol: 'I', value: res.I_meas.toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent, highlight: 'extreme' },
          { label: '外阻阻值 R', symbol: 'R', value: R_slider.toFixed(1), unit: 'Ω', color: PHYSICS_COLORS.appliedForce },
          { label: '等效测得电动势 E_测', symbol: 'E_测', value: E_meas.toFixed(3), unit: 'V', color: PHYSICS_COLORS.emf },
          { label: '等效测得内阻 r_测', symbol: 'r_测', value: r_meas.toFixed(3), unit: 'Ω', highlight: 'extreme' }
        ],
        formulas: [
          ...(wiring === 0 ? [
            {
              name: '电流表外接法系统误差',
              latex: 'E_{\\text{测}} = \\frac{E}{1 + r/R_V} < E, \\quad r_{\\text{测}} = \\frac{r}{1 + r/R_V} < r',
              level: 'core' as const,
              condition: '电压表分流产生系统误差',
            }
          ] : [
            {
              name: '电流表内接法系统误差',
              latex: 'E_{\\text{测}} = E, \\quad r_{\\text{测}} = r + R_A > r',
              level: 'core' as const,
              condition: '电流表分压产生系统误差',
            }
          ])
        ],
        gaokaoPoints: [
          {
            text: '【电路甲误差特点】采用电流表外接法，电压表分流。U-I 图线中，纵截距（E_测）与斜率绝对值（r_测）均小于真实值。在高考误差分析中极常考。',
            importance: 'gaokao',
          },
          {
            text: '【电路乙误差特点】采用电流表内接法，电流表分压。U-I 图线中，纵截距（E_测）等于真实值，但斜率绝对值（r_测）偏大（测得内阻包含了电流表内阻）。',
            importance: 'gaokao',
          }
        ],
        warnings: [
          {
            text: '【实验选型铁律】由于电源内阻一般很小（通常小于 2Ω），若用电流表内接法，电流表的分压压降占比极大，误差严重；而电压表阻值很大（数千欧），分流影响极小。因此，测定电源E与r实验中，必须选用电路甲（电流表外接法）！',
            level: 'danger',
          }
        ]
      }
    }
    case 'anim-motor-circuit': {
      const motorState = params.motorState ?? 1
      const U = params.U ?? 10
      const mass = params.mass ?? 0.5
      const R_protect = 2.0
      const r_M = 1.0
      const E_back = 5.0

      const res = calculateMotorCircuit(U, R_protect, r_M, motorState, E_back, mass)
      const P_in_motor = res.U_M * res.I
      const eff = P_in_motor > 0 ? (res.P_mech / P_in_motor) * 100 : 0

      return {
        quantities: [
          ...base,
          { label: '电源总电压 U', symbol: 'U', value: U.toFixed(1), unit: 'V', color: PHYSICS_COLORS.electricPotential },
          { label: '干路总电流 I', symbol: 'I', value: res.I.toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent, highlight: 'extreme' },
          { label: '电动机两端电压 UM', symbol: 'U_M', value: res.U_M.toFixed(2), unit: 'V', color: PHYSICS_COLORS.electricPotential },
          { label: '电源总输入功率 P_总', symbol: 'P_总', value: res.P_total.toFixed(2), unit: 'W', color: PHYSICS_COLORS.power },
          { label: '电动机输入电功率 P_入', symbol: 'P_入', value: P_in_motor.toFixed(2), unit: 'W', color: PHYSICS_COLORS.power },
          { label: '电动机热耗功率 P_热', symbol: 'P_热', value: res.P_heat_M.toFixed(2), unit: 'W', color: PHYSICS_COLORS.internalEnergy },
          { label: '电动机输出机械功率 P_机', symbol: 'P_机', value: res.P_mech.toFixed(2), unit: 'W', color: PHYSICS_COLORS.work, highlight: 'extreme' },
          { label: '电动机工作效率 η', symbol: 'η', value: eff.toFixed(1), unit: '%', color: PHYSICS_COLORS.work },
          ...(motorState === 1 ? [{ label: '重物匀速提升速度 v', symbol: 'v', value: res.v_lift.toFixed(3), unit: 'm/s', color: PHYSICS_COLORS.velocity, highlight: 'extreme' as const }] : [])
        ],
        formulas: [
          {
            name: '纯电阻与非纯电阻功耗拆解',
            latex: 'P_{\\text{入}} = I U_M, \\quad P_{\\text{热}} = I^2 r_M, \\quad P_{\\text{机}} = P_{\\text{入}} - P_{\\text{热}} = E_{\\text{反}} I',
            level: 'core' as const,
            condition: '适用于含电动机的非纯电阻电路',
          },
          {
            name: '提升机械功率平衡',
            latex: 'P_{\\text{机}} = F \\cdot v = mg \\cdot v',
            level: 'core' as const,
            condition: '重物匀速上升时',
          }
        ],
        gaokaoPoints: [
          {
            text: '【纯与非纯本质区别】纯电阻电路中电能全部转化为焦耳热（W = Q）；非纯电阻电路中，电能只有小部分转化为焦耳热，大部分转化为机械能、化学能等其他形式能量（W > Q）。',
            importance: 'gaokao',
          },
          {
            text: '【电动机卡死分析】电动机卡死时，机械功率输出降为 0，反电动势消失，电动机退化为纯电阻电路。此时电流极大，发热量激增，极易烧毁绕组。',
            importance: 'core',
          }
        ],
        warnings: [
          {
            text: '【物理雷区】欧姆定律 I = U/R 绝对不适用于电动机整体！计算电流或电压分配时，必须根据电功率分配方程 U_M = E_反 + I*r_M，切勿直接代入 I = U_M / r_M。',
            level: 'danger',
          }
        ]
      }
    }
  }
  return null
}
