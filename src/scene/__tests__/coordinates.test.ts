import { describe, it, expect } from 'vitest'
import {
  asPhysicsCoord,
  asDesignCoord,
  asContainerPixelCoord,
  asPhysicsVector,
  asDesignVector,
  physicsToDesign,
  designToContainer,
  containerToDesign,
  physicsVectorToDesignVector,
  designVectorToPhysicsVector,
} from '../coordinates'

describe('factory functions', () => {
  it('asPhysicsCoord preserves values', () => {
    const p = asPhysicsCoord({ x: 5, y: 10 })
    expect(p.x).toBe(5)
    expect(p.y).toBe(10)
  })

  it('asDesignCoord preserves values', () => {
    const p = asDesignCoord({ x: 200, y: 150 })
    expect(p.x).toBe(200)
    expect(p.y).toBe(150)
  })

  it('asContainerPixelCoord preserves values', () => {
    const p = asContainerPixelCoord({ x: 800, y: 600 })
    expect(p.x).toBe(800)
    expect(p.y).toBe(600)
  })

  it('asPhysicsVector preserves values', () => {
    const v = asPhysicsVector({ x: 3, y: 4 })
    expect(v.x).toBe(3)
    expect(v.y).toBe(4)
  })

  it('asDesignVector preserves values', () => {
    const v = asDesignVector({ x: 30, y: 40 })
    expect(v.x).toBe(30)
    expect(v.y).toBe(40)
  })
})

describe('physicsToDesign', () => {
  const scene = {
    scaleX: 40,
    scaleY: 40,
    scale: 40,
    originX: 50,
    originY: 250,
    maxVectorLength: 120,
  }

  it('converts origin correctly', () => {
    const p = asPhysicsCoord({ x: 0, y: 0 })
    const d = physicsToDesign(p, scene)
    expect(d.x).toBe(50)
    expect(d.y).toBe(250)
  })

  it('scales x correctly', () => {
    const p = asPhysicsCoord({ x: 5, y: 0 })
    const d = physicsToDesign(p, scene)
    expect(d.x).toBe(50 + 5 * 40) // 250
  })

  it('flips y axis', () => {
    const origin = physicsToDesign(asPhysicsCoord({ x: 0, y: 0 }), scene)
    const up = physicsToDesign(asPhysicsCoord({ x: 0, y: 5 }), scene)
    const down = physicsToDesign(asPhysicsCoord({ x: 0, y: -5 }), scene)

    expect(up.y).toBeLessThan(origin.y)   // up in physics -> smaller y in design
    expect(down.y).toBeGreaterThan(origin.y) // down in physics -> larger y in design
  })

  it('has correct y-flip formula', () => {
    const p = asPhysicsCoord({ x: 2, y: 3 })
    const d = physicsToDesign(p, scene)
    expect(d.x).toBe(50 + 2 * 40)  // 130
    expect(d.y).toBe(250 - 3 * 40) // 130
  })
})

describe('designToContainer / containerToDesign', () => {
  const vp = { tx: 10, ty: 20, scale: 2 }

  it('scales and translates', () => {
    const d = asDesignCoord({ x: 100, y: 150 })
    const c = designToContainer(d, vp)
    expect(c.x).toBe(100 * 2 + 10) // 210
    expect(c.y).toBe(150 * 2 + 20) // 320
  })

  it('round-trips correctly', () => {
    const original = asDesignCoord({ x: 75, y: 125 })
    const container = designToContainer(original, vp)
    const back = containerToDesign(container, vp)
    expect(back.x).toBeCloseTo(original.x, 10)
    expect(back.y).toBeCloseTo(original.y, 10)
  })
})

describe('physicsVectorToDesignVector', () => {
  const scene = {
    scaleX: 40,
    scaleY: 40,
    scale: 40,
    originX: 50,
    originY: 250,
    maxVectorLength: 120,
  }

  it('scales but does not translate', () => {
    const v = asPhysicsVector({ x: 3, y: 4 })
    const d = physicsVectorToDesignVector(v, scene)
    expect(d.x).toBe(3 * 40)   // 120
    expect(d.y).toBe(-4 * 40)  // -160 (flipped)
  })

  it('flips y direction', () => {
    const up = physicsVectorToDesignVector(asPhysicsVector({ x: 0, y: 1 }), scene)
    const down = physicsVectorToDesignVector(asPhysicsVector({ x: 0, y: -1 }), scene)
    expect(up.y).toBeLessThan(0)    // physics up -> design negative y
    expect(down.y).toBeGreaterThan(0) // physics down -> design positive y
  })
})

describe('designVectorToPhysicsVector', () => {
  const scene = {
    scaleX: 40,
    scaleY: 40,
    scale: 40,
    originX: 50,
    originY: 250,
    maxVectorLength: 120,
  }

  it('is inverse of physicsVectorToDesignVector', () => {
    const original = asPhysicsVector({ x: 3, y: 4 })
    const design = physicsVectorToDesignVector(original, scene)
    const back = designVectorToPhysicsVector(design, scene)
    expect(back.x).toBeCloseTo(original.x, 10)
    expect(back.y).toBeCloseTo(original.y, 10)
  })
})

describe('coordinate pipeline', () => {
  const scene = {
    scaleX: 40,
    scaleY: 40,
    scale: 40,
    originX: 50,
    originY: 250,
    maxVectorLength: 120,
  }
  const vp = { tx: 10, ty: 20, scale: 2 }

  it('physics -> design -> container pipeline', () => {
    const physics = asPhysicsCoord({ x: 5, y: 3 })
    const design = physicsToDesign(physics, scene)
    const container = designToContainer(design, vp)

    // design = (50+200, 250-120) = (250, 130)
    expect(design.x).toBe(250)
    expect(design.y).toBe(130)

    // container = (250*2+10, 130*2+20) = (510, 280)
    expect(container.x).toBe(510)
    expect(container.y).toBe(280)
  })
})
