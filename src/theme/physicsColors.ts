/**
 * src/theme/physicsColors.ts
 *
 * ⚠️  已迁移到 src/theme/physics/ 子目录，本文件保留为向后兼容层。
 *
 * ─────────────────────────────────────────────────────────────────
 *  迁移状态：MIGRATED — 请勿在此文件新增颜色 token
 * ─────────────────────────────────────────────────────────────────
 *
 *  新代码统一从子模块引入：
 *    import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE,
 *             CHART_COLORS, ENERGY_BAR_COLORS,
 *             SVG_ATTR, SVG_MARKER, SVG_FILTER, SVG_ANIM }
 *      from '@/theme/physics'
 *
 *  本文件所有导出均直接 re-export 自 physics/，
 *  现有代码无需任何修改即可继续使用：
 *    import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'  ✓
 *
 *  完整变更记录见 physics/colors.ts 头部注释。
 */

// ─── 向后兼容 re-export ───────────────────────────────────────────────────────

export {
  // 物理量颜色（扩展版，新增 ~70 个 token，原有 32 个完全兼容）
  PHYSICS_COLORS,
  // 分模块导出（新代码推荐按需引入）
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

export {
  // 场景结构性颜色（新增，原 physicsColors.ts 无此模块）
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
} from './physics/sceneColors'

export type {
  SceneColorGroup,
} from './physics/sceneColors'

export {
  // 图表配色（完全兼容原 CHART_COLORS / ENERGY_BAR_COLORS 值）
  CHART_COLORS,
  ENERGY_BAR_COLORS,
  // 物理图像专项（新增）
  VT_CHART_COLORS,
  XT_CHART_COLORS,
  AT_CHART_COLORS,
  FX_CHART_COLORS,
  PV_CHART_COLORS,
  ENERGY_CHART_COLORS,
  UI_CHART_COLORS,
  WAVE_CHART_COLORS,
} from './physics/chartColors'

export {
  // Canvas / SVG 绘制规范（完全兼容原 CANVAS_STYLE 所有子字段）
  CANVAS_STYLE,
  STROKE,
  OPACITY,
  ARROW,
  OBJECT,
  FONT,
  DASH,
  FIELD_LINE,
  LAYER_Z,
  // SVG 专项（新增，项目当前主要使用 SVG）
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
