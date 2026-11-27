import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAnimationStore } from '@/stores'
import { buildEqualChargeFieldQuantities } from '@/data/quantities/electromagnetism/equalChargeField'
import EqualChargeFieldAnimation from '../EqualChargeFieldAnimation'

const FORBIDDEN_EXAM_WORDS = ['高考', '真题', '压轴', '母题']
const RAW_LATEX_RE = /\\frac|\\vec|\\varphi|\$/

describe('EqualChargeFieldAnimation 与五段式看板同步验证', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      params: {
        chargeType: 0,
        axis: 0,
        qMicroC: 5,
        halfSepCm: 3,
        showFieldLines: 1,
        showEquipotentials: 1,
      },
      time: 3.0,
      showVectors: true,
    })
  })

  it('正确渲染主 SVG 画布无障碍标题且严格隔离不同对称轴的极值标记', () => {
    const { container, rerender } = render(<EqualChargeFieldAnimation />)
    expect(container.querySelector('title')?.textContent).toContain('等量电荷场线与等势面空间模型')
    expect(container.querySelector('desc')?.textContent).toBeTruthy()
    // 连线模式 (axis=0) 不显示中垂线 ±0.71a 极大值标注
    expect(container.querySelector('[data-layer="bisector-extrema"]')).toBeNull()
    expect(container.textContent).not.toContain('0.71a (E极大)')

    // 切换为等量同正 + 中垂线模式 (chargeType=1, axis=1) 后显示 ±0.71a 极大值点标注
    useAnimationStore.setState({
      params: {
        chargeType: 1,
        axis: 1,
        qMicroC: 5,
        halfSepCm: 3,
        showFieldLines: 1,
        showEquipotentials: 1,
      },
    })
    rerender(<EqualChargeFieldAnimation />)
    expect(container.querySelector('[data-layer="bisector-extrema"]')).not.toBeNull()
    expect(container.textContent).toContain('+0.71a (E极大)')

    // 切换为等量异种 + 中垂线模式 (chargeType=0, axis=1) 时仍不应显示同种极值点标注
    useAnimationStore.setState({
      params: {
        chargeType: 0,
        axis: 1,
        qMicroC: 5,
        halfSepCm: 3,
        showFieldLines: 0,
        showEquipotentials: 0,
      },
    })
    rerender(<EqualChargeFieldAnimation />)
    expect(container.querySelector('[data-layer="bisector-extrema"]')).toBeNull()
    expect(container.textContent).not.toContain('+0.71a (E极大)')
  })

  it('buildEqualChargeFieldQuantities 五段式内容随 (chargeType, axis) 同步且符合文本守卫', () => {
    const oppPanel = buildEqualChargeFieldQuantities(
      'anim-equal-charge-field',
      { chargeType: 0, axis: 1, qMicroC: 5, halfSepCm: 3 },
      3.0,
    )
    const samePanel = buildEqualChargeFieldQuantities(
      'anim-equal-charge-field',
      { chargeType: 1, axis: 1, qMicroC: 5, halfSepCm: 3 },
      3.0,
    )

    expect(oppPanel.quantities.length).toBeGreaterThan(5)
    expect(samePanel.quantities.some((q) => q.label.includes('极值') || q.label.includes('极大'))).toBe(true)
    expect(oppPanel.mnemonic).not.toBe(samePanel.mnemonic)

    for (const chargeType of [0, 1, 2]) {
      for (const axis of [0, 1]) {
        const panel = buildEqualChargeFieldQuantities(
          'anim-equal-charge-field',
          { chargeType, axis, qMicroC: 5, halfSepCm: 3 },
          2.0,
        )
        expect(panel.formulas?.length).toBeGreaterThanOrEqual(2)
        expect(panel.warnings?.length).toBeGreaterThanOrEqual(2)
        expect(panel.gaokaoPoints?.length).toBeGreaterThanOrEqual(2)
        expect(panel.mnemonic).toBeTruthy()

        // 公式中点电荷电势叠加与同种中垂线极值公式均标记为 supplementary
        const potFormula = panel.formulas?.find((f) => f.name.includes('点电荷电势'))
        expect(potFormula?.level).toBe('supplementary')

        if (chargeType !== 0 && axis === 1) {
          const extFormula = panel.formulas?.find((f) => f.name.includes('中垂线场强极值'))
          expect(extFormula?.level).toBe('supplementary')
          expect(extFormula?.latex).toContain('|y|')
        }

        // condition / note 不含原始 LaTeX
        panel.formulas?.forEach((f) => {
          if (f.condition) expect(RAW_LATEX_RE.test(f.condition)).toBe(false)
          if (f.note) expect(RAW_LATEX_RE.test(f.note)).toBe(false)
        })

        // 全文不含基础页违禁词
        const serialized = JSON.stringify(panel)
        FORBIDDEN_EXAM_WORDS.forEach((word) => {
          expect(serialized).not.toContain(word)
        })
      }
    }
  })
})
