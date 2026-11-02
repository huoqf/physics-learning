/**
 * @file src/physics/laser.ts
 * 激光特性（anim-laser）的几何与强度估算。
 *
 * 单一真源：光斑半径 `r(d) = r₀ + d·tan(θ/2)` 此前在三个地方各写一遍
 *   - 右屏看板 `data/quantities/laser.ts`
 *   - 中屏 hook `hooks/useLaserPhysics.ts`
 *   - 中屏场景 `components/LaserScene.tsx`（还自带一套 mm 单位约定与 r₀=1.0）
 * 三处对"初始半径"和"单位"的理解不一致，是最容易悄悄分叉的一类重复。
 *
 * 单位约定（全项目统一）：长度用 m，长度换 mm 只在展示层乘 1000。
 */

/** 激光/普通光源的初始出射半径 (m)，即 1 mm */
export const LASER_BEAM_INITIAL_RADIUS_M = 0.001

/**
 * 由毫弧度换算半发散角 (rad)。
 *
 * 工程标注的"发散角 1.5 mrad"是**全角**，光斑半径用半角。
 *
 * @param mrad 全发散角 (mrad)
 */
export function halfAngleFromMrad(mrad: number): number {
  return mrad / 1000 / 2
}

/**
 * 由角度换算半发散角 (rad)。
 *
 * @param deg 全发散角 (度)
 */
export function halfAngleFromDeg(deg: number): number {
  return ((deg * Math.PI) / 180) / 2
}

/**
 * 传播 d 米后的光斑半径 (m)：r(d) = r₀ + d·tan(θ/2)。
 *
 * 小发散角下 tanθ ≈ θ；此处保留 tan 以便普通光源的大角度也正确。
 *
 * @param r0 出射半径 (m)
 * @param distance 传播距离 (m)
 * @param halfAngleRad 半发散角 (rad)
 */
export function beamRadius(r0: number, distance: number, halfAngleRad: number): number {
  return r0 + distance * Math.tan(halfAngleRad)
}

/**
 * 末端相对光强（百分数）：I/I₀ = (r₀/r)² × 100。
 *
 * 只做纯计算，不夹取上下限——是否夹取属于各展示层自己的视觉策略。
 *
 * @param r0 出射半径 (m)
 * @param r 末端光斑半径 (m)
 */
export function intensityRatioPercent(r0: number, r: number): number {
  if (r <= 0) return 0
  return Math.pow(r0 / r, 2) * 100
}
