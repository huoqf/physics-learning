/**
 * 电磁振荡与电磁波动画 — 右屏物理量看板数据构建。
 *
 * 覆盖 3 个动画（共享同一物理模型族）：
 *   anim-lc-oscillation → LC 振荡电路（场次 0）
 *   anim-em-wave         → 麦克斯韦电磁场理论与电磁波（场次 1）
 *   anim-em-spectrum     → 电磁波谱与无线电波的发射与接收（场次 2）
 *
 * 参数约定（各场次 key 互不重叠，避免"同一参数多义"）：
 *   场次 0：L (H) / C (F) / Q0 (C) / showDamping
 *   场次 1：fEM (MHz)
 *   场次 2：band (谱段索引)
 *
 * ⚠️ 分派依据是 `params.scene`（而非 animId）：三个节点在同一页面内
 * 可通过左屏切换场次，画布 / 中屏图表 / 右屏必须同时跟随才不会是双真源。
 */
import {
  calculateLCConstants,
  lcChargeAt,
  lcCurrentAt,
  lcElectricEnergy,
  lcMagneticEnergy,
  lcDampingAmplitude,
  EM_SPECTRUM_BANDS,
  getSpectrumBand,
  wavelengthFromFrequency,
  frequencyFromWavelength,
  formatWavelength,
  formatFrequency,
  formatLCEnergy,
} from '@/physics'
import { EM_OSCILLATION_COLORS } from '@/theme/physics'
import type {
  Formula,
  GaokaoPoint,
  PhysicsPanelData,
  PhysicsQuantity,
  WarningItem,
} from './types'

/** LC 场次的默认参数（与 registry defaultParams 保持一致） */
const LC_DEFAULTS = { L: 1, C: 1, Q0: 1 } as const

/** 相对误差判据：用于判断是否处于极值状态 */
const EXTREME_EPS = 1e-6

/**
 * entry → 初始场次。
 *
 * ⚠️ 仅作 `params.scene` 缺省时的兜底，**不得**作为分派依据：
 * 三个节点共用同一薄壳，左屏 `controlMeta.scene` 只改 `params.scene`，
 * 画布（EMOscillationAnimation）与中屏图表（EMOscillationCenterExtra）
 * 都跟随 `params.scene`；右屏若按 `animId` 分派，在本页面切换场次后
 * 就会停留在旧场次的数据（对当前节点而言等于"悬空"）。
 */
const INITIAL_SCENE_BY_ANIM: Record<string, number> = {
  'anim-lc-oscillation': 0,
  'anim-em-wave': 1,
  'anim-em-spectrum': 2,
}

export function buildEmOscillationQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const scene = params.scene ?? INITIAL_SCENE_BY_ANIM[animId] ?? 0

  switch (scene) {
    case 1:
      return buildEMWavePanel(params)
    case 2:
      return buildSpectrumPanel(params)
    default:
      return buildLCPanel(params, time)
  }
}

// ─── 场次 0：LC 振荡电路 ──────────────────────────────────────────────────

