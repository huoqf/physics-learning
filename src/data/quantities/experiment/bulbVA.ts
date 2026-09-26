import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { PhysicsPanelData } from '../types'
import { calculateCircuitState } from '@/physics'

export function buildBulbVAQuantities(
  _animId: string,
  params: Record<string, number>,
  _time: number
): PhysicsPanelData | null {
  const circuitMode = Number(params?.circuitMode ?? 0)
  const meterMode = Number(params?.meterMode ?? 0)
  const sliderRatio = Number(params?.sliderRatio ?? 0.5)
  const E = Number(params?.E ?? 6.0)
  const R_slider_max = Number(params?.R_slider_max ?? 20)

  const circuitType = circuitMode === 0 ? 'voltage-divider' : 'current-limiting'
  const meterWiring = meterMode === 0 ? 'external' : 'internal'

  // 小灯泡额定参数与模型
  const U_rated = 3.8
  const I_rated = 0.3
  const R_cold = 2.5
  const RV = 3000
  const RA = 0.6

  const getBulbCurrent = (u: number): number => {
    if (u <= 0) return 0
    return I_rated * Math.pow(Math.min(u, 5.0) / U_rated, 0.55)
  }

  const getBulbResistance = (u: number): number => {
    if (u < 0.05) return R_cold
    const i = getBulbCurrent(u)
    return Math.max(R_cold, u / i)
  }

  let uEst = circuitType === 'voltage-divider' ? E * sliderRatio : E * 0.5
  for (let iter = 0; iter < 4; iter++) {
    const rx = getBulbResistance(uEst)
    const st = calculateCircuitState({
      circuitType,
      meterWiring,
      sliderRatio,
      E,
      R_slider_max,
      Rx: rx,
      RV,
      RA,
    })
    uEst = st.U_real
  }

  const finalRx = getBulbResistance(uEst)
  const st = calculateCircuitState({
    circuitType,
    meterWiring,
    sliderRatio,
    E,
    R_slider_max,
    Rx: finalRx,
    RV,
    RA,
  })

  const U_meas = st.U_meas
  const I_meas = st.I_meas
  const U_real = st.U_real
  const I_real = st.I_real
  const P_real = U_real * I_real
  const R_meas = st.R_meas
  const relError = finalRx > 0 ? ((R_meas - finalRx) / finalRx) * 100 : 0

  return {
    quantities: [
      {
        label: '端电压测量值 U',
        value: U_meas.toFixed(2),
        unit: 'V',
        color: PHYSICS_COLORS.emf,
        highlight: 'extreme',
      },
      {
        label: '通过电流测量值 I',
        value: I_meas.toFixed(3),
        unit: 'A',
        color: PHYSICS_COLORS.electricCurrent,
        highlight: 'extreme',
      },
      {
        label: '实际电功率 P',
        value: P_real.toFixed(2),
        unit: 'W',
        color: colors.accent[500],
      },
      {
        label: '等效电阻测量值 R_测',
        value: R_meas.toFixed(2),
        unit: 'Ω',
        color: PHYSICS_COLORS.resistance,
      },
      {
        label: '灯丝真实电阻 R_真',
        value: finalRx.toFixed(2),
        unit: 'Ω',
        color: PHYSICS_COLORS.resistance,
      },
      {
        label: '测量相对误差 δ',
        value: `${relError >= 0 ? '+' : ''}${relError.toFixed(2)}`,
        unit: '%',
        color: Math.abs(relError) < 1 ? colors.success[600] : colors.danger[500],
      },
    ],
    formulas: [
      {
        name: '部分电路欧姆定律',
        latex: 'R = \\frac{U}{I}',
        level: 'core',
        condition: '适用于纯电阻元件，R 为割线电阻而非微分切线斜率',
      },
      {
        name: '外接法系统误差修正',
        latex: 'R_{\\text{测}} = \\frac{R_x R_V}{R_x + R_V} < R_x',
        level: 'important',
        condition: '因电压表分流，测得电阻偏小；因 Rx ≪ RV，误差极小',
      },
      {
        name: '电源负载线方程',
        latex: 'I = \\frac{E - U}{r}',
        level: 'important',
        condition: '与非线性 I-U 曲线交点即实际工作点',
      },
    ],
    gaokaoPoints: [
      {
        text: '【分压接法必考原因】高考题明确要求“小灯泡两端电压从零开始调节”，限流接法存在最小输出电压（无法调零），故必须采用分压式接法。',
        importance: 'gaokao',
      },
      {
        text: '【外接法减小误差判据】小灯泡冷态电阻约 2.5Ω，额定电阻约 12.7Ω，属于典型小电阻（Rx ≪ RV）。采用外接法时，电压表内阻分流造成的相对误差远小于内接法电流表分压造成的误差。',
        importance: 'gaokao',
      },
      {
        text: '【图线弯曲与电阻变化】随电压升高，电功率增大，灯丝温度升高，金属电阻率增大，导致电阻随电压增大而变大，伏安特性曲线呈现向上弯曲的非线性特征。',
        importance: 'core',
      },
      {
        text: '【工作点图像求法】将小灯泡接入实际电源时，画出电源外特性曲线 I = (E-U)/r，两图线交点坐标即为灯泡的实际工作电压和电流。',
        importance: 'gaokao',
      },
    ],
    warnings: [
      {
        text: '易错警示：严禁将伏安特性曲线上某点切线的斜率倒数当做该状态下的电阻！非线性元件的阻值恒等于该状态点与原点连线的割线斜率倒数 R = U / I。',
        level: 'danger',
      },
    ],
  }
}
