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
  lcVoltageAt,
  lcInductorEmfMagnitudeAt,
  lcOscillationStage,
  lcElectricEnergy,
  lcMagneticEnergy,
  EM_SPECTRUM_BANDS,
  getSpectrumBand,
  wavelengthFromFrequency,
  frequencyFromWavelength,
  formatWavelength,
  formatFrequency,
  formatLCEnergy,
  calculateCapacitanceWithGap,
  calculateRadioTuning,
  LC_DEFAULT_PARAMS,
  LC_PHYSICS_EPSILON,
  LC_DISPLAY_ENERGY_EPSILON,
} from '@/physics'
import { CANVAS_COLORS, EM_OSCILLATION_COLORS, ENERGY_CHART_COLORS } from '@/theme/physics'
import type {
  Formula,
  GaokaoPoint,
  PhysicsPanelData,
  PhysicsQuantity,
  WarningItem,
} from './types'

/** LC 场次的默认参数（收敛至 physics 层的 LC_DEFAULT_PARAMS） */
const LC_DEFAULTS = LC_DEFAULT_PARAMS

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
  const baseC = params.C ?? LC_DEFAULTS.C
  const dRatio = params.dRatio ?? 1.0
  const effectiveC = calculateCapacitanceWithGap(baseC, dRatio)
  const Q0 = params.Q0 ?? LC_DEFAULTS.Q0
  const showDamping = (params.showDamping ?? 0) === 1
  const switchPos = params.switchPos ?? 2
  const isCharging = switchPos === 1

  // damped 标志交给 physics 层：q、i、u_C、|e_L| 与画布/波形曲线消费的是同一份取值，
  // 杜绝"画布画了衰减、右屏却仍是理想值"的双真源。
  const lc = { L, C: effectiveC, Q0, damped: showDamping }
  const { omega, T, f, energyPeriod, iMax, eTotal } = calculateLCConstants(lc)

  const q = isCharging ? Q0 : lcChargeAt(lc, time)
  const i = isCharging ? 0 : lcCurrentAt(lc, time)
  const uC = isCharging ? Q0 / effectiveC : lcVoltageAt(lc, time)
  const eInductor = isCharging ? 0 : lcInductorEmfMagnitudeAt(lc, time)
  const { stage } = isCharging
    ? { stage: '直流充电稳态（开关接 1）' }
    : lcOscillationStage(lc, time)
  const eElectric = isCharging ? eTotal : lcElectricEnergy(q, effectiveC)
  const eMagnetic = isCharging ? 0 : lcMagneticEnergy(i, L)

  // 只有理想 LC 振荡态才使用“电荷/电压/电动势极值 ↔ 电流为零”的严格相位判据。
  // 弱阻尼下极值时刻会发生偏移，不能再用同一套高亮规则。
  const isIdealOsc = !isCharging && !showDamping
  const atChargeExtreme = isIdealOsc && Math.abs(Math.abs(q) - Math.abs(Q0)) < Math.abs(Q0) * EXTREME_EPS
  const atCurrentExtreme = isIdealOsc && Math.abs(Math.abs(i) - iMax) < iMax * EXTREME_EPS

  const safeElectric = Math.abs(eElectric) < LC_DISPLAY_ENERGY_EPSILON ? 0 : eElectric
  const safeMagnetic = Math.abs(eMagnetic) < LC_DISPLAY_ENERGY_EPSILON ? 0 : eMagnetic
  const safeTotal = safeElectric + safeMagnetic
  const safeHeat = !isCharging && showDamping ? Math.max(0, eTotal - safeTotal) : 0

  // 面板渲染规则为「label + symbol」，故 label 只放中文名，符号统一放 symbol，
  // 避免出现「电容器电荷量 q q」这类符号重复。
  const quantities: PhysicsQuantity[] = [
    {
      label: '工作阶段',
      value: stage,
      unit: '',
      color: CANVAS_COLORS.labelText,
    },
    {
      label: '电容器电荷量',
      symbol: 'q',
      value: Math.abs(q) < 1e-6 ? 0 : q,
      unit: 'C',
      color: EM_OSCILLATION_COLORS.charge,
      highlight: atChargeExtreme ? 'extreme' : undefined,
    },
    {
      label: '极板间电压',
      symbol: 'u_C',
      value: Math.abs(uC) < 1e-6 ? 0 : uC,
      unit: 'V',
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
      label: '自感电动势',
      symbol: '|e_L|',
      value: Math.abs(eInductor) < 1e-6 ? 0 : eInductor,
      unit: 'V',
      color: EM_OSCILLATION_COLORS.current,
      highlight: atChargeExtreme ? 'extreme' : undefined,
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
      label: !isCharging && showDamping ? '电磁能' : '总能量',
      symbol: !isCharging && showDamping ? 'E_em' : 'E',
      value: formatLCEnergy(safeTotal),
      unit: 'J',
      color: EM_OSCILLATION_COLORS.totalEnergy,
      highlight: 'positive',
    },
    { label: '固有周期', symbol: 'T₀', value: T, unit: 's' },
    { label: '能量变化周期', symbol: 'T_E', value: energyPeriod, unit: 's' },
    { label: '固有频率', symbol: 'f₀', value: f, unit: 'Hz' },
  ]

  if (!isCharging && showDamping) {
    quantities.push({
      label: '回路内能',
      symbol: 'Q',
      value: formatLCEnergy(safeHeat),
      unit: 'J',
      color: ENERGY_CHART_COLORS.thermal,
      highlight: 'positive',
    })
  } else {
    quantities.push({ label: '有效电容', symbol: 'C_eff', value: effectiveC, unit: 'F' })
  }

  const formulas: Formula[] = [
    {
      name: 'LC 回路振荡周期与能量周期',
      latex: 'T = 2\\pi\\sqrt{LC}, \\quad T_E = \\frac{T}{2} = \\pi\\sqrt{LC}',
      condition: '无阻尼理想 LC 回路（开关 S 接 2）',
      note: '固有周期仅由 L、C 决定，与 Q₀ 无关；电场能与磁场能每周期完成两次完整转化，故能量变化周期为 T/2。',
      level: 'core' as const,
    },
    {
      name: '平行板电容器电压与决定式',
      latex: 'u_C = \\frac{q}{C}, \\quad C = \\frac{\\varepsilon_r S}{4\\pi k d}',
      condition: '平行板电容器任意时刻（开关接 1 充电稳态时 u_C = E）',
      note: '充放电过程中 u_C 始终随电荷量 q 同步变化；增大间距 d 时 C 减小、固有周期 T 变短。',
      level: 'important' as const,
    },
    {
      name: '回路自感电动势与动力学方程',
      latex: '|e_L| = L\\left|\\frac{\\Delta i}{\\Delta t}\\right|, \\quad u_C = L\\frac{di}{dt} + iR',
      condition: 'LC / 弱阻尼 RLC 闭合回路（开关 S 接 2）',
      note: '电流 i 为零瞬间（q、u_C 达极值），电流变化率 |di/dt| 与线圈自感电动势 |e_L| 反而达到最大值。',
      level: 'important' as const,
    },
    {
      name: '理想 LC 瞬时电荷与电流',
      latex: 'q = Q_0\\cos(\\omega t), \\quad i = -\\frac{dq}{dt} = \\omega Q_0\\sin(\\omega t)',
      condition: '无阻尼理想 LC；以正电荷自上极板 A 流出经开关 2（左回路逆时针）为正方向',
      note: '电流与电荷相位差 90°；依据 d(q²)/dt = -2qi，q 与 i 同号为放电过程、异号为充电过程。',
      level: 'core' as const,
    },
    {
      name: '电磁振荡能量守恒',
      latex: 'E = E_e + E_m = \\frac{q^2}{2C} + \\frac{1}{2}Li^2 = \\frac{Q_0^2}{2C}',
      condition: '无阻尼理想回路（开关 S 接 2 且忽略辐射损耗）',
      note: '电场能与磁场能周期性互换；开关接 1 直流充电稳态下能量全部以电场能储存。',
      level: 'core' as const,
    },
  ]

  if (!isCharging && showDamping) {
    formulas.push({
      name: '弱阻尼能量转化',
      latex: 'E_e + E_m + Q_{\\text{内}} = \\frac{Q_0^2}{2C}',
      condition: '串联等效阻尼电阻 R > 0（开关 S 接 2）',
      note: 'q、i 振幅按指数衰减，电磁能减少量全部转化为电阻焦耳内能，计入内能后总能量守恒。',
      level: 'supplementary' as const,
    })
  }

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '极值互补与导数关系：q、u_C、E_e 与 |di/dt|、|e_L| 同步最大（此时 i = 0、E_m = 0）；电流 i、磁感应强度 B 与磁场能 E_m 同步最大（此时 q = 0、u_C = 0、|di/dt| = 0）。',
      importance: 'gaokao' as const,
    },
    {
      text: '四阶段充放电判据：放电时 |q| 减小、|i| 增大，E_e → E_m（电流从当前正极板流出）；充电时 |q| 增大、|i| 减小，E_m → E_e（电流流入当前正极板）。',
      importance: 'gaokao' as const,
    },
    {
      text: '能量双倍频关系：电荷 q、电流 i 的周期均为 T = 2π√(LC)；而电场能 E_e、磁场能 E_m、电压绝对值及电流强弱每半个周期重复一次，故能量周期 T_E = T/2（频率 f_E = 2f）。',
      importance: 'gaokao' as const,
    },
    {
      text: '高考压轴做功与储能突变：① 在 q=Q₀ 瞬间迅速拉大极板间距 d，Q 不变、C 减小，外力克服极板间静电引力做正功，电场能 Ee 突增；② 在 q=0 瞬间拉大间距 d，极板不带电外力不做功，总能量守恒不变，但周期 T 突变缩短。',
      importance: 'hard' as const,
    },
    {
      text: '动态电路分析：开关接 1 时电容器接直流电源（u_C = E 恒定），增大 d 则 C 减小、Q 减小；拨至 2 振荡后若外力断开电源下在峰值处拉大极板间距 d，Q 不变而 C 减小，周期 T 变短、电场能增大。',
      importance: 'gaokao' as const,
    },
    {
      text: '周期调控规律：增大线圈匝数/插入铁芯增大 L，或减小极板间距 d/插入电介质增大 C，均使 T = 2π√(LC) 增大、固有频率降低；只调电源电压 E 或 Q₀ 仅改振幅与储能，不改周期 T。',
      importance: 'core' as const,
    },
    {
      text: '电磁波发射条件：闭合小区域 LC 回路场能局限于器件附近，要有效发射电磁波必须改造为开放电路（拉开极板、减少匝数）并提高振荡频率。',
      importance: 'basic' as const,
    },
  ]

  const warnings: WarningItem[] = [
    {
      text: '易错提醒一（电流为零 ≠ 电动势为零）：当电流 i = 0 时，极板电压 u_C 与电荷量 q 恰好最大，此时电流变化率 |di/dt| 与线圈自感电动势 |e_L| 反而达到最大值。',
      level: 'danger' as const,
    },
    {
      text: '方向约定：本页取逆时针放电（正电荷自上极板 A 流出经开关 2 绕左回路流过 L）为电流正方向，由此严格满足 i = -dq/dt 与安培右手螺旋定则。',
      level: 'info' as const,
    },
  ]

  if (isCharging) {
    warnings.push({
      text: '当前开关接 1：直流电源 E 已将电容器上极板充至 +Q₀，电感支路处于断路；拨至开关 2 即可开始 LC 电磁振荡。',
      level: 'info' as const,
    })
  } else if (showDamping) {
    warnings.push({
      text: '已串联阻尼电阻 R：电磁能逐渐转化为焦耳内能，理想 LC 的四分之一周期相位吸附已停用，计入内能后总能量守恒。',
      level: 'info' as const,
    })
  }

  if (Math.abs(omega) < LC_PHYSICS_EPSILON || !Number.isFinite(T)) {
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
      text: '变化的磁场激发感生电场（涡旋电场）：其电场线是闭合曲线，闭合回路上遵循安培/楞次右手螺旋规律。',
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
    {
      text: '物理学史考点：麦克斯韦建立了电磁场理论并预言电磁波，赫兹通过火花放电实验首次证实了电磁波的存在。',
      level: 'info' as const,
    },
  ]

  return { quantities, formulas, gaokaoPoints, warnings }
}

