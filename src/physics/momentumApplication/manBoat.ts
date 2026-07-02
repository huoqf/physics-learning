/**
 * 人船模型 (Man & Boat Model)
 */

export interface ManBoatState {
  s1: number        // 人1相对于船头的距离 (m)，范围 [0, L]
  s2: number        // 人2相对于船头的距离 (m)，范围 [0, L]
  x_boat: number   // 船在绝对坐标中的左端位置 (m)
  x_person1: number // 人1在绝对坐标中的位置 (m)
  x_person2: number // 人2在绝对坐标中的位置 (m)
  x_cm: number     // 质心绝对位置 (m)，永远是 0
  v1_rel: number    // 人1相对于船的速度 (m/s)
  v2_rel: number    // 人2相对于船的速度 (m/s)
  v_boat: number   // 船在绝对坐标中的速度 (m/s)
  v_person1: number // 人1在绝对坐标中的速度 (m/s)
  v_person2: number // 人2在绝对坐标中的速度 (m/s)
  // 兼容老代码的旧字段
  s: number
  x_person: number
  v_rel: number
  v_person: number
}

/**
 * 人船模型解析计算 (解析计算以防数值积累误差，满足质心绝对定点)
 * 
 * 假定系统总质心被锁死在绝对坐标 0。船重 M，长 L，人1重 m1，人2重 m2。
 * 
 * @param s1 人1相对于船头的距离 (m)
 * @param v1_rel 人1相对于船的瞬时速度 (m/s)
 * @param s2 人2相对于船头的距离 (m)
 * @param v2_rel 人2相对于船的瞬时速度 (m/s)
 * @param m1 人1质量 (kg)
 * @param m2 人2质量 (kg)
 * @param M 船质量 (kg)
 * @param L 船长 (m)
 * @returns state 当前的人船物理状态
 */
export function calculateManBoatState(
  s1: number,
  v1_rel: number,
  s2: number,
  v2_rel: number,
  m1: number,
  m2: number,
  M: number,
  L: number
): ManBoatState {
  // 限制人不能跑出船
  const clampedS1 = Math.max(0, Math.min(L, s1))
  const clampedS2 = Math.max(0, Math.min(L, s2))

  // 根据总质心公式：(m1 * x_person1 + m2 * x_person2 + M * x_boat_center) / (m1 + m2 + M) = 0
  // 其中 x_person1 = x_boat + s1, x_person2 = x_boat + s2, x_boat_center = x_boat + L/2
  // => m1*(x_boat + s1) + m2*(x_boat + s2) + M*(x_boat + L/2) = 0
  // => (m1 + m2 + M)*x_boat + m1*s1 + m2*s2 + M*L/2 = 0
  // => x_boat = -(m1*s1 + m2*s2 + M*L/2) / (m1 + m2 + M)
  const totalM = m1 + m2 + M
  const x_boat = -(m1 * clampedS1 + m2 * clampedS2 + M * L * 0.5) / totalM
  const x_person1 = x_boat + clampedS1
  const x_person2 = x_boat + clampedS2

  // 质心计算 (用以自检)
  const x_cm = (m1 * x_person1 + m2 * x_person2 + M * (x_boat + L * 0.5)) / totalM

  // 速度关系：m1 * v1 + m2 * v2 + M * v_boat = 0 且 v1 = v_boat + v1_rel, v2 = v_boat + v2_rel
  // => m1 * (v_boat + v1_rel) + m2 * (v_boat + v2_rel) + M * v_boat = 0
  // => v_boat = -(m1 * v1_rel + m2 * v2_rel) / (m1 + m2 + M)
  const v_boat = -(m1 * v1_rel + m2 * v2_rel) / totalM
  const v_person1 = v_boat + v1_rel
  const v_person2 = v_boat + v2_rel

  return {
    s1: clampedS1,
    s2: clampedS2,
    x_boat,
    x_person1,
    x_person2,
    x_cm,
    v1_rel,
    v2_rel,
    v_boat,
    v_person1,
    v_person2,
    // 兼容旧字段
    s: clampedS1,
    x_person: x_person1,
    v_rel: v1_rel,
    v_person: v_person1
  }
}

/**
 * 自动演示模式下人船的相对位置和相对速度计算
 * 
 * @param t 当前播放时间 (s)
 * @param L 船长 (m)
 * @param durationWalk 走路总耗时 (s)，默认 2.5
 * @param mode 演示模式：0-单人，1-双人交换，2-双人相向至中央，3-双人依次走动
 * @returns { s1, v1_rel, s2, v2_rel } 相对位置 (m) 与相对速度 (m/s)
 */
