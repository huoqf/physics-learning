/**
 * src/theme/physics/index.ts
 * physics 子主题统一导出入口
 *
 * ═══════════════════════════════════════════════════════════════════
 *  推荐引用方式（组件内）：
 *
 *    import {
 *      PHYSICS_COLORS,
 *      SCENE_COLORS,
 *      CANVAS_STYLE,
 *      CHART_COLORS,
 *      ENERGY_BAR_COLORS,
 *    } from '@/theme/physics'
 *
 *  分组引用（需要更细粒度 tree-shaking 时）：
 *
 *    import { KINEMATICS_COLORS, EM_COLORS }          from '@/theme/physics'
 *    import { MAGNET_COLORS, HAND_COLORS }            from '@/theme/physics'
 *    import { ENERGY_CHART_COLORS, PV_CHART_COLORS }  from '@/theme/physics'
 *    import { STROKE, OPACITY, SVG_ATTR }             from '@/theme/physics'
 *
 * ═══════════════════════════════════════════════════════════════════
 *
 *  向后兼容说明：
 *  原 physicsColors.ts 导出的所有符号（PHYSICS_COLORS / CANVAS_STYLE /
 *  CHART_COLORS / ENERGY_BAR_COLORS）均可从本入口直接引入，无需修改现有代码。
 */

// ─── 物理量颜色 ───────────────────────────────────────────────────────────────
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
  TRANSMISSION_COLORS,
} from './colors'

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
} from './colors'

// ─── 场景结构性颜色 ───────────────────────────────────────────────────────────
import {
  COMMON_MATERIALS,
  SPHERE_COLORS,
  ENVIRONMENT_COLORS,
  SPECIAL_EFFECTS,
  SAFETY_PRESETS,
  LAB_LABELS,
  CHART_COMPONENT_COLORS,
} from './scene/materials'

import {
  SPRING_COLORS,
  SURFACE_COLORS,
  PENDULUM_COLORS,
  MECHANICS_APPARATUS_COLORS,
} from './scene/mechanics'

import {
  MAGNET_COLORS,
  COIL_COLORS,
  CIRCUIT_COLORS,
  BULB_GLOW_COLORS,
  HAND_COLORS,
  ELECTRICAL_APPARATUS_COLORS,
  ELECTROSTATIC_APPARATUS_COLORS,
} from './scene/electricity'

import {
  THERMAL_COLORS,
  THERMO_CHAMBER_COLORS,
} from './scene/thermal'

import {
  OPTICAL_COLORS,
  MODERN_PHYSICS_COLORS,
} from './scene/optics'

export const SCENE_COLORS = {
  materials: COMMON_MATERIALS,
  sphere: SPHERE_COLORS,
  environment: ENVIRONMENT_COLORS,
  effects: SPECIAL_EFFECTS,
  safety: SAFETY_PRESETS,
  labels: LAB_LABELS,
  magnet:   MAGNET_COLORS,
  coil:     COIL_COLORS,
  spring:   SPRING_COLORS,
  surface:  SURFACE_COLORS,
  pendulum: PENDULUM_COLORS,
  circuit:  CIRCUIT_COLORS,
  bulb:     BULB_GLOW_COLORS,
  hand:     HAND_COLORS,
  optical:  OPTICAL_COLORS,
  thermal:  THERMAL_COLORS,

  mechanicsApparatus: MECHANICS_APPARATUS_COLORS,
  electricalApparatus: ELECTRICAL_APPARATUS_COLORS,
  electrostaticApparatus: ELECTROSTATIC_APPARATUS_COLORS,
  thermoChamber: THERMO_CHAMBER_COLORS,
  modernPhysics: MODERN_PHYSICS_COLORS,
  charts: CHART_COMPONENT_COLORS,
} as const;

export {
  COMMON_MATERIALS,
  SPHERE_COLORS,
  ENVIRONMENT_COLORS,
  SPECIAL_EFFECTS,
  SAFETY_PRESETS,
  LAB_LABELS,
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
}

export type SceneColorGroup   = keyof typeof SCENE_COLORS
export type MaterialsColorKey = keyof typeof COMMON_MATERIALS
export type SpherePresetKey   = keyof typeof SPHERE_COLORS
export type EnvironmentColorKey = keyof typeof ENVIRONMENT_COLORS
export type EffectsColorKey   = keyof typeof SPECIAL_EFFECTS
export type SafetyColorKey    = keyof typeof SAFETY_PRESETS
export type LabLabelsColorKey = keyof typeof LAB_LABELS
export type MagnetColorKey    = keyof typeof MAGNET_COLORS
export type CoilColorKey      = keyof typeof COIL_COLORS
export type SpringColorKey    = keyof typeof SPRING_COLORS
export type SurfaceColorKey   = keyof typeof SURFACE_COLORS
export type PendulumColorKey  = keyof typeof PENDULUM_COLORS
export type CircuitColorKey   = keyof typeof CIRCUIT_COLORS
export type BulbColorKey      = keyof typeof BULB_GLOW_COLORS
export type HandColorKey      = keyof typeof HAND_COLORS
export type OpticalColorKey   = keyof typeof OPTICAL_COLORS
export type ThermalColorKey   = keyof typeof THERMAL_COLORS

