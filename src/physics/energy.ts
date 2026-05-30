export function calculateWork(F: number, s: number, angleDeg: number): { W: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { W: F * s * Math.cos(angleRad) };
}

export function calculateKineticEnergy(m: number, v: number): { Ek: number } {
  return { Ek: 0.5 * m * v * v };
}

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