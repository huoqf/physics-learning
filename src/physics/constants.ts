/**
 * 物理常量（纯数据，无副作用）。
 * 统一来源，禁止在组件/页面内硬编码数值（如 g=9.8）。
 */

/** 重力加速度近似值（高中物理常用 9.8 m/s²） */
export const GRAVITY = 9.8

/** 万有引力常量 G (N·m²/kg²) */
export const GRAVITATIONAL_CONSTANT = 6.67e-11

/**
 * 静电力常量 k = 1/(4πε₀) (N·m²/C²)。
 *
 * 高中物理取近似值 9.0×10⁹。历史问题：中屏与看板各自写一份 `const COULOMB_K = 9e9`，
 * 共 8 处副本，改一处即分叉。
 */
export const COULOMB_CONSTANT = 9e9

/** 地球质量 (kg) */
export const EARTH_MASS = 5.97e24

/** 地球半径 (m) */
export const EARTH_RADIUS = 6.37e6

/** 太阳质量 M☉ (kg) */
export const SOLAR_MASS = 1.989e30

/** 一天的秒数 (s/d) */
export const SECONDS_PER_DAY = 86400

/**
 * 卫星发射演示的入轨半径比 r₀ / R_地球。
 *
 * 中屏的发射-转弯-入轨动画就在这个半径进轨，看板算在轨段也必须用它。
 * 历史问题：中屏 1.05、看板写死 1.35，同一页给出两条不同的轨道。
 */
export const SATELLITE_LAUNCH_RADIUS_RATIO = 1.05



/** 理想气体常量 R (J/(mol·K)) */
export const GAS_CONSTANT = 8.314

/**
 * 真空中的光速 c (m/s)。
 *
 * 高中物理教材取近似值 3.0×10⁸ m/s（精确值 299792458 m/s）。
 * 电磁波在真空中同样以 c 传播，故本常量同时用于光学与电磁波计算。
 */
export const SPEED_OF_LIGHT = 3.0e8

/** 玻尔兹曼常量 kB (J/K) */
export const BOLTZMANN_CONSTANT = 1.38e-23

/** 阿伏伽德罗常量 NA (mol⁻¹) */
export const AVOGADRO_CONSTANT = 6.02e23

