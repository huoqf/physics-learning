/**
 * 磁感应强度比值定义实验与磁通量投影计算纯函数
 *
 * @agent-rule 零副作用，不依赖 React/DOM/window
 * @agent-rule 所有数据结构可序列化（IndexedDB 兼容）
 * @agent-rule 见 docs/agent-rules/core/ARCHITECTURE_RULES.md §4
 */

/** 悬吊导线框自重 G₀ (N) */
export const WIRE_FRAME_GRAVITY_N = 0.5

/** 探测定量实验 5 组典型接入有效长度抽头 (m) */
export const TAP_LENGTHS_M = [0.05, 0.1, 0.15, 0.2, 0.25] as const

/** 磁通量投影演示总磁感线数量（根） */
export const FLUX_FIELD_LINE_COUNT = 9

export interface BFieldRatioParams {
  /** 待测磁感应强度 B (T) */
  B: number
  /** 检验电流 I (A) */
  I: number
  /** 接入磁场中的导线有效长度 L (m) */
  L: number
  /** 电流与磁场方向夹角 θ_IB (°) */
  thetaIB: number
  /** 当前图表的横轴选择（可选：0=F-I, 1=F-L, 2=F-IL） */
  chartAxis?: number
}

export interface BFieldRatioSamplePoint {
  /** 横轴电流元 IL (A·m) */
  x: number
  /** 纵轴安培力 F (N) */
  y: number
  /** 抽头接入长度 L (m) */
  L: number
  /** 当前电流 I (A) */
  I: number
  /** 对应的安培力 F (N) */
  F: number
  /** 抽头标签 */
  label: string
}

export interface BFieldRatioResult {
  /** 待测磁感应强度 B (T) */
  B: number
  /** 检验电流 I (A) */
  I: number
  /** 接入有效长度 L (m) */
  L: number
  /** 导线与磁场夹角 θ_IB (°) */
  thetaIB: number
  /** 垂直电流方向的磁场分量 B_⊥ = B·sinθ_IB (T) */
  B_perp: number
  /** 电流元 IL (A·m) */
  currentElementIL: number
  /** 安培力大小 F = B·I·L·sinθ_IB (N) */
  ampereForceF: number
  /** 悬吊线框自重 G₀ (N) */
  wireGravityG: number
  /** 弹簧测力计总示数 T = G₀ + F (N) */
  springReadingT: number
  /** 实测比值 F/(IL) = B·sinθ_IB (N/(A·m)) */
  measuredRatio: number
  /** F–I 图直线斜率 k_I = B·L·sinθ_IB (N/A) */
  slopeFI: number
  /** F–L 图直线斜率 k_L = B·I·sinθ_IB (N/m) */
  slopeFL: number
  /** F–(IL) 图直线斜率 k_IL = B·sinθ_IB (T) */
  slopeFIL: number
  /** F–I 关系直线端点集 (I ∈ [0, 5.0] A) */
  fiPoints: { x: number; y: number }[]
  /** F–L 关系直线端点集 (L ∈ [0, 0.30] m) */
  flPoints: { x: number; y: number }[]
  /** F–(IL) 关系直线端点集 (IL ∈ [0, 1.50] A·m) */
  filPoints: { x: number; y: number }[]
  /** 当前电流 I 下 5 档抽头长度 L 的样本点 */
  tapSamples: BFieldRatioSamplePoint[]
}

/**
 * 计算控制变量法探究磁感应强度比值定义 B = F/(IL) 的物理状态与图像数据。
 *
 * 物理模型：通电直导线段水平悬挂在弹簧测力计下端，垂直置于匀强磁场中，
 * 当安培力方向竖直向下时，测力计拉力 T = G₀ + F_安。
 * 通过调节电流 I 或抽头长度 L，保持比值 F/(IL) = B·sinθ_IB 恒定。
 */
export function computeBFieldRatioExperiment(
  params: BFieldRatioParams,
): BFieldRatioResult {
  const { B, I, L, thetaIB } = params
  const radIB = (thetaIB * Math.PI) / 180
  const B_perp = B * Math.sin(radIB)
  const currentElementIL = I * L
  const ampereForceF = B_perp * currentElementIL
  const wireGravityG = WIRE_FRAME_GRAVITY_N
  const springReadingT = wireGravityG + ampereForceF
  const measuredRatio = currentElementIL > 1e-9 ? ampereForceF / currentElementIL : 0

  const slopeFI = B_perp * L
  const slopeFL = B_perp * I
  const slopeFIL = B_perp

  const fiPoints = [
    { x: 0, y: 0 },
    { x: 5.0, y: slopeFI * 5.0 },
  ]
  const flPoints = [
    { x: 0, y: 0 },
    { x: 0.3, y: slopeFL * 0.3 },
  ]
  const filPoints = [
    { x: 0, y: 0 },
    { x: 1.5, y: slopeFIL * 1.5 },
  ]

  const tapSamples: BFieldRatioSamplePoint[] = TAP_LENGTHS_M.map((tapL) => {
    const il = I * tapL
    const force = B_perp * il
    return {
      x: il,
      y: force,
      L: tapL,
      I,
      F: force,
      label: `L=${tapL.toFixed(2)}m`,
    }
  })

  return {
    B,
    I,
    L,
    thetaIB,
    B_perp,
    currentElementIL,
    ampereForceF,
    wireGravityG,
    springReadingT,
    measuredRatio,
    slopeFI,
    slopeFL,
    slopeFIL,
    fiPoints,
    flPoints,
    filPoints,
    tapSamples,
  }
}

