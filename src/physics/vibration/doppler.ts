/**
 * 纯物理计算：多普勒效应 (Doppler Effect)
 *
 * 铁律遵循：纯计算函数，无 React/DOM 依赖，所有函数具备 JSDoc 与物理单位注释。
 */

/**
 * 计算波源运动时的视在波长 λ'
 *
 * @param v 介质波速 (m/s)
 * @param vs 波源移动速度 (m/s)，向前为正
 * @param f0 波源本征振荡频率 (Hz)
 * @param direction 'front' (波源前方) | 'back' (波源后方)
 * @returns 视在波长 (m)
 */
export function calculateDopplerWavelength(
  v: number,
  vs: number,
  f0: number,
  direction: 'front' | 'back',
): number {
  if (f0 <= 0 || v <= 0) return 0
  if (direction === 'front') {
    // 前方波前被压缩：λ' = (v - vs) / f0
    return Math.max(0.01, (v - vs) / f0)
  }
  // 后方波前被拉伸：λ' = (v + vs) / f0
  return (v + vs) / f0
}

/**
 * 计算观察者接收到的视在频率 f'
 * 公式：f' = f0 * (v ± vo) / (v ∓ vs)
 *
 * @param f0 波源固有频率 (Hz)
 * @param v 介质波速 (m/s)
 * @param vs 波源向观察者运动的速度 (m/s)，向观察者靠近取正，远离取负
 * @param vo 观察者向波源运动的速度 (m/s)，向波源靠近取正，远离取负
 * @returns 视在频率 f' (Hz)
 */
export function calculateDopplerFrequency(
  f0: number,
  v: number,
  vs = 0,
  vo = 0,
): number {
  if (f0 <= 0 || v <= 0) return 0
  const numerator = v + vo
  const denominator = v - vs
  if (denominator <= 0) {
    // 超音速或音障奇点时截断保护
    return f0 * 10
  }
  return f0 * (numerator / denominator)
}

/**
 * 波前圆环几何数据定义
 */
export interface WavefrontCircle {
  /** 发射时刻 t_emit (s) */
  tEmit: number
  /** 发射时刻波源中心的 X 坐标 (m) */
  sourceX: number
  /** 发射时刻波源中心的 Y 坐标 (m) */
  sourceY: number
  /** 当前时刻该波前的扩散半径 (m) */
  radius: number
  /** 扩散衰减透明度 (0~1) */
  opacity: number
}

/**
 * 根据波源运动与当前时间计算所有有效扩散波前圆环
 *
 * @param currentTime 当前动画时间 (s)
 * @param v 介质波速 (m/s)
 * @param vs 波源水平移动速度 (m/s)
 * @param f0 波源发射频率 (Hz)
 * @param x0 波源 t=0 时的起始 X 坐标 (m)
 * @param maxDistance 最大可视扩散距离 (m)，超出将被裁剪
 * @returns 激活中的波前圆环数组
 */
export function generateWavefronts(
  currentTime: number,
  v: number,
  vs: number,
  f0: number,
  x0 = -22,
  maxDistance = 50,
): WavefrontCircle[] {
  if (f0 <= 0 || v <= 0 || currentTime < 0) return []

  const period = 1 / f0
  const circles: WavefrontCircle[] = []
  // 从当前时间倒推至更早时刻发射的波前
  let tEmit = currentTime
  while (tEmit >= 0) {
    const elapsed = currentTime - tEmit
    const radius = v * elapsed
    if (radius > maxDistance) {
      break
    }
    // 发射时刻波源的真实位置：x = x0 + vs * tEmit
    const sx = x0 + vs * tEmit
    const sy = 0
    const opacity = Math.max(0.08, 1 - radius / maxDistance)

    circles.push({
      tEmit,
      sourceX: sx,
      sourceY: sy,
      radius,
      opacity,
    })

    tEmit -= period
  }

  return circles
}
