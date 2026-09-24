import { useMemo } from 'react'
import {
  calcPhotoresistorResistance,
  calcNTCResistance,
  calcHallVoltage,
  evaluateSensorCircuit,
} from '@/physics/electromagnetism/sensors'

export interface SensorPhysicsParams {
  sensorType?: number
  illuminance?: number
  temperature?: number
  magneticB?: number
  currentI?: number
  carrierType?: number // 0: 电子型 (N型), 1: 空穴型 (P型)
  rFixed?: number
  vThreshold?: number
  time?: number
}

export interface SensorPhysicsResult {
  sensorType: number
  rSensor: number
  uHallMilliVolts: number
  topPolarity: '+' | '-'
  bottomPolarity: '+' | '-'
  vOut: number
  isTriggered: boolean
  circuitCurrent: number
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
  rFixed = 5000,
  vThreshold = 2.5,
}: SensorPhysicsParams): SensorPhysicsResult {
  return useMemo(() => {
    let rSensor = 0
    let uHallMilliVolts = 0
    let topPolarity: '+' | '-' = '-'
    let bottomPolarity: '+' | '-' = '+'
    let vOut = 0
    let isTriggered = false
    let circuitCurrent = 0

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
      // 0: 光敏电阻
      rSensor = calcPhotoresistorResistance(illuminance)
      const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, vThreshold, 'bottom')
      vOut = circuit.vOut
      isTriggered = circuit.isTriggered
      circuitCurrent = circuit.current

      currentX = illuminance
      currentY = rSensor / 1000 // 单位换算为 kΩ 便于读图
      xLabel = '光照度 E / lx'
      yLabel = '阻值 R / kΩ'
      xDomain = [0, 600]
      yDomain = [0, 30]

      // 采样 R-E 响应曲线
      for (let lux = 5; lux <= 600; lux += 15) {
        curvePoints.push({ x: lux, y: calcPhotoresistorResistance(lux) / 1000 })
      }
    } else if (sensorType === 1) {
      // 1: NTC 热敏电阻
      rSensor = calcNTCResistance(temperature)
      const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, vThreshold, 'bottom')
      vOut = circuit.vOut
      isTriggered = circuit.isTriggered
      circuitCurrent = circuit.current

      currentX = temperature
      currentY = rSensor / 1000
      xLabel = '环境温度 T / ℃'
      yLabel = '热敏电阻 R / kΩ'
      xDomain = [0, 90]
      yDomain = [0, 25]

      for (let t = 0; t <= 90; t += 2) {
        curvePoints.push({ x: t, y: calcNTCResistance(t) / 1000 })
      }
    } else {
      // 2: 霍尔元件
      const hallRes = calcHallVoltage(currentI, magneticB, 0.0005, isHole ? 'hole' : 'electron')
      uHallMilliVolts = hallRes.uHall * 1000 // 转换为 mV
      topPolarity = hallRes.topPolarity
      bottomPolarity = hallRes.bottomPolarity

      vOut = hallRes.uHall * 50 // 经运算放大后用于比较
      isTriggered = vOut >= vThreshold
      circuitCurrent = currentI

      currentX = magneticB
      currentY = uHallMilliVolts
      xLabel = '磁感应强度 B / T'
      yLabel = '霍尔电压 UH / mV'
      xDomain = [0, 2.0]
      yDomain = [0, 1.2]
      thresholdLineY = (vThreshold / 50) * 1000

      for (let b = 0; b <= 2.0; b += 0.05) {
        const h = calcHallVoltage(currentI, b, 0.0005, isHole ? 'hole' : 'electron')
        curvePoints.push({ x: b, y: h.uHall * 1000 })
      }
    }

    return {
      sensorType,
      rSensor,
      uHallMilliVolts,
      topPolarity,
      bottomPolarity,
      vOut,
      isTriggered,
      circuitCurrent,
      curvePoints,
      currentX,
      currentY,
      xLabel,
      yLabel,
      xDomain,
      yDomain,
      thresholdLineY,
    }
  }, [sensorType, illuminance, temperature, magneticB, currentI, carrierType, rFixed, vThreshold])
}