function buildLCPanel(params: Record<string, number>, time: number): PhysicsPanelData {
  const L = params.L ?? LC_DEFAULTS.L
  const C = params.C ?? LC_DEFAULTS.C
  const Q0 = params.Q0 ?? LC_DEFAULTS.Q0
  const showDamping = (params.showDamping ?? 0) === 1

  // damped 标志交给 physics 层：q、i 与画布/波形曲线消费的是同一份取值，
  // 杜绝"画布画了衰减、右屏却仍是理想值"的双真源。
  const lc = { L, C, Q0, damped: showDamping }
  const { omega, T, f, iMax } = calculateLCConstants(lc)

  const q = lcChargeAt(lc, time)
  const i = lcCurrentAt(lc, time)
  const eElectric = lcElectricEnergy(q, C)
  const eMagnetic = lcMagneticEnergy(i, L)

  // 有阻尼时实际峰值 = 理想峰值 × 振幅系数（唯一入口）；
  // 不修正的话"电荷/电流达到极值"的高亮永远不会触发。
  const amplitude = showDamping ? lcDampingAmplitude(time, T) : 1
  const qPeak = Math.abs(Q0) * amplitude
  const iPeak = iMax * amplitude

  // 极值判定：用于右屏把"当前主导的物理量"高亮
  const atChargeExtreme = Math.abs(Math.abs(q) - qPeak) < qPeak * EXTREME_EPS
  const atCurrentExtreme = Math.abs(Math.abs(i) - iPeak) < iPeak * EXTREME_EPS

  const safeElectric = Math.abs(eElectric) < 1e-4 ? 0 : eElectric
  const safeMagnetic = Math.abs(eMagnetic) < 1e-4 ? 0 : eMagnetic
  const safeTotal = safeElectric + safeMagnetic

  // 面板渲染规则为「label + symbol」，故 label 只放中文名，符号统一放 symbol，
  // 避免出现「电容器电荷量 q q」这类符号重复。
  const quantities: PhysicsQuantity[] = [
    {
      label: '电容器电荷量',
      symbol: 'q',
      value: Math.abs(q) < 1e-6 ? 0 : q,
      unit: 'C',
      color: EM_OSCILLATION_COLORS.charge,
      highlight: atChargeExtreme ? 'extreme' : undefined,
    },
    {
      label: '回路电流',
      symbol: 'i',
      value: Math.abs(i) < 1e-6 ? 0 : i,
      unit: 'A',
      color: EM_OSCILLATION_COLORS.current,
      highlight: atCurrentExtreme ? 'extreme' : undefined,
    },
    {
      label: '电场能',
      symbol: 'Ee',
      value: formatLCEnergy(safeElectric),
      unit: 'J',
      color: EM_OSCILLATION_COLORS.electricEnergy,
      highlight: atChargeExtreme ? 'extreme' : undefined,
    },
    {
      label: '磁场能',
      symbol: 'Em',
      value: formatLCEnergy(safeMagnetic),
      unit: 'J',
      color: EM_OSCILLATION_COLORS.magneticEnergy,
      highlight: atCurrentExtreme ? 'extreme' : undefined,
    },
    {
      label: '总能量',
      symbol: 'E',
      value: formatLCEnergy(safeTotal),
      unit: 'J',
      color: EM_OSCILLATION_COLORS.totalEnergy,
      highlight: 'positive',
    },
    { label: '振荡周期', symbol: 'T', value: T, unit: 's' },
    { label: '振荡频率', symbol: 'f', value: f, unit: 'Hz' },
  ]

  const formulas: Formula[] = [
    {
      name: 'LC 回路振荡周期',
      latex: 'T = 2\\pi\\sqrt{LC}',
      condition: '无阻尼理想 LC 回路（回路电阻 R = 0）',
      note: '周期只由 L、C 决定（固有角频率 ω = 1/√(LC)），与初始电荷量 Q₀ 无关。',
      level: 'core' as const,
    },
    {
      name: '瞬时电荷与电流关系',
      latex: 'q = Q_0\\cos(\\omega t), \\quad i = -\\omega Q_0\\sin(\\omega t)',
      note: '由 i = dq/dt 导出：电流与电荷相位相差 90°，电荷最大时电流为零。',
      level: 'core' as const,
    },
    {
      name: '电磁振荡能量守恒',
      latex: 'E = E_e + E_m = \\frac{q^2}{2C} + \\frac{1}{2}Li^2 = \\frac{Q_0^2}{2C}',
      condition: '无阻尼理想回路',
      note: '电场能与磁场能在一个周期内各自完成两次完整转化，总能量守恒。',
      level: 'core' as const,
    },
  ]

  if (showDamping) {
    formulas.push({
      name: '阻尼衰减规律（定性）',
      latex: 'q(t) = Q_0 e^{-t/\\tau}\\cos(\\omega t)',
      condition: '回路存在电阻 R 时',
      note: '振幅随时间呈指数递减，电磁能逐渐转化为回路内能。',
      level: 'supplementary' as const,
    })
  }

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '电容器电荷量最大时电流为零、能量全在电场；电流最大时电荷量为零、能量全在磁场。',
      importance: 'gaokao' as const,
    },
    {
      text: 'T = 2π√(LC) 只由 L、C 决定：改变 Q₀ 只改变振幅，不改变周期。',
      importance: 'gaokao' as const,
    },
    {
      text: '电场能与磁场能在一个周期内各自完成两次完整的相互转化（各 2 次最大、2 次为零）。',
      importance: 'hard' as const,
    },
    {
      text: '实际回路存在电阻，形成振幅逐渐减小的阻尼振荡，最终转化为内能。',
      importance: 'basic' as const,
    },
  ]

  const warnings: WarningItem[] = [
    {
      text: '易错提醒：LC 回路中电流与电荷量相位差 90°，"电荷最大处电流为零"是最常考的判据。',
      level: 'danger' as const,
    },
  ]

  if (showDamping) {
    warnings.push({
      text: '已开启阻尼：电场能与磁场能之和不再守恒（能量总量随振幅平方减小），减少的部分转化为内能。',
      level: 'info' as const,
    })
  }

  if (Math.abs(omega) < 1e-12 || !Number.isFinite(T)) {
    warnings.push({
      text: '参数异常：请检查 L 与 C 是否为正数，否则回路无法振荡。',
      level: 'warning' as const,
    })
  }

  return { quantities, formulas, gaokaoPoints, warnings }
}

