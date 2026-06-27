/**
 * 计算平抛运动状态（无空气阻力）
 *
 * 物理坐标系：抛出点为原点，x 轴向右为正，y 轴向上为正。
 * 水平方向匀速，竖直方向自由落体（加速度向下）。
 *
 * @param v0x 水平初速度 (m/s)，正值
 * @param g 重力加速度 (m/s²)，正值
 * @param t 运动时间 (s)
 * @returns x 水平位移 (m)、y 竖直位移 (m，下落为负)、vx 水平速度 (m/s)、vy 竖直速度 (m/s，向下为负)、v 合速度大小 (m/s)、angle 合速度与水平方向夹角 (rad)
 */
export function calculateProjectileMotion(v0x: number, g: number, t: number): { x: number; y: number; vx: number; vy: number; v: number; angle: number } {
  const x = v0x * t;
  const y = -0.5 * g * t * t;
  const vx = v0x;
  const vy = -g * t;
  const v = Math.sqrt(vx * vx + vy * vy);
  const angle = Math.atan2(vy, vx);
  return { x, y, vx, vy, v, angle };
}

/**
 * 计算斜抛运动状态（无空气阻力）
 *
 * 物理坐标系：抛出点为原点，x 轴向右为正，y 轴向上为正。
 * 水平方向匀速，竖直方向初速度向上、加速度向下。
 *
 * @param v0 初速度大小 (m/s)
 * @param angleDeg 抛射角 (°)，相对水平方向，向上为正
 * @param g 重力加速度 (m/s²)，正值
 * @param t 运动时间 (s)
 * @returns x 水平位移 (m)、y 竖直位移 (m，向上为正)、vx 水平速度 (m/s)、vy 竖直速度 (m/s，向上为正)
 */
export function calculateObliqueThrow(v0: number, angleDeg: number, g: number, t: number): { x: number; y: number; vx: number; vy: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const v0x = v0 * Math.cos(angleRad);
  const v0y = v0 * Math.sin(angleRad);
  return {
    x: v0x * t,
    y: v0y * t - 0.5 * g * t * t,
    vx: v0x,
    vy: v0y - g * t
  };
}

/**
 * 计算斜抛运动的射程、最大高度和总飞行时间（无空气阻力）
 *
 * 物理坐标系：抛出点为原点，y 轴向上为正，落回抛出高度时飞行结束。
 * 公式：R = v₀²sin2θ/g，H = v₀²sin²θ/(2g)，T = 2v₀sinθ/g
 *
 * @param v0 初速度大小 (m/s)
 * @param angleDeg 抛射角 (°)，相对水平方向，向上为正
 * @param g 重力加速度 (m/s²)，正值
 * @returns range 水平射程 (m)、maxHeight 最大高度 (m)、totalTime 总飞行时间 (s)
 */
export function calculateObliqueThrowRange(v0: number, angleDeg: number, g: number): { range: number; maxHeight: number; totalTime: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const totalTime = (2 * v0 * Math.sin(angleRad)) / g;
  const range = (v0 * v0 * Math.sin(2 * angleRad)) / g;
  const maxHeight = (v0 * v0 * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * g);
  return { range, maxHeight, totalTime };
}

/**
 * 计算匀速圆周运动状态
 *
 * 物理坐标系：圆心为原点，x 轴向右为正，y 轴向上为正。
 * 角度从 x 正方向逆时针旋转，θ = ωt。
 *
 * @param r 圆周运动半径 (m)，正值
 * @param omega 角速度 (rad/s)，正值表示逆时针
 * @param t 运动时间 (s)
 * @returns x 水平坐标 (m)、y 竖直坐标 (m，向上为正)、v 线速度大小 (m/s)、a_c 向心加速度大小 (m/s²)、period 周期 (s)
 */
export function calculateCircularMotion(r: number, omega: number, t: number): { x: number; y: number; v: number; a_c: number; period: number } {
  const angle = omega * t;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
    v: r * omega,
    a_c: r * omega * omega,
    period: (2 * Math.PI) / omega
  };
}