// ─── 场次 2：电磁波谱与无线电波的发射与接收 ───────────────────────────────

function buildSpectrumPanel(params: Record<string, number>): PhysicsPanelData {
  if (params.radioMode === 2) {
    // ── 无线电调制与检波全链路子模式 ──
    const isFM = (params.modType ?? 0) === 1
    const quantities: PhysicsQuantity[] = [
      { label: '调制体制', value: isFM ? '调频 (FM)' : '调幅 (AM)', unit: '', color: EM_OSCILLATION_COLORS.current, highlight: 'positive' },
      { label: '基带信号', value: '低频音频', unit: '20Hz ~ 20kHz', color: CANVAS_COLORS.labelText },
      { label: '载波信号', value: '高频等幅波', unit: 'MHz 级', color: EM_OSCILLATION_COLORS.current },
      { label: '检波器件', value: '二极管单向导电', unit: '', color: EM_OSCILLATION_COLORS.charge },
      { label: '解调还原', value: 'RC 低通滤波', unit: '', color: CANVAS_COLORS.labelText },
    ]

    const formulas: Formula[] = [
      {
        name: '调幅信号表达式 (AM)',
        latex: 's_{\\text{AM}}(t) = [A_0 + s_m(t)]\\cos(\\omega_c t)',
        condition: '调幅过程（振幅随音频信号线性变化，包络与原信号同形）',
        note: '高频载波角频率 ω_c 远大于低频音频角频率 ω_m；调幅波包络的上下轮廓线与音频信号同形。',
        level: 'core' as const,
      },
      {
        name: '二极管检波半波整流与包络检波',
        latex: 'v_{\\text{检波}}(t) = \\max(0, s_{\\text{AM}}(t)) \\xrightarrow{\\text{RC滤波}} s_m(t)',
        condition: '接收机解调过程（二极管单向导电切除负半周，RC 滤波去除高频载波还原音频）',
        level: 'important' as const,
      },
    ]

    const gaokaoPoints: GaokaoPoint[] = [
      {
        text: '新高考必考波形辨析四图：① 音频信号（低频正弦波，不能直接辐射）；② 高频载波（等幅密集振荡）；③ 调幅波（高频振荡振幅随音频变化）；④ 检波信号（半波整流脉冲）与滤波输出（还原平滑音频）。',
        importance: 'gaokao' as const,
      },
      {
        text: '调幅与调频核心区别：调幅（AM）是使高频载波的振幅随信号改变；调频（FM）是使高频载波的频率随信号改变（抗干扰能力更强）。',
        importance: 'core' as const,
      },
      {
        text: '无线电通信全链四步：调制（音频装载到高频） ⟶ 发射（开放天线光速辐射） ⟶ 调谐（电谐振选台） ⟶ 检波/解调（二极管与RC滤波还原声音）。',
        importance: 'gaokao' as const,
      },
    ]

    const warnings: WarningItem[] = [
      {
        text: '高考术语辨析陷阱：调制是发射端的动作；调谐是接收端通过电谐振选出目标频率；解调（检波）是从高频波中还原音频信号，三者绝不能混为一谈。',
        level: 'danger' as const,
      },
    ]

    return { quantities, formulas, gaokaoPoints, warnings }
  }

  if (params.radioMode === 1) {
    // ── 无线电发射与接收（调谐）子模式 ──
    const cRx = params.cRx ?? 1.0
    const tuning = calculateRadioTuning(100e6, cRx)
    const fTxMHz = tuning.fTx / 1e6
    const fRxMHz = tuning.fRx / 1e6
    const isTuned = tuning.isTuned
    const responsePct = Math.round(tuning.response * 100)

    const quantities: PhysicsQuantity[] = [
      { label: '电台发射频率', symbol: 'f_Tx', value: fTxMHz, unit: 'MHz', color: EM_OSCILLATION_COLORS.propagation },
      {
        label: '接收固有频率',
        symbol: 'f_0',
        value: Number(fRxMHz.toFixed(1)),
        unit: 'MHz',
        color: isTuned ? EM_OSCILLATION_COLORS.current : CANVAS_COLORS.labelText,
        highlight: isTuned ? 'extreme' : undefined,
      },
      { label: '调谐电容', symbol: 'C_rx', value: cRx, unit: 'C₀', color: EM_OSCILLATION_COLORS.charge },
      {
        label: '信号响应度',
        symbol: 'I/I_0',
        value: `${responsePct}%`,
        unit: '',
        color: isTuned ? EM_OSCILLATION_COLORS.current : CANVAS_COLORS.textMuted,
        highlight: isTuned ? 'extreme' : undefined,
      },
      {
        label: '调谐状态',
        value: isTuned ? '电谐振·选台成功' : '失谐无信号',
        unit: '',
        highlight: isTuned ? 'positive' : undefined,
      },
    ]

    const formulas: Formula[] = [
      {
        name: '电谐振调谐条件',
        latex: 'f_0 = \\frac{1}{2\\pi\\sqrt{LC}} = f_{\\text{发射}}',
        condition: '接收回路固有频率等于所要接收电磁波的频率时发生电谐振',
        note: '感应电流达到最大值，实现选台。实际调频回路中通常为 pF 级电容（基准 C₀ ≈ 25.3 pF）与 μH 级电感（L ≈ 0.1 μH）。',
        level: 'core' as const,
      },
      {
        name: '可变电容器调节与选台规律',
        latex: 'C = \\frac{\\varepsilon_r S}{4\\pi k d} \\implies f_0 \\propto \\frac{1}{\\sqrt{C}}',
        condition: '接收较低频率电台时需减小 f₀，即应增大电容 C（增大极板面积 S、减小间距 d）',
        level: 'important' as const,
      },
    ]

    const gaokaoPoints: GaokaoPoint[] = [
      {
        text: '选台原理（电谐振）：旋转可变电容器改变 C，使接收回路固有频率与目标电台频率相同。',
        importance: 'gaokao' as const,
      },
      {
        text: '高考高频题眼：由接收高频电台转为低频电台，需使固有频率减小，方法是增大 C（增大正对面积 S、减小间距 d）或增大 L（插入铁芯、增加匝数）。',
        importance: 'gaokao' as const,
      },
      {
        text: '无线电三步过程：调制（信号装载到高频载波）→ 发射（开放天线）→ 调谐（电谐振选台）→ 解调/检波（还原原始信号）。',
        importance: 'core' as const,
      },
    ]

    const warnings: WarningItem[] = [
      {
        text: '高考易混淆术语：调制是发送端将低频信号加到高频波上；调谐是接收端通过电谐振选择电台；解调（检波）是从高频载波中还原声音信号。',
        level: 'danger' as const,
      },
    ]

    return { quantities, formulas, gaokaoPoints, warnings }
  }

  // ── 默认：电磁波谱全景 ──
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
      text: '电磁波谱顺序（波长由长到短）：无线电波 → 红外线 → 可见光 → 紫外线 → X 射线 → γ 射线。微波属于无线电波的高频段；图中为便于对照，把它单独列为一个谱段。',
      importance: 'gaokao' as const,
    },
    {
      text: '顺序即频率由低到高、波长由长到短、穿透能力由弱到强、电离能力由弱到强。',
      importance: 'gaokao' as const,
    },
    {
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