// ─── 图表配色大一统桥接层 (Chart Color Semantic Bridge) ────────────────────────
import { PHYSICS_COLORS, withAlpha } from './colors'

export const CHART_COLORS = {
  // 网格和轴线直接映射至场景 UI 结构色
  gridLine:     SCENE_COLORS.charts.gridLine,
  axisLine:     SCENE_COLORS.charts.axisLine,
  axisArrow:    SCENE_COLORS.charts.axisArrow,
  labelText:    SCENE_COLORS.charts.labelText,
  tickMark:     SCENE_COLORS.charts.tickMark,
  tickLabel:    SCENE_COLORS.charts.tickLabel,
  zeroline:     SCENE_COLORS.charts.zeroline,
  reference:    SCENE_COLORS.charts.referenceLine,
  tangent:      SCENE_COLORS.charts.tangentLine,
  highlight:    SCENE_COLORS.charts.highlightPt,
  criticalPt:   SCENE_COLORS.charts.criticalPt,
  origin:       SCENE_COLORS.charts.axisLine,
  asymptote:    SCENE_COLORS.charts.asymptoteLine, // 渐近线
  titleText:    SCENE_COLORS.charts.labelText,     // 图表标题
  equilibrium:  PHYSICS_COLORS.work,               // 平衡态标注线 (映射至功/黄绿色)

  // 派生数据曲线
  primary:      PHYSICS_COLORS.velocity,      // 统一映射至 PHYSICS_COLORS 速度蓝
  compareA:     PHYSICS_COLORS.angularVelocity,
  compareB:     PHYSICS_COLORS.magneticField, // 使用磁场主色
  compareC:     PHYSICS_COLORS.electricField,  // 使用电场主色
  compareD:     PHYSICS_COLORS.displacement,   // 使用升级后的紫色位移
  compareE:     PHYSICS_COLORS.momentum,

  // 面积填充
  areaFill:     withAlpha(PHYSICS_COLORS.velocity, 0.18),
  areaFillAlt:  withAlpha(PHYSICS_COLORS.magneticField, 0.15),
  areaFillWarm: withAlpha(PHYSICS_COLORS.elasticForce, 0.15),
} as const;

export const VT_CHART_COLORS = {
  velocityCurve:   PHYSICS_COLORS.velocity,
  slopeTangent:    SCENE_COLORS.charts.tangentLine,
  areaShade:       withAlpha(PHYSICS_COLORS.velocity, 0.18),
  zeroCrossing:    SCENE_COLORS.charts.criticalPt,
  avgVelocity:     PHYSICS_COLORS.averageVelocity,
} as const;

export const XT_CHART_COLORS = {
  positionCurve:   PHYSICS_COLORS.displacement, // 使用升级后的紫色位移
  slopeTangent:    PHYSICS_COLORS.velocity,     // 速度是斜率
  avgSlope:        PHYSICS_COLORS.averageVelocity,
  constantLine:    SCENE_COLORS.charts.referenceLine,
} as const;

export const AT_CHART_COLORS = {
  accelCurve:      PHYSICS_COLORS.acceleration,
  areaShade:       withAlpha(PHYSICS_COLORS.acceleration, 0.18),
  zeroline:        SCENE_COLORS.charts.referenceLine,
} as const;

export const FX_CHART_COLORS = {
  forceCurve:      PHYSICS_COLORS.forceNet,
  hookeLine:       PHYSICS_COLORS.elasticForce,
  areaShade:       withAlpha(PHYSICS_COLORS.elasticForce, 0.15),
  hysteresis:      PHYSICS_COLORS.momentum,
  naturalLength:   SCENE_COLORS.charts.referenceLine,
} as const;

export const PV_CHART_COLORS = {
  isotherm:        PHYSICS_COLORS.temperature,
  isothermsGroup:  PHYSICS_COLORS.temperatureIsothermalGroup, // 升级后的冷暖温度联觉渐变
  isobar:          PHYSICS_COLORS.pressure,
  isochor:         PHYSICS_COLORS.volume,
  adiabatic:       PHYSICS_COLORS.displacement,
  processArrow:    PHYSICS_COLORS.forceNet,
  statePoint:      SCENE_COLORS.charts.labelText,
  statePointFill:  SCENE_COLORS.charts.highlightPt,
} as const;

export const ENERGY_CHART_COLORS = {
  kinetic:         PHYSICS_COLORS.kineticEnergy,
  potential:       PHYSICS_COLORS.potentialEnergy,
  mechanical:      PHYSICS_COLORS.mechanicalEnergy, // 升级后的石墨灰
  thermal:         PHYSICS_COLORS.internalEnergy,
  total:           PHYSICS_COLORS.mechanicalEnergy, // 总能量/机械能守恒线指向机械能主色
  loss:            PHYSICS_COLORS.heatLoss,
} as const;

