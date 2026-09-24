import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnergyBars } from '@/components/Physics/EnergyBars'

const CYAN = '#06B6D4'
const VIOLET = '#7C3AED'

/** 读取某根能量柱的百分比高度（从 `height: N%` 内联样式中解析） */
function barPercent(key: string): number {
  const el = screen.getByTestId(`energy-bar-${key}`)
  const raw = el.style.height
  expect(raw.endsWith('%')).toBe(true)
  return Number.parseFloat(raw)
}

describe('EnergyBars · 归一化基准', () => {
  it('不传 normalizeMax 时保持历史行为：以 max(initialEtot ?? 1.0, ...values, 1e-3) 归一化', () => {
    render(
      <EnergyBars
        items={[
          { key: 'a', label: 'A', value: 1, color: CYAN },
          { key: 'b', label: 'B', value: 2, color: VIOLET },
          { key: 'c', label: 'C', value: 3, color: CYAN },
        ]}
      />,
    )
    // maxVal = max(1.0, 1, 2, 3, 1e-3) = 3
    expect(barPercent('a')).toBeCloseTo(100 / 3, 6)
    expect(barPercent('b')).toBeCloseTo(200 / 3, 6)
    expect(barPercent('c')).toBeCloseTo(100, 6)
  })

  it('历史行为的 1.0 下限会把小量级能量压扁（这是 normalizeMax 要解决的问题）', () => {
    // LC 振荡量级：总和 2.5e-6 J
    render(
      <EnergyBars
        initialEtot={2.5e-6}
        items={[
          { key: 'ee', label: '电场能', value: 1e-6, color: CYAN },
          { key: 'em', label: '磁场能', value: 1.5e-6, color: VIOLET },
        ]}
      />,
    )
    // maxVal = max(2.5e-6, 1e-6, 1.5e-6, 1e-3) = 1e-3（被 1e-3 下限主导）
    // → 柱高仅 0.1% / 0.15%，视觉上完全无法分辨
    expect(barPercent('ee')).toBeCloseTo(0.1, 6)
    expect(barPercent('em')).toBeCloseTo(0.15, 6)
  })

  it('显式 normalizeMax 后小量级能量得到可读柱高', () => {
    render(
      <EnergyBars
        initialEtot={2.5e-6}
        normalizeMax={2.5e-6}
        items={[
          { key: 'ee', label: '电场能', value: 1e-6, color: CYAN },
          { key: 'em', label: '磁场能', value: 1.5e-6, color: VIOLET },
        ]}
      />,
    )
    expect(barPercent('ee')).toBeCloseTo(40, 6)
    expect(barPercent('em')).toBeCloseTo(60, 6)
  })

  it('normalizeMax 传值后 initialEtot 不再参与归一化（消除双重语义）', () => {
    render(
      <EnergyBars
        initialEtot={100}
        normalizeMax={2}
        items={[
          { key: 'a', label: 'A', value: 1, color: CYAN },
          { key: 'b', label: 'B', value: 2, color: VIOLET },
        ]}
      />,
    )
    // 若 initialEtot 仍参与归一化，柱高会变成 1% / 2%
    expect(barPercent('a')).toBeCloseTo(50, 6)
    expect(barPercent('b')).toBeCloseTo(100, 6)
  })

  it('normalizeMax 非正数时回退到历史行为（防止除零/负基准）', () => {
    render(
      <EnergyBars
        normalizeMax={0}
        items={[
          { key: 'a', label: 'A', value: 1, color: CYAN },
          { key: 'b', label: 'B', value: 3, color: VIOLET },
        ]}
      />,
    )
    // 回退：maxVal = max(1.0, 1, 3, 1e-3) = 3
    expect(barPercent('a')).toBeCloseTo(100 / 3, 6)
    expect(barPercent('b')).toBeCloseTo(100, 6)
  })

  it('数值超过归一化基准时柱高夹紧在 100%', () => {
    render(
      <EnergyBars
        normalizeMax={1}
        items={[{ key: 'a', label: 'A', value: 5, color: CYAN }]}
      />,
    )
    expect(barPercent('a')).toBe(100)
  })
})

describe('EnergyBars · 守恒总和读数', () => {
  it('默认不显示总和读数（既有消费方零变化）', () => {
    render(<EnergyBars items={[{ key: 'a', label: 'A', value: 1, color: CYAN }]} />)
    expect(screen.queryByText(/总和/)).toBeNull()
  })

  it('开启后显示各项之和，默认保留两位小数', () => {
    render(
      <EnergyBars
        showConservationTotal
        items={[
          { key: 'a', label: 'A', value: 1.25, color: CYAN },
          { key: 'b', label: 'B', value: 1.75, color: VIOLET },
        ]}
      />,
    )
    expect(screen.getByText('总和: 3.00')).toBeInTheDocument()
  })

  it('conservationFormat 可自定义格式', () => {
    render(
      <EnergyBars
        showConservationTotal
        conservationFormat={(t) => `${(t * 1e6).toFixed(3)} μJ`}
        items={[
          { key: 'ee', label: '电场能', value: 1e-6, color: CYAN },
          { key: 'em', label: '磁场能', value: 1.5e-6, color: VIOLET },
        ]}
      />,
    )
    expect(screen.getByText('总和: 2.500 μJ')).toBeInTheDocument()
  })

  it('总和读数与 initialEtot 读数可同时存在', () => {
    render(
      <EnergyBars
        initialEtot={2.5e-6}
        normalizeMax={2.5e-6}
        showConservationTotal
        conservationFormat={(t) => `${(t * 1e6).toFixed(2)} μJ`}
        items={[
          { key: 'ee', label: '电场能', value: 1e-6, color: CYAN },
          { key: 'em', label: '磁场能', value: 1.5e-6, color: VIOLET },
        ]}
      />,
    )
    expect(screen.getByText('总和: 2.50 μJ')).toBeInTheDocument()
    expect(screen.getByText(/初始:/)).toBeInTheDocument()
  })
})

describe('EnergyBars · 既有行为回归', () => {
  it('碰撞高亮仅作用于指定 key', () => {
    render(
      <EnergyBars
        hasCollision
        collisionKey="b"
        items={[
          { key: 'a', label: 'A', value: 1, color: CYAN },
          { key: 'b', label: 'B', value: 1, color: VIOLET },
        ]}
      />,
    )
    expect(screen.getByTestId('energy-bar-b').style.backgroundColor).toBe('rgb(239, 68, 68)')
    expect(screen.getByTestId('energy-bar-a').style.backgroundColor).toBe('rgb(6, 182, 212)')
    expect(screen.getByText('损失')).toBeInTheDocument()
  })

  it('物品为空时不崩溃', () => {
    const { container } = render(<EnergyBars items={[]} />)
    expect(container.querySelector('div')).toBeTruthy()
  })
})
