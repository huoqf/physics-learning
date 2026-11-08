import { describe, it, expect } from 'vitest'
import { calculateMotorCircuit } from '@/physics/dcCircuit'
import { handleDcCircuits } from '@/data/quantities/electromagnetism/dc-circuits'

describe('NonPureCircuit 非纯电阻电动机模型严格物理测试', () => {
  const U = 10
  const R_protect = 2.0
  const r_M = 1.0
  const E_back = 5.0
  const mass = 0.5

  it('正常旋转 (motorState=1): 能量严格守恒且输出有用机械功', () => {
    const res = calculateMotorCircuit(U, R_protect, r_M, 1, E_back, mass)

    // 电流 I = (U - E_back) / (R_protect + r_M) = 5 / 3 ≈ 1.667 A
    expect(res.I).toBeCloseTo(5 / 3, 3)

    const P_protect = res.I * res.I * R_protect
    const P_in_motor = res.U_M * res.I

    // 第一层守恒：P_总 = P_保 + P_入
    expect(res.P_total).toBeCloseTo(P_protect + P_in_motor, 3)

    // 第二层守恒：P_入 = P_热 + P_机
    expect(P_in_motor).toBeCloseTo(res.P_heat_M + res.P_mech, 3)

    // 机械输出大于零
    expect(res.P_mech).toBeGreaterThan(0)

    // 右屏无堵转告警
    const data = handleDcCircuits('anim-motor-circuit', { motorState: 1, U, mass }, 0, [])
    expect(data?.warnings?.some((w) => w.text.includes('【堵转预警】'))).toBe(false)
  })

  it('电动机堵转 (motorState=0): 反电动势消失，退化为纯电阻发热，输出机械功为零', () => {
    const res = calculateMotorCircuit(U, R_protect, r_M, 0, E_back, mass)

    // 电流 I = U / (R_protect + r_M) = 10 / 3 ≈ 3.333 A (电流翻倍)
    expect(res.I).toBeCloseTo(10 / 3, 3)
    expect(res.P_mech).toBe(0)
    expect(res.v_lift).toBe(0)

    // 纯电阻发热守恒：P_总 = I²(R_保 + r_M)
    const expectedHeat = res.I * res.I * (R_protect + r_M)
    expect(res.P_total).toBeCloseTo(expectedHeat, 3)

    // 右屏必须触发【堵转预警】
    const data = handleDcCircuits('anim-motor-circuit', { motorState: 0, U, mass }, 0, [])
    expect(data?.warnings?.some((w) => w.text.includes('【堵转预警】'))).toBe(true)
  })
})
