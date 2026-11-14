import { describe, it, expect } from 'vitest'
import {
  ELEMENTARY_CHARGE,
  ELECTRON_MASS,
  GRAVITY,
  PROTON_MASS,
} from '../../constants'
import {
  calculateChargingProcess,
  calculateMillikanOilDrop,
} from '../chargeElementary'

describe('chargeElementary · 电荷、起电方式与元电荷物理模型', () => {
  describe('calculateChargingProcess', () => {
    it('摩擦起电（正值）：丝绸摩擦玻璃棒，玻璃棒失电子带正电，总电量始终守恒为 0', () => {
      const init = calculateChargingProcess({
        method: 0,
        step: 0,
        qAInit: 4,
        qBInit: 0,
        inducerQ: 6,
        isGrounded: 0,
      })
      expect(init.qA).toBe(0)
      expect(init.qB).toBe(0)
      expect(init.isRubberFur).toBe(false)
      expect(init.qTotalAfter).toBe(0)

      const transfer = calculateChargingProcess({
        method: 0,
        step: 1,
        qAInit: 4,
        qBInit: 0,
        inducerQ: 6,
        isGrounded: 0,
      })
      expect(transfer.qA).toBe(4)
      expect(transfer.qB).toBe(-4)
      expect(transfer.electronFlowDir).toBe('AtoB')
      expect(transfer.qTotalAfter).toBe(0)
      expect(transfer.transferredElectrons).toBeCloseTo((4e-9) / ELEMENTARY_CHARGE, 3)
    })

    it('摩擦起电（负值）：毛皮摩擦橡胶棒，橡胶棒得电子带负电，电子由毛皮流向橡胶棒', () => {
      const res = calculateChargingProcess({
        method: 0,
        step: 1,
        qAInit: -6,
        qBInit: 0,
        inducerQ: 6,
        isGrounded: 0,
      })
      expect(res.isRubberFur).toBe(true)
      expect(res.qA).toBe(-6)
      expect(res.qB).toBe(6)
      expect(res.electronFlowDir).toBe('BtoA')
      expect(res.qTotalAfter).toBe(0)
    })

    it('接触起电：异号电荷先中和再均分，总电荷量前后严格相等', () => {
      const res = calculateChargingProcess({
        method: 1,
        step: 2,
        qAInit: 6,
        qBInit: -2,
        inducerQ: 6,
        isGrounded: 0,
      })
      expect(res.qA).toBe(2)
      expect(res.qB).toBe(2)
      expect(res.qTotalInit).toBe(4)
      expect(res.qTotalAfter).toBe(4)
      expect(res.deltaQ).toBe(4)
    })

    it('感应起电（不接地与接地）：分别演示近异远同分离与接地引走远端电荷守恒', () => {
      const ungrounded = calculateChargingProcess({
        method: 2,
        step: 2,
        qAInit: 4,
        qBInit: -2,
        inducerQ: 6,
        isGrounded: 0,
      })
      expect(ungrounded.qA).toBe(-3)
      expect(ungrounded.qB).toBe(3)
      expect(ungrounded.qTotalAfter).toBe(0)

      const groundedStep1 = calculateChargingProcess({
        method: 2,
        step: 1,
        qAInit: 4,
        qBInit: -2,
        inducerQ: 6,
        isGrounded: 1,
      })
      expect(groundedStep1.qA).toBe(-3)
      expect(groundedStep1.qB).toBe(0)
      expect(groundedStep1.qGround).toBe(3)
      expect(groundedStep1.electronFlowDir).toBe('GroundToB')
      expect(groundedStep1.qTotalAfter).toBe(0)

      const groundedStep2 = calculateChargingProcess({
        method: 2,
        step: 2,
        qAInit: 4,
        qBInit: -2,
        inducerQ: 6,
        isGrounded: 1,
      })
      expect(groundedStep2.qA).toBe(-1.5)
      expect(groundedStep2.qB).toBe(-1.5)
      expect(groundedStep2.qGround).toBe(3)
      expect(groundedStep2.qTotalAfter).toBe(0)
    })
  })

  describe('calculateMillikanOilDrop', () => {
    it('精确计算油滴悬浮平衡电压、元电荷整数倍量子化电量及比荷', () => {
      const drop = calculateMillikanOilDrop({
        voltageU: 490,
        plateGapMm: 5,
        chargeMultipleN: 2,
        dropMass1e15: 3.2,
      })
      expect(drop.chargeQ).toBeCloseTo(2 * ELEMENTARY_CHARGE, 25)
      expect(drop.electricField).toBeCloseTo(98000, 6)
      expect(drop.gravityForce).toBeCloseTo(3.2e-15 * GRAVITY, 20)
      expect(drop.balanceVoltage).toBeCloseTo(490, 1)
      expect(drop.isBalanced).toBe(true)
      expect(drop.specificChargeElectron).toBeCloseTo(
        ELEMENTARY_CHARGE / ELECTRON_MASS,
        5,
      )
      expect(drop.specificChargeProton).toBeCloseTo(
        ELEMENTARY_CHARGE / PROTON_MASS,
        3,
      )
      expect(drop.measuredSamples).toHaveLength(8)
    })
  })
})
