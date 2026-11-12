import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ParamControl } from '../ParamControl'

describe('ParamControl', () => {
  it('按 step 格式化数值并在失焦时吸附到合法步长', () => {
    const onParamChange = vi.fn()

    const Harness = () => {
      const [value, setValue] = React.useState(0.2)
      return (
        <ParamControl
          params={[
            { key: 'mu', label: '摩擦因数 μ', value, min: 0, max: 0.8, step: 0.05, unit: '' },
          ]}
          onParamChange={(key, nextValue) => {
            onParamChange(key, nextValue)
            setValue(nextValue)
          }}
        />
      )
    }

    render(<Harness />)

    const input = screen.getByLabelText('摩擦因数 μ数值') as HTMLInputElement
    expect(input.value).toBe('0.20')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '0.234' } })
    fireEvent.blur(input)

    expect(onParamChange).toHaveBeenCalledWith('mu', 0.25)
    expect(input.value).toBe('0.25')
  })

  it('Escape 撤销当前输入且不提交参数变化', () => {
    const onParamChange = vi.fn()
    render(
      <ParamControl
        params={[
          { key: 'I', label: '电流 I', value: 2, min: -10, max: 10, step: 0.5, unit: 'A' },
        ]}
        onParamChange={onParamChange}
      />,
    )

    const input = screen.getByLabelText('电流 I数值') as HTMLInputElement
    expect(input.value).toBe('2.0')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '7.5' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onParamChange).not.toHaveBeenCalled()
    expect(input.value).toBe('2.0')
  })

  it('跨越零点的参数显示零点标记文本', () => {
    const onParamChange = vi.fn()
    render(
      <ParamControl
        params={[
          { key: 'B', label: '磁感应强度 B', value: -1, min: -2, max: 2, step: 0.1, unit: 'T' },
        ]}
        onParamChange={onParamChange}
      />,
    )

    expect(screen.getByText('0T')).toBeTruthy()
    expect((screen.getByLabelText('磁感应强度 B滑块') as HTMLInputElement).value).toBe('-1')
  })

  it('渲染参数分组、说明、重要性与显式标记', () => {
    const onParamChange = vi.fn()
    render(
      <ParamControl
        params={[
          {
            key: 'theta',
            label: '导轨倾角 θ',
            value: 30,
            min: 0,
            max: 90,
            step: 5,
            unit: '°',
            group: '进阶参数',
            description: '倾角越大，重力沿斜面分力越大',
            importance: 'advanced',
            marks: [{ value: 37, label: '常用37°', variant: 'recommended' }],
          },
        ]}
        onParamChange={onParamChange}
      />,
    )

    expect(screen.getByText('进阶参数')).toBeTruthy()
    expect(screen.getByText('倾角越大，重力沿斜面分力越大')).toBeTruthy()
    expect(screen.getByText('常用37°')).toBeTruthy()
  })

  it('恢复默认按钮调用 onReset', () => {
    const onParamChange = vi.fn()
    const onReset = vi.fn()
    render(
      <ParamControl
        params={[
          { key: 'theta', label: '角度 θ', value: 30, min: 0, max: 90, step: 5, unit: '°' },
        ]}
        onParamChange={onParamChange}
        onReset={onReset}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '恢复默认参数' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('边界刻度标签采用边缘自对齐并约束于 overflow-hidden 容器内', () => {
    const onParamChange = vi.fn()
    render(
      <ParamControl
        params={[
          {
            key: 'dRatio',
            label: '板间距离 d',
            value: 1,
            min: 0.5,
            max: 2.0,
            step: 0.1,
            unit: 'd₀',
            marks: [
              { value: 0.5, label: '0.5d₀' },
              { value: 1.25, label: '基准' },
              { value: 2.0, label: '2d₀(C减半/f升√2倍)', variant: 'critical' },
            ],
          },
        ]}
        onParamChange={onParamChange}
      />,
    )

    const leftMark = screen.getByText('0.5d₀')
    const midMark = screen.getByText('基准')
    const rightMark = screen.getByText('2d₀(C减半/f升√2倍)')

    expect(leftMark.style.left).toBe('0%')
    expect(leftMark.style.transform).toBe('translateX(-0%)')
    expect(midMark.style.left).toBe('50%')
    expect(midMark.style.transform).toBe('translateX(-50%)')
    expect(rightMark.style.left).toBe('100%')
    expect(rightMark.style.transform).toBe('translateX(-100%)')
    expect(rightMark.parentElement?.className).toContain('overflow-hidden')
  })
})
