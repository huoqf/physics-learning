import { DEFAULT_STATIC_FRICTION_RATIO } from '../constants'

export function calculateFrictionPullModel(
  m: number,
  mu: number,
  F_applied: number,
  g: number
): {
  F_normal: number;
  muStatic: number;
  f_max: number;
  f_slip: number;
  f_actual: number;
  a: number;
  F_net: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const F_normal = weight;
  const muStatic = mu * DEFAULT_STATIC_FRICTION_RATIO;
  const f_max = muStatic * F_normal;
  const f_slip = mu * F_normal;
  const isSliding = F_applied > f_max;
  const f_actual = isSliding ? f_slip : F_applied;
  const a = isSliding ? (F_applied - f_slip) / m : 0;
  const F_net = F_applied - f_actual;

  return { F_normal, muStatic, f_max, f_slip, f_actual, a, F_net, isSliding };
}

/**
 * 进阶模式：双重摩擦力斜面模型物理动力学解算器
 *
 * 物理模型：斜面体 M 置于粗糙水平地面上（摩擦系数 μ₂），滑块 m 置于斜面上（摩擦系数 μ₁），
 * 斜面倾角为 θ，系统仅在重力作用下运动。
 *
 * @param params 输入自变量
 * @param params.m 滑块质量 (kg)
 * @param params.M 斜面体质量 (kg)
 * @param params.theta 斜面倾角 (度)
 * @param params.mu_1 滑块与斜面板之间的动摩擦系数
 * @param params.mu_2 斜面板与地面之间的动摩擦系数
 * @param params.g 重力加速度 (m/s²)
 * @returns 运动学与动力学因变量
 */
export function calculateDoubleFrictionIncline(params: {
  m: number
  M: number
  theta: number
  mu_1: number
  mu_2: number
  g: number
}): {
  isBlockSliding: boolean
  isInclineSliding: boolean
  a_M: number
  a_rel: number
  a_1x: number
  a_1y: number
  f1: number
  FN1: number
  f2: number
  FN2: number
  F_drive: number
  f2_max: number
  criticalAngle: number
} {
  const { m, M, theta, mu_1, mu_2, g } = params
  const angleRad = (theta * Math.PI) / 180

  // 1.12倍最大静摩擦系数，与基础模式对齐
  const mu_1_static = 1.12 * mu_1
  const criticalAngleRad = Math.atan(mu_1_static)
  const criticalAngle = (criticalAngleRad * 180) / Math.PI

  // 判断滑块是否相对斜面下滑
  const isBlockSliding = theta > criticalAngle

  if (!isBlockSliding) {
    const FN1 = m * g * Math.cos(angleRad)
    const f1 = m * g * Math.sin(angleRad)
    const F_drive = 0
    const FN2 = (m + M) * g
    const f2 = 0
    const f2_max = 1.12 * mu_2 * FN2

    return {
      isBlockSliding: false,
      isInclineSliding: false,
      a_M: 0,
      a_rel: 0,
      a_1x: 0,
      a_1y: 0,
      f1,
      FN1,
      f2,
      FN2,
      F_drive,
      f2_max,
      criticalAngle,
    }
  }

  // 滑块在斜面上滑动 (f1 = mu_1 * FN1)
  // 先假设斜面体静止 (a_M = 0)
  const FN1_static = m * g * Math.cos(angleRad)
  const f1_static = mu_1 * FN1_static
  const F_drive_static = FN1_static * Math.sin(angleRad) - f1_static * Math.cos(angleRad)
  const FN2_static = M * g + FN1_static * Math.cos(angleRad) + f1_static * Math.sin(angleRad)
  const f2_max = 1.12 * mu_2 * FN2_static

  const isInclineSliding = F_drive_static > f2_max

  if (!isInclineSliding) {
    const FN1 = FN1_static
    const f1 = f1_static
    const F_drive = F_drive_static
    const FN2 = FN2_static
    const f2 = Math.max(0, F_drive) // 静摩擦力
    const a_rel = g * Math.sin(angleRad) - mu_1 * g * Math.cos(angleRad)
    const a_1x = a_rel * Math.cos(angleRad)
    const a_1y = a_rel * Math.sin(angleRad)

    return {
      isBlockSliding: true,
      isInclineSliding: false,
      a_M: 0,
      a_rel: Math.max(0, a_rel),
      a_1x,
      a_1y,
      f1,
      FN1,
      f2,
      FN2,
      F_drive,
      f2_max,
      criticalAngle,
    }
  } else {
    // 斜面发生滑动，联立方程求解 a_M
    const C1 =
      Math.sin(angleRad) -
      mu_1 * Math.cos(angleRad) -
      mu_2 * (Math.cos(angleRad) + mu_1 * Math.sin(angleRad))
    let a_M = (g * (m * C1 * Math.cos(angleRad) - mu_2 * M)) / (M + m * C1 * Math.sin(angleRad))
    if (a_M < 0) a_M = 0 // 防御截断

    const FN1_raw = m * (g * Math.cos(angleRad) - a_M * Math.sin(angleRad))
    const FN1 = Math.max(0, FN1_raw)
    const f1 = mu_1 * FN1
    const F_drive = FN1 * Math.sin(angleRad) - f1 * Math.cos(angleRad)
    const FN2 = M * g + FN1 * Math.cos(angleRad) + f1 * Math.sin(angleRad)
    const f2 = mu_2 * FN2

    const a_rel =
      g * Math.sin(angleRad) +
      a_M * Math.cos(angleRad) -
      mu_1 * (g * Math.cos(angleRad) - a_M * Math.sin(angleRad))
    const a_1x = a_rel * Math.cos(angleRad) - a_M
    const a_1y = a_rel * Math.sin(angleRad)

    return {
      isBlockSliding: true,
      isInclineSliding: true,
      a_M,
      a_rel: Math.max(0, a_rel),
      a_1x,
      a_1y,
      f1,
      FN1,
      f2,
      FN2,
      F_drive,
      f2_max,
      criticalAngle,
    }
  }
}
