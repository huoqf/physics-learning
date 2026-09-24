/**
 * 传感器物理机理与控制电路纯物理模型 (SSOT)
 *
 * 涵盖：
 * 1. 光敏电阻光电响应
 * 2. NTC 热敏电阻温度特性
 * 3. 霍尔元件微观平衡与霍尔电压 (含 N 型/P 型载流子电势极性判定)
 * 4. 传感器分压电路与继电器门限触发模型
 */

/**
 * 光敏电阻阻值计算
 * 规律: 光照越强, 激发的光生载流子越多, 电阻越小 (反比幂律关系)
 *
 * @param illuminance 光照度 E (lux, 典型范围 1 ~ 1000 lux)
 * @param rDark 暗电阻 (Ω, 默认 50000Ω = 50kΩ)
 * @param gamma 光电灵敏度系数 (典型 0.7 ~ 0.9)
 * @returns 传感器实时阻值 (Ω)
 */
export function calcPhotoresistorResistance(
  illuminance: number,
  rDark: number = 50000,
  gamma: number = 0.8,
): number {
  const lux = Math.max(0.1, illuminance)
  // R = rDark / (1 + (lux / 5)^gamma)
  const r = rDark / (1 + Math.pow(lux / 5, gamma))
  return Math.max(100, r)
}

/**
 * NTC 负温度系数热敏电阻阻值计算 (Steinhart-Hart / B-参数方程)
 * R(T) = R25 * exp(B * (1/T - 1/T25))
 *
 * @param tempCelsius 环境摄氏温度 (℃, 典型 -10 ~ 100℃)
 * @param r25 25℃ 标称基准阻值 (Ω, 默认 10000Ω = 10kΩ)
 * @param B 热敏材料常数 (K, 典型 3435 ~ 3950K)
 * @returns 实时热敏阻值 (Ω)
 */
export function calcNTCResistance(
  tempCelsius: number,
  r25: number = 10000,
  B: number = 3450,
): number {
  const T = tempCelsius + 273.15 // 绝对温度 K
  const T25 = 25 + 273.15
  if (T <= 0) return r25 * 10
  const r = r25 * Math.exp(B * (1 / T - 1 / T25))
  return Math.max(50, r)
}

/**
 * 霍尔效应与霍尔电压计算 (qvB = q*UH/b 平衡)
 * UH = (1 / (n*q)) * (I * B / d) = RH * (I * B / d)
 *
 * @param currentI 控制电流 I (A)
 * @param magneticB 垂直磁感应强度 B (T)
 * @param thicknessD 霍尔薄片厚度 d (m, 如 0.5mm = 0.0005m)
 * @param carrierType 载流子类型 ('electron' 为电子, 'hole' 为正空穴)
 * @param rh 霍尔系数 (m^3/C, 典型半导体 ~ 1e-4)
 * @returns 霍尔电压 (V) 与正面/侧面极性
 */
export function calcHallVoltage(
  currentI: number,
  magneticB: number,
  thicknessD: number = 0.0005,
  carrierType: 'electron' | 'hole' = 'electron',
  rh: number = 2.5e-4,
): {
  uHall: number // 绝对值 (V)
  topPolarity: '+' | '-' // 上表面电势极性
  bottomPolarity: '+' | '-' // 下表面电势极性
  sign: number // 符号 (+1 或 -1)
} {
  const d = Math.max(1e-5, thicknessD)
  const uMag = Math.abs(rh * (currentI * magneticB) / d)

  // 极性推导:
  // 电流 I 水平向右, 磁场 B 垂直纸面向里 (方向: cross(v, B))
  // 电子 (q < 0, v 向左): 洛伦兹力向上偏转 -> 上表面积聚负电荷, 下表面带正电 -> 上低下高
  // 空穴 (q > 0, v 向右): 洛伦兹力向上偏转 -> 上表面积聚正电荷, 下表面带负电 -> 上高下低
  const isBPositive = magneticB >= 0
  const isIPositive = currentI >= 0

  let topIsPositive: boolean
  if (carrierType === 'electron') {
    topIsPositive = !(isIPositive && isBPositive)
  } else {
    topIsPositive = isIPositive && isBPositive
  }

  return {
    uHall: uMag,
    topPolarity: topIsPositive ? '+' : '-',
    bottomPolarity: topIsPositive ? '-' : '+',
    sign: topIsPositive ? 1 : -1,
  }
}

/**
 * 传感器分压控制电路与继电器触发状态
 *
 * @param rSensor 传感器当前阻值 (Ω)
 * @param rFixed 串联定值/滑动变阻器阻值 (Ω)
 * @param vSupply 控制电源电压 (V, 如 5V)
 * @param vThreshold 继电器动作导通阈值电压 (V, 如 2.5V)
 * @param sensorPosition 传感器在分压电路中的位置 ('top' 上拉分压, 'bottom' 下拉接地分压)
 * @returns 输出电压与继电器开关状态
 */
export function evaluateSensorCircuit(
  rSensor: number,
  rFixed: number,
  vSupply: number = 5,
  vThreshold: number = 2.5,
  sensorPosition: 'top' | 'bottom' = 'bottom',
): {
  vOut: number
  isTriggered: boolean
  current: number
} {
  const rTotal = Math.max(1, rSensor + rFixed)
  const current = vSupply / rTotal
  const vOut = sensorPosition === 'bottom'
    ? vSupply * (rSensor / rTotal)
    : vSupply * (rFixed / rTotal)

  const isTriggered = vOut >= vThreshold

  return { vOut, isTriggered, current }
}
