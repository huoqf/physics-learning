/**
 * 物理常量（纯数据，无副作用）。
 * 统一来源，禁止在组件/页面内硬编码数值（如 g=9.8）。
 */

/** 重力加速度近似值（高中物理常用 9.8 m/s²） */
export const GRAVITY = 9.8

/** 万有引力常量 G (N·m²/kg²) */
export const GRAVITATIONAL_CONSTANT = 6.67e-11

/** 地球质量 (kg) */
export const EARTH_MASS = 5.97e24

/** 地球半径 (m) */
export const EARTH_RADIUS = 6.37e6

/** 理想气体常量 R (J/(mol·K)) */
export const GAS_CONSTANT = 8.314

/**
 * 真空中的光速 c (m/s)。
 *
 * 高中物理教材取近似值 3.0×10⁸ m/s（精确值 299792458 m/s）。
 * 电磁波在真空中同样以 c 传播，故本常量同时用于光学与电磁波计算。
 */
export const SPEED_OF_LIGHT = 3.0e8