// ─── 场次 1：麦克斯韦电磁场理论与电磁波 ───────────────────────────────────

/** 电磁波场次默认频率 (MHz) */
const EM_WAVE_DEFAULT_FREQ_MHZ = 100

function buildEMWavePanel(params: Record<string, number>): PhysicsPanelData {
  const fMHz = params.fEM ?? EM_WAVE_DEFAULT_FREQ_MHZ
  const f = fMHz * 1e6
  const lambda = wavelengthFromFrequency(f)

  const quantities: PhysicsQuantity[] = [
    // 频率以 MHz 呈现：面板对 number 固定保留两位小数，用 Hz 会出现「100000000.00 Hz」
    { label: '电磁波频率', symbol: 'f', value: fMHz, unit: 'MHz', color: EM_OSCILLATION_COLORS.current },
    { label: '真空中波长', symbol: 'λ', value: lambda, unit: 'm', color: EM_OSCILLATION_COLORS.bFieldWave },
    { label: '传播速度', symbol: 'c', value: '3.00 × 10⁸', unit: 'm/s', color: EM_OSCILLATION_COLORS.propagation },
  ]

  const formulas: Formula[] = [
    {
      name: '波速公式',
      latex: 'c = \\lambda f',
      condition: '电磁波在真空中传播（c = 3.0×10⁸ m/s）',
      note: '同一电磁波在不同介质中频率不变、波速与波长改变。',
      level: 'core' as const,
    },
    {
      name: '波长与频率的换算',
      latex: '\\lambda = \\frac{c}{f}',
      level: 'derived' as const,
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '麦克斯韦电磁场理论两个论点：变化的磁场产生电场，变化的电场产生磁场。',
      importance: 'gaokao' as const,
    },
    {
      text: '电磁波是横波：电场 E 与磁场 B 相互垂直，且都垂直于传播方向。',
      importance: 'gaokao' as const,
    },
    {
      text: '赫兹用实验首次证实了电磁波的存在；电磁波在真空中传播无需介质。',
      importance: 'core' as const,
    },
    {
      text: '频率越高（波长越短），电磁波的穿透能力越强、电离能力越强。',
      importance: 'hard' as const,
    },
  ]

  const warnings: WarningItem[] = [
    {
      text: '易错提醒：均匀变化的磁场产生稳定的电场（不再激发变化的电场），只有周期性变化的场才能形成持续传播的电磁波。',
      level: 'warning' as const,
    },
  ]

  return { quantities, formulas, gaokaoPoints, warnings }
}

