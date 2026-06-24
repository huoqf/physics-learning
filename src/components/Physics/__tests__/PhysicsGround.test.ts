import { describe, it, expect, vi } from 'vitest'
import { createRulerTicks } from '../PhysicsGround'
import { render } from '@testing-library/react'
import React from 'react'
import { PhysicsGround } from '../PhysicsGround'

describe('createRulerTicks', () => {
  it('should return empty array if tickInterval <= 0', () => {
    expect(createRulerTicks([0, 10], 0)).toEqual([])
    expect(createRulerTicks([0, 10], -1)).toEqual([])
  })

  it('should generate major ticks for normal domain [0, 10]', () => {
    const ticks = createRulerTicks([0, 10], 2)
    expect(ticks.length).toBe(6) // 0, 2, 4, 6, 8, 10
    expect(ticks.map(t => t.value)).toEqual([0, 2, 4, 6, 8, 10])
    expect(ticks.every(t => !t.isMinor)).toBe(true)
  })

  it('should generate major ticks for non-zero start domain [2, 8]', () => {
    const ticks = createRulerTicks([2, 8], 2)
    expect(ticks.map(t => t.value)).toEqual([2, 4, 6, 8])
  })

  it('should handle fractional tickInterval (0.5)', () => {
    const ticks = createRulerTicks([0, 2], 0.5)
    expect(ticks.map(t => t.value)).toEqual([0, 0.5, 1, 1.5, 2])
  })

  it('should generate minor ticks correctly', () => {
    // 0 到 4，主间隔 2，1 个次级间隔 (因此次级在 1 和 3)
    const ticks = createRulerTicks([0, 4], 2, 1)
    
    // 我们期望的完全结果：0(M), 1(m), 2(M), 3(m), 4(M)
    expect(ticks.length).toBe(5)
    
    const values = ticks.map(t => t.value)
    expect(values).toEqual([0, 1, 2, 3, 4])

    // 检查哪些是 minor
    const minorFlags = ticks.map(t => t.isMinor)
    expect(minorFlags).toEqual([false, true, false, true, false])
  })

  it('should handle reversed domain [10, 0] seamlessly', () => {
    // createRulerTicks 内部应该根据 min 和 max 来计算，不受 domain 数组顺序影响
    const ticks = createRulerTicks([10, 0], 5)
    expect(ticks.map(t => t.value)).toEqual([0, 5, 10])
  })

  it('should handle non-aligned domains cleanly, e.g. [1, 5] interval 2', () => {
    const ticks = createRulerTicks([1, 5], 2)
    // 能够生成的刻度将是 2, 4
    expect(ticks.map(t => t.value)).toEqual([2, 4])
  })
})

describe('PhysicsGround - wall type', () => {
  it('should render wall rect when type="wall" with wall prop', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 40, y: 100, width: 40, type: 'wall',
        wall: { height: 100 }
      })
    )
    const rect = container.querySelector('rect')
    expect(rect).toBeTruthy()
    expect(rect?.getAttribute('x')).toBe('40')
    expect(rect?.getAttribute('y')).toBe('100')
    expect(rect?.getAttribute('width')).toBe('40')
    expect(rect?.getAttribute('height')).toBe('100')
  })

  it('should return null and console.error when type="wall" but no wall prop', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 40, y: 100, width: 40, type: 'wall'
      })
    )
    // outer <g> wrapper still renders, but no rect/line children
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(spy).toHaveBeenCalledWith('PhysicsGround: type="wall" requires wall prop')
    spy.mockRestore()
  })

  it('should render hatch lines when showHatch=true', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 40, y: 100, width: 40, type: 'wall',
        wall: { height: 80, hatchCount: 4 },
        appearance: { showHatch: true }
      })
    )
    const lines = container.querySelectorAll('line')
    // 4 hatch lines
    expect(lines.length).toBe(4)
  })

  it('should render hatch left-to-right upward when hatchSide="left"', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 0, width: 100, type: 'wall',
        wall: { height: 100, hatchCount: 1, hatchSide: 'left' },
        appearance: { showHatch: true }
      })
    )
    const line = container.querySelector('line')
    // left side: x1=0,y1=step(100) → x2=100,y2=0
    expect(line?.getAttribute('y1')).toBe('100')
    expect(line?.getAttribute('y2')).toBe('0')
  })

  it('should render hatch right-to-left downward when hatchSide="right"', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 0, width: 100, type: 'wall',
        wall: { height: 100, hatchCount: 1, hatchSide: 'right' },
        appearance: { showHatch: true }
      })
    )
    const line = container.querySelector('line')
    // right side: x1=0,y1=0 → x2=100,y2=100
    expect(line?.getAttribute('y1')).toBe('0')
    expect(line?.getAttribute('y2')).toBe('100')
  })

  it('should not render hatch when showHatch is false', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 40, y: 100, width: 40, type: 'wall',
        wall: { height: 80 },
        appearance: { showHatch: false }
      })
    )
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(0)
  })
})

describe('PhysicsGround - bracket type', () => {
  it('should render bracket main line', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 100, width: 200, type: 'bracket'
      })
    )
    const line = container.querySelector('line')
    expect(line).toBeTruthy()
    expect(line?.getAttribute('x1')).toBe('0')
    expect(line?.getAttribute('y1')).toBe('100')
    expect(line?.getAttribute('x2')).toBe('200')
    expect(line?.getAttribute('y2')).toBe('100')
  })

  it('should render showBaseShadow parallel line', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 100, width: 200, type: 'bracket',
        appearance: { showBaseShadow: true }
      })
    )
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(2)
    // second line at y+3
    expect(lines[1].getAttribute('y1')).toBe('103')
  })

  it('should render showHatch斜线纹理 (MomentumTheoremAnimation兼容)', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 100, width: 200, type: 'bracket',
        appearance: { showHatch: true }
      })
    )
    const lines = container.querySelectorAll('line')
    // 1 main + 8 hatch
    expect(lines.length).toBe(9)
    // first hatch at y-80
    expect(lines[1].getAttribute('y1')).toBe('20')
    expect(lines[1].getAttribute('y2')).toBe('35')
  })
})

describe('PhysicsGround - backward compatibility', () => {
  it('ground type should work without new props', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 100, width: 300
      })
    )
    const line = container.querySelector('line')
    expect(line).toBeTruthy()
    expect(line?.getAttribute('y1')).toBe('100')
  })

  it('platform type should work unchanged', () => {
    const { container } = render(
      React.createElement(PhysicsGround, {
        x: 0, y: 100, width: 300, type: 'platform',
        appearance: { thickness: 30 }
      })
    )
    const rect = container.querySelector('rect')
    expect(rect).toBeTruthy()
    expect(rect?.getAttribute('height')).toBe('30')
  })
})
