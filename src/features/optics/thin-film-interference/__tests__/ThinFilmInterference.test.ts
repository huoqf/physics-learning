import { describe, it, expect } from 'vitest'
import { buildThinFilmInterferenceQuantities } from '@/data/quantities/thinFilmInterference'
import { opticsInterferenceAnimations } from '@/data/registries/optics-interference'

describe('ThinFilmInterference 集成测试', () => {
  it('注册表应正确登记 anim-thin-film-interference 配置', () => {
    const config = opticsInterferenceAnimations['anim-thin-film-interference']
    expect(config).toBeDefined()
    expect(config.knowledgeId).toBe('wave-optics-1-5')
    expect(config.controlsMode).toBe('param')
    expect(config.defaultParams.mode).toBe(0)
    expect(config.defaultParams.filmThickness).toBe(100)
    expect(config.defaultParams.defect).toBe(1)
    expect(config.paramMeta).toHaveLength(4)
  })

  it('物理量面板构建器应能正确导出 550nm 理想增透膜参数', () => {
    const data = buildThinFilmInterferenceQuantities('anim-thin-film-interference', {
      mode: 0,
      wavelength: 550,
      filmThickness: 99.6,
      n_film: 1.38,
      wedgeAngle_mrad: 0.3,
    }, 0)

    expect(data).not.toBeNull()
    const dQuantity = data?.quantities.find((q) => q.symbol === 'd')
    const rQuantity = data?.quantities.find((q) => q.symbol === 'R')
    expect(dQuantity?.value).toBe(99.6)
    // 理想增透反射率应接近 1% 极小值
    expect(rQuantity?.value).toBeLessThan(3.0)
    expect(data?.formulas).toHaveLength(3)
    expect(data?.gaokaoPoints).toHaveLength(5)
  })

  it('劈尖模式下应导出正确的直条纹间距', () => {
    const data = buildThinFilmInterferenceQuantities('anim-thin-film-interference', {
      mode: 1,
      wavelength: 600,
      wedgeAngle_mrad: 0.3,
      filmThickness: 100,
      n_film: 1.38,
    }, 0)

    expect(data).not.toBeNull()
    const dx = data?.quantities.find((q) => q.symbol === 'Δx')
    expect(dx).toBeDefined()
    // Δx = λ / (2 * alpha) = 600e-9 / (2 * 3e-4) = 1.0 mm
    expect(dx?.value).toBeCloseTo(1.0, 1)
  })
})
