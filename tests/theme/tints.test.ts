/**
 * 温度/内能着色器与光谱配色的单测。
 *
 * 这两组函数 2026-11 从 `src/physics/firstLaw.ts`、`secondLaw.ts`、`photoelectric.ts`
 * 迁到 `src/theme/physics/`，原因见 tints.ts 头注释。搬迁要求"视觉零变化（光谱）/
 * 统一实现（温度）"，所以这里的断言都对着 token 算，而不是写死 rgb 字面量——
 * 否则改 token 时测试会变成需要跟着改的副本。
 */
import { describe, it, expect } from 'vitest'
import { frequencyToColor, deltaUToBgColor, temperatureColor } from '@/theme/physics'
import { OPTICS_COLORS, THERMO_COLORS } from '@/theme/physics'
import { THERMO_CHAMBER_COLORS } from '@/theme/physics/scene/thermal'
import { hexToRgb } from '@/utils/color'

/** token → `rgba(r, g, b,` 前缀，用于断言"颜色来自 token 而不是字面量" */
function rgbaPrefix(token: string): string {
  const c = hexToRgb(token)
  if (!c) throw new Error(`测试用 token 非法：${token}`)
  return `rgba(${c.r}, ${c.g}, ${c.b},`
}

function parseRgb(css: string): [number, number, number] {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(css)
  if (!m) throw new Error(`不是 rgb() 字符串：${css}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

describe('temperatureColor', () => {
  it('低温端偏蓝', () => {
    const [r, , b] = parseRgb(temperatureColor(200, 200, 500))
    expect(b).toBeGreaterThan(r)
  })

  it('高温端偏红', () => {
    const [r, , b] = parseRgb(temperatureColor(500, 200, 500))
    expect(r).toBeGreaterThan(b)
  })

  it('两端取色等于 THERMO_COLORS 的低温/高温 token', () => {
    expect(temperatureColor(200, 200, 500)).toBe(
      `rgb(${hexToRgb(THERMO_COLORS.temperatureLow)!.r},${hexToRgb(THERMO_COLORS.temperatureLow)!.g},${hexToRgb(THERMO_COLORS.temperatureLow)!.b})`,
    )
    expect(temperatureColor(500, 200, 500)).toBe(
      `rgb(${hexToRgb(THERMO_COLORS.temperatureHigh)!.r},${hexToRgb(THERMO_COLORS.temperatureHigh)!.g},${hexToRgb(THERMO_COLORS.temperatureHigh)!.b})`,
    )
  })

  it('中点取紫色（绿通道低于红/蓝）', () => {
    const [r, g, b] = parseRgb(temperatureColor(350, 200, 500))
    expect(g).toBeLessThan(r)
    expect(g).toBeLessThan(b)
  })

  it('超出区间被截断到两端，不产生越界值', () => {
    expect(temperatureColor(9999, 200, 500)).toBe(temperatureColor(500, 200, 500))
    expect(temperatureColor(-9999, 200, 500)).toBe(temperatureColor(200, 200, 500))
  })

  it('tLow === tHigh 时退化为低温色而不出现 NaN', () => {
    const color = temperatureColor(300, 300, 300)
    expect(color).not.toContain('NaN')
    expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
  })

  it('默认区间 300~1200 K 可正常插值', () => {
    expect(temperatureColor(300)).toBe(
      `rgb(${hexToRgb(THERMO_COLORS.temperatureLow)!.r},${hexToRgb(THERMO_COLORS.temperatureLow)!.g},${hexToRgb(THERMO_COLORS.temperatureLow)!.b})`,
    )
    expect(parseRgb(temperatureColor(1200))).toBeDefined()
  })
})

describe('deltaUToBgColor', () => {
  it('吸热（ΔU>0）用 heatAbsorb token', () => {
    expect(deltaUToBgColor(200, 500)).toContain(rgbaPrefix(THERMO_COLORS.heatAbsorb))
  })

  it('放热（ΔU<0）用 heatRelease token', () => {
    expect(deltaUToBgColor(-200, 500)).toContain(rgbaPrefix(THERMO_COLORS.heatRelease))
  })

  it('ΔU≈0 回到气缸基色 token', () => {
    expect(deltaUToBgColor(0)).toContain(rgbaPrefix(THERMO_CHAMBER_COLORS.gasVolumeBase))
  })

  it('透明度随 |ΔU| 增大而增大并在 1 倍基准处封顶', () => {
    const alphaOf = (css: string) => Number(/,\s*([\d.]+)\)$/.exec(css)?.[1] ?? NaN)
    expect(alphaOf(deltaUToBgColor(100, 500))).toBeGreaterThan(alphaOf(deltaUToBgColor(20, 500)))
    expect(alphaOf(deltaUToBgColor(2000, 500))).toBeCloseTo(alphaOf(deltaUToBgColor(500, 500)), 5)
  })

  it('maxAbsDU 为 0 时不出现 NaN/Infinity', () => {
    const css = deltaUToBgColor(100, 0)
    expect(css).not.toMatch(/NaN|Infinity/)
  })
})

describe('frequencyToColor', () => {
  it.each([
    [4.0, OPTICS_COLORS.wavelengthRed],
    [4.7, OPTICS_COLORS.wavelengthOrange],
    [5.2, OPTICS_COLORS.wavelengthYellow],
    [5.7, OPTICS_COLORS.wavelengthGreen],
    [6.2, OPTICS_COLORS.wavelengthBlue],
    [6.7, OPTICS_COLORS.wavelengthIndigo],
    [7.5, OPTICS_COLORS.wavelengthViolet],
  ])('ν=%s 返回光谱 token %s', (nu, expected) => {
    expect(frequencyToColor(nu)).toBe(expected)
  })

  it('边界值归属于下一个更短的波长段', () => {
    expect(frequencyToColor(4.5)).toBe(OPTICS_COLORS.wavelengthOrange)
    expect(frequencyToColor(7.0)).toBe(OPTICS_COLORS.wavelengthViolet)
  })
})
