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
