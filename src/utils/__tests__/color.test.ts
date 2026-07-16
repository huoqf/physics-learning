import { describe, it, expect } from 'vitest'
import { hexToRgb } from '../color'

describe('hexToRgb', () => {
  it('解析 6 位 hex 颜色', () => {
    expect(hexToRgb('#3B82F6')).toEqual({ r: 59, g: 130, b: 246 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('解析 3 位 hex 缩写', () => {
    expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('不区分大小写', () => {
    expect(hexToRgb('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 })
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 })
  })

  it('无效输入返回 null', () => {
    expect(hexToRgb('')).toBeNull()
    expect(hexToRgb('red')).toBeNull()
    expect(hexToRgb('#GGG')).toBeNull()
    expect(hexToRgb('3B82F6')).toBeNull()
  })
})
