import { describe, it, expect } from 'vitest'
import {
  createSceneScale,
  worldToPixel,
  worldToDesign,
  createSceneScaleFromDesignCenter,
} from '../SceneScale'

describe('createSceneScale', () => {
  it('creates scale with world dimensions', () => {
    const scale = createSceneScale({
      vectorBounds: { x: 0, y: 0, width: 400, height: 300 },
      worldWidth: 10,
      worldHeight: 5,
      originX: 50,
      originY: 250,
    })

    expect(scale.scaleX).toBe(40)  // 400/10
    expect(scale.scaleY).toBe(60)  // 300/5
    expect(scale.scale).toBe(40)   // min(40,60)
    expect(scale.originX).toBe(50)
    expect(scale.originY).toBe(250)
    expect(scale.maxVectorLength).toBe(90) // min(400,300)*0.3 = 300*0.3
  })

  it('creates identity scale without world dimensions', () => {
    const scale = createSceneScale({
      vectorBounds: { x: 0, y: 0, width: 400, height: 300 },
      originX: 0,
      originY: 0,
    })

    expect(scale.scaleX).toBe(1)
    expect(scale.scaleY).toBe(1)
    expect(scale.scale).toBe(1)
  })

  it('applies refMagnitudes', () => {
    const scale = createSceneScale({
      vectorBounds: { x: 0, y: 0, width: 400, height: 300 },
      originX: 0,
      originY: 0,
      refMagnitudes: { force: 30, velocity: 10 },
    })

    expect(scale.refMagnitudes).toEqual({ force: 30, velocity: 10 })
  })
})

describe('worldToPixel / worldToDesign', () => {
  const scene = {
    scaleX: 40,
    scaleY: 40,
    scale: 40,
    originX: 50,
    originY: 250,
    maxVectorLength: 120,
  }

  it('converts physics origin to design origin', () => {
    const result = worldToPixel(0, 0, scene)
    expect(result.px).toBe(50)
    expect(result.py).toBe(250)
  })

  it('converts positive x to right', () => {
    const result = worldToPixel(5, 0, scene)
    expect(result.px).toBe(50 + 5 * 40) // 250
    expect(result.py).toBe(250)
  })

  it('flips y axis (physics y-up to design y-down)', () => {
    const origin = worldToPixel(0, 0, scene)
    const up = worldToPixel(0, 5, scene)
    const down = worldToPixel(0, -5, scene)

    // y=5 (up in physics) should be above origin in design (smaller y)
    expect(up.py).toBeLessThan(origin.py)
    // y=-5 (down in physics) should be below origin in design (larger y)
    expect(down.py).toBeGreaterThan(origin.py)
  })

  it('has correct y-flip formula', () => {
    const result = worldToPixel(2, 3, scene)
    expect(result.px).toBe(50 + 2 * 40)  // 130
    expect(result.py).toBe(250 - 3 * 40) // 130
  })

  it('worldToDesign is an alias of worldToPixel', () => {
    const a = worldToPixel(2, 3, scene)
    const b = worldToDesign(2, 3, scene)
    expect(a).toEqual(b)
  })
})

describe('createSceneScaleFromDesignCenter', () => {
  it('creates centered scene scale', () => {
    const scale = createSceneScaleFromDesignCenter({
      designWidth: 800,
      designHeight: 600,
      centerX: 400,
      centerY: 300,
      scale: 2,
      refMagnitudes: { force: 50 },
    })

    expect(scale.originX).toBe(400)
    expect(scale.originY).toBe(300)
    expect(scale.scaleX).toBe(2)
    expect(scale.scaleY).toBe(2)
    expect(scale.scale).toBe(2)
    expect(scale.maxVectorLength).toBe(180) // min(800,600)*0.3
    expect(scale.refMagnitudes).toEqual({ force: 50 })
  })

  it('accepts custom maxVectorLength', () => {
    const scale = createSceneScaleFromDesignCenter({
      designWidth: 800,
      designHeight: 600,
      centerX: 400,
      centerY: 300,
      scale: 2,
      maxVectorLength: 100,
    })

    expect(scale.maxVectorLength).toBe(100)
  })
})
