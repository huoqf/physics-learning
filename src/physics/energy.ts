/**
 * 计算恒力做功
 * W = F·s·cosθ
 *
 * @param F 力的大小 (N)，必须 ≥ 0
 * @param s 位移大小 (m)，必须 ≥ 0
 * @param angleDeg 力与位移方向的夹角 (°)，0°~180°
 * @returns W 功 (J)，正值表示正功，负值表示负功
 *
 * @category M4
 */
export function calculateWork(F: number, s: number, angleDeg: number): { W: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { W: F * s * Math.cos(angleRad) };
}

export function calculateKineticEnergy(m: number, v: number): { Ek: number } {
  return { Ek: 0.5 * m * v * v };
}

/**
 * 计算重力势能
 * Ep = mgh（以参考平面为零势能面，h 为相对高度）
 *
 * @param m 物体质量 (kg)，必须 > 0
 * @param g 重力加速度 (m/s²)，通常取 9.8
 * @param h 相对参考平面的高度 (m)，正值表示在上方
 * @returns Ep 重力势能 (J)
 *
 * @category M4
 */
export function calculateGravityPotential(m: number, g: number, h: number): { Ep: number } {
  return { Ep: m * g * h };
}

export function calculateMechanicalEnergy(m: number, v: number, g: number, h: number): { E: number; Ek: number; Ep: number } {
  const Ek = 0.5 * m * v * v;
  const Ep = m * g * h;
  return { E: Ek + Ep, Ek, Ep };
}

export function calculateMomentum(m: number, v: number): { p: number } {
  return { p: m * v };
}

/**
 * 计算冲量
 * I = F·Δt（恒力冲量）
 *
 * @param F 恒力大小 (N)
 * @param t 作用时间 (s)，必须 ≥ 0
 * @returns I 冲量 (N·s)
 *
 * @category M4
 */
export function calculateImpulse(F: number, t: number): { I: number } {
  return { I: F * t };
}

export function calculateElasticCollision(m1: number, v1: number, m2: number, v2: number): { v1f: number; v2f: number; deltaEk: number } {
  const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
  const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
  const Ek_initial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  const Ek_final = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;
  return { v1f, v2f, deltaEk: Ek_final - Ek_initial };
}

export function calculateInelasticCollision(m1: number, v1: number, m2: number, v2: number): { vf: number; deltaEk: number } {
  const vf = (m1 * v1 + m2 * v2) / (m1 + m2);
  const Ek_initial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  const Ek_final = 0.5 * (m1 + m2) * vf * vf;
  return { vf, deltaEk: Ek_final - Ek_initial };
}

/**
 * 一维带恢复系数 e 的碰撞：动量守恒 + 相对速度关系 v2f - v1f = e(v1 - v2)。
 * e=1 退化为弹性碰撞，e=0 退化为完全非弹性碰撞。
 * @param e 恢复系数 (0–1)
 * @returns 碰后两物体速度与碰撞前后总动量
 */
export function calculateRestitutionCollision(
  m1: number,
  v1: number,
  m2: number,
  v2: number,
  e: number
): { v1f: number; v2f: number; pBefore: number; pAfter: number } {
  const totalMass = m1 + m2;
  const v1f = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / totalMass;
  const v2f = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / totalMass;
  const pBefore = m1 * v1 + m2 * v2;
  const pAfter = m1 * v1f + m2 * v2f;
  return { v1f, v2f, pBefore, pAfter };
}