import { useMemo } from 'react'
import { calculateCircuitState, type CircuitType, type MeterWiring } from '@/physics'

export interface BulbVAPhysicsParams {
  /** 电路类型：0 = 分压式 (voltage-divider), 1 = 限流式 (current-limiting) */
  circuitMode?: number
  /** 电表接法：0 = 外接法 (external), 1 = 内接法 (internal) */
  meterMode?: number
  /** 滑动变阻器滑片位置 0~1 */
  sliderRatio?: number
  /** 电源电动势 (V) */
  E?: number
  /** 电源内阻 (Ω) */
  r?: number
  /** 滑动变阻器最大阻值 (Ω) */
  R_slider_max?: number
  /** 是否展示电源外特性负载线 (工作点分析) */
  showLoadLine?: boolean
  /** 负载线电源电动势 (V) */
  E_load?: number
  /** 负载线电源内阻 (Ω) */
  r_load?: number
}

export interface BulbVAPoint {
  x: number // 电压 U (V)
  y: number // 电流 I (A)
}

export function useBulbVAPhysics(params: BulbVAPhysicsParams) {
  const {
    circuitMode = 0,
    meterMode = 0,
    sliderRatio = 0.5,
    E = 6.0,
    r = 0.5,
    R_slider_max = 20,
    showLoadLine = false,
    E_load = 3.5,
    r_load = 5.0,
  } = params

  const circuitType: CircuitType = circuitMode === 0 ? 'voltage-divider' : 'current-limiting'
  const meterWiring: MeterWiring = meterMode === 0 ? 'external' : 'internal'

  // 小灯泡额定参数：3.8V, 0.3A
  const U_rated = 3.8
  const I_rated = 0.3
  const R_cold = 2.5 // 冷态电阻 (Ω)
  const RV = 3000 // 电压表内阻 (Ω)
  const RA = 0.6 // 电流表内阻 (Ω)

  return useMemo(() => {
    // 纯物理小灯泡非线性 I-U 关系：I(U) = I_rated * (U / U_rated)^0.55
    const getBulbCurrent = (u: number): number => {
      if (u <= 0) return 0
      return I_rated * Math.pow(Math.min(u, 5.0) / U_rated, 0.55)
    }

    const getBulbResistance = (u: number): number => {
      if (u < 0.05) return R_cold
      const i = getBulbCurrent(u)
      return Math.max(R_cold, u / i)
    }

    // 迭代求解当前滑片位置下小灯泡真实端电压
    let uEst = circuitType === 'voltage-divider' ? E * sliderRatio : E * 0.5
    for (let iter = 0; iter < 4; iter++) {
      const rx = getBulbResistance(uEst)
      const st = calculateCircuitState({
        circuitType,
        meterWiring,
        sliderRatio,
        E,
        r,
        R_slider_max,
        Rx: rx,
        RV,
        RA,
      })
      uEst = st.U_real
    }

    const finalRx = getBulbResistance(uEst)
    const circuitState = calculateCircuitState({
      circuitType,
      meterWiring,
      sliderRatio,
      E,
      r,
      R_slider_max,
      Rx: finalRx,
      RV,
      RA,
    })

    const U_meas = circuitState.U_meas
    const I_meas = circuitState.I_meas
    const U_real = circuitState.U_real
    const I_real = circuitState.I_real
    const R_meas = circuitState.R_meas
    const R_real = finalRx
    const bulbPower = U_real * I_real

    // 生成真实伏安特性曲线点集 (U: 0 ~ 4.2V, 步长 0.1V)
    const realCurvePoints: BulbVAPoint[] = []
    for (let u = 0; u <= 4.2; u += 0.1) {
      realCurvePoints.push({
        x: u,
        y: getBulbCurrent(u),
      })
    }

    // 生成测量伏安特性曲线点集 (考虑内外接误差)
    const measuredCurvePoints: BulbVAPoint[] = realCurvePoints.map((pt) => {
      const u = pt.x
      const i = pt.y
      if (meterWiring === 'external') {
        // 外接法：电压表并联分流，I_meas = I + U / RV
        return { x: u, y: i + u / RV }
      } else {
        // 内接法：电流表串联分压，U_meas = U + I * RA
        return { x: u + i * RA, y: i }
      }
    })

    // 电源负载线工作点：I = (E_load - U) / r_load
    const loadLinePoints: BulbVAPoint[] = [
      { x: 0, y: E_load / r_load },
      { x: E_load, y: 0 },
    ]

    // 二分搜索求解负载线交点
    let workU = 0
    let workI = 0
    if (showLoadLine) {
      let low = 0
      let high = E_load
      for (let step = 0; step < 20; step++) {
        const mid = (low + high) / 2
        const iBulb = getBulbCurrent(mid)
        const iLoad = (E_load - mid) / r_load
        if (iBulb < iLoad) {
          low = mid
        } else {
          high = mid
        }
      }
      workU = (low + high) / 2
      workI = getBulbCurrent(workU)
    }

    const relError = R_real > 0 ? ((R_meas - R_real) / R_real) * 100 : 0

    return {
      circuitType,
      meterWiring,
      sliderRatio,
      U_meas,
      I_meas,
      U_real,
      I_real,
      R_meas,
      R_real,
      bulbPower,
      relError,
      realCurvePoints,
      measuredCurvePoints,
      loadLinePoints,
      workPoint: { U: workU, I: workI },
      showLoadLine,
      E,
      R_slider_max,
      U_rated,
      I_rated,
    }
  }, [circuitType, meterWiring, sliderRatio, E, r, R_slider_max, showLoadLine, E_load, r_load])
}
