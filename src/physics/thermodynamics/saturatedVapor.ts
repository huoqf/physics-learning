/**
 * 饱和汽压与相对湿度物理纯计算函数
 */

/**
 * 根据温度计算水蒸气的饱和汽压 ps (Pa)
 * 采用国际气象常用的 Tetens 公式:
 * ps(T) = 610.78 * exp((17.27 * T) / (T + 237.3))  (T 单位为摄氏度 ℃)
 */
export function calculateSaturatedVaporPressure(tempCelsius: number): number {
  const t = Math.max(-20, Math.min(100, tempCelsius))
  const exponent = (17.27 * t) / (t + 237.3)
  return 610.78 * Math.exp(exponent)
}

/**
 * 计算空气相对湿度 RH (%)
 * RH = (p / ps) * 100%
 * @param actualPressure 实际水蒸气分压 (Pa)
 * @param tempCelsius 当前温度 (℃)
 */
export function calculateRelativeHumidity(
  actualPressure: number,
  tempCelsius: number
): {
  ps: number // 饱和汽压 (Pa)
  rh: number // 相对湿度 (0 ~ 100%)
  status: 'unsaturated' | 'saturated' | 'supersaturated' // 未饱和、饱和、过饱和结露
  dewPoint: number // 露点温度 (℃)
} {
  const ps = calculateSaturatedVaporPressure(tempCelsius)
  const safeP = Math.max(0, actualPressure)
  const rawRh = (safeP / Math.max(1, ps)) * 100
  const rh = Math.min(100, Math.max(0, rawRh))

  let status: 'unsaturated' | 'saturated' | 'supersaturated' = 'unsaturated'
  if (rawRh >= 100) {
    status = rawRh > 100.5 ? 'supersaturated' : 'saturated'
  }

  // 露点计算 (反解 Tetens 方程)
  // ln(p / 610.78) = 17.27*Td / (Td + 237.3)
  const a = 17.27
  const b = 237.3
  const ratio = Math.max(1e-4, safeP / 610.78)
  const alpha = Math.log(ratio)
  const dewPoint = (b * alpha) / (a - alpha)

  return {
    ps,
    rh: +rh.toFixed(1),
    status,
    dewPoint: +dewPoint.toFixed(1),
  }
}

/**
 * 计算单位时间内表面分子的逸出（蒸发）与碰撞回落（凝结）粒子通量
 */
export function calculatePhaseFlux(
  actualPressure: number,
  tempCelsius: number
): {
  evapFlux: number // 蒸发率 (取决于温度，即分子平均热运动动能)
  condFlux: number // 凝结率 (取决于蒸汽密度与分压)
  netEvap: number // 净蒸发量
  isBalanced: boolean
} {
  const ps = calculateSaturatedVaporPressure(tempCelsius)
  // 归一化为便于在 Canvas 渲染动画的速率标量 (10 ~ 80)
  const evapFlux = 15 + (ps / 8000) * 45
  const condFlux = 15 + (actualPressure / 8000) * 45
  const netEvap = evapFlux - condFlux
  const isBalanced = Math.abs(netEvap) < 0.5

  return {
    evapFlux,
    condFlux,
    netEvap,
    isBalanced,
  }
}
