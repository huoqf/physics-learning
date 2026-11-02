/**
 * @file src/physics/systemIsolated.ts
 * 整体法 / 隔离法（anim-system-isolated）纯物理计算模块。
 *
 * 单一真源：中屏 `hooks/useSystemIsolatedPhysics.ts` 与右屏
 * `data/quantities/dynamics/systemIsolated.ts` 都从这里取受力结果。
 * 此前两处各写了一份 `N_slope / f_slope / N_ground / f_ground`，
 * 连模型 2 的 `hasMotion / a / ax / ay` 也是各算一遍 —— 改一个判据就只对了一半。
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m, s, N, rad）
 */

/** 斜面叠放系统在某一时刻的受力分解结果 */
export interface StackedStaticStatics {
  /** 地面对系统的支持力 (N) */
  N_ground: number
  /** 地面对系统的静摩擦力 (N)，方向与外力 F 相反 */
  f_ground: number
  /** 斜面对滑块的支持力 (N) */
  N_slope: number
  /** 斜面对滑块的静摩擦力 (N)，沿斜面向上为正 */
  f_slope: number
}

/** 滑块沿斜面下滑时的系统受力与运动量 */
export interface SlidingStatics extends StackedStaticStatics {
  /** 是否满足起动条件 sinθ > μcosθ */
  hasMotion: boolean
  /** 滑块沿斜面的加速度 (m/s²)，未起动时为 0 */
  acceleration: number
  /** 加速度水平分量 (m/s²)，向右为正 */
  ax: number
  /** 加速度竖直分量 (m/s²)，向下为正 */
  ay: number
}

/**
 * 模型 1：斜面叠放静力平衡（外力 F 水平推斜面，整体处于静止）。
 *
 * 滑块与斜面之间的 N、f 是系统内力，整体法求地面反力时相互抵消；
 * 但右屏/copy 要展示"隔离法看内力"，所以这里一并返回两者的数值。
 *
 * @param m1 滑块质量 (kg)
 * @param m2 斜面质量 (kg)
 * @param thetaRad 倾角 (rad)
 * @param g 重力加速度 (m/s²)
 * @param F 水平推力 (N)
 */
export function computeStackedStaticStatics(
  m1: number,
  m2: number,
  thetaRad: number,
  g: number,
  F: number,
): StackedStaticStatics {
  const cos = Math.cos(thetaRad)
  const sin = Math.sin(thetaRad)
  return {
    N_ground: (m1 + m2) * g,
    f_ground: F,
    N_slope: m1 * g * cos,
    f_slope: m1 * g * sin,
  }
}

/**
 * 模型 2：滑块沿斜面下滑（系统牛顿第二定律）。
 *
 * 起动判据与摩擦方向在同一处决定：`sinθ > μcosθ` 时动摩擦沿斜面向上
 * （f = μN），否则静摩擦恰好平衡重力分力（f = mg·sinθ）。
 *
 * @param m1 滑块质量 (kg)
 * @param m2 斜面质量 (kg)
 * @param thetaRad 倾角 (rad)
 * @param mu 动摩擦因数
 * @param g 重力加速度 (m/s²)
 */
export function computeSlidingStatics(
  m1: number,
  m2: number,
  thetaRad: number,
  mu: number,
  g: number,
): SlidingStatics {
  const cos = Math.cos(thetaRad)
  const sin = Math.sin(thetaRad)
  const N_slope = m1 * g * cos

  const hasMotion = sin > mu * cos
  const acceleration = hasMotion ? g * (sin - mu * cos) : 0
  const ax = acceleration * cos
  const ay = acceleration * sin

  return {
    hasMotion,
    acceleration,
    ax,
    ay,
    N_slope,
    f_slope: hasMotion ? mu * N_slope : m1 * g * sin,
    f_ground: m1 * ax,
    N_ground: (m1 + m2) * g - m1 * ay,
  }
}
