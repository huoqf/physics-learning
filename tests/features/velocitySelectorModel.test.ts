import { describe, expect, it } from 'vitest'
import { calculateVelocitySelectorTrajectory } from '@/physics'
import {
  buildMagneticFieldSigns,
  buildVelocitySelectorChartData,
  buildVelocitySelectorChartGeometry,
  buildVelocitySelectorChartPath,
  buildVelocitySelectorHandPose,
  buildVelocitySelectorLayout,
  normalizeVelocitySelectorParams,
} from '@/features/electromagnetism/magnetism/velocity-selector/model/velocitySelectorModel'

describe('velocity selector view model', () => {
  it('normalizes params with expected defaults and flags', () => {
    const params = normalizeVelocitySelectorParams({ mode: 1, showElectricField: 1, showHandRule: 0 })

    expect(params).toMatchObject({
      mode: 1,
      v0: 10,
      B: 1,
      E: 10,
      qOverM: 1,
      q: 1,
      keepTrack: false,
      showElectricField: true,
      showHandRule: false,
    })
  })

  it('builds responsive layout and magnetic field signs', () => {
    const layout = buildVelocitySelectorLayout({ width: 1000, height: 600 }, 1)

    expect(layout.cxIn).toBe(200)
    expect(layout.cy).toBeCloseTo(408)
    expect(layout.wPlatePx).toBe(650)
    expect(layout.gapPlatePx).toBe(120)

    const signs = buildMagneticFieldSigns({
      mode: 1,
      B: 1,
      cy: layout.cy,
      gapPlatePx: layout.gapPlatePx,
      wPlatePx: layout.wPlatePx,
      canvasHeight: 600,
      cxIn: layout.cxIn,
    })

    expect(signs).toHaveLength(24)
    expect(signs[0].id).toBe('b-cross-0-0')
    expect(signs[0].x).toBe(215)
    expect(signs[0].y).toBeCloseTo(363)
  })

  it('builds y-v chart data and path for advanced mode', () => {
    const chartData = buildVelocitySelectorChartData({
      mode: 1,
      E: 10,
      B: 1,
      qOverM: 1,
      v0: 10,
      showElectricField: true,
    })
    const layout = buildVelocitySelectorLayout({ width: 1000, height: 600 }, 1)
    const chartGeometry = buildVelocitySelectorChartGeometry({ height: 600 }, layout)

    expect(chartData).not.toBeNull()
    expect(chartData?.points).toHaveLength(81)
    expect(chartData?.vFilter).toBe(10)
    expect(chartGeometry.toChartX(1)).toBe(layout.cxIn)
    expect(chartGeometry.toChartX(25)).toBe(layout.cxIn + layout.wPlatePx)
    expect(chartGeometry.toChartY(0)).toBeCloseTo(chartGeometry.yOffset + chartGeometry.height / 2)

    const path = buildVelocitySelectorChartPath(chartData!, chartGeometry)
    expect(path).toContain('M')
    expect(path).toContain('L')
  })

  it('maps hand pose from physics force and velocity directions', () => {
    const singleParticle = calculateVelocitySelectorTrajectory(1, 1, 10, 0, -1, 15, 6, 0.2)
    const pose = buildVelocitySelectorHandPose({ mode: 0, singleParticle, q: 1, time: 0.2 })

    expect(pose.handActive).toBe(true)
    expect(pose.middleDir.x).toBeGreaterThan(0)
    expect(pose.thumbDir.y).toBeLessThan(0)

    const advancedPose = buildVelocitySelectorHandPose({ mode: 1, singleParticle: null, q: 1, time: 0 })
    expect(advancedPose).toEqual({
      thumbDir: { x: 0, y: -1 },
      middleDir: { x: 1, y: 0 },
      handActive: true,
    })
  })
})
