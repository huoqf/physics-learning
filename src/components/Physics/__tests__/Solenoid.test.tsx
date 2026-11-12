import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Solenoid } from '../Solenoid'
import { SolenoidFieldLines } from '../SolenoidFieldLines'
import { LCOscillationScene } from '@/features/electromagnetism/em-oscillation/components/LCOscillationScene'
import { RadioTuningScene } from '@/features/electromagnetism/em-oscillation/components/RadioTuningScene'
import { ProbLcOscillationModelDiagram } from '../ProblemDiagrams/ProbLcOscillationModelDiagram'
import type { LCPhysicsResult } from '@/features/electromagnetism/em-oscillation/hooks/useLCPhysics'

const mockLCPhysics: LCPhysicsResult = {
  omega: 2.5,
  T: 2.51,
  f: 0.4,
  energyPeriod: 1.255,
  eTotal: 1.25,
  iMax: 2.5,
  resistance: 0,
  switchPos: 2,
  effectiveC: 0.4,
  dRatio: 1.0,
  q: 0.5,
  i: 1.8,
  uC: 1.25,
  diDt: -1.5,
  eInductor: 0.6,
  stageLabel: '正向放电',
  energyFlowLabel: '电场能 → 磁场能',
  eElectric: 0.3125,
  eMagnetic: 0.9375,
  eHeat: 0,
  time: 0.4,
  chargeRatio: 0.5,
  chargeCurve: [],
  currentCurve: [],
  dampingCurve: [],
  curveSpan: 5.02,
  tShow: 0.4,
  viewStart: 0,
  viewEnd: 6,
}

describe('Solenoid / CoilBase 线圈模型', () => {
  it('apparatus 模式应绘制连续螺旋绕线并从水平中轴线平稳入出，而不是孤立封闭椭圆', () => {
    const { container } = render(
      <svg>
        <Solenoid
          x={0}
          y={0}
          width={160}
          height={40}
          rx={6}
          turns={5}
          current={1}
          leadType="horizontal"
          showIronCore={false}
          animated={false}
        />
      </svg>,
    )

    const root = container.querySelector('.coil-apparatus')
    expect(root).toBeTruthy()

    const groups = root?.querySelectorAll(':scope > g')
    expect(groups?.length).toBeGreaterThanOrEqual(2)

    // 背面绕组 (4 条内部背面连接弧) + 左右入出线 (起点/终点落在 ±width/2, 0)
    const backPaths = groups?.[0].querySelectorAll('path')
    expect(backPaths).toHaveLength(4)

    const leadPaths = groups?.[1].querySelectorAll('path')
    expect(leadPaths).toHaveLength(2)
    expect(leadPaths?.[0].getAttribute('d')).toMatch(/^M -80\.00 0 /)
    expect(leadPaths?.[1].getAttribute('d')).toMatch(/80\.00 0$/)

    // 正面 5 匝螺旋各自首尾跨过螺距，而非回到同一 cx
    const frontGroups = root?.querySelectorAll(':scope > g > path')
    expect(frontGroups?.length).toBeGreaterThanOrEqual(10)
    const firstFrontD = root?.querySelectorAll('g > path[strokeLinecap="round"], path')?.[6]?.getAttribute('d') ?? ''
    const matchM = firstFrontD.match(/^M ([\d.-]+) ([\d.-]+)/)
    const matchLastL = firstFrontD.match(/L ([\d.-]+) ([\d.-]+)$/)
    if (matchM && matchLastL) {
      expect(Number(matchLastL[1])).toBeGreaterThan(Number(matchM[1]))
      expect(Number(matchM[2])).toBeGreaterThan(0)
      expect(Number(matchLastL[2])).toBeLessThan(0)
    }
  })

  it('symbolic 模式应绘制标准连续半圆拱电路符号并支持铁芯双横线', () => {
    const { container, rerender } = render(
      <svg>
        <Solenoid
          variant="symbolic"
          x={100}
          y={100}
          width={80}
          height={32}
          turns={4}
          leadType="horizontal"
          showIronCore={false}
        />
      </svg>,
    )

    const sym = container.querySelector('.coil-symbolic')
    expect(sym).toBeTruthy()
    const paths = Array.from(sym?.querySelectorAll('path') ?? [])
    const archPath = paths.find((p) => (p.getAttribute('d') ?? '').includes(' A '))
    expect(archPath).toBeTruthy()
    // 4 匝即有 4 个半圆拱 A 指令
    expect((archPath?.getAttribute('d') ?? '').match(/ A /g)).toHaveLength(4)
    expect(sym?.querySelectorAll('line')).toHaveLength(0)

    rerender(
      <svg>
        <Solenoid
          variant="symbolic"
          x={100}
          y={100}
          width={80}
          height={32}
          turns={4}
          leadType="horizontal"
          showIronCore
        />
      </svg>,
    )
    expect(container.querySelector('.coil-symbolic')?.querySelectorAll('line')).toHaveLength(2)
  })

  it('innerOverlay 应置于背面绕线之后、正面绕线之前，磁极遵循安培定则', () => {
    const { container } = render(
      <svg>
        <Solenoid
          x={0}
          y={0}
          width={160}
          height={40}
          turns={5}
          current={1.2}
          leadType="horizontal"
          showIronCore={false}
          showPolarity
          showWindingArrows
          animated={false}
          innerOverlay={<SolenoidFieldLines x={0} y={0} width={134} height={36} current={1.2} />}
        />
      </svg>,
    )

    const root = container.querySelector('.coil-apparatus')
    const fieldLines = root?.querySelector('.solenoid-field-lines')
    expect(fieldLines).toBeTruthy()
    expect(root?.textContent).toContain('N')
    expect(root?.textContent).toContain('S')
    // 中间两匝应渲染绕向三角箭头（排除内部 SolenoidFieldLines 的 5 个磁感线箭头）
    const directFrontArrows = Array.from(root?.querySelectorAll('polygon') ?? []).filter(
      (p) => !p.closest('.solenoid-field-lines'),
    )
    expect(directFrontArrows).toHaveLength(2)
    // 验证 DOM 渲染层级：背面绕线 < innerOverlay(磁感线) < 正面绕线
    const children = Array.from(root?.children ?? [])
    const fieldIdx = children.findIndex((el) => el.classList.contains('solenoid-field-lines'))
    expect(fieldIdx).toBeGreaterThan(0)
    expect(fieldIdx).toBeLessThan(children.length - 1)
  })

  it('LC 振荡相关三大页面组件均应正确渲染规范化线圈模型', () => {
    const { container: c1 } = render(
      <svg>
        <LCOscillationScene physics={mockLCPhysics} font={(n) => n} />
      </svg>,
    )
    expect(c1.querySelector('.coil-apparatus')).toBeTruthy()
    expect(c1.querySelector('.coil-apparatus .solenoid-field-lines')).toBeTruthy()

    const { container: c2 } = render(<ProbLcOscillationModelDiagram />)
    expect(c2.querySelector('.coil-apparatus')).toBeTruthy()

    const { container: c3 } = render(
      <svg>
        <RadioTuningScene cRx={1.0} time={0.2} font={(n) => n} />
      </svg>,
    )
    expect(c3.querySelector('.coil-symbolic')).toBeTruthy()
    expect(c3.querySelector('.coil-apparatus')).toBeNull()
  })
})
