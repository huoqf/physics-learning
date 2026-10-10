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
 * 传感器分压/串联控制电路与继电器触发状态
 *
 * `threshold` 的量纲由 `mode` 严格决定，本函数不做任何隐式换算或兜底替换
 * （历史实现曾按 "threshold < 0.1 视为电流，否则回落到 0.0005 A" 静默替换，
 *  导致传入 0.1 A 等合法值时被判据悄悄改写，已移除）：
 * - `'bottom'` / `'top'`（分压比较模式）：threshold 为被比较电阻两端的分压阈值，单位 **V**
 * - `'NC'` / `'NO'`（继电器串联模式）：threshold 为线圈吸合电流 I_pull，单位 **A**
 *
 * @param rSensor 传感器当前阻值 (Ω)
 * @param rFixed 串联定值/滑动变阻器阻值 (Ω)
 * @param vSupply 控制电源电压 (V)
 * @param threshold 动作阈值（量纲随 mode 变化，见上）
 * @param mode 控制模式 ('NC' 常闭路灯, 'NO' 常开报警, 'bottom' 下拉分压, 'top' 上拉分压)
 * @param rCoil 继电器线圈内阻 (Ω, 默认 100Ω)
 * @returns 控制回路电流、衔铁吸合状态、工作回路通断状态、传感器分压
 */
export function evaluateSensorCircuit(
  rSensor: number,
  rFixed: number,
  vSupply: number,
  threshold: number,
  mode: 'NC' | 'NO' | 'bottom' | 'top' = 'NC',
  rCoil: number = 100,
): {
  vOut: number
  current: number
  isArmatureAttracted: boolean
  isTriggered: boolean
} {
  const rTotalWithoutCoil = Math.max(1, rSensor + rFixed)
  const rTotal = Math.max(1, rSensor + rFixed + rCoil)
  const current = vSupply / rTotal

  let vOut: number
  if (mode === 'top') {
    vOut = vSupply * (rFixed / rTotalWithoutCoil)
  } else {
    vOut = vSupply * (rSensor / rTotalWithoutCoil)
  }

  // 判定是否吸下衔铁
  let isArmatureAttracted = false
  let isTriggered = false

  if (mode === 'bottom' || mode === 'top') {
    // 经典分压模式（兼容已有分压测试）：以电压阈值为准
    isTriggered = vOut >= threshold
    isArmatureAttracted = isTriggered
  } else {
    // 继电器串联真实欧姆定律模式：threshold 即线圈吸合电流 I_pull (A)
    isArmatureAttracted = current >= threshold
    // NC(常闭)：吸合时拉开灭灯，未吸合时复位闭合亮灯
    // NO(常开)：吸合时闭合报警，未吸合时断开
    isTriggered = mode === 'NC' ? !isArmatureAttracted : isArmatureAttracted
  }

  return { vOut, current, isArmatureAttracted, isTriggered }
}

// ─── 传感器物理与控制系统标准常量 (SSOT) ─────────────────────────────
export const CAP_SENSOR_AREA_CM2 = 50
export const CAP_SENSOR_TRIGGER_GAP_MM = 1.8
export const LIGHT_RELAY_I_PULL = 0.0005 // 0.50 mA 动作电流
export const NTC_RELAY_I_PULL = 0.0007 // 0.70 mA 动作电流
export const HALL_TRIGGER_VOLTAGE_MV = 400 // 400 mV 动作门限

/**
 * 电容式位移/压力传感器物理模型 (平行板电容器决定式)
 * C = εr * ε0 * S / d
 *
 * @param gapD 极板间距 d (mm, 典型范围 1.0 ~ 10.0 mm)
 * @param areaS 极板正对面积 S (cm^2, 默认 50 cm^2)
 * @param epsilonR 相对介电常数 εr (默认空气 1.0)
 * @returns 实时电容值 (pF)
 */
export function calcCapacitiveSensorCapacitance(
  gapD: number,
  areaS: number = CAP_SENSOR_AREA_CM2,
  epsilonR: number = 1.0,
): number {
  const d_m = Math.max(0.1, gapD) * 1e-3 // mm -> m
  const s_m2 = Math.max(1, areaS) * 1e-4 // cm^2 -> m^2
  const epsilon0 = 8.854e-12 // F/m (真空介电常数)
  // C = εr * ε0 * S / d (F)
  const cFarad = (epsilonR * epsilon0 * s_m2) / d_m
  return +(cFarad * 1e12).toFixed(2) // 转换为 pF (皮法)
}

/**
 * 电容式位移/压力传感器状态评估函数
 *
 * @param gapD 极板间距 d (mm)
 * @param areaS 正对面积 S (cm^2)
 * @param triggerGapMm 预警触发极限间距 (mm)
 * @returns 实时电容量 (pF) 与是否超程/受压报警
 */
export function evaluateCapacitiveSensor(
  gapD: number,
  areaS: number = CAP_SENSOR_AREA_CM2,
  triggerGapMm: number = CAP_SENSOR_TRIGGER_GAP_MM,
): {
  capacitancePf: number
  isExceeded: boolean
} {
  const capacitancePf = calcCapacitiveSensorCapacitance(gapD, areaS)
  const isExceeded = gapD <= triggerGapMm
  return { capacitancePf, isExceeded }
}
