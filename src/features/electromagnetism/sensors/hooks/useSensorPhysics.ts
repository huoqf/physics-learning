import { useMemo } from 'react'
import {
  calcPhotoresistorResistance,
  calcNTCResistance,
  calcHallVoltage,
  calcCapacitiveSensorCapacitance,
  evaluateSensorCircuit,
  evaluateCapacitiveSensor,
  CAP_SENSOR_AREA_CM2,
  CAP_SENSOR_TRIGGER_GAP_MM,
  LIGHT_RELAY_I_PULL,
  NTC_RELAY_I_PULL,
  HALL_TRIGGER_VOLTAGE_MV,
} from '@/physics/electromagnetism/sensors'

export interface SensorPhysicsParams {
  sensorType?: number
  illuminance?: number
  temperature?: number
  magneticB?: number
  currentI?: number
  carrierType?: number // 0: 电子型 (N型), 1: 空穴型 (P型)
  capacitorGap?: number // mm
  rFixed?: number
  time?: number
}

export interface SensorPhysicsResult {
  sensorType: number
  rSensor: number
  uHallMilliVolts: number
  topPolarity: '+' | '-'
  bottomPolarity: '+' | '-'
  isArmatureAttracted: boolean
  isTriggered: boolean
  circuitCurrent: number
  capacitancePf: number
  curvePoints: { x: number; y: number }[]
  currentX: number
  currentY: number
  xLabel: string
  yLabel: string
  xDomain: [number, number]
  yDomain: [number, number]
  thresholdLineY?: number
}

export function useSensorPhysics({
  sensorType = 0,
  illuminance = 100,
  temperature = 25,
  magneticB = 1.0,
  currentI = 0.8,
  carrierType = 0,
  capacitorGap = 3.0,
  rFixed = 5000,
}: SensorPhysicsParams): SensorPhysicsResult {
  return useMemo(() => {
    let rSensor = 0
    let uHallMilliVolts = 0
    let topPolarity: '+' | '-' = '-'
    let bottomPolarity: '+' | '-' = '+'
    let isArmatureAttracted = false
    let isTriggered = false
    let circuitCurrent = 0
    let capacitancePf = 0

    const curvePoints: { x: number; y: number }[] = []
    let currentX = 0
    let currentY = 0
    let xLabel = ''
    let yLabel = ''
    let xDomain: [number, number] = [0, 100]
    let yDomain: [number, number] = [0, 100]
    let thresholdLineY: number | undefined

    const isHole = carrierType === 1

    if (sensorType === 0) {
      // 0: 光敏电阻 (常闭触点路灯控制)
      rSensor = calcPhotoresistorResistance(illuminance)
      const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, LIGHT_RELAY_I_PULL, 'NC')
      isArmatureAttracted = circuit.isArmatureAttracted
      isTriggered = circuit.isTriggered
      circuitCurrent = circuit.current

      currentX = illuminance
      currentY = rSensor / 1000 // kΩ
      xLabel = '光照度 E / lx'
      yLabel = '阻值 R / kΩ'
      xDomain = [0, 600]
      yDomain = [0, 30]

      // 采样 R-E 响应曲线：整数计数保证覆盖到坐标域右端 600 lx
      // (浮点累加步长会因 0.05/0.2 类步长丢终点，使曲线与坐标轴右端错位)
      for (let i = 0; i <= 119; i++) {
        const lux = 5 + i * 5
        curvePoints.push({ x: lux, y: calcPhotoresistorResistance(lux) / 1000 })
      }
    } else if (sensorType === 1) {
      // 1: NTC 热敏电阻 (常开触点火警报警)
      rSensor = calcNTCResistance(temperature)
      const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, NTC_RELAY_I_PULL, 'NO')
      isArmatureAttracted = circuit.isArmatureAttracted
      isTriggered = circuit.isTriggered
      circuitCurrent = circuit.current

      currentX = temperature
      currentY = rSensor / 1000
      xLabel = '环境温度 T / ℃'
      yLabel = '热敏电阻 R / kΩ'
      xDomain = [0, 90]
      yDomain = [0, 30]

      for (let i = 0; i <= 45; i++) {
        const t = i * 2
        curvePoints.push({ x: t, y: calcNTCResistance(t) / 1000 })
      }
    } else if (sensorType === 2) {
      // 2: 霍尔元件 (微观平衡与磁电无触点开关)
      const hallRes = calcHallVoltage(currentI, magneticB, 0.0005, isHole ? 'hole' : 'electron')
      uHallMilliVolts = hallRes.uHall * 1000 // 转换为 mV
      topPolarity = hallRes.topPolarity
      bottomPolarity = hallRes.bottomPolarity

      // 动作判定：在 mV 域直接比较，当 UH >= 400 mV 时吸合触发无触点开关
      isArmatureAttracted = uHallMilliVolts >= HALL_TRIGGER_VOLTAGE_MV
      isTriggered = isArmatureAttracted
      circuitCurrent = currentI

      currentX = magneticB
      currentY = uHallMilliVolts
      xLabel = '磁感应强度 B / T'
      yLabel = '霍尔电压 UH / mV'
      xDomain = [0, 2.0]
      // 采样点在 B=2.0T 时的最大值：当 I=2.0A 时为 2000 mV，当 I=0.8A 时为 800 mV
      const maxCurveMv = Math.ceil((calcHallVoltage(currentI, 2.0, 0.0005).uHall * 1000) / 200) * 200
      yDomain = [0, Math.max(1000, maxCurveMv)]
      thresholdLineY = HALL_TRIGGER_VOLTAGE_MV

      for (let i = 0; i <= 40; i++) {
        const b = i / 20
        const h = calcHallVoltage(currentI, b, 0.0005, isHole ? 'hole' : 'electron')
        curvePoints.push({ x: b, y: +(h.uHall * 1000).toFixed(2) })
      }
    } else {
      // 3: 电容式传感器 (微位移与压力检测)
      const evalRes = evaluateCapacitiveSensor(capacitorGap, CAP_SENSOR_AREA_CM2, CAP_SENSOR_TRIGGER_GAP_MM)
      capacitancePf = evalRes.capacitancePf
      isArmatureAttracted = evalRes.isExceeded
      isTriggered = evalRes.isExceeded

      currentX = capacitorGap
      currentY = capacitancePf
      xLabel = '极板间距 d / mm'
      yLabel = '电容量 C / pF'
      xDomain = [1.0, 10.0]
      yDomain = [0, 50]
      // 阈值线使用物理层统一计算值 (d = 1.8mm 对应电容值)
      thresholdLineY = calcCapacitiveSensorCapacitance(CAP_SENSOR_TRIGGER_GAP_MM, CAP_SENSOR_AREA_CM2)

      for (let i = 0; i <= 45; i++) {
        const d = 1 + i / 5
        curvePoints.push({ x: d, y: calcCapacitiveSensorCapacitance(d, CAP_SENSOR_AREA_CM2) })
      }
    }

    return {
      sensorType,
      rSensor,
      uHallMilliVolts,
      topPolarity,
      bottomPolarity,
      isArmatureAttracted,
      isTriggered,
      circuitCurrent,
      capacitancePf,
      curvePoints,
      currentX,
      currentY,
      xLabel,
      yLabel,
      xDomain,
      yDomain,
      thresholdLineY,
    }
  }, [sensorType, illuminance, temperature, magneticB, currentI, carrierType, capacitorGap, rFixed])
}
