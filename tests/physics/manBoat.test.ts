import { describe, it, expect } from 'vitest'
import { calculateManBoatState, getManBoatAutoMotion } from '../../src/physics/momentumApplication/manBoat'

describe('人船模型物理纯计算层单元测试', () => {
  const M = 150
  const m1 = 50
  const m2 = 60
  const L = 4.0
  const duration = 2.5

  it('单人走动模式 (mode=0) - 验证质心锁定在0与动量/位移守恒', () => {
    // 自动模拟状态列表
    const steps = 100
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration
      const motion = getManBoatAutoMotion(t, L, duration, 0)
      const st = calculateManBoatState(motion.s1, motion.v1_rel, motion.s2, motion.v2_rel, m1, 0, M, L)

      // 1. 验证质心绝对坐标严格为0 (自检值)
      expect(st.x_cm).toBeCloseTo(0, 5)

      // 2. 验证瞬时总动量为0
      const p_total = m1 * st.v_person1 + M * st.v_boat
      expect(p_total).toBeCloseTo(0, 5)
    }

    // 验证末位移
    const startMotion = getManBoatAutoMotion(0, L, duration, 0)
    const endMotion = getManBoatAutoMotion(duration, L, duration, 0)
    const startState = calculateManBoatState(startMotion.s1, startMotion.v1_rel, startMotion.s2, startMotion.v2_rel, m1, 0, M, L)
    const endState = calculateManBoatState(endMotion.s1, endMotion.v1_rel, endMotion.s2, endMotion.v2_rel, m1, 0, M, L)

    const disp_boat = endState.x_boat - startState.x_boat
    const disp_person1 = endState.x_person1 - startState.x_person1

    // 理论绝对位移：船为 -m1*L/(m1+M)，人为 M*L/(m1+M)
    const expected_disp_boat = -(m1 * L) / (m1 + M)
    const expected_disp_person1 = (M * L) / (m1 + M)

    expect(disp_boat).toBeCloseTo(expected_disp_boat, 5)
    expect(disp_person1).toBeCloseTo(expected_disp_person1, 5)
    expect(disp_person1 - disp_boat).toBeCloseTo(L, 5)
  })

  it('双人交换位置模式 (mode=1) - 验证质心绝对守恒与双人动量/位移守恒', () => {
    const steps = 100
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration
      const motion = getManBoatAutoMotion(t, L, duration, 1)
      const st = calculateManBoatState(motion.s1, motion.v1_rel, motion.s2, motion.v2_rel, m1, m2, M, L)

      expect(st.x_cm).toBeCloseTo(0, 5)
      
      const p_total = m1 * st.v_person1 + m2 * st.v_person2 + M * st.v_boat
      expect(p_total).toBeCloseTo(0, 5)
    }

    const startMotion = getManBoatAutoMotion(0, L, duration, 1)
    const endMotion = getManBoatAutoMotion(duration, L, duration, 1)
    const startState = calculateManBoatState(startMotion.s1, startMotion.v1_rel, startMotion.s2, startMotion.v2_rel, m1, m2, M, L)
    const endState = calculateManBoatState(endMotion.s1, endMotion.v1_rel, endMotion.s2, endMotion.v2_rel, m1, m2, M, L)

    const disp_boat = endState.x_boat - startState.x_boat
    // 理论绝对位移：船位移为 (m2 - m1)*L / (m1 + m2 + M)
    const expected_disp_boat = ((m2 - m1) * L) / (m1 + m2 + M)
    expect(disp_boat).toBeCloseTo(expected_disp_boat, 5)
  })

  it('双人相向走向中央汇合 (mode=2) - 验证船的末态位移', () => {
    const startMotion = getManBoatAutoMotion(0, L, duration, 2)
    const endMotion = getManBoatAutoMotion(duration, L, duration, 2)
    const startState = calculateManBoatState(startMotion.s1, startMotion.v1_rel, startMotion.s2, startMotion.v2_rel, m1, m2, M, L)
    const endState = calculateManBoatState(endMotion.s1, endMotion.v1_rel, endMotion.s2, endMotion.v2_rel, m1, m2, M, L)

    const disp_boat = endState.x_boat - startState.x_boat
    // 理论绝对位移：船位移为 (m2 - m1)*L / 2(m1 + m2 + M)
    const expected_disp_boat = ((m2 - m1) * L) / (2 * (m1 + m2 + M))
    expect(disp_boat).toBeCloseTo(expected_disp_boat, 5)
  })

  it('验证过程无关性 (mode=1 vs mode=3) - 双人同时走动与双人依次走动，船的最终位移严格相同', () => {
    // 模式1：同时走动
    const motion1 = getManBoatAutoMotion(duration, L, duration, 1)
    const endState1 = calculateManBoatState(motion1.s1, motion1.v1_rel, motion1.s2, motion1.v2_rel, m1, m2, M, L)

    // 模式3：依次走动
    const motion3 = getManBoatAutoMotion(duration, L, duration, 3)
    const endState3 = calculateManBoatState(motion3.s1, motion3.v1_rel, motion3.s2, motion3.v2_rel, m1, m2, M, L)

    expect(endState3.x_boat).toBeCloseTo(endState1.x_boat, 5)
  })
})
