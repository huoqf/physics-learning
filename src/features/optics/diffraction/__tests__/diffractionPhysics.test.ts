import { describe, test, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDiffractionPhysics } from '../hooks/useDiffractionPhysics'
import { buildDiffractionQuantities } from '@/data/quantities/diffraction'

describe('Diffraction Physics & Parameter Sync Tests', () => {
  test('Single slit diffraction formula calculation', () => {
    // L = 1.0m, a = 0.1mm, lambda = 650nm
    // W = 2 * (1.0 / 0.1) * 650 * 1e-3 = 13.0 mm
    const result = buildDiffractionQuantities('anim-diffraction', {
      mode: 0,
      wavelength: 650,
      obstacleSize: 0.1,
      screenDistance: 1.0,
    }, 0)

    expect(result).not.toBeNull()
    const widthQty = result?.quantities.find(q => q.label === '中央亮纹宽度 W')
    expect(widthQty?.value).toBe('13.000')
  })

  test('Circular aperture diffraction (Airy Disk) formula calculation', () => {
    // L = 1.0m, d = 0.1mm, lambda = 650nm
    // D = 2.44 * (1.0 / 0.1) * 650 * 1e-3 = 15.86 mm
    const result = buildDiffractionQuantities('anim-diffraction', {
      mode: 1,
      wavelength: 650,
      obstacleSize: 0.1,
      screenDistance: 1.0,
    }, 0)

    expect(result).not.toBeNull()
    const diameterQty = result?.quantities.find(q => q.label === '中央艾里斑直径 D')
    expect(diameterQty?.value).toBe('15.860')
  })

  test('Poisson spot parameters calculation', () => {
    const result = buildDiffractionQuantities('anim-diffraction', {
      mode: 2,
      wavelength: 650,
      obstacleSize: 0.15,
      screenDistance: 1.0,
    }, 0)

    expect(result).not.toBeNull()
    const shadowQty = result?.quantities.find(q => q.label === '几何阴影直径 D_sh')
    expect(shadowQty?.value).toBe('0.15')
  })

  test('useDiffractionPhysics hook produces valid intensity path and color', () => {
    const { result } = renderHook(() =>
      useDiffractionPhysics({
        mode: 'single-slit',
        wavelength: 650,
        obstacleSize: 0.1,
        screenDistance: 1.0,
        time: 0,
      })
    )

    expect(result.current.wavelengthColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(result.current.intensityPath).toContain('M 690,85')
    expect(result.current.wavefronts.length).toBeGreaterThan(0)
  })
})
