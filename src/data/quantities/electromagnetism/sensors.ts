import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calcPhotoresistorResistance,
  calcNTCResistance,
  calcHallVoltage,
  evaluateSensorCircuit,
} from '@/physics/electromagnetism/sensors'

export function buildSensorQuantities(
  _animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const sensorType = params.sensorType ?? 0
  const illuminance = params.illuminance ?? 100
  const temperature = params.temperature ?? 25
  const magneticB = params.magneticB ?? 1.0
  const currentI = params.currentI ?? 0.8
  const carrierType = params.carrierType ?? 0
  const rFixed = params.rFixed ?? 5000
  const vThreshold = params.vThreshold ?? 2.5

  const quantities: PhysicsQuantity[] = []
  const formulas: Formula[] = []
  const gaokaoPoints: GaokaoPoint[] = []

  const isHole = carrierType === 1

  if (sensorType === 0) {
    const rSensor = calcPhotoresistorResistance(illuminance)
    const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, vThreshold, 'bottom')

    quantities.push(
      { label: '光照度', symbol: 'E', value: illuminance, unit: 'lx' },
      { label: '光敏电阻阻值', symbol: 'R', value: +(rSensor / 1000).toFixed(2), unit: 'kΩ' },
      { label: '控制端输出电压', symbol: 'V_{\\text{out}}', value: +circuit.vOut.toFixed(2), unit: 'V' },
      { label: '继电器吸合阈值', symbol: 'V_{\\text{th}}', value: vThreshold, unit: 'V' },
    )

    formulas.push(
      { name: '传感器分压比', latex: 'V_{\\text{out}} = V_{cc} \\frac{R}{R_0 + R}', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: '光敏电阻工作特性：半导体硫化镉无光照时暗电阻很大；光照增强时光生载流子激增，亮电阻急剧下降。',
        importance: 'gaokao',
      },
      {
        text: '路灯自动控制逻辑：天黑时光照减弱，光敏电阻阻值增大，分压输出 Vout 上升，达到动作阈值时触发继电器闭合路灯。',
        importance: 'core',
      },
    )
  } else if (sensorType === 1) {
    const rSensor = calcNTCResistance(temperature)
    const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, vThreshold, 'bottom')

    quantities.push(
      { label: '环境温度', symbol: 'T', value: temperature, unit: '℃' },
      { label: 'NTC 热敏阻值', symbol: 'R_T', value: +(rSensor / 1000).toFixed(2), unit: 'kΩ' },
      { label: '控制端输出电压', symbol: 'V_{\\text{out}}', value: +circuit.vOut.toFixed(2), unit: 'V' },
      { label: '继电器动作状态', symbol: '状态', value: circuit.isTriggered ? 1 : 0, unit: circuit.isTriggered ? '导通' : '断开' },
    )

    formulas.push(
      { name: 'NTC 热敏方程', latex: 'R(T) = R_{25} e^{B\\left(\\frac{1}{T} - \\frac{1}{T_{25}}\\right)}', level: 'important' },
      { name: '分压比较输出', latex: 'V_{\\text{out}} = V_{cc} \\frac{R_T}{R_0 + R_T}', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: 'NTC 负温度系数特性：NTC 热敏电阻阻值随温度升高而急剧降低，常用于火灾温度报警与恒温控制。',
        importance: 'gaokao',
      },
      {
        text: '灵敏度与阈值设定：调节滑动变阻器 R0 可改变报警基准温度点；R0 增大时触发报警所需的阻值更小，对应温度更高。',
        importance: 'core',
      },
    )
  } else {
    const hallRes = calcHallVoltage(currentI, magneticB, 0.0005, isHole ? 'hole' : 'electron')

    quantities.push(
      { label: '磁感应强度', symbol: 'B', value: magneticB, unit: 'T' },
      { label: '控制电流', symbol: 'I', value: currentI, unit: 'A' },
      { label: '霍尔电压', symbol: 'U_H', value: +(hallRes.uHall * 1000).toFixed(2), unit: 'mV' },
      { label: '上表面极性', symbol: '极性', value: hallRes.topPolarity === '+' ? 1 : -1, unit: hallRes.topPolarity },
    )

    formulas.push(
      { name: '微观平衡方程', latex: 'qvB = q\\frac{U_H}{d}', level: 'core' },
      { name: '霍尔电压公式', latex: 'U_H = k \\frac{IB}{d} = \\frac{1}{nq}\\frac{IB}{d}', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: isHole
          ? '高考高频考点【P型半导体（空穴导电）】：正电荷定向移动受洛伦兹力向上聚集，【上表面电势高于下表面】。'
          : '高考高频考点【N型半导体（电子导电）】：自由电子定向移动受洛伦兹力向上聚集，【上表面电势低于下表面】！',
        importance: 'gaokao',
      },
      {
        text: '霍尔效应应用：霍尔电压 UH 与电流 I 和垂直磁感应强度 B 成正比，可制成高灵敏度磁强计、转速传感器与无触点开关。',
        importance: 'core',
      },
    )
  }

  return { quantities, formulas, gaokaoPoints }
}
