import { describe, it, expect } from 'vitest'
import {
  calculateMotorCircuit,
  generateMotorPowerCurve,
  MOTOR_CIRCUIT_CONSTANTS,
} from '@/physics/dcCircuit'
import { GRAVITY } from '@/physics/constants'
import { handleDcCircuits } from '@/data/quantities/electromagnetism/dc-circuits'

describe('NonPureCircuit 非纯电阻电动机机电耦合模型物理与规范测试', () => {
  const U = 12
  const R_protect = 2.0
  const r_M = 1.0

  it('正常转动 (motorState=1): 电流与负载质量耦合，能量严格守恒且 U_M > I·rM', () => {
    const mass = 0.5
    const res = calculateMotorCircuit({ U, R_protect, r_M, motorState: 1, mass })

    // I = mg / kv = 2m = 1.0 A
    expect(res.valid).toBe(true)
    expect(res.isStalled).toBe(false)
    expect(res.stallReason).toBe('none')
    expect(res.I).toBeCloseTo(1.0, 5)
    expect(res.U_M).toBeCloseTo(10.0, 5)

    // 第一层守恒：P_总 = P_保 + P_入
    expect(res.P_total).toBeCloseTo(res.P_heat_R + res.P_in_motor, 5)
    // 第二层守恒：P_入 = P_热 + P_机
    expect(res.P_in_motor).toBeCloseTo(res.P_heat_M + res.P_mech, 5)
    // 机械输出与速度：P_机 = 10*1 - 1^2*1 = 9 W, v = 9 / (0.5 * 9.8)
    expect(res.P_mech).toBeCloseTo(9.0, 5)
    expect(res.v_lift).toBeCloseTo(9.0 / (mass * GRAVITY), 5)
    // 非纯电阻核心判据：U_M > I * rM，错套欧姆定律算出的电流大于实测 I
    expect(res.U_M).toBeGreaterThan(res.I * r_M)
    expect(res.I_ohmWrong).toBeGreaterThan(res.I)
  })

  it('人为卡住 (motorState=0): 退化为纯电阻电路，U_M = I·rM，触发右屏卡住警示', () => {
    const res = calculateMotorCircuit({ U, R_protect, r_M, motorState: 0, mass: 0.5 })

    expect(res.valid).toBe(true)
    expect(res.isStalled).toBe(true)
    expect(res.stallReason).toBe('locked')
    expect(res.I).toBeCloseTo(U / (R_protect + r_M), 5) // 12 / 3 = 4.0 A
    expect(res.U_M).toBeCloseTo(res.I * r_M, 5)
    expect(res.I_ohmWrong).toBeCloseTo(res.I, 5)
    expect(res.P_mech).toBe(0)
    expect(res.v_lift).toBe(0)
    expect(res.P_total).toBeCloseTo(res.I * res.I * (R_protect + r_M), 5)

    const panel = handleDcCircuits('anim-motor-circuit', { motorState: 0, U, mass: 0.5, r_M, R_protect }, 0, [])
    expect(panel?.warnings?.some((w) => w.text.includes('转轴卡住警示'))).toBe(true)
  })

  it('低电压或重物过重时自动进入无法转动状态（修复 U≤5V 假归零缺陷）', () => {
    // 场景 A：U = 2V，m = 0.5kg -> I_stall = 2/3 A < I_required = 1.0 A
    const lowVoltage = calculateMotorCircuit({ U: 2, R_protect, r_M, motorState: 1, mass: 0.5 })
    expect(lowVoltage.valid).toBe(true)
    expect(lowVoltage.isStalled).toBe(true)
    expect(lowVoltage.stallReason).toBe('overload')
    expect(lowVoltage.I).toBeCloseTo(2 / 3, 5)
    expect(lowVoltage.P_mech).toBe(0)

    // 场景 B：U = 12V，m = 2.2kg -> I_required = 4.4 A > I_stall = 4.0 A
    const heavyLoad = calculateMotorCircuit({ U: 12, R_protect, r_M, motorState: 1, mass: 2.2 })
    expect(heavyLoad.valid).toBe(true)
    expect(heavyLoad.isStalled).toBe(true)
    expect(heavyLoad.stallReason).toBe('overload')
    expect(heavyLoad.I).toBeCloseTo(4.0, 5)

    const panel = handleDcCircuits('anim-motor-circuit', { motorState: 1, U: 12, mass: 2.2, r_M, R_protect }, 0, [])
    expect(panel?.warnings?.some((w) => w.text.includes('无法启动警示'))).toBe(true)
  })

  it('最大机械功率极值验证：I = U / [2(R保+rM)] 时 P_机 达到峰值', () => {
    const optMass = MOTOR_CIRCUIT_CONSTANTS.kv * (U / (2 * (R_protect + r_M))) / GRAVITY // 1.0 kg
    const atPeak = calculateMotorCircuit({ U, R_protect, r_M, motorState: 1, mass: optMass })
    const belowPeak = calculateMotorCircuit({ U, R_protect, r_M, motorState: 1, mass: optMass - 0.3 })
    const abovePeak = calculateMotorCircuit({ U, R_protect, r_M, motorState: 1, mass: optMass + 0.3 })

    expect(atPeak.I).toBeCloseTo(atPeak.I_opt, 5)
    expect(atPeak.P_mech).toBeCloseTo(atPeak.P_mech_max, 5)
    expect(atPeak.P_mech).toBeGreaterThan(belowPeak.P_mech)
    expect(atPeak.P_mech).toBeGreaterThan(abovePeak.P_mech)
  })

  it('R保 = 0 边界与 P-I 功率特性曲线全点守恒', () => {
    const zeroProtect = calculateMotorCircuit({ U: 10, R_protect: 0, r_M: 1.0, motorState: 1, mass: 0.5 })
    expect(zeroProtect.valid).toBe(true)
    expect(zeroProtect.U_M).toBeCloseTo(10, 5)
    expect(zeroProtect.P_heat_R).toBe(0)

    const curve = generateMotorPowerCurve(U, R_protect, r_M, 60)
    expect(curve[0].I).toBe(0)
    expect(curve[curve.length - 1].I).toBeCloseTo(U / (R_protect + r_M), 5)
    expect(curve[curve.length - 1].P_mech).toBeCloseTo(0, 5)
    for (const pt of curve) {
      expect(pt.P_total).toBeCloseTo(pt.P_heat_total + pt.P_mech, 5)
    }
    const maxCurveMech = Math.max(...curve.map((pt) => pt.P_mech))
    expect(maxCurveMech).toBeCloseTo((U * U) / (4 * (R_protect + r_M)), 5)
  })

  it('右屏物理量行数 ≤ 8 且不含超纲术语', () => {
    const panel = handleDcCircuits('anim-motor-circuit', { motorState: 1, U, mass: 0.5, r_M, R_protect }, 0, [])
    expect(panel).not.toBeNull()
    expect(panel!.quantities.length).toBeLessThanOrEqual(8)

    const allText = JSON.stringify(panel)
    for (const term of ['反电动势', 'E_反', '堵转', '绕组', '电枢']) {
      expect(allText).not.toContain(term)
    }
  })
})
