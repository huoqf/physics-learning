/**
 * 圆锥摆与水平圆盘模型计算。
 *
 * 本文件只包含无副作用、可序列化的物理计算函数；不依赖 React/DOM/window。
 */

import { GRAVITY } from './constants'

export interface ConicalPendulumState {
  /** 是否存在非零稳定圆锥摆解 */
  stable: boolean
  /** 绳与竖直方向夹角，单位：rad */
  thetaRad: number
  /** 绳与竖直方向夹角，单位：° */
  thetaDeg: number
  /** 水平圆周半径，单位：m */
  radius: number
  /** 拉力大小，单位：N */
  tension: number
  /** 水平方向合外力/向心力，单位：N */
  centripetalForce: number
  /** 形成非零圆锥摆所需角速度阈值，单位：rad/s */
  minOmega: number
}

export interface DiskRotationState {
  /** 所需向心力，单位：N */
  requiredForce: number
  /** 最大静摩擦力，单位：N */
  maxStaticFriction: number
  /** 临界角速度，单位：rad/s */
  criticalOmega: number
  /** 是否超过静摩擦临界 */
  slipping: boolean
  /** 静摩擦利用率，0~1 */
  frictionRatio: number
}

/**
 * 计算圆锥摆状态。
 *
 * @param omega 角速度，单位：rad/s
 * @param length 绳长 L，单位：m
 * @param mass 质点质量，单位：kg
 * @param g 重力加速度，单位：m/s²，默认 9.8
 * @returns 圆锥摆角度、半径与受力状态
 */
export function calculateConicalPendulumState(
  omega: number,
  length: number,
  mass: number,
  g = GRAVITY,
): ConicalPendulumState {
  const minOmega = Math.sqrt(g / length)
  const stable = omega >= minOmega

  if (!stable) {
    return {
      stable,
      thetaRad: 0,
      thetaDeg: 0,
      radius: 0,
      tension: mass * g,
      centripetalForce: 0,
      minOmega,
    }
  }

  const cosTheta = Math.min(1, Math.max(0, g / (omega * omega * length)))
  const thetaRad = Math.acos(cosTheta)
  const thetaDeg = thetaRad * 180 / Math.PI
  const radius = length * Math.sin(thetaRad)
  const tension = mass * g / Math.max(Number.EPSILON, cosTheta)
  const centripetalForce = mass * omega * omega * radius

  return {
    stable,
    thetaRad,
    thetaDeg,
    radius,
    tension,
    centripetalForce,
    minOmega,
  }
}

/**
 * 计算所需向心力。
 *
 * @param mass 质量，单位：kg
 * @param omega 角速度，单位：rad/s
 * @param radius 圆周运动半径，单位：m
 * @returns 向心力大小，单位：N
 */
export function calculateCentripetalForce(mass: number, omega: number, radius: number): number {
  return mass * omega * omega * radius
}

/**
 * 计算水平圆盘上静摩擦提供向心力的临界状态。
 *
 * @param omega 角速度，单位：rad/s
 * @param radius 物体到转轴距离，单位：m
 * @param mu 最大静摩擦系数，无量纲
 * @param mass 物体质量，单位：kg
 * @param g 重力加速度，单位：m/s²，默认 9.8
 * @returns 所需摩擦力、最大静摩擦力、临界角速度与打滑状态
 */
export function calculateDiskRotationState(
  omega: number,
  radius: number,
  mu: number,
  mass: number,
  g = GRAVITY,
): DiskRotationState {
  const requiredForce = calculateCentripetalForce(mass, omega, radius)
  const maxStaticFriction = mu * mass * g
  const criticalOmega = Math.sqrt(mu * g / radius)
  const slipping = requiredForce > maxStaticFriction
  const frictionRatio = Math.min(1, requiredForce / Math.max(Number.EPSILON, maxStaticFriction))

  return {
    requiredForce,
    maxStaticFriction,
    criticalOmega,
    slipping,
    frictionRatio,
  }
}

