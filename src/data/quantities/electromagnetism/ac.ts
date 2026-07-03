import { calculateACRMS, calculateTransformerWithLoad, calculatePowerTransmission } from '../../../physics'
import { getEffectiveCurrent, getTheoreticalThermalState, type WaveformType } from '../../../physics/rmsCalculator'
import { PHYSICS_COLORS, TRANSMISSION_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function handleAc(
  animId: string,
  params: Record<string, number>,
  time: number,
  lastChangedParam: string | null,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-ac-generation': {
      const B = params.B ?? 0.5
      const S = params.S ?? 0.04
      const omega = params.omega ?? 2
      const N = params.N ?? 100
      const initialPhase = params.initialPhase ?? 0
      const mode = params.mode ?? 0
      // 峰值电动势 Em = NBSω
      const Em = N * B * S * omega
      const { V_rms } = calculateACRMS(Em)
      const freq = omega / (2 * Math.PI)
      // 瞬时值（纯函数计算，与 ACGeneration.tsx 中的 state 一致）
      const theta = omega * time + initialPhase
      const phi = B * S * Math.cos(theta)
      const e = Em * Math.sin(theta)
      const isNeutral = Math.abs(Math.sin(theta)) < 0.09
      const isMaxEmf = Math.abs(Math.cos(theta)) < 0.09

      const formulas = [
        { name: '磁通量公式', latex: '\\Phi = BS\\cos(\\omega t + \\theta_0)', level: 'core' as const },
        { name: '感应电动势', latex: 'e = E_m\\sin(\\omega t + \\theta_0)', level: 'core' as const },
        { name: '峰值电动势', latex: 'E_m = NBS\\omega', level: 'core' as const },
      ]

      const gaokaoPoints = [
        { text: '中性面（Φ最大，dΦ/dt=0，e=0）与垂直中性面（Φ=0，|dΦ/dt|最大，|e|=Em）的交替辨析。', importance: 'gaokao' as const },
        { text: '转速 n 翻倍时，周期 T 减半，同时波峰高度 Em 同步翻倍。', importance: 'gaokao' as const },
      ]

      const warnings = [
        { text: '易错提醒：转速 n 翻倍时，图象周期 T 减半的同时，波峰高度 Em 同步翻倍。', level: 'danger' as const },
      ]

      if (mode === 1) {
        formulas.push(
          { name: '一般表达式', latex: '\\Phi = BS\\cos(\\omega t + \\theta_0)', level: 'core' as const },
        )
      }

      return {
        quantities: [
          ...base,
          { label: '瞬时磁通量 Φ', value: phi.toFixed(4), unit: 'Wb', color: PHYSICS_COLORS.magneticField, highlight: isNeutral ? 'extreme' : undefined },
          { label: '瞬时电动势 e', value: e.toFixed(2), unit: 'V', color: PHYSICS_COLORS.emf, highlight: isMaxEmf ? 'extreme' : undefined },
          { label: '峰值电动势 Em', value: Em.toFixed(2), unit: 'V' },
          { label: '有效值 Erms', value: V_rms.toFixed(2), unit: 'V' },
          { label: '频率 f', value: freq.toFixed(2), unit: 'Hz' },
        ],
        formulas,
        gaokaoPoints,
        warnings,
      }
    }

    case 'anim-ac-values': {
      const Im = params.Im ?? 5
      const R = params.R ?? 10
      const Idc = params.Idc ?? 3
      const waveform = params.waveform ?? 0
      const duty = params.duty ?? 0.5

      const waveformType: WaveformType = (['sine', 'square', 'pulse', 'half_sine'] as const)[waveform] ?? 'sine'
      const I_eff = getEffectiveCurrent({ type: waveformType, Im, R, period: 2, dcCurrent: Idc, duty })
      const thermalState = getTheoreticalThermalState(time, { type: waveformType, Im, R, period: 2, dcCurrent: Idc, duty })
      const Q_ac = thermalState.Q_ac
      const Q_dc = Idc * Idc * R * time
      const deltaQ = Q_dc - Q_ac

      return {
        quantities: [
          ...base,
          { label: '交流热量 Q_ac', value: Q_ac, unit: 'J', color: PHYSICS_COLORS.potentialEnergy },
          { label: '直流热量 Q_dc', value: Q_dc, unit: 'J', color: PHYSICS_COLORS.potentialEnergy },
          { label: '热量差 ΔQ', value: deltaQ, unit: 'J', highlight: Math.abs(deltaQ) < 1 ? 'positive' : 'negative' },
          { label: '理论有效值 I_eff', value: I_eff, unit: 'A', highlight: 'extreme' },
        ],
        formulas: [
          {
            name: '有效值通用定义',
            latex: 'I_{eff} = \\sqrt{\\frac{1}{T}\\int_0^T i^2(t)dt}',
            level: 'core' as const,
            condition: '适用于任意周期性交变电流',
          },
          {
            name: '正弦波特例',
            latex: 'I_{eff} = \\frac{I_m}{\\sqrt{2}}',
            condition: '仅适用于标准正弦（余弦）交变电流',
            note: '严禁套用于方波、脉冲波、半波整流等非正弦波形！',
            level: 'important' as const,
          },
        ],
        gaokaoPoints: [
          { text: '非正弦交变电流必须回归热效应定义求解，不可套用 Im/√2', importance: 'gaokao' as const },
          { text: '半波整流: I_eff = Im/2；对称方波: I_eff = Im；脉冲波: I_eff = Im√D', importance: 'gaokao' as const },
          { text: '电容器耐压值看峰值，电表读数/保险丝看有效值', importance: 'hard' as const },
        ],
        warnings: [
          { text: '本结论仅适用于标准正弦（或余弦）交变电流', level: 'info' as const },
        ],
      }
    }

    case 'anim-transformer': {
      const n1 = params.n1 ?? 100
      const n2 = params.n2 ?? 200
      const U1 = params.U1 ?? 220
      const R = params.R ?? 50
      const { U2, I2, I1, P_input, P_output } = calculateTransformerWithLoad(n1, n2, U1, R)
      const turnsRatio = n1 === 0 ? 0 : n2 / n1
      const R_eq = n2 === 0 ? 0 : (n1 / n2) ** 2 * R
      return {
        quantities: [
          ...base,
          { label: '匝数比 n₂/n₁', value: turnsRatio, unit: '' },
          { label: '输出电压 U₂', value: U2, unit: 'V', color: PHYSICS_COLORS.magnetSouth, highlight: 'extreme' },
          { label: '原线圈电流 I₁', value: I1, unit: 'A', color: PHYSICS_COLORS.electricCurrent },
          { label: '副线圈电流 I₂', value: I2, unit: 'A', color: PHYSICS_COLORS.magnetSouth },
          { label: '输入功率 P_in', value: P_input, unit: 'W', color: PHYSICS_COLORS.power },
          { label: '输出功率 P_out', value: P_output, unit: 'W', color: PHYSICS_COLORS.power, highlight: Math.abs(P_input - P_output) < 0.01 ? 'positive' : 'negative' },
          { label: '等效输入电阻 R_eq', value: R_eq, unit: 'Ω', color: PHYSICS_COLORS.resistance },
        ],
        formulas: [
          {
            name: '变压比',
            latex: '\\frac{U_1}{U_2} = \\frac{n_1}{n_2}',
            condition: '理想变压器（无漏磁、无铜损铁损）',
            level: 'core' as const,
          },
          {
            name: '功率守恒',
            latex: 'P_{in} = P_{out} \\quad (U_1 I_1 = U_2 I_2)',
            condition: '理想变压器任意负载',
            level: 'core' as const,
          },
          {
            name: '变流比（单副线圈）',
            latex: '\\frac{I_1}{I_2} = \\frac{n_2}{n_1}',
            condition: '仅适用于单一副线圈',
            note: '多副线圈时此式彻底失效，必须用 U₁I₁ = U₂I₂ + U₃I₃ 功率守恒求解！',
            level: 'important' as const,
          },
          {
            name: '等效输入电阻',
            latex: 'R_{eq} = \\left(\\frac{n_1}{n_2}\\right)^2 R',
            condition: '副线圈接纯电阻负载 R',
            level: 'derived' as const,
          },
        ],
        gaokaoPoints: [
          { text: '动态电路因果链（铁律）：U₁ 决定 U₂ → R 决定 I₂ → I₂ 决定 P_out → P_out 决定 P_in → P_in 决定 I₁', importance: 'gaokao' as const },
          { text: '多副线圈：电压比 U₁/n₁ = U₂/n₂ = U₃/n₃ 仍成立，但电流比 I₁/I₂=n₂/n₁ 失效，须用功率守恒 U₁I₁=ΣU_i I_i', importance: 'gaokao' as const },
          { text: '理想变压器原线圈电流 I₁ 由副线圈负载决定（I₁ 是被动的），而非由 U₁ 决定', importance: 'hard' as const },
        ],
        warnings: [
          { text: '电流比 I₁/I₂ = n₂/n₁ 仅对单副线圈成立，多副线圈必须用功率守恒式', level: 'danger' as const },
          { text: '原线圈电流 I₁ 随负载 R 减小而增大（R↓ → I₂↑ → P_out↑ → I₁↑）', level: 'info' as const },
        ],
      }
    }

    case 'anim-power-transmission': {
      // 自变量（从 params 读取，单位转换为 SI）
      const P1 = (params.P1 ?? 100) * 1000  // kW → W
      const U2 = (params.U2 ?? 10) * 1000   // kV → V
      const r = params.r ?? 10              // Ω
      const k = params.k ?? 0.02            // 降压变压器变比 k = n4/n3
      const mode = params.mode ?? 0
      const N = params.N ?? 10
      const scenario = params.scenario ?? 0

      // 计算因变量（使用纯函数）
      const { P1: P1_real, I_line, deltaU, P_loss, U3, U4, eta } = calculatePowerTransmission(
        P1, U2, r, k, mode, N, scenario
      )

      // 动态高亮链：根据 lastChangedParam 高亮因果链节点
      // 因果链：N↑ → R_user↓ → I_line↑ → ΔU↑ → U3↓ → U4↓
      const causalChain: Record<string, string[]> = {
        N: ['I_line', 'deltaU', 'U3', 'U4'],
        k: ['U4'],
        U2: ['I_line', 'deltaU', 'P_loss', 'U3', 'U4'],
        P1: ['I_line', 'deltaU', 'P_loss', 'U3', 'U4'],
        r: ['deltaU', 'P_loss', 'U3', 'U4'],
      }
      const highlightKeys = lastChangedParam ? (causalChain[lastChangedParam] ?? []) : []
      const isHighlight = (key: string) => highlightKeys.includes(key)

      return {
        quantities: [
          ...base,
          { label: '实际发电功率 P₁', symbol: 'P_1', value: (P1_real / 1000).toFixed(1), unit: 'kW', color: PHYSICS_COLORS.power, highlight: mode === 1 ? 'extreme' : undefined },
          { label: '线路电流 I', symbol: 'I_{line}', value: I_line.toFixed(2), unit: 'A', color: TRANSMISSION_COLORS.currentLine, highlight: isHighlight('I_line') ? 'extreme' : undefined },
          { label: '电压损失 ΔU', symbol: '\\Delta U', value: deltaU.toFixed(1), unit: 'V', color: TRANSMISSION_COLORS.voltageHigh, highlight: isHighlight('deltaU') ? 'extreme' : undefined },
          { label: '损耗功率 ΔP', symbol: 'P_{loss}', value: (P_loss / 1000).toFixed(2), unit: 'kW', color: TRANSMISSION_COLORS.powerLoss, highlight: isHighlight('P_loss') ? 'extreme' : undefined },
          { label: '降压端电压 U₃', symbol: 'U_3', value: U3.toFixed(1), unit: 'V', color: TRANSMISSION_COLORS.voltageHigh, highlight: isHighlight('U3') ? 'extreme' : undefined },
          { label: '用户电压 U₄', symbol: 'U_4', value: U4.toFixed(1), unit: 'V', color: TRANSMISSION_COLORS.powerUser, highlight: isHighlight('U4') ? 'extreme' : undefined },
          { label: '输电效率 η', symbol: '\\eta', value: (eta * 100).toFixed(1), unit: '%', color: TRANSMISSION_COLORS.efficiency, highlight: 'extreme' },
        ],
        formulas: [
          { name: '输电线电流', latex: 'I_{line} = \\frac{P_1}{U_2}', level: 'core' },
          { name: '线路等效折算电阻', latex: 'R_{eq3} = \\frac{R_{load}}{k^2} \\quad (k = \\frac{n_4}{n_3})', level: 'derived' },
          { name: '电压损失与损耗功率', latex: '\\Delta U = I_{line}r, \\quad P_{loss} = I_{line}^2r', level: 'core' },
          { name: '降压原副线圈电压', latex: 'U_3 = U_2 - \\Delta U, \\quad U_4 = U_3 \\cdot k', level: 'core' },
          { name: '输电效率', latex: '\\eta = \\frac{P_{user}}{P_1} = \\frac{U_3}{U_2} = 1 - \\frac{\\Delta U}{U_2}', level: 'core' },
        ],
        gaokaoPoints: [
          { text: '高压输电优越性：提高 U₂ ⇒ 减小 I_line ⇒ 大幅减少 P_loss = I²r（电压变 n 倍，损耗降为 1/n² ）。', importance: 'gaokao' },
          { text: '动态负载铁律：用户增加 ⇒ R_load↓ ⇒ 折算电阻 R_eq3↓ ⇒ 总电阻↓ ⇒ I_line↑ ⇒ ΔU↑ ⇒ U₃↓ ⇒ U₄↓（用电器变暗）。', importance: 'gaokao' },
          { text: '等效电阻秒杀法：将变压器副线圈负载 R_load 折算到原线圈回路，公式为 R_eq = R_load / k²。', importance: 'hard' },
          { text: '稳压补偿手段：用电高峰时 U₄ 降低，增大 k = n₄/n₃（即增加降压变压器副线圈匝数）可使 U₄ 回升。', importance: 'hard' },
        ],
        warnings: [
          { text: '严禁使用 P_loss = U₂²/r 算损耗，真正施加在输电线两端的电压仅为 ΔU = I·r，而非输电电压 U₂！', level: 'danger' },
          { text: '发电机输出功率 P₁ 不是固定不变的！在动态负载下，P₁ 被动地跟随用户侧负载阻值改变而改变（P₁ = U₂·I_line）。', level: 'warning' },
        ],
      }
    }
  }
  return null
}
