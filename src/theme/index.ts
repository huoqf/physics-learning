/**
 * src/theme/index.ts
 * 主题系统统一导出入口
 *
 * 使用方式：
 *   import { colors, PHYSICS_COLORS, CANVAS_STYLE, LAYOUT, duration } from '@/theme'
 *
 * ⚠️ 所有颜色、间距、圆角、阴影、动效值必须从此处引用，禁止组件内硬编码
 */

export { colors, tailwindColors }              from './colors'
export type { ColorScale, PrimaryColor }        from './colors'

export {
  PHYSICS_COLORS,
  CANVAS_STYLE,
  CHART_COLORS,
  ENERGY_BAR_COLORS,
}                                               from './physicsColors'
export type { PhysicsColorKey }                 from './physicsColors'

export { spacing, LAYOUT, DENSITY }             from './spacing'

export { radius }                               from './radius'
export type { RadiusKey }                       from './radius'

export { shadow }                               from './shadow'
export type { ShadowKey }                       from './shadow'

export {
  duration,
  easing,
  transition,
  motionConfig,
  canvasAnimation,
}                                               from './motion'
