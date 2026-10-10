import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calcPhotoresistorResistance,
  calcNTCResistance,
  calcHallVoltage,
  evaluateSensorCircuit,
  evaluateCapacitiveSensor,
  CAP_SENSOR_AREA_CM2,
  CAP_SENSOR_TRIGGER_GAP_MM,
  LIGHT_RELAY_I_PULL,
  NTC_RELAY_I_PULL,
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
  const capacitorGap = params.capacitorGap ?? 3.0
  const rFixed = params.rFixed ?? 5000

  const quantities: PhysicsQuantity[] = []
  const formulas: Formula[] = []
  const gaokaoPoints: GaokaoPoint[] = []

  const isHole = carrierType === 1

  if (sensorType === 0) {
    const rSensor = calcPhotoresistorResistance(illuminance)
    const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, LIGHT_RELAY_I_PULL, 'NC')

    quantities.push(
      { label: '光照度', symbol: 'E', value: illuminance, unit: 'lx' },
      { label: '光敏电阻阻值', symbol: 'R_G', value: +(rSensor / 1000).toFixed(2), unit: 'kΩ' },
      { label: '控制回路电流', symbol: 'I_控', value: +(circuit.current * 1000).toFixed(2), unit: 'mA' },
      { label: '电磁铁动作状态', value: circuit.isArmatureAttracted ? 1 : 0, unit: circuit.isArmatureAttracted ? '吸合衔铁' : '释放衔铁' },
      { label: '受控路灯状态', value: circuit.isTriggered ? 1 : 0, unit: circuit.isTriggered ? '常闭闭合(点亮)' : '常闭拉开(熄灭)' },
    )

    formulas.push(
      { name: '闭合电路欧姆定律', latex: 'I = \\frac{E_{cc}}{R_0 + R_G + R_{\\text{coil}}}', level: 'core' },
      { name: '继电器吸合判定', latex: 'I \\ge I_{\\text{pull}} \\implies \\text{电磁铁吸合}', level: 'important' },
    )

    gaokaoPoints.push(
      {
        text: '光敏电阻半导体机理：光照越强，光生载流子激增，电阻急剧减小（反比幂律关系）。暗电阻数万欧，亮电阻仅数百欧。',
        importance: 'gaokao',
      },
      {
        text: '光控路灯常闭触点逻辑：白天光照强，RG 很小，回路电流大，电磁铁吸下衔铁断开常闭触点灭灯；天黑 RG 变大，电流不足，弹簧拉回衔铁闭合常闭触点点亮路灯！',
        importance: 'gaokao',
      },
      {
        text: '滑动变阻器调灵敏度：增大 R0，回路总电阻变大，光敏电阻仅需较小阻值（即在黄昏较亮时）电流即降至释放阈值点亮路灯；减小 R0，需天更黑（RG 阻值更大）时才点亮。',
        importance: 'core',
      },
    )
  } else if (sensorType === 1) {
    const rSensor = calcNTCResistance(temperature)
    const circuit = evaluateSensorCircuit(rSensor, rFixed, 5, NTC_RELAY_I_PULL, 'NO')

    quantities.push(
      { label: '环境温度', symbol: 'T', value: temperature, unit: '℃' },
      { label: 'NTC 热敏阻值', symbol: 'R_T', value: +(rSensor / 1000).toFixed(2), unit: 'kΩ' },
      { label: '控制回路电流', symbol: 'I_控', value: +(circuit.current * 1000).toFixed(2), unit: 'mA' },
      { label: '电磁铁动作状态', value: circuit.isArmatureAttracted ? 1 : 0, unit: circuit.isArmatureAttracted ? '吸合衔铁' : '未动作' },
      { label: '火警报警器', value: circuit.isTriggered ? 1 : 0, unit: circuit.isTriggered ? '常开闭合(报警)' : '常开断开(正常)' },
    )

    formulas.push(
      { name: 'NTC 热敏方程', latex: 'R(T) = R_{25} e^{B\\left(\\frac{1}{T} - \\frac{1}{T_{25}}\\right)}', level: 'important' },
      { name: '回路欧姆定律', latex: 'I = \\frac{E_{cc}}{R_0 + R_T + R_{\\text{coil}}}', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: 'NTC 负温度系数特性：随温度升高阻值按指数规律剧烈减小。金属热电阻则随温度升高电阻线性增大，注意两者的考点辨析！',
        importance: 'gaokao',
      },
      {
        text: '火警报警器常开触点逻辑：常温下 RT 很大，回路电流微弱不足以吸合衔铁；发生火灾温度超标时 RT 剧降，电流猛增吸合衔铁闭合常开触点，电铃报警。',
        importance: 'gaokao',
      },
      {
        text: '报警温度门限设定：增大变阻器 R0，需要 RT 降到更小阻值（即更高温度）才能吸合报警，设定报警温度点升高。',
        importance: 'core',
      },
    )
  } else if (sensorType === 2) {
    const hallRes = calcHallVoltage(currentI, magneticB, 0.0005, isHole ? 'hole' : 'electron')

    quantities.push(
      { label: '磁感应强度', symbol: 'B', value: magneticB, unit: 'T' },
      { label: '控制电流', symbol: 'I', value: currentI, unit: 'A' },
      { label: '霍尔电压', symbol: 'U_H', value: +(hallRes.uHall * 1000).toFixed(2), unit: 'mV' },
      { label: '上表面电势极性', value: hallRes.topPolarity === '+' ? 1 : -1, unit: hallRes.topPolarity },
    )

    formulas.push(
      { name: '洛伦兹力微观平衡', latex: 'qvB = q\\frac{U_H}{b}', level: 'core' },
      { name: '霍尔电压决定式', latex: 'U_H = k \\frac{IB}{d} = \\frac{1}{nq}\\frac{IB}{d}', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: isHole
          ? '高考高频考点【P型半导体（空穴导电，q>0）】：正电荷定向移动受向上的洛伦兹力偏转积聚，【上表面电势高于下表面】。'
          : '高考高频考点【N型半导体（电子导电，q<0）】：自由电子定向移动受向上的洛伦兹力偏转积聚，【上表面电势低于下表面】！',
        importance: 'gaokao',
      },
      {
        text: '微观平衡推导符号：qvB = q·UH/b（b 为上下表面间距即偏转距离），联立 I = nqv(bd) 可得 UH = IB/(nqd)（d 为沿磁场方向的薄片厚度）。',
        importance: 'gaokao',
      },
      {
        text: '霍尔效应应用大题模型：霍尔电压 UH 正比于 B 和 I，反比于薄片厚度 d 与载流子密度 n。可用于高精度测磁场、转速测量仪与无触点点火开关。',
        importance: 'core',
      },
    )
  } else {
    // 3: 电容式传感器 (微位移/压力检测)
    const evalRes = evaluateCapacitiveSensor(capacitorGap, CAP_SENSOR_AREA_CM2, CAP_SENSOR_TRIGGER_GAP_MM)
    const capPf = evalRes.capacitancePf
    const isExceeded = evalRes.isExceeded

    quantities.push(
      { label: '极板间距', symbol: 'd', value: capacitorGap, unit: 'mm' },
      { label: '正对面积', symbol: 'S', value: CAP_SENSOR_AREA_CM2, unit: 'cm²' },
      { label: '传感器实时电容', symbol: 'C', value: capPf, unit: 'pF' },
      { label: '微位移临界预警', value: isExceeded ? 1 : 0, unit: isExceeded ? '超程/受压报警' : '间距正常' },
    )

    formulas.push(
      { name: '平行板电容器决定式', latex: 'C = \\frac{\\varepsilon_r S}{4\\pi k d}', level: 'core' },
      { name: '电荷-电压定义式', latex: 'C = \\frac{Q}{U}', level: 'important' },
    )

    gaokaoPoints.push(
      {
        text: '电容式传感器分类：①变间距式（测微小位移、压力、加速度，反比非线性）；②变面积式（测角位移、线位移，线性良好）；③变介电常数式（测物位、液体油面高低）。',
        importance: 'gaokao',
      },
      {
        text: '新高考电容加速度计模型：小车加减速时惯性力推动中间动片极板移动改变 d，引起电容 C 变化，电路产生微弱充放电电流脉冲，检测信号即反映加速度大小与方向。',
        importance: 'gaokao',
      },
      {
        text: '动态灵敏度分析：极板初始间距 d 越小，单位位移引起电容变化量 ΔC 越大，灵敏度越高；但测量线性范围随之收窄。',
        importance: 'core',
      },
    )
  }

  return { quantities, formulas, gaokaoPoints }
}
