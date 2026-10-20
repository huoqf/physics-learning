/**
 * 磁场圆周几何模型（"找圆心—定三角形"）的轨道解算。
 *
 * 该页面原先在「中屏组件」与「右屏看板」各写了一份完全相同的迭代，
 * 且两份都把「电荷符号」直接当作「旋向符号」，导致正电荷在垂直纸面向里的磁场中
 * 被画成顺时针（应为逆时针）、出射弧角取成短弧 2α。
 *
 * 这里统一为单一真源：中屏与看板必须同时调用本函数。
 */

/** 磁场边界类型：0=单边界 y≥0，1=矩形边界，2=圆形边界 */
export type MagBoundaryType = 0 | 1 | 2

export interface CircularGeometryParams {
  /** +1 正电荷，-1 负电荷 */
  particleSign: number
  /** 初速度大小 (m/s) */
  velocity: number
  /** 入射角 (°)，相对 +x 轴 */
  angleDeg: number
  /** 磁感应强度大小 (T)，方向恒为垂直纸面向里 */
  B: number
  boundaryType: MagBoundaryType
}

export interface CircularGeometryOrbit {
  /** 轨道半径 R = mv/(qB) (m) */
  R: number
  /** 角速度大小 ω = v/R = qB/m (rad/s) */
  omega: number
  /** 圆心 x（发射点为原点） */
  xc: number
  /** 圆心 y */
  yc: number
  /** 起始相位：粒子位置 = 圆心 + R(cosθ, sinθ) */
  theta0: number
  /** 相位变化率（带符号），正电荷在 ⊗ 场中为正（逆时针） */
  omegaDir: number
  /** 出射时刻 (s) */
  tOut: number
}

/** 判断某点是否仍在磁场边界内 */
export function isInsideMagBoundary(
  x: number,
  y: number,
  boundaryType: MagBoundaryType
): boolean {
  if (boundaryType === 1) {
    return x >= -3.0 && x <= 3.0 && y >= 0 && y <= 4.0
  }
  if (boundaryType === 2) {
    return x * x + (y - 3.5) * (y - 3.5) <= 3.5 * 3.5
  }
  return y >= 0
}

/**
 * 解算圆周运动的圆心、相位与出射时刻。
 *
 * 符号约定（关键）：磁场垂直纸面向里（⊗），在「x 向右、y 向上」的物理坐标系中
 * B = -z，故 +q 的洛伦兹力 F = qv×B 指向速度的左侧，即圆心在 v 逆时针转 90° 的方向：
 *   c = ( -R·sinα, +R·cosα )   （正电荷，α 为入射角）
 * 负电荷取镜像。旧实现写成 ( +R·sinα, -R·cosα )，正好把整个圆镜像了。
 */
export function computeCircularGeometryOrbit(
  p: CircularGeometryParams
): CircularGeometryOrbit {
  const { velocity, boundaryType } = p
  const spin = p.particleSign >= 0 ? 1 : -1
  const angleRad = (p.angleDeg * Math.PI) / 180
  const B = Math.abs(p.B)

  const R = B > 0 ? velocity / B : 0
  const omega = B

  // 圆心：速度向左（逆时针 90°）方向，正电荷取 spin=+1
  const xc = -spin * R * Math.sin(angleRad)
  const yc = spin * R * Math.cos(angleRad)

  // 相位：位置 = 圆心 + R(cosθ, sinθ)，t=0 时回到原点
  const theta0 = angleRad - (spin * Math.PI) / 2
  const omegaDir = spin * omega

  // 迭代求出射时刻（dt = 1 ms）
  const dt = 0.001
  const maxT = 12.0
  let tOut = maxT
  let t = 0.005 // 略微偏离初始时刻，避免边界浮点判定误差

  if (R > 0) {
    while (t < maxT) {
      const theta = theta0 + omegaDir * t
      const x = xc + R * Math.cos(theta)
      const y = yc + R * Math.sin(theta)
      if (!isInsideMagBoundary(x, y, boundaryType)) {
        tOut = t - dt / 2
        break
      }
      t += dt
    }
  } else {
    tOut = 0
  }

  return { R, omega, xc, yc, theta0, omegaDir, tOut }
}
