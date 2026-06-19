/**
 * 反射定律纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI / 度。
 */

/**
 * 反射定律：反射角等于入射角。
 *
 * 物理模型：
 *   光线照射到平面镜上，反射角 θ₂ 恒等于入射角 θ₁。
 *   入射光线、法线、反射光线在同一平面内，分居法线两侧。
 *
 * @param theta1_deg 入射角 (°)，范围 [0, 90]
 * @returns theta2_deg 反射角 (°)，恒等于入射角
 */
export function calculateReflection(theta1_deg: number): { theta2_deg: number } {
  return { theta2_deg: Math.abs(theta1_deg) }
}

/**
 * 计算平面镜旋转对反射光的影响。
 *
 * 物理模型：
 *   镜面旋转 Δα → 法线同步旋转 Δα → 入射角改变 Δα → 反射光偏转 2Δα。
 *   这是高考五星考点：镜面旋转模型。
 *
 * @param mirrorRotation_deg 平面镜旋转角度 (°)，正值逆时针
 * @returns 法线偏转角和反射光偏转角 (°)
 */
export function calculateMirrorRotationEffect(mirrorRotation_deg: number): {
  normalDeflection: number
  reflectedRayDeflection: number
} {
  return {
    normalDeflection: mirrorRotation_deg,
    reflectedRayDeflection: 2 * mirrorRotation_deg,
  }
}
