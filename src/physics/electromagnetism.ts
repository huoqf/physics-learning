/**
 * 电磁学纯函数库（[M4-1]）。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * ⚠️ 库仑力 calculateCoulombForce 已在 src/physics/dynamics.ts 实现，
 *    此处不重复定义，使用方直接从 '@/physics' 引入即可。
 */

/** 点电荷电场强度 E = kq/r²（N/C） */
export function calculateElectricField(k: number, q: number, r: number): { E: number } {
  return { E: (k * q) / (r * r) }
}

/** 点电荷电势 V = kq/r（V） */
export function calculateElectricPotential(k: number, q: number, r: number): { V: number } {
  return { V: (k * q) / r }
}

/** 平行板电容 C = εS/d（F） */
export function calculateCapacitor(epsilon: number, S: number, d: number): { C: number } {
  return { C: (epsilon * S) / d }
}

/** 欧姆定律 I = U/R（A） */
export function calculateOhmLaw(U: number, R: number): { I: number } {
  return { I: U / R }
}

/** 串联电阻 R_total = ΣR（Ω） */
export function calculateSeriesResistance(Rs: number[]): { R_total: number } {
  return { R_total: Rs.reduce((sum, r) => sum + r, 0) }
}

/** 并联电阻 1/R_total = Σ(1/R)（Ω）；空数组或含 0 电阻时返回 0 */
export function calculateParallelResistance(Rs: number[]): { R_total: number } {
  if (Rs.length === 0 || Rs.some((r) => r === 0)) return { R_total: 0 }
  const inv = Rs.reduce((sum, r) => sum + 1 / r, 0)
  return { R_total: 1 / inv }
}

/**
 * 闭合电路欧姆定律。
 * I = EMF/(R_ext + r)，路端电压 U = EMF - I·r
 * 输出功率 P_output = U·I，总功率 P_total = EMF·I，效率 eta = P_output/P_total
 */
export function calculateClosedCircuit(
  EMF: number,
  r: number,
  R_ext: number
): { I: number; U_terminal: number; P_output: number; P_total: number; eta: number } {
  const I = EMF / (R_ext + r)
  const U_terminal = EMF - I * r
  const P_output = U_terminal * I
  const P_total = EMF * I
  const eta = P_total === 0 ? 0 : P_output / P_total
  return { I, U_terminal, P_output, P_total, eta }
}

/** 安培力 F = BIL·sinθ（N），θ 为电流与磁场夹角 */
export function calculateAmpereForce(
  B: number,
  I: number,
  L: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: B * I * L * Math.sin(angleRad) }
}

/** 洛伦兹力 F = qvB·sinθ（N），θ 为速度与磁场夹角 */
export function calculateLorentzForce(
  q: number,
  v: number,
  B: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: q * v * B * Math.sin(angleRad) }
}

/**
 * 带电粒子在匀强磁场中圆周运动（垂直入射）。
 * r = mv/(qB)，T = 2πm/(qB)，ω = qB/m
 */
export function calculateChargeInMagField(
  q: number,
  m: number,
  v: number,
  B: number
): { r: number; T: number; omega: number } {
  const denom = q * B
  const r = denom === 0 ? 0 : (m * v) / denom
  const T = denom === 0 ? 0 : (2 * Math.PI * m) / denom
  const omega = m === 0 ? 0 : denom / m
  return { r, T, omega }
}

/** 法拉第电磁感应定律 EMF = N·(dΦ/dt)（V） */
export function calculateFaradayEMF(N: number, dPhi_dt: number): { EMF: number } {
  return { EMF: N * dPhi_dt }
}

/**
 * 楞次定律计算。
 *
 * @param magnetPole    磁极指向：1=N极朝下, -1=S极朝下
 * @param velocity      速度：正值=远离线圈, 负值=靠近线圈
 * @param coilN         线圈匝数
 * @returns 楞次定律分析结果
 */
export function calculateLenzsLaw(
  magnetPole: number,
  velocity: number
): {
  originalFieldDirection: 'up' | 'down'
  fluxChange: 'increasing' | 'decreasing' | 'stable'
  inducedFieldDirection: 'up' | 'down'
  inducedCurrentDirection: 'clockwise' | 'counterclockwise'
  equivalentPole: 'N' | 'S' | null
  forceType: 'repulsion' | 'attraction' | null
  currentAction: string
} {
  // 原磁场方向（N极朝下磁场向下，S极朝下磁场向上）
  const originalFieldDirection: 'up' | 'down' = magnetPole > 0 ? 'down' : 'up'

  // 磁通量变化（速度负=靠近=磁通增加，速度正=远离=磁通减少）
  const fluxChange: 'increasing' | 'decreasing' | 'stable' =
    velocity < -0.1 ? 'increasing' :
    velocity > 0.1 ? 'decreasing' : 'stable'

  // 楞次定律：感应磁场阻碍原磁通变化
  const inducedFieldDirection: 'up' | 'down' =
    fluxChange === 'increasing'
      ? (originalFieldDirection === 'down' ? 'up' : 'down')
      : fluxChange === 'decreasing'
      ? originalFieldDirection
      : 'up' // stable时默认向上

  // 感应电流方向（右手定则：感应磁场向上=逆时针，向下=顺时针）
  const inducedCurrentDirection: 'clockwise' | 'counterclockwise' =
    inducedFieldDirection === 'up' ? 'counterclockwise' : 'clockwise'

  // 等效磁极（上端与感应磁场方向对应）
  const equivalentPole: 'N' | 'S' | null =
    fluxChange === 'stable' ? null :
    inducedFieldDirection === 'up' ? 'N' : 'S'

  // 力反馈（阻碍原理：靠近排斥，远离吸引）
  const forceType: 'repulsion' | 'attraction' | null =
    fluxChange === 'increasing' ? 'repulsion' :
    fluxChange === 'decreasing' ? 'attraction' : null

  // 当前动作描述
  const currentAction =
    magnetPole > 0
      ? (velocity < 0 ? 'N极靠近' : 'N极远离')
      : (velocity < 0 ? 'S极靠近' : 'S极远离')

  return {
    originalFieldDirection,
    fluxChange,
    inducedFieldDirection,
    inducedCurrentDirection,
    equivalentPole,
    forceType,
    currentAction,
  }
}

/**
 * 理想变压器。
 * U2 = U1·(n2/n1)，I2 = I1·(n1/n2)（功率守恒）
 */
export function calculateTransformer(
  n1: number,
  n2: number,
  U1: number,
  I1: number
): { U2: number; I2: number } {
  const U2 = n1 === 0 ? 0 : U1 * (n2 / n1)
  const I2 = n2 === 0 ? 0 : I1 * (n1 / n2)
  return { U2, I2 }
}

/** 正弦交流有效值 V_rms = V_peak/√2，I_rms 同理（此处复用同一峰值口径） */
export function calculateACRMS(V_peak: number): { V_rms: number; I_rms: number } {
  const factor = Math.SQRT1_2 // 1/√2
  return { V_rms: V_peak * factor, I_rms: V_peak * factor }
}
