import { describe, expect, it } from 'vitest'
import { calculateTransformerWithLoad } from '@/physics'
import {
  buildTransformerChainSteps,
  buildTransformerDerived,
  buildTransformerLayout,
  generateCoilPaths3D,
  niceMeterMax,
  normalizeTransformerParams,
} from '@/features/electromagnetism/induction/transformer/model/transformerModel'

describe('transformer view model', () => {
  it('normalizes params and computes nice meter ranges', () => {
    expect(normalizeTransformerParams({ n2: 300 })).toEqual({ mode: 0, n1: 100, n2: 300, U1: 220, R: 50 })
    expect(niceMeterMax(0)).toBe(10)
    expect(niceMeterMax(1.2)).toBe(2)
    expect(niceMeterMax(230)).toBe(500)
    expect(niceMeterMax(999)).toBe(1000)
  })

  it('builds stable responsive layout', () => {
    const layout = buildTransformerLayout({ width: 760, height: 440, mode: 0 })

    // scale = Math.min(760/350, 440/400) = 1.1
    expect(layout.scale).toBeCloseTo(1.1)
    expect(layout.v1X).toBeCloseTo(319.5)
    expect(layout.v2X).toBeCloseTo(440.5)
    expect(layout.coreTop).toBeCloseTo(134.75)
    expect(layout.coreBottom).toBeCloseTo(305.25)
    expect(layout.primaryLeft).toBeCloseTo(306.3)
    expect(layout.secondaryRight).toBeCloseTo(453.7)
  })

  it('generates limited 3D coil paths', () => {
    const paths = generateCoilPaths3D(10, 20, 0, 100, 999, true, 10, 5)

    expect(paths.backD.startsWith('M 10 10')).toBe(true)
    expect(paths.frontD.startsWith('M 20')).toBe(true)
    expect(paths.backD.match(/ Q /g)).toHaveLength(20)
    expect(paths.frontD.match(/ Q /g)).toHaveLength(20)
  })

  it('builds derived values and causal chain from physics result', () => {
    const params = normalizeTransformerParams({ n1: 100, n2: 200, U1: 220, R: 50 })
    const result = calculateTransformerWithLoad(params.n1, params.n2, params.U1, params.R)
    const layout = buildTransformerLayout({ width: 760, height: 440, mode: 1 })
    const derived = buildTransformerDerived({ params, result, layout })

    expect(derived.displayI1).toBeCloseTo(17.6)
    expect(derived.displayI2).toBeCloseTo(8.8)
    expect(derived.v1Max).toBe(500)
    expect(derived.v2Max).toBe(500)
    expect(derived.powerBalanced).toBe(true)
    expect(derived.pBarW).toBe(100)

    const steps = buildTransformerChainSteps(params, result, derived.displayI1, derived.displayI2)
    expect(steps.map((step) => step.key)).toEqual(['U1', 'U2', 'I2', 'Pout', 'Pin', 'I1'])
  })
})