export interface DiskSlippingState {
  /** 物理坐标 x (m) */
  x: number
  /** 物理坐标 y (m) */
  y: number
  /** 物理坐标 z (m) ，向下掉落 */
  z: number
  /** 当前半径 (m) */
  radius: number
  /** 是否已经飞出圆盘 */
  isFlownOut: boolean
  /** 真实的重力大小 (N) */
  gravity: number
  /** 真实的支持力大小 (N) */
  normalForce: number
  /** 真实的摩擦力大小 (N) */
  friction: number
  /** 物体实际透明度 (0~1) */
  opacity: number
}

/**
 * 计算打滑物体的实时位置与受力状态 (含平抛阶段)
 *
 * @param tLocal 周期内局部时间 (s)，范围 [0, 1.5]
 * @param omega 圆盘角速度 (rad/s)
 * @param r0 初始半径 (m)
 * @param mu 摩擦系数
 * @param mass 质量 (kg)
 * @param diskRadius 圆盘物理半径，设为 2.0 m
 * @param g 重力加速度 (m/s²)
 * @returns 实时空间坐标与真实的力大小
 */
export function calculateDiskSlippingState(
  time: number,
  omega: number,
  r0: number,
  mu: number,
  mass: number,
  diskRadius = 2.0,
  g = GRAVITY,
): DiskSlippingState {
  const criticalOmega = Math.sqrt((mu * g) / r0)
  const isSlipping = omega > criticalOmega

  // 若不打滑，做匀速圆周运动
  if (!isSlipping) {
    const phi = omega * time
    const requiredForce = mass * omega * omega * r0
    return {
      x: r0 * Math.cos(phi),
      y: r0 * Math.sin(phi),
      z: 0,
      radius: r0,
      isFlownOut: false,
      gravity: mass * g,
      normalForce: mass * g,
      friction: requiredForce,
      opacity: 1.0,
    }
  }

  // 1. 打滑阶段计算
  // 径向离心加速度近似：a = omega^2 * r0 - mu * g，若太小则赋予一个视觉合理的极小加速度
  const aSlip = Math.max(0.1, omega * omega * r0 - mu * g)
  
  // 算出飞出圆盘的临界时刻 tFly
  // r0 + 0.5 * aSlip * tFly^2 = diskRadius
  const tFly = Math.sqrt(Math.max(0, (2 * (diskRadius - r0)) / aSlip))

  if (time <= tFly) {
    // 还在圆盘上滑动，不透明度保持 1.0
    const rCurrent = r0 + 0.5 * aSlip * time * time
    const phi = omega * time
    return {
      x: rCurrent * Math.cos(phi),
      y: rCurrent * Math.sin(phi),
      z: 0,
      radius: rCurrent,
      isFlownOut: false,
      gravity: mass * g,
      normalForce: mass * g,
      friction: mu * mass * g, // 已经是滑动摩擦力
      opacity: 1.0,
    }
  }

  // 2. 飞出阶段：做切向平抛运动，并在飞出后 1.0s 内逐渐淡出
  const phiFly = omega * tFly
  const xFly = diskRadius * Math.cos(phiFly)
  const yFly = diskRadius * Math.sin(phiFly)

  // 飞出时的速度向量：径向外推速度 + 切向旋转速度
  const vRadial = aSlip * tFly
  const vTangential = omega * diskRadius

  const vxFly = vRadial * Math.cos(phiFly) - vTangential * Math.sin(phiFly)
  const vyFly = vRadial * Math.sin(phiFly) + vTangential * Math.cos(phiFly)

  const dt = time - tFly
  const xCurrent = xFly + vxFly * dt
  const yCurrent = yFly + vyFly * dt
  const zCurrent = -0.5 * g * dt * dt // 自由落体高度下落

  // 飞出后开始淡出
  const opacity = Math.max(0, 1.0 - dt / 1.0)

  return {
    x: xCurrent,
    y: yCurrent,
    z: zCurrent,
    radius: Math.hypot(xCurrent, yCurrent),
    isFlownOut: true,
    gravity: mass * g,
    normalForce: 0, // 飞出后无支持力
    friction: 0,    // 飞出后无摩擦力
    opacity,
  }
}

