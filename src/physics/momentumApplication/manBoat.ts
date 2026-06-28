/**
 * 人船模型 (Man & Boat Model)
 */

export interface ManBoatState {
  s: number        // 人相对于船头的距离 (m)，范围 [0, L]
  x_boat: number   // 船在绝对坐标中的左端位置 (m)
  x_person: number // 人在绝对坐标中的位置 (m)
  x_cm: number     // 质心绝对位置 (m)，永远是 0
  v_rel: number    // 人相对于船的速度 (m/s)
  v_boat: number   // 船在绝对坐标中的速度 (m/s)
  v_person: number // 人在绝对坐标中的速度 (m/s)
}

/**
 * 人船模型解析计算 (解析计算以防数值积累误差，满足质心绝对定点)
 * 
 * 假定系统总质心被锁死在绝对坐标 0。船重 M，长 L，人重 m。
 * 人相对于船头（船的左端）的距离为 s (0 <= s <= L)。
 * 
 * @param s 人相对于船头的距离 (m)
 * @param v_rel 人相对于船的瞬时速度 (m/s)
 * @param m 人质量 (kg)
 * @param M 船质量 (kg)
 * @param L 船长 (m)
 * @returns state 当前的人船物理状态
 */
export function calculateManBoatState(
  s: number,
  v_rel: number,
  m: number,
  M: number,
  L: number
): ManBoatState {
  // 限制人不能跑出船
  const clampedS = Math.max(0, Math.min(L, s))

  // 根据质心公式：(m * x_person + M * x_boat_center) / (m + M) = 0
  // 其中 x_person = x_boat + s, x_boat_center = x_boat + L/2
  // => m*(x_boat + s) + M*(x_boat + L/2) = 0
  // => (m + M)*x_boat + m*s + M*L/2 = 0
  // => x_boat = -(m*s + M*L/2) / (m + M)
  const x_boat = -(m * clampedS + M * L * 0.5) / (m + M)
  const x_person = x_boat + clampedS

  // 质心计算 (用以自检)
  const x_cm = (m * x_person + M * (x_boat + L * 0.5)) / (m + M)

  // 速度关系：m * v_person + M * v_boat = 0 且 v_person = v_boat + v_rel
  // => m * (v_boat + v_rel) + M * v_boat = 0
  // => v_boat = -(m * v_rel) / (m + M)
  const v_boat = -(m * v_rel) / (m + M)
  const v_person = v_boat + v_rel

  return {
    s: clampedS,
    x_boat,
    x_person,
    x_cm,
    v_rel,
    v_boat,
    v_person
  }
}

/**
 * 自动演示模式下人船的相对位置和相对速度计算
 * 
 * 在 4 秒的周期内，人以余弦变速曲线从船头走动到船尾。
 * 
 * @param t 当前播放时间 (s)
 * @param L 船长 (m)
 * @param durationWalk 走路总耗时 (s)，默认 4.0
 * @returns { s, v_rel } 相对位置 (m) 与相对速度 (m/s)
 */
export function getManBoatAutoMotion(
  t: number,
  L: number,
  durationWalk: number = 4.0
): { s: number; v_rel: number } {
  if (t <= 0) return { s: 0, v_rel: 0 }
  if (t >= durationWalk) return { s: L, v_rel: 0 }

  // 相对位置：s(t) = L/2 * (1 - cos(pi * t / durationWalk))
  const angle = (Math.PI * t) / durationWalk
  const s = (L * 0.5) * (1 - Math.cos(angle))
  
  // 相对速度：v_rel(t) = ds/dt = L/2 * (pi / durationWalk) * sin(pi * t / durationWalk)
  const v_rel = (L * 0.5) * (Math.PI / durationWalk) * Math.sin(angle)

  return { s, v_rel }
}