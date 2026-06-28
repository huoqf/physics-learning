/**
 * src/theme/index.ts
 * 主题系统统一导出入口
 *
 * 使用方式（推荐）：
 *   import { colors, PHYSICS_COLORS, SCENE_COLORS,
 *            CANVAS_STYLE, SVG_ATTR, CHART_COLORS,
 *            LAYOUT, duration } from '@/theme'
 *
 * ⚠️  所有颜色、间距、圆角、阴影、动效值必须从此处引用，禁止组件内硬编码
 *
 * ─── 模块职责速查 ────────────────────────────────────────────────────────────
 *  colors.ts           — UI 语义色（primary / secondary / accent / neutral / status）
 *  physics/colors.ts   — 物理量颜色（速度/加速度/力/能量/电磁/热/光/波 共 ~110 token）
 *  physics/sceneColors — 场景器材外观色（磁铁 3D 面/线圈/灯泡/手势/电路元件等）
 *  physics/chartColors — 物理图像配色（v-t / x-t / P-V / U-I 等 9 组专项）
 *  physics/canvasStyle — SVG/Canvas 绘制规范（线宽/虚线/箭头/SVG属性/Marker/Filter/动画）
 *  spacing.ts          — 间距与布局网格
 *  radius.ts           — 圆角
 *  shadow.ts           — 阴影与发光环
 *  motion.ts           — 动效时长与缓动
 */

// ─── UI 语义色 ────────────────────────────────────────────────────────────────
export { colors }                              from './colors'
export type { ColorScale, PrimaryColor }        from './colors'

// ─── 物理量颜色（完整扩展版）─────────────────────────────────────────────────
export {
  PHYSICS_COLORS,
  KINEMATICS_COLORS,
  DYNAMICS_COLORS,
  ENERGY_COLORS,
  EM_COLORS,
  THERMO_COLORS,
  OPTICS_COLORS,
  WAVE_COLORS,
  CANVAS_COLORS,
} from './physics/colors'
export type {
  PhysicsColorKey,
  KinematicsColorKey,
  DynamicsColorKey,
  EnergyColorKey,
  EMColorKey,
  ThermoColorKey,
  OpticsColorKey,
  WaveColorKey,
  CanvasColorKey,
} from './physics/colors'

// ─── 场景结构性颜色 ───────────────────────────────────────────────────────────
export {
  SCENE_COLORS,
  MAGNET_COLORS,
  COIL_COLORS,
  SPRING_COLORS,
  SURFACE_COLORS,
  PENDULUM_COLORS,
  CIRCUIT_COLORS,
  BULB_GLOW_COLORS,
  HAND_COLORS,
  OPTICAL_COLORS,
  THERMAL_COLORS,
} from './physics'
export type { SceneColorGroup }                 from './physics'

// ─── 物理图像配色 ─────────────────────────────────────────────────────────────
export {
  CHART_COLORS,
  ENERGY_BAR_COLORS,
  VT_CHART_COLORS,
  XT_CHART_COLORS,
  AT_CHART_COLORS,
  FX_CHART_COLORS,
  PV_CHART_COLORS,
  ENERGY_CHART_COLORS,
  UI_CHART_COLORS,
  WAVE_CHART_COLORS,
} from './physics'
export type { ChartColorKey, EnergyBarColorKey } from './physics'

// ─── SVG / Canvas 绘制规范 ────────────────────────────────────────────────────
export {
  CANVAS_STYLE,
  STROKE,
  OPACITY,
  ARROW,
  OBJECT,
  FONT,
  DASH,
  FIELD_LINE,
  LAYER_Z,
  SVG_ATTR,
  SVG_MARKER,
  SVG_FILTER,
  SVG_ANIM,
} from './physics/canvasStyle'
export type {
  StrokeKey,
  OpacityKey,
  ArrowKey,
  ObjectSizeKey,
  FontKey,
  DashKey,
} from './physics/canvasStyle'

// ─── 间距 / 布局 ──────────────────────────────────────────────────────────────
export { spacing, LAYOUT, DENSITY, CANVAS_PRESETS } from './spacing'

// ─── 动画 UI token ───────────────────────────────────────────────────────
export {
  ANIM_FONT,
  ANIM_SHADOW,
  ANIM_PANEL,
  CHART_PAD,
  CHART_PAD_FREEFALL,
  CHART_PAD_VERT,
}                                   from './animationTokens'
export type { ChartPadding }        from './animationTokens'

// ─── 圆角 ─────────────────────────────────────────────────────────────────────
export { radius }                               from './radius'
export type { RadiusKey }                       from './radius'

// ─── 阴影 ─────────────────────────────────────────────────────────────────────
export { shadow, glowRing }                     from './shadow'
export type { ShadowKey }                       from './shadow'

// ─── 动效 ─────────────────────────────────────────────────────────────────────
export {
  duration,
  easing,
  transition,
  canvasAnimation,
}                                               from './motion'