export function getManBoatAutoMotion(
  t: number,
  L: number,
  durationWalk: number = 2.5,
  mode: number = 0
): { s1: number; v1_rel: number; s2: number; v2_rel: number } {
  if (t <= 0) {
    return { s1: 0, v1_rel: 0, s2: L, v2_rel: 0 }
  }

  // 模式 0: 单人从左到右
  if (mode === 0) {
    if (t >= durationWalk) return { s1: L, v1_rel: 0, s2: L, v2_rel: 0 }
    const angle = (Math.PI * t) / durationWalk
    const s1 = (L * 0.5) * (1 - Math.cos(angle))
    const v1_rel = (L * 0.5) * (Math.PI / durationWalk) * Math.sin(angle)
    return { s1, v1_rel, s2: L, v2_rel: 0 }
  }

  // 模式 1: 双人同时相向交换位置 (人1从 0 -> L, 人2从 L -> 0)
  if (mode === 1) {
    if (t >= durationWalk) return { s1: L, v1_rel: 0, s2: 0, v2_rel: 0 }
    const angle = (Math.PI * t) / durationWalk
    const s1 = (L * 0.5) * (1 - Math.cos(angle))
    const v1_rel = (L * 0.5) * (Math.PI / durationWalk) * Math.sin(angle)
    const s2 = L - s1
    const v2_rel = -v1_rel
    return { s1, v1_rel, s2, v2_rel }
  }

  // 模式 2: 双人同时走向正中央汇合 (人1从 0 -> L/2, 人2从 L -> L/2)
  if (mode === 2) {
    if (t >= durationWalk) return { s1: L * 0.5, v1_rel: 0, s2: L * 0.5, v2_rel: 0 }
    const angle = (Math.PI * t) / durationWalk
    const s1 = (L * 0.25) * (1 - Math.cos(angle))
    const v1_rel = (L * 0.25) * (Math.PI / durationWalk) * Math.sin(angle)
    const s2 = L - s1
    const v2_rel = -v1_rel
    return { s1, v1_rel, s2, v2_rel }
  }

  // 模式 3: 双人依次走动 (前一半时间人1从 0 -> L, 后一半时间人2从 L -> 0)
  if (mode === 3) {
    const halfWalk = durationWalk / 2
    if (t <= halfWalk) {
      const angle = (Math.PI * t) / halfWalk
      const s1 = (L * 0.5) * (1 - Math.cos(angle))
      const v1_rel = (L * 0.5) * (Math.PI / halfWalk) * Math.sin(angle)
      return { s1, v1_rel, s2: L, v2_rel: 0 }
    } else if (t < durationWalk) {
      const t2 = t - halfWalk
      const angle = (Math.PI * t2) / halfWalk
      const s2_dist = (L * 0.5) * (1 - Math.cos(angle))
      const v2_rel = -(L * 0.5) * (Math.PI / halfWalk) * Math.sin(angle)
      return { s1: L, v1_rel: 0, s2: L - s2_dist, v2_rel }
    } else {
      return { s1: L, v1_rel: 0, s2: 0, v2_rel: 0 }
    }
  }

  return { s1: 0, v1_rel: 0, s2: L, v2_rel: 0 }
}

/**
 * 计算人船模型初始状态与末态位移（用于自动演示结束时的位移标注）
 *
 * @param m1 人1质量 (kg)
 * @param m2 人2质量 (kg)，单人模式传 0
 * @param M 船质量 (kg)
 * @param L 船长 (m)
 * @param endState 末态物理状态
 * @returns 初始位置、末态位置和绝对位移
 */
export function calculateManBoatDisplacements(
  m1: number,
  m2: number,
  M: number,
  L: number,
  endState: ManBoatState,
) {
  const totalM = m1 + m2 + M
  const x0_boat = -(m2 * L + M * L * 0.5) / totalM
  const x0_person1 = x0_boat
  const x0_person2 = x0_boat + L

  return {
    x0: { boat: x0_boat, person1: x0_person1, person2: x0_person2 },
    xEnd: { boat: endState.x_boat, person1: endState.x_person1, person2: endState.x_person2 },
    disp: {
      boat: endState.x_boat - x0_boat,
      person1: endState.x_person1 - x0_person1,
      person2: endState.x_person2 - x0_person2,
    },
  }
}