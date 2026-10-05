import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { calculateLCConstants, LC_DEFAULT_PARAMS } from '@/physics'
import type { ControlMeta, ParamMeta } from '../types'

/**
 * 电磁振荡与电磁波 — 动画注册表
 *
 * 3 个知识节点（electricity-6-1 / 6-2 / 6-3）各自独立登记 entry，
 * 但共用同一个薄壳组件 `EMOscillationAnimation`，由 `defaultParams.scene` 决定初始场次，
 * 左屏 `controlMeta.scene` 可在同一页面内切换场次。
 *
 * 这样既满足「一节点一 entry」（知识树与进度系统按 entry 记账），
 * 又避免为 3 个场次各写一个重复的编排层，同时把单文件行数控制在铁律之内。
 */

/** 场次 0 默认参数（收敛至 physics 层的 LC_DEFAULT_PARAMS） */
const LC_L_DEFAULT = LC_DEFAULT_PARAMS.L
const LC_C_DEFAULT = LC_DEFAULT_PARAMS.C

/**
 * 循环上限 = 2 个完整振荡周期。
 *
 * 周期由 L、C 唯一决定（T = 2π√(LC)），必须复用 physics 层的计算结果，
 * 禁止在注册表里重复写一遍公式（双真源）。
 */
function lcMaxTime(params: Record<string, number>): number {
  const L = params.L ?? LC_L_DEFAULT
  const baseC = params.C ?? LC_C_DEFAULT
  const dRatio = params.dRatio ?? 1
  const C = baseC / Math.max(0.1, dRatio)
  if (!(L > 0) || !(C > 0)) return 30
  return 2 * calculateLCConstants({ L, C, Q0: 1 }).T
}

/** 4 个相位关键点，供进度条标记与一键吸附定格 */
function lcCriticalTimes(params: Record<string, number>) {
  if (params.scene !== 0 && params.scene !== undefined) return []
  const L = params.L ?? LC_L_DEFAULT
  const baseC = params.C ?? LC_C_DEFAULT
  const dRatio = params.dRatio ?? 1
  const C = baseC / Math.max(0.1, dRatio)
  if (!(L > 0) || !(C > 0)) return []
  const { T } = calculateLCConstants({ L, C, Q0: 1 })
  return [
    { time: T / 4, label: '电荷为零·电流最大', variant: 'critical' as const },
    { time: T / 2, label: '电荷反向最大·电流为零', variant: 'info' as const },
    { time: (3 * T) / 4, label: '电荷为零·电流反向最大', variant: 'critical' as const },
    { time: T, label: '回到初始状态（一个周期）', variant: 'info' as const },
    { time: 2 * T, label: '第二个周期结束', variant: 'info' as const },
  ]
}

/** 三个 entry 共用的场景与参数声明 */
const sharedParams = {
  scene: 0,
  // ── 场次 0：LC 振荡 ──
  L: LC_L_DEFAULT,
  C: LC_C_DEFAULT,
  dRatio: 1.0,
  Q0: 1,
  showDamping: 0,
  // ── 场次 1：电磁波 ──
  fEM: 100,
  // ── 场次 2：电磁波谱与无线电 ──
  radioMode: 0, // 0: 波谱全景, 1: 无线电发射与接收（调谐）
  band: 0,
  cRx: 1.0, // 接收端调谐电容 (μF)
} as const

