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
 * 根据相对运动模式获取等效波源速度 vs 与观察者速度 vo
 *
 * 单一真源：消除各处组件对 mode === 1 或 mode === 2 判定规则不一致的隐患。
 *
 * @param mode 0: 波源运动 (观察者静止), 1: 观察者运动 (波源静止), 2: 超音速激波
 * @param sourceSpeed 输入波源速度 (m/s)
 * @param observerSpeed 输入观察者速度 (m/s)
 * @param waveSpeed 介质波速 (m/s)
 * @returns { vs: number, vo: number }
 */
export function getEffectiveDopplerSpeeds(
  mode: number,
  sourceSpeed: number,
  observerSpeed: number,
  waveSpeed: number,
): { vs: number; vo: number } {
  if (mode === 1) {
    return { vs: 0, vo: observerSpeed }
  }
  if (mode === 2) {
    return { vs: Math.max(waveSpeed * 1.25, sourceSpeed), vo: 0 }
  }
  return { vs: sourceSpeed, vo: 0 }
}

/**
 * 计算观察者接收到的视在频率 f'
 * 公式：f' = f0 * (v ± vo) / (v ∓ vs)
 *
 * ⚠️ 公式仅适用于亚音速（v - vs > 0）。当 vs ≥ v 时波源已追上自己发出的波前，
 * 前方不再有规则波列而出现马赫锥（激波），多普勒频率公式失效，此时返回值仅为
 * 供波形绘制使用的示意保护值，调用方必须通过 `isSupersonic` 判定并改用激波表述。
 *
 * @param f0 波源固有频率 (Hz)
 * @param v 介质波速 (m/s)
 * @param vs 波源向观察者运动的速度 (m/s)，向观察者靠近取正，远离取负
 * @param vo 观察者向波源运动的速度 (m/s)，向波源靠近取正，远离取负
 * @returns 视在频率 f' (Hz)；超音速时返回示意保护值，不代表真实接收频率
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
    // 超音速/音障奇点：多普勒公式失效，返回示意保护值（仅用于波形绘制，UI 需按激波表述）
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

/**
 * 计算超音速马赫角 (Mach Angle)
 * 公式：sin(θ) = v / vs = 1 / Ma
 *
 * @param v 介质波速 (m/s)
 * @param vs 波源移动速度 (m/s)
 * @returns 马赫角半顶角（度数），若 vs <= v (亚音速) 则返回 null
 */
export function calculateMachAngle(v: number, vs: number): number | null {
  if (v <= 0 || vs <= v) return null
  const sinTheta = v / vs
  const rad = Math.asin(Math.min(1, sinTheta))
  return (rad * 180) / Math.PI
}

/**
 * 马赫锥切线几何数据定义
 */
export interface MachConeGeometry {
  /** 马赫数 Ma = vs / v */
  machNumber: number
  /** 马赫角半顶角 θ (度) */
  halfAngleDeg: number
  /** 上包络切线端点 (m) */
  upperLine: { x1: number; y1: number; x2: number; y2: number }
  /** 下包络切线端点 (m) */
  lowerLine: { x1: number; y1: number; x2: number; y2: number }
}

/**
 * 计算马赫锥包络线几何线段
 *
 * @param sourceX 当前波源 X 坐标 (m)
 * @param sourceY 当前波源 Y 坐标 (m)
 * @param v 扩散波速 (m/s)
 * @param vs 波源移动速度 (m/s)
 * @param coneLength 马赫锥向后延伸的物理长度 (m)
 */
export function calculateMachConeGeometry(
  sourceX: number,
  sourceY: number,
  v: number,
  vs: number,
  coneLength = 40,
): MachConeGeometry | null {
  if (vs <= v || v <= 0) return null
  const machNumber = vs / v
  const halfAngleDeg = calculateMachAngle(v, vs)
  if (halfAngleDeg === null) return null

  const rad = (halfAngleDeg * Math.PI) / 180
  const dx = coneLength * Math.cos(rad)
  const dy = coneLength * Math.sin(rad)

  return {
    machNumber,
    halfAngleDeg,
    upperLine: {
      x1: sourceX,
      y1: sourceY,
      x2: sourceX - dx,
      y2: sourceY - dy,
    },
    lowerLine: {
      x1: sourceX,
      y1: sourceY,
      x2: sourceX - dx,
      y2: sourceY + dy,
    },
  }
}
