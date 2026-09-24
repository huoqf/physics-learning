/**
 * 固体、液体与表面张力物理纯函数
 */

export interface CrystalLatticeNode {
  x: number
  y: number
  isCrystal: boolean
}

/**
 * 常见液体在 20℃ 下的表面张力系数 γ (N/m)
 * 水 ≈ 0.0728；水银 ≈ 0.465（约为水的 6.4 倍）
 */
export const LIQUID_SURFACE_TENSION = {
  water: 0.0728,
  mercury: 0.465,
} as const

/**
 * 常见液体在 20℃ 下与玻璃的接触角 θ (rad)
 * 水浸润（近似取 0）；水银不浸润（≈ 140°）
 */
export const LIQUID_CONTACT_ANGLE = {
  water: 0,
  mercury: (140 * Math.PI) / 180,
} as const

/**
 * 常见液体的密度 ρ (kg/m³)
 */
export const LIQUID_DENSITY = {
  water: 1000,
  mercury: 13600,
} as const

/**
 * 生成晶体（单晶规则点阵）与非晶体（无序结构）的二维截面分子坐标
 */
export function generateLatticeNodes(
  type: 'singleCrystal' | 'polycrystal' | 'amorphous',
  rows: number = 6,
  cols: number = 6,
  spacing: number = 30
): CrystalLatticeNode[] {
  const nodes: CrystalLatticeNode[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (type === 'singleCrystal') {
        nodes.push({
          x: c * spacing,
          y: r * spacing,
          isCrystal: true,
        })
      } else if (type === 'polycrystal') {
        // 多晶体分为几个晶畴
        const angle = c > 2 ? 0.25 : -0.2
        const cx = (c - 2.5) * spacing
        const cy = (r - 2.5) * spacing
        const rx = cx * Math.cos(angle) - cy * Math.sin(angle) + 2.5 * spacing
        const ry = cx * Math.sin(angle) + cy * Math.cos(angle) + 2.5 * spacing
        nodes.push({ x: rx, y: ry, isCrystal: true })
      } else {
        // 非晶体：规则点阵加上强随机位移扰动
        // 使用确定性的伪随机保证渲染纯净
        const seed = Math.sin(r * 13 + c * 37) * 10000
        const randX = (seed - Math.floor(seed) - 0.5) * spacing * 0.65
        const seedY = Math.cos(r * 19 + c * 43) * 10000
        const randY = (seedY - Math.floor(seedY) - 0.5) * spacing * 0.65
        nodes.push({
          x: c * spacing + randX,
          y: r * spacing + randY,
          isCrystal: false,
        })
      }
    }
  }

  return nodes
}

/**
 * 计算表面张力大小与拉力 F = 2 * gamma * L
 * @param gamma 表面张力系数 (N/m), 常见如水为 0.0728 N/m
 * @param L 细丝/滑边长度 (m)
 */
export function calculateSurfaceTensionForce(gamma: number, L: number): number {
  return 2 * Math.max(0, gamma) * Math.max(0, L)
}

/**
 * 毛细现象浸润上升高度公式
 * h = (2 * gamma * cos(theta)) / (rho * g * r)
 * @param gamma 表面张力系数 (N/m)
 * @param theta 接触角 (rad)
 * @param r 管半径 (m)
 * @param rho 液体密度 (kg/m^3), 水默认 1000
 * @param g 重力加速度 (m/s^2), 默认 9.8
 */
export function calculateCapillaryRise(
  gamma: number,
  theta: number,
  r: number,
  rho: number = 1000,
  g: number = 9.8
): {
  h: number // 上升高度 (m)；当 theta > pi/2 时 h < 0 为下降
  isWetting: boolean // 是否浸润
  meniscusType: 'concave' | 'convex' | 'flat'
} {
  const safeR = Math.max(1e-5, r)
  const safeRho = Math.max(1, rho)
  const cosTheta = Math.cos(theta)
  const h = (2 * gamma * cosTheta) / (safeRho * g * safeR)

  const isWetting = cosTheta > 0.05
  let meniscusType: 'concave' | 'convex' | 'flat' = 'flat'
  if (cosTheta > 0.05) meniscusType = 'concave'
  else if (cosTheta < -0.05) meniscusType = 'convex'

  return { h, isWetting, meniscusType }
}