// ─── 场次 2：电磁波谱与无线电波的发射与接收 ───────────────────────────────

function buildSpectrumPanel(params: Record<string, number>): PhysicsPanelData {
  const band = getSpectrumBand(params.band ?? 0)
  const lambda = band.representativeLambda
  const f = frequencyFromWavelength(lambda)

  const quantities: PhysicsQuantity[] = [
    { label: '谱段', value: band.label, unit: '', highlight: 'extreme' },
    {
      label: '典型波长',
      symbol: 'λ',
      value: formatWavelength(lambda),
      unit: '',
      color: EM_OSCILLATION_COLORS.bFieldWave,
    },
    {
      label: '对应频率',
      symbol: 'f',
      value: formatFrequency(f),
      unit: '',
      color: EM_OSCILLATION_COLORS.current,
    },
    { label: '传播速度', symbol: 'c', value: '3.00 × 10⁸', unit: 'm/s', color: EM_OSCILLATION_COLORS.propagation },
  ]

  const formulas: Formula[] = [
    {
      name: '波速公式',
      latex: 'c = \\lambda f',
      condition: '真空中所有电磁波的传播速度均为 c',
      note: '波长越长 → 频率越低；波长越短 → 频率越高。',
      level: 'core' as const,
    },
    {
      name: '无线电波的发射与接收',
      latex: 'f_{\\text{接收}} = f_{\\text{发射}}',
      condition: '调谐时接收回路的固有频率与目标电磁波频率相同（电谐振）',
      level: 'important' as const,
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      // 教材（人教版）的谱系是 6 段；微波按定义属于无线电波的高频段。
      // 但本页中屏 / 左屏都把微波当作独立谱段（7 段），若此处只列 6 段，
      // 就会与同一面板自动生成的「谱段定位：比它波长短的是微波」自相矛盾，
      // 故显式说明"图中单列"的约定，两边口径才能对齐。
      text: '电磁波谱顺序（波长由长到短）：无线电波 → 红外线 → 可见光 → 紫外线 → X 射线 → γ 射线。微波属于无线电波的高频段；图中为便于对照，把它单独列为一个谱段。',
      importance: 'gaokao' as const,
    },
    {
      text: '顺序即频率由低到高、波长由长到短、穿透能力由弱到强、电离能力由弱到强。',
      importance: 'gaokao' as const,
    },
    {
      // 各谱段的典型应用只以文字承载（中屏画布仅呈现名称与位置，不放叙述性内容）
      text: `${band.label}的典型应用：${band.typicalApplications.join('、')}。`,
      importance: 'core' as const,
    },
    {
      text: '无线电波的发射需要开放电路与足够高的振荡频率；接收采用"调谐"选台，即电谐振。',
      importance: 'hard' as const,
    },
    {
      text: '调制（调幅/调频）用于把信号加载到高频载波上，解调用于还原信号。',
      importance: 'core' as const,
    },
  ]

  const warnings: WarningItem[] = [
    {
      text: '易错提醒：γ 射线是波长最短、频率最高、穿透能力最强的电磁波，与核衰变中的 α、β 粒子不同，它是波不是实物粒子。',
      level: 'danger' as const,
    },
  ]

  // 把相邻谱段作为"相对位置"提示补入右屏，便于学生对照记忆
  const idx = EM_SPECTRUM_BANDS.findIndex((b) => b.key === band.key)
  const prev = idx > 0 ? EM_SPECTRUM_BANDS[idx - 1].label : null
  const next = idx < EM_SPECTRUM_BANDS.length - 1 ? EM_SPECTRUM_BANDS[idx + 1].label : null
  if (prev || next) {
    warnings.push({
      text: `谱段定位：${prev ? `比它波长长的是${prev}` : '它是波长最长的谱段'}；${
        next ? `比它波长短的是${next}` : '它是波长最短的谱段'
      }。`,
      level: 'info' as const,
    })
  }

  return { quantities, formulas, gaokaoPoints, warnings }
}