export interface MagneticFluxParams {
  /** 匀强磁感应强度 B (T) */
  B: number
  /** 线圈面积 S (m²) */
  S: number
  /** 线圈正面法线 n̂ 与磁场 B 方向夹角 θ (° , 0° ~ 180°) */
  thetaNormal: number
}

export interface MagneticFluxResult {
  /** 匀强磁感应强度 B (T) */
  B: number
  /** 线圈总面积 S (m²) */
  S: number
  /** 线圈法线 n̂ 与磁场 B 夹角 θ (°) */
  thetaNormal: number
  /** 线圈平面与磁场方向的有向夹角 α = 90° - θ (° , -90° ~ 90°) */
  planeAngleAlpha: number
  /** 线圈平面与磁场方向的锐角/直角夹角 |α| (° , 0° ~ 90°) */
  planeAngleAbs: number
  /** cosθ */
  cosTheta: number
  /** sinθ */
  sinTheta: number
  /** 垂直于磁场方向的有效投影面积大小 S_⊥ = S·|cosθ| (m²) */
  projAreaSPerp: number
  /** 有向投影面积 S·cosθ (m²) */
  signedProjArea: number
  /** 垂直线圈平面的磁场分量 B_⊥ = B·cosθ (T) */
  B_perp: number
  /** 平行线圈平面的磁场分量 B_∥ = B·sinθ (T) */
  B_para: number
  /** 当前磁通量 Φ = B·S·cosθ (Wb) */
  phi: number
  /** 初态 (θ = 0°) 正面垂直穿入的磁通量 Φ₁ = B·S (Wb) */
  phiInitial: number
  /** 相对初态 (θ = 0°) 的磁通量变化量 ΔΦ = Φ - Φ₁ = B·S·(cosθ - 1) (Wb) */
  deltaPhiFromZero: number
  /** 磁感线穿入侧面标记：front=正面穿入(+)，back=反面穿入(-)，parallel=平行(0) */
  fluxSide: 'front' | 'back' | 'parallel'
  /** 穿过线圈投影面的有效磁感线条数（总计 9 条中按 |cosθ| 比例穿过） */
  effectiveLineCount: number
  /** Φ–θ 余弦曲线采样点（0° ~ 180°，步长 3°，共 61 点） */
  curvePoints: { x: number; y: number }[]
}

/**
 * 计算一般倾斜情形下匀强磁场穿过线圈的投影面积与磁通量 Φ = B·S·cosθ。
 */
export function computeMagneticFluxState(
  params: MagneticFluxParams,
): MagneticFluxResult {
  const { B, S, thetaNormal } = params
  const rad = (thetaNormal * Math.PI) / 180
  const cosTheta = Math.cos(rad)
  const sinTheta = Math.sin(rad)
  const planeAngleAlpha = 90 - thetaNormal
  const planeAngleAbs = Math.abs(planeAngleAlpha)

  const signedProjArea = S * cosTheta
  const projAreaSPerp = S * Math.abs(cosTheta)
  const B_perp = B * cosTheta
  const B_para = B * sinTheta
  const phi = B * S * cosTheta
  const phiInitial = B * S
  const deltaPhiFromZero = phi - phiInitial

  const absCos = Math.abs(cosTheta)
  const fluxSide: 'front' | 'back' | 'parallel' =
    cosTheta > 1e-4 ? 'front' : cosTheta < -1e-4 ? 'back' : 'parallel'

  const effectiveLineCount =
    absCos < 0.02
      ? 0
      : [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter(
          (k) => Math.abs(k) / 4 <= absCos + 1e-4,
        ).length

  const curvePoints: { x: number; y: number }[] = []
  for (let deg = 0; deg <= 180; deg += 3) {
    const r = (deg * Math.PI) / 180
    curvePoints.push({
      x: deg,
      y: B * S * Math.cos(r),
    })
  }

  return {
    B,
    S,
    thetaNormal,
    planeAngleAlpha,
    planeAngleAbs,
    cosTheta,
    sinTheta,
    projAreaSPerp,
    signedProjArea,
    B_perp,
    B_para,
    phi,
    phiInitial,
    deltaPhiFromZero,
    fluxSide,
    effectiveLineCount,
    curvePoints,
  }
}