const sharedParamMeta: ParamMeta[] = [
  {
    key: 'L',
    label: '电感 L',
    min: 0.1,
    max: 4,
    step: 0.1,
    unit: 'H',
    showIf: 'scene',
    showIfValue: 0,
    group: 'LC 回路参数',
    description: '增大电感会使振荡周期变长（T ∝ √(LC)）',
    marks: [
      { value: 0.4, label: '基准 0.4H' },
      { value: 1.6, label: '4倍L(T加倍)', variant: 'critical' as const },
    ],
  },
  {
    key: 'C',
    label: '基准电容 C',
    min: 0.1,
    max: 4,
    step: 0.1,
    unit: 'F',
    showIf: 'scene',
    showIfValue: 0,
    group: 'LC 回路参数',
    description: '增大电容会使振荡周期变长（T ∝ √(LC)）',
    marks: [
      { value: 0.4, label: '基准 0.4F' },
      { value: 1.6, label: '4倍C(T加倍)', variant: 'critical' as const },
    ],
  },
  {
    key: 'dRatio',
    label: '板间距离 d',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    unit: 'd₀',
    showIf: 'scene',
    showIfValue: 0,
    group: 'LC 回路参数',
    description: '拉开极板使电容减小（C ∝ 1/d），振荡周期变短、频率升高',
    marks: [
      { value: 0.5, label: '0.5d₀' },
      { value: 1.0, label: '基准 d₀' },
      { value: 2.0, label: '2d₀(C减半/f升√2倍)', variant: 'critical' as const },
    ],
  },
  {
    key: 'Q0',
    label: '初始电荷量 Q₀',
    min: 0.1,
    max: 5,
    step: 0.1,
    unit: 'C',
    showIf: 'scene',
    showIfValue: 0,
    group: 'LC 回路参数',
    description: '只改变振幅，不改变周期',
  },
  {
    key: 'fEM',
    label: '电磁波频率 f',
    min: 100,
    max: 1000,
    step: 10,
    unit: 'MHz',
    showIf: 'scene',
    showIfValue: 1,
    group: '电磁波参数',
    description: 'λ = c / f，频率越高波长越短；画布横轴为 0–3.0 m 的真实长度',
    marks: [
      { value: 100, label: '100MHz(λ=3m)' },
      { value: 300, label: '300MHz(λ=1m)', variant: 'critical' as const },
    ],
  },
  {
    key: 'cRx',
    label: '调谐电容 C',
    min: 0.25,
    max: 2.5,
    step: 0.05,
    unit: 'μF',
    showIf: 'scene',
    showIfValue: 2,
    hideIf: 'radioMode',
    hideIfValue: 0,
    group: '接收回路可变电容',
    description: '调节电容使接收回路固有频率与电台相同（发生电谐振选台）',
    marks: [
      { value: 0.5, label: '141MHz' },
      { value: 1.0, label: '100MHz(电谐振点)', variant: 'critical' as const },
      { value: 2.0, label: '70.7MHz' },
    ],
  },
]

const sharedControlMeta: ControlMeta[] = [
  {
    type: 'segmented' as const,
    key: 'scene',
    label: '演示场次',
    resetOnChange: true,
    options: [
      { value: 0, label: 'LC 振荡' },
      { value: 1, label: '电磁波' },
      { value: 2, label: '电磁波谱' },
    ],
  },
  // ── 高考真题一键预设（gaokao-enhancement Skill 规范） ──
  {
    type: 'preset' as const,
    label: '📋 2022全国乙卷真题（LC振荡充放电与能量转化）',
    description: 'L=0.4H, C=0.4F, Q₀=1.0C，观察电荷-电流90°相位与能量互换',
    params: { scene: 0, L: 0.4, C: 0.4, dRatio: 1.0, Q0: 1.0, showDamping: 0 },
    restartOnApply: true,
    showIf: 'scene',
    showIfValue: 0,
  },
  {
    type: 'preset' as const,
    label: '📋 2021浙江选考真题（麦克斯韦理论与电磁波性质）',
    description: 'f=100MHz, λ=3.0m，周期性电场与磁场正交同相同步传播',
    params: { scene: 1, fEM: 100 },
    restartOnApply: true,
    showIf: 'scene',
    showIfValue: 1,
  },
  {
    type: 'preset' as const,
    label: '📋 2020浙江选考真题（收音机LC调谐与电谐振选台）',
    description: '目标电台f=100MHz，调节可变电容C=1.0μF达成电谐振（感应电流最大）',
    params: { scene: 2, radioMode: 1, cRx: 1.0 },
    restartOnApply: true,
    showIf: 'scene',
    showIfValue: 2,
  },
  {
    type: 'toggle' as const,
    key: 'showDamping',
    label: '考虑阻尼（定性）',
    group: 'LC 回路参数',
    showIf: 'scene',
    showIfValue: 0,
  },
  {
    type: 'segmented' as const,
    key: 'radioMode',
    label: '子模块',
    group: '电磁波谱与无线电',
    showIf: 'scene',
    showIfValue: 2,
    resetOnChange: true,
    options: [
      { value: 0, label: '波谱全景' },
      { value: 1, label: '无线电调谐' },
    ],
  },
  {
    type: 'segmented' as const,
    key: 'band',
    label: '谱段',
    group: '电磁波谱',
    showIf: 'scene',
    showIfValue: 2,
    hideIf: 'radioMode',
    hideIfValue: 1,
    resetOnChange: true,
    options: [
      { value: 0, label: '无线电' },
      { value: 1, label: '微波' },
      { value: 2, label: '红外' },
      { value: 3, label: '可见' },
      { value: 4, label: '紫外' },
      { value: 5, label: 'X' },
      { value: 6, label: 'γ' },
    ],
  },
  {
    type: 'tip' as const,
    showIf: 'scene',
    showIfValue: 0,
    content:
      '观察电容器电荷量与回路电流的相位关系：电荷最大时电流为零，电流最大时电荷为零。拉开极板间距 d 可直观看到电容变小、振荡加快。',
  },
  {
    type: 'tip' as const,
    showIf: 'scene',
    showIfValue: 1,
    content:
      '电磁波是横波：E、B 在空间上相互垂直，且都垂直于传播方向；真空中平面波的 E 与 B 同相位。图中 B 轴为斜投影透视，B 波峰相对 E 波峰的水平错位是投影效果，不是相位差。',
  },
  {
    type: 'tip' as const,
    showIf: 'scene',
    showIfValue: 2,
    hideIf: 'radioMode',
    hideIfValue: 1,
    content: '按波长由长到短记忆谱段顺序，并对照各谱段的典型应用。',
  },
  {
    type: 'tip' as const,
    showIf: 'scene',
    showIfValue: 2,
    hideIf: 'radioMode',
    hideIfValue: 0,
    content:
      '高考调谐模型：旋转可变电容器使接收端 LC 回路固有频率等于发射电台频率（f₀ = 1/(2π√(LC))），回路发生电谐振，感应电流最大，完成选台。',
  },
]

