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
export {
  SCENE_COLORS,
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
} from './sceneColors'

export type {
  SceneColorGroup,
  MaterialsColorKey,
  SpherePresetKey,
  EnvironmentColorKey,
  EffectsColorKey,
  SafetyColorKey,
  LabLabelsColorKey,
  MagnetColorKey,
  CoilColorKey,
  SpringColorKey,
  SurfaceColorKey,
  PendulumColorKey,
  CircuitColorKey,
  BulbColorKey,
  HandColorKey,
  OpticalColorKey,
  ThermalColorKey,
} from './sceneColors'

// ─── 图表配色 ─────────────────────────────────────────────────────────────────
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
} from './chartColors'

export type {
  ChartColorKey,
  EnergyBarColorKey,
} from './chartColors'

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
