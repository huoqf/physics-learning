import type { PhysicsPanelData, ParamDefs, Formula } from './types'
import { normalizeParams } from './types'
import {
  calcConstantForceAccelState,
  calcLightClockState,
  calcSimultaneityState,
  clampRelativityBeta,
  formatRelativityBeta,
} from '@/physics/relativity'
import { PHYSICS_COLORS } from '@/theme/physics'

interface RelativityParams {
  beta: number
  m0: number
  mode: number
  showGeometry: number
}

const RELATIVITY_DEFAULTS: ParamDefs<RelativityParams> = {
  beta: { default: 0.6 },
  m0: { default: 1.0 },
  mode: { default: 0 },
  showGeometry: { default: 0 },
}

export function buildRelativityQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-relativity') return null

  const p = normalizeParams(params, RELATIVITY_DEFAULTS)
  const beta = clampRelativityBeta(p.beta)
  const mode = p.mode ?? 0
  const safeM0 = Number.isFinite(p.m0) && p.m0 > 0 ? p.m0 : 1.0

  const clockState = calcLightClockState(beta, time)
  const simultaneity = calcSimultaneityState(beta, time)
  const accelState = calcConstantForceAccelState(beta, safeM0, time)

  const lorentzFormula: Formula = {
    name: '洛伦兹因子',
    latex: '\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}} = \\frac{1}{\\sqrt{1 - \\beta^2}}',
    condition: '0 ≤ v < c；当 v ≪ c 时 γ → 1，相对论结果退化为牛顿力学',
    level: 'important',
  }
  const timeDilationFormula: Formula = {
    name: '时间延缓效应（动钟变慢）',
    latex: '\\Delta t = \\gamma \\Delta \\tau = \\frac{\\Delta \\tau}{\\sqrt{1 - v^2/c^2}}',
    condition: 'Δτ 为同一地点发生的两事件的固有时，是所有惯性系中最短的时间间隔',
    level: 'core',
  }
  const lengthContractionFormula: Formula = {
    name: '长度收缩效应（动尺缩短）',
    latex: 'L = \\frac{L_0}{\\gamma} = L_0 \\sqrt{1 - v^2/c^2}',
    condition: 'L₀ 为物体静止系固有长度；观测系须同时测两端，且仅沿运动方向收缩',
    level: 'important',
  }
  const accelFormula: Formula = {
    name: '恒力加速下的相对论速度演化',
    latex: 'v(t) = \\frac{a_0 t}{\\sqrt{1 + (a_0 t/c)^2}} < c, \\quad a_0 = \\frac{F}{m_0}',
    condition: '定性演示式，高中不要求推导记忆；v ≪ c 时退化为 v = a₀t，高速时渐近趋近光速 c',
    level: 'supplementary',
  }
  const energyFormula: Formula = {
    name: '相对论能量与质能关系（拓展）',
    latex: 'E = \\gamma m_0 c^2 = E_0 + E_k, \\quad E_0 = m_0 c^2',
    condition: '采用不变质量 m₀ 口径；低速时 E_k = (γ - 1)m₀c² 近似退化为 ½m₀v²',
    level: 'supplementary',
  }

  // ── 模式 0：动钟变慢 ──
  if (mode === 0) {
    return {
      quantities: [
        {
          label: '航速与光速比',
          symbol: 'β = v/c',
          value: formatRelativityBeta(beta),
          unit: '',
          color: PHYSICS_COLORS.velocity,
          highlight: beta === 0 ? 'zero' : 'positive',
        },
        {
          label: '洛伦兹因子',
          symbol: 'γ',
          value: clockState.gamma.toFixed(4),
          unit: '',
          color: PHYSICS_COLORS.acceleration,
          highlight: clockState.gamma >= 2 ? 'extreme' : 'positive',
        },
        {
          label: '地面参考钟读数',
          symbol: 't',
          value: clockState.groundTime.toFixed(2),
          unit: 's',
          color: PHYSICS_COLORS.velocity,
        },
        {
          label: '飞船固有钟读数',
          symbol: 'τ',
          value: clockState.properTime.toFixed(2),
          unit: 's',
          color: PHYSICS_COLORS.displacement,
        },
        {
          label: '时间延缓比值',
          symbol: 'Δt / Δτ',
          value: clockState.gamma.toFixed(4),
          unit: '',
          color: PHYSICS_COLORS.period,
        },
      ],
      formulas: [lorentzFormula, timeDilationFormula],
      warnings: [
        {
          text: '时间延缓是相互且对称的：地面系看飞船时钟变慢，飞船系看地面时钟同样变慢，不能把“谁绝对变慢”绝对化。',
          level: 'warning',
        },
        {
          text: '只有在同一地点发射和接收（或同一只相对静止的钟）测得的时间间隔才是固有时 Δτ，其余惯性系测得 Δt 均更大。',
          level: 'info',
        },
      ],
      gaokaoPoints: [
        {
          text: '狭义相对论两条基本假设：狭义相对性原理（物理规律在一切惯性系中形式相同）与光速不变原理（真空中光速恒为 c）。',
          importance: 'gaokao',
        },
        {
          text: '动钟变慢与固有时最短：两事件同地发生的参考系测得固有时 Δτ 最短，相对运动系测得时间延缓 Δt = γΔτ。',
          importance: 'gaokao',
        },
        {
          text: '宇宙射线 μ 子寿命现象：高速 μ 子相对地面运动时，地面测得其寿命因时间延缓而延长，是相对论时空观的重要实验证据之一。',
          importance: 'extend',
        },
      ],
      mnemonic: '同地之时最短，光速一切系同；动钟走得慢，公式乘以 γ。',
    }
  }

  // ── 模式 1：动尺收缩 + 同时的相对性 ──
  if (mode === 1) {
    return {
      quantities: [
        {
          label: '航速与光速比',
          symbol: 'β = v/c',
          value: formatRelativityBeta(beta),
          unit: '',
          color: PHYSICS_COLORS.velocity,
          highlight: beta === 0 ? 'zero' : 'positive',
        },
        {
          label: '洛伦兹因子',
          symbol: 'γ',
          value: simultaneity.gamma.toFixed(4),
          unit: '',
          color: PHYSICS_COLORS.acceleration,
          highlight: simultaneity.gamma >= 2 ? 'extreme' : 'positive',
        },
        {
          label: '运动长度收缩比',
          symbol: 'L / L₀',
          value: simultaneity.lengthRatio.toFixed(4),
          unit: '',
          color: PHYSICS_COLORS.displacement,
        },
        {
          label: '地面当前时刻',
          symbol: 't',
          value: simultaneity.groundTime.toFixed(2),
          unit: 's',
          color: PHYSICS_COLORS.velocity,
        },
        {
          label: '到达两壁时差',
          symbol: 'Δt_AB',
          value: simultaneity.deltaTab.toFixed(2),
          unit: 's',
          color: PHYSICS_COLORS.acceleration,
          highlight: simultaneity.deltaTab > 0.01 ? 'extreme' : 'zero',
        },
      ],
      formulas: [lorentzFormula, lengthContractionFormula],
      warnings: [
        {
          text: '尺缩只发生在平行于运动速度的方向，垂直于速度方向的横截尺寸（如车厢高度与宽度）完全不变。',
          level: 'warning',
        },
        {
          text: '测量运动物体的长度必须在观测系中“同时”记下首尾位置；正因同时具有相对性，不同参考系测得的长度才不同。',
          level: 'info',
        },
      ],
      gaokaoPoints: [
        {
          text: '同时的相对性：在车厢系中同时到达前后壁的两束光，在地面系中因光速仍为 c、后壁迎光而前壁退让，表现为先到后壁、后到前壁。',
          importance: 'gaokao',
        },
        {
          text: '随物之尺最长：物体相对自身静止的参考系测得固有长度 L₀ 最长，其余沿运动方向测得长度均为 L = L₀/γ。',
          importance: 'gaokao',
        },
        {
          text: 'μ 子静止系视角：在高速 μ 子自身静止系中，地球大气层高速迎面运动而沿运动方向发生尺缩，厚度变薄使其得以穿透。',
          importance: 'extend',
        },
      ],
      mnemonic: '随物之尺最长，尺缩只沿运动；先定同时测量，垂直尺寸不变。',
    }
  }

  // ── 模式 2：牛顿力学局限性 ──
  if (mode === 2) {
    return {
      quantities: [
        {
          label: '目标航速比',
          symbol: 'β₀',
          value: formatRelativityBeta(accelState.targetBeta),
          unit: '',
          color: PHYSICS_COLORS.velocity,
        },
        {
          label: '当前航速比',
          symbol: 'β(t)',
          value: formatRelativityBeta(accelState.currentBeta),
          unit: '',
          color: PHYSICS_COLORS.wavelengthGreen,
          highlight: accelState.currentBeta === 0 ? 'zero' : 'positive',
        },
        {
          label: '经典预测比',
          symbol: 'β_cl',
          value: accelState.classicalBeta.toFixed(2),
          unit: '',
          color: accelState.classicalBeta >= 1 ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity,
          highlight: accelState.classicalBeta >= 1 ? 'negative' : 'positive',
        },
        {
          label: '当前洛伦兹因子',
          symbol: 'γ(t)',
          value: accelState.currentGamma.toFixed(4),
          unit: '',
          color: PHYSICS_COLORS.acceleration,
        },
        {
          label: '相对经典偏差',
          symbol: 'γ − 1',
          value: `${(accelState.currentNewtonMetrics.relativeDeviation * 100).toFixed(accelState.currentBeta < 0.1 ? 3 : 2)}%`,
          unit: '',
          color: PHYSICS_COLORS.wavelengthGreen,
          highlight: accelState.currentBeta <= 0.1 ? 'zero' : 'extreme',
        },
      ],
      formulas: [lorentzFormula, accelFormula],
      warnings: [
        {
          text: '相对论与量子力学并非简单“推翻”牛顿力学，而是在低速、宏观、弱引力条件下把牛顿力学包容为精确的近似极限。',
          level: 'warning',
        },
        {
          text: '恒力一直加速时，牛顿公式 v = at 会错误地预测速度超过光速 c；相对论修正保证任何有质量物体速度恒小于 c。',
          level: 'info',
        },
      ],
      gaokaoPoints: [
        {
          text: '牛顿力学的适用范围：宏观、低速（v ≪ c）、弱引力领域；日常力学与天体常规运动均在适用范围内。',
          importance: 'gaokao',
        },
        {
          text: '牛顿力学的三大适用边界：高速接近光速需狭义相对论，微观原子尺度需量子力学，强引力场（如黑洞附近）需广义相对论。',
          importance: 'core',
        },
        {
          text: '低速极限回归：当 v ≪ c 时 γ → 1，时间延缓、长度收缩与动力学结果全部平滑退化回牛顿力学。',
          importance: 'core',
        },
      ],
      mnemonic: '宏观低速弱引力，牛顿力学最适用；高速微粒强引力，低速极限仍相通。',
    }
  }

  // ── 模式 3：质能拓展 ──
  return {
    quantities: [
      {
        label: '不变质量',
        symbol: 'm₀',
        value: safeM0.toFixed(2),
        unit: 'kg',
        color: PHYSICS_COLORS.potentialEnergy,
      },
      {
        label: '当前航速比',
        symbol: 'β(t)',
        value: formatRelativityBeta(accelState.currentBeta),
        unit: '',
        color: PHYSICS_COLORS.velocity,
      },
      {
        label: '当前洛伦兹因子',
        symbol: 'γ(t)',
        value: accelState.currentGamma.toFixed(4),
        unit: '',
        color: PHYSICS_COLORS.acceleration,
      },
      {
        label: '静止能量',
        symbol: 'E₀ = m₀c²',
        value: (accelState.currentEnergy.restEnergy / 1e16).toFixed(2),
        unit: '×10¹⁶ J',
        color: PHYSICS_COLORS.potentialEnergy,
      },
      {
        label: '相对论动能',
        symbol: 'E_k',
        value: (accelState.currentEnergy.kineticEnergy / 1e16).toFixed(2),
        unit: '×10¹⁶ J',
        color: PHYSICS_COLORS.kineticEnergy,
      },
      {
        label: '经典动能对比',
        symbol: 'E_k0',
        value: (accelState.currentClassicalEk / 1e16).toFixed(2),
        unit: '×10¹⁶ J',
        color: PHYSICS_COLORS.velocity,
      },
    ],
    formulas: [lorentzFormula, energyFormula],
    warnings: [
      {
        text: '现代物理学普遍保持质量 m₀ 为不变量，把高速下的能量激增表述为 E = γm₀c²，不再提倡将 γm₀ 视作“质量随速度变大”。',
        level: 'warning',
      },
      {
        text: '随着速度趋近光速 c，动能 E_k = (γ − 1)m₀c² 趋于无穷大，因此任何有静止质量的物体都无法被加速至光速。',
        level: 'info',
      },
    ],
    gaokaoPoints: [
      {
        text: '质能方程与静能：静止质量为 m₀ 的物体蕴含静能 E₀ = m₀c²；能量变化 ΔE 与质量变化遵循 ΔE = Δmc²（核反应质量亏损将在选择性必修第三册「原子核」中深入学习）。',
        importance: 'core',
      },
      {
        text: '低速动能极限：当 v ≪ c 时，利用小量近似 γ ≈ 1 + ½β²，相对论动能 E_k = (γ − 1)m₀c² 自动退化为牛顿动能 ½m₀v²。',
        importance: 'extend',
      },
    ],
    mnemonic: '静能源自不变质，高速动能急剧增；低速退化二分一，光速屏障不可越。',
  }
}