const sharedVisual = {
  controlsMode: (params: Record<string, number>) => {
    if (params.scene === 2) {
      return params.radioMode === 1 ? ('loop' as const) : ('param' as const)
    }
    if (params.scene === 1) return 'loop' as const
    return 'timed' as const // 场次 0（LC 振荡）使用 timed，全面激活进度条、关键相位吸附与定格分析
  },
  maxTime: lcMaxTime,
  enableFrameStep: true,
  CenterExtra: lazy(() => import('@/features/electromagnetism/em-oscillation/EMOscillationCenterExtra')),
  centerLayout: 'splitV' as const,
}

export const electromagnetismEmOscillationAnimations = defineAnimations({
  // ── electricity-6-1 电磁振荡（LC 振荡电路）────────────────────────────
  'anim-lc-oscillation': {
    title: '电磁振荡（LC 振荡电路）',
    knowledgeId: 'electricity-6-1',
    Component: lazy(() => import('@/features/electromagnetism/em-oscillation/EMOscillationAnimation')),
    defaultParams: { ...sharedParams, scene: 0 } as const,
    paramMeta: sharedParamMeta,
    controlMeta: sharedControlMeta,
    criticalTimes: lcCriticalTimes,
    ...sharedVisual,
  },

  // ── electricity-6-2 麦克斯韦电磁场理论与电磁波 ────────────────────────
  'anim-em-wave': {
    title: '麦克斯韦电磁场理论与电磁波',
    knowledgeId: 'electricity-6-2',
    Component: lazy(() => import('@/features/electromagnetism/em-oscillation/EMOscillationAnimation')),
    defaultParams: { ...sharedParams, scene: 1 } as const,
    paramMeta: sharedParamMeta,
    controlMeta: sharedControlMeta,
    ...sharedVisual,
  },

  // ── electricity-6-3 电磁波谱与无线电波的发射与接收 ────────────────────
  'anim-em-spectrum': {
    title: '电磁波谱与无线电波的发射与接收',
    knowledgeId: 'electricity-6-3',
    Component: lazy(() => import('@/features/electromagnetism/em-oscillation/EMOscillationAnimation')),
    defaultParams: { ...sharedParams, scene: 2 } as const,
    paramMeta: sharedParamMeta,
    controlMeta: sharedControlMeta,
    ...sharedVisual,
  },
})