export const UI_CHART_COLORS = {
  ohmic:           PHYSICS_COLORS.velocity,
  nonOhmic:        PHYSICS_COLORS.electricField,
  diode:           PHYSICS_COLORS.lorentzForce,
  filament:        PHYSICS_COLORS.electricForce,
  workingPoint:    SCENE_COLORS.charts.criticalPt,
  slopeNote:       SCENE_COLORS.charts.referenceLine,
} as const;

export const WAVE_CHART_COLORS = {
  waveMain:        PHYSICS_COLORS.velocity,
  waveSource:      PHYSICS_COLORS.acceleration,
  interference:    PHYSICS_COLORS.standingWave,
  envelope:        SCENE_COLORS.charts.referenceLine,
  nodeMarker:      SCENE_COLORS.charts.axisLine,
  antinodeMarker:  SCENE_COLORS.charts.highlightPt,
  phaseMarker:     PHYSICS_COLORS.work,
} as const;

export const ENERGY_BAR_COLORS = {
  kinetic:           PHYSICS_COLORS.kineticEnergy,
  potential:         PHYSICS_COLORS.potentialEnergy,
  potentialElastic:  PHYSICS_COLORS.potentialElastic,
  mechanical:        PHYSICS_COLORS.mechanicalEnergy,
  internal:          PHYSICS_COLORS.internalEnergy,
  heat:              PHYSICS_COLORS.heatLoss,
  total:             PHYSICS_COLORS.mechanicalEnergy,

  // 能量柱状图渐变
  kineticGrad:       ['#22D3EE', '#0891B2'] as const,
  potentialGrad:     ['#A78BFA', '#7C3AED'] as const,
  mechanicalGrad:    ['#64748B', '#475569'] as const, // 升级为石墨灰渐变
} as const;

export type ChartColorKey       = keyof typeof CHART_COLORS;
export type EnergyBarColorKey   = keyof typeof ENERGY_BAR_COLORS;

// ─── 图表插件颜色变体 ──────────────────────────────────────────────────────
/** 参考线/游标/切线颜色变体 */
export type ChartReferenceVariant = 'default' | 'highlight' | 'tangent'
/** 数据曲线颜色变体 */
export type ChartSeriesVariant = 'primary' | 'secondary' | 'accent' | 'warm' | 'success'
/** 面积填充变体 */
export type ChartAreaVariant = 'default' | 'alt' | 'warm' | 'impulse'
/** 面积填充强度 */
export type ChartAreaIntensity = 'subtle' | 'normal' | 'strong'

/** 参考线 token 映射 */
export const REFERENCE_MAP: Record<ChartReferenceVariant, string> = {
  default:   CHART_COLORS.reference,
  highlight: CHART_COLORS.highlight,
  tangent:   CHART_COLORS.tangent,
}

/** 数据曲线 token 映射 */
export const SERIES_MAP: Record<ChartSeriesVariant, string> = {
  primary:   CHART_COLORS.primary,
  secondary: CHART_COLORS.compareA,
  accent:    CHART_COLORS.compareB,
  warm:      CHART_COLORS.compareC,
  success:   CHART_COLORS.compareD,
}

/** 面积填充 token 映射 */
export const AREA_FILL_MAP: Record<ChartAreaVariant, string> = {
  default: CHART_COLORS.areaFill,
  alt:     CHART_COLORS.areaFillAlt,
  warm:    CHART_COLORS.areaFillWarm,
  impulse: PHYSICS_COLORS.impulse,
}

/** 面积填充强度映射 */
export const AREA_INTENSITY_MAP: Record<ChartAreaIntensity, number> = {
  subtle:  0.12,
  normal:  0.18,
  strong:  0.32,
}

// ─── Canvas / SVG 绘制规范 ────────────────────────────────────────────────────
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
  KEPLER_CONFIG,
  VECTOR_DISPLAY,
  INSET_CHART,
  GRID_DISPLAY,
  CHART_LAYOUT,
} from './canvasStyle'

export type {
  StrokeKey,
  OpacityKey,
  ArrowKey,
  ObjectSizeKey,
  FontKey,
  DashKey,
} from './canvasStyle'

// ─── 矢量显示系统 ─────────────────────────────────────────────────────────
export {
  VECTOR_VISUAL_WEIGHT,
  VECTOR_COLORS,
  MARKER_TIERS,
  selectMarkerTier,
} from './vectorStyle'

// ─── 热力学第一定律专用颜色 ───────────────────────────────────────────────
export {
  FIRST_LAW_COLORS,
} from './firstLawColors'

export type {
  FirstLawColorKey,
} from './firstLawColors'

// ─── 热力学第二定律专用颜色 ─────────────────────────────────────────
export {
  SECOND_LAW_COLORS,
} from './secondLawColors'

export type {
  SecondLawColorKey,
} from './secondLawColors'

export type {
  VectorType,
  MarkerTier,
} from './vectorStyle'

export {
  getArrowGeometry,
} from './arrowStyle'

export type {
  ArrowGeometry,
} from './arrowStyle'

export { withAlpha } from './colors'
