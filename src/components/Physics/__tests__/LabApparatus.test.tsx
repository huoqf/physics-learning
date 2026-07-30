import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  PaperTape,
  TickerTimer,
  Photogate,
  TimerDisplay,
  LabRuler,
  VernierCaliper,
  Micrometer,
  SpringBalance,
  LabStand,
} from '../index'

describe('力学实验专属组件渲染测试 (Mechanics Lab Apparatus)', () => {
  it('应成功渲染 PaperTape 打点纸带组件', () => {
    const { container } = render(
      <svg>
        <PaperTape x={10} y={10} width={200} dots={[10, 30, 60, 100]} highlightInterval={[1, 3]} highlightLabel="x1" />
      </svg>
    )
    expect(container.querySelector('.paper-tape')).toBeTruthy()
  })

  it('应成功渲染 TickerTimer 打点计时器组件', () => {
    const { container } = render(
      <svg>
        <TickerTimer x={50} y={50} type="electromagnetic" isVibrating />
        <TickerTimer x={150} y={50} type="spark" isVibrating />
      </svg>
    )
    expect(container.querySelectorAll('.ticker-timer')).toHaveLength(2)
  })

  it('应成功渲染 Photogate 光电门组件', () => {
    const { container } = render(
      <svg>
        <Photogate x={100} y={100} isBlocked beamVisible label="光电门 A" />
      </svg>
    )
    expect(container.querySelector('.photogate')).toBeTruthy()
  })

  it('应成功渲染 TimerDisplay 数字计时器显示屏组件', () => {
    const { container } = render(
      <svg>
        <TimerDisplay x={10} y={10} timeMs={12.34} channel="CH A" />
      </svg>
    )
    expect(container.querySelector('.timer-display')).toBeTruthy()
  })

  it('应成功渲染 LabRuler 实验室毫米刻度尺组件', () => {
    const { container } = render(
      <svg>
        <LabRuler x={0} y={0} length={200} showMagnifier magnifierPos={100} />
      </svg>
    )
    expect(container.querySelector('.lab-ruler')).toBeTruthy()
  })

  it('应成功渲染 VernierCaliper 游标卡尺组件', () => {
    const { container } = render(
      <svg>
        <VernierCaliper x={0} y={0} measuredValue={23.45} division={20} showMagnifier />
      </svg>
    )
    expect(container.querySelector('.vernier-caliper')).toBeTruthy()
  })

  it('应成功渲染 Micrometer 螺旋测微器组件', () => {
    const { container } = render(
      <svg>
        <Micrometer x={0} y={0} measuredValue={5.382} showMagnifier />
      </svg>
    )
    expect(container.querySelector('.micrometer')).toBeTruthy()
  })

  it('应成功渲染 SpringBalance 弹簧测力计组件', () => {
    const { container } = render(
      <svg>
        <SpringBalance x={50} y={50} force={3.5} maxForce={5} />
      </svg>
    )
    expect(container.querySelector('.spring-balance')).toBeTruthy()
  })

  it('应成功渲染 LabStand 铁架台组件', () => {
    const { container } = render(
      <svg>
        <LabStand x={100} y={200} attachment="clamp" />
      </svg>
    )
    expect(container.querySelector('.lab-stand')).toBeTruthy()
  })
})
