import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { VectorArrow } from '../VectorArrow'
import type { SceneScale } from '../../../scene/SceneScale'

function renderWithSvg(ui: React.ReactElement) {
  return render(React.createElement('svg', null, ui))
}

const sceneScale: SceneScale = {
  originX: 100,
  originY: 200,
  scaleX: 10,
  scaleY: 20,
  scale: 10,
  maxVectorLength: 60,
  refMagnitudes: { velocity: 10 },
  intentionalNonUniformScale: true, // 测试用：故意非等比以验证坐标计算
}

describe('VectorArrow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('origin: 物理坐标通过 sceneScale 转换为像素坐标', () => {
    const { container } = renderWithSvg(
      <VectorArrow
        origin={{ x: 2, y: 3 }}
        vector={{ x: 1, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
      />
    )

    const line = container.querySelector('line')
    expect(line).toBeTruthy()

    // x1 = originX + origin.x * scaleX = 100 + 2 * 10 = 120
    // y1 = originY - origin.y * scaleY = 200 - 3 * 20 = 140
    expect(line?.getAttribute('x1')).toBe('120')
    expect(line?.getAttribute('y1')).toBe('140')
  })

  it('originDesign: 像素坐标直接使用，跳过 sceneScale 转换', () => {
    const { container } = renderWithSvg(
      <VectorArrow
        originDesign={{ x: 120, y: -140 }}
        vector={{ x: 1, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
      />
    )

    const line = container.querySelector('line')
    expect(line).toBeTruthy()

    // 像素坐标直接使用，不做转换
    expect(line?.getAttribute('x1')).toBe('120')
    expect(line?.getAttribute('y1')).toBe('-140')
  })

  it('originDesign 优先于 origin，同时传入时忽略 origin', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { container } = renderWithSvg(
      <VectorArrow
        origin={{ x: 999, y: 999 }}
        originDesign={{ x: 120, y: -140 }}
        vector={{ x: 1, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
      />
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('originDesign')
    )

    const line = container.querySelector('line')
    expect(line).toBeTruthy()

    // 应使用 originDesign，而非 origin
    expect(line?.getAttribute('x1')).toBe('120')
    expect(line?.getAttribute('y1')).toBe('-140')

    warnSpy.mockRestore()
  })
})
