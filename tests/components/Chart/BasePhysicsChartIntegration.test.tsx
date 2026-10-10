import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BasePhysicsChart } from '@/components/Chart/BasePhysicsChart'
import { RelationChart } from '@/components/Chart/RelationChart'
import EkNuCurveChart from '@/features/modern/photoelectric/components/EkNuCurveChart'

describe('BasePhysicsChart & 派生图表集成渲染验证', () => {
  it('BasePhysicsChart 基础渲染：坐标、刻度与旋转 yLabel 正确无 NaN', () => {
    const { container } = render(
      <BasePhysicsChart
        xDomain={[0, 10]}
        yDomain={[-5, 25]}
        xLabel="时间 t (s)"
        yLabel="速度 v (m/s)"
        title="测试速度时间图"
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // 检查所有 text 元素
    const textEls = container.querySelectorAll('text')
    expect(textEls.length).toBeGreaterThan(0)
    for (const el of textEls) {
      const x = el.getAttribute('x')
      const y = el.getAttribute('y')
      if (x) expect(x).not.toContain('NaN')
      if (y) expect(y).not.toContain('NaN')
      const transform = el.getAttribute('transform')
      if (transform) expect(transform).not.toContain('NaN')
    }

    // 检查旋转 yLabel
    const yLabelEl = Array.from(textEls).find((el) => el.textContent === '速度 v (m/s)')
    expect(yLabelEl).toBeDefined()
    expect(yLabelEl?.getAttribute('transform')).toMatch(/rotate\(-90,\s*[\d.]+/i)
  })

  it('BasePhysicsChart 双 Y 轴模式：左右两轴标签均正确且无 NaN', () => {
    const { container } = render(
      <BasePhysicsChart
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        yDomain2={[-20, 20]}
        xLabel="时间 t (s)"
        yLabel="位移 s (m)"
        yLabel2="加速度 a (m/s²)"
        title="双轴测试"
      />
    )

    const textEls = container.querySelectorAll('text')
    const yLabel1 = Array.from(textEls).find((el) => el.textContent === '位移 s (m)')
    const yLabel2 = Array.from(textEls).find((el) => el.textContent === '加速度 a (m/s²)')

    expect(yLabel1).toBeDefined()
    expect(yLabel2).toBeDefined()
    expect(yLabel1?.getAttribute('transform')).toMatch(/rotate\(-90,\s*[\d.]+/i)
    expect(yLabel2?.getAttribute('transform')).toMatch(/rotate\(90,\s*[\d.]+/i)
  })

  it('BasePhysicsChart 无 yLabel 时正常渲染不崩溃', () => {
    const { container } = render(
      <BasePhysicsChart
        xDomain={[0, 5]}
        yDomain={[0, 10]}
        xLabel="x (m)"
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('EkNuCurveChart 光电效应图：发生光电效应时正常渲染游标与多金属图线', () => {
    const { container } = render(
      <EkNuCurveChart
        cutoffFreq={4.59}
        currentFreq={7.0}
        currentEkm={1.0}
        W0={1.9}
        isPE={true}
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // 检查截距标记与多金属文字
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent)
    expect(texts.some((t) => t?.includes('ν₀ = 4.59'))).toBe(true)
    expect(texts.some((t) => t?.includes('纵轴反向截距 −W₀ = −1.90 eV'))).toBe(true)
    expect(texts.some((t) => t?.includes('E_km = 1.00 eV'))).toBe(true)
    expect(texts.some((t) => t === '钠')).toBe(true)
    expect(texts.some((t) => t === '锌')).toBe(true)
    expect(texts.some((t) => t === '钨')).toBe(true)

    // 所有 path 与 line 无 NaN
    container.querySelectorAll('path').forEach((p) => {
      expect(p.getAttribute('d')).not.toContain('NaN')
    })
    container.querySelectorAll('line').forEach((l) => {
      expect(l.getAttribute('x1')).not.toContain('NaN')
      expect(l.getAttribute('y1')).not.toContain('NaN')
      expect(l.getAttribute('x2')).not.toContain('NaN')
      expect(l.getAttribute('y2')).not.toContain('NaN')
    })
  })

  it('EkNuCurveChart 光电效应图：未发生光电效应时游标安全隐藏，负截距正常可见', () => {
    const { container } = render(
      <EkNuCurveChart
        cutoffFreq={7.98}
        currentFreq={5.0}
        currentEkm={0}
        W0={3.3}
        isPE={false}
      />
    )

    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent)
    expect(texts.some((t) => t?.includes('ν₀ = 7.98'))).toBe(true)
    expect(texts.some((t) => t?.includes('纵轴反向截距 −W₀ = −3.30 eV'))).toBe(true)
    // 未发生光电效应时，不应当有 E_km 游标文本
    expect(texts.some((t) => t?.includes('E_km ='))).toBe(false)
  })

  it('RelationChart 归一化反比曲线（核衰变场景）：真实电荷尺度与比值渲染自洽', () => {
    const curve = [
      { x: 2, y: 45 },
      { x: 10, y: 9 },
      { x: 90, y: 1 },
    ]
    const { container } = render(
      <RelationChart
        points={curve}
        xDomain={[0, 135]}
        yDomain={[0, 52]}
        xLabel="核电荷量绝对值 |q| (e)"
        yLabel="轨迹半径 R (以新核为 1)"
        title="α 衰变磁场轨迹半径反比曲线"
        markers={[
          { axis: 'point', x: 2, y: 45, label: 'α 粒子 |q|=2e' },
          { axis: 'point', x: 90, y: 1, label: '反冲钍核 |q|=90e' },
        ]}
      />
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent)
    expect(texts.some((t) => t?.includes('α 粒子 |q|=2e'))).toBe(true)
    expect(texts.some((t) => t?.includes('反冲钍核 |q|=90e'))).toBe(true)

    // 检查所有圆形散点
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThanOrEqual(2)
    circles.forEach((c) => {
      expect(c.getAttribute('cx')).not.toContain('NaN')
      expect(c.getAttribute('cy')).not.toContain('NaN')
    })
  })
})
