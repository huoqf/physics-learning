/**
 * @file src/physics/orthogonalDecomposition.ts
 * 正交分解 / 建系优化（anim-orthogonal-decomposition）纯物理计算模块。
 *
 * 单一真源：中屏 `model/orthogonalDecompositionViewModel.ts` 与右屏
 * `data/quantities/dynamics/orthogonalDecomposition.ts` 都从这里取分解结果。
 * 此前两侧各写一份 `fx/fy/fx′/fy′/投影` 的三角计算，viewModel 内部还把同一段
 * 抄了两遍（computeForce 与 computeSlopeForce），斜面模式又各自 `m*g·cos/sin`。
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（N, kg, m/s²），角度入参为「度」，内部转弧度。
 */

import { GRAVITY } from './constants'

/** 一个平面内力矢量：大小 (N) + 与 +x 轴夹角（度，逆时针为正） */
export interface ForceVector {
  /** 力的大小 (N) */
  F: number
  /** 与 +x 轴夹角（度） */
  thetaDeg: number
}

/** 单个力在「原坐标系」与「旋转后坐标系」下的分量及投影矢量 */
export interface ForceComponents {
  /** 原 x 轴分量 (N) */
  fx: number
  /** 原 y 轴分量 (N) */
  fy: number
  /** 旋转坐标系 x′ 轴分量 (N) */
  fxPrime: number
  /** 旋转坐标系 y′ 轴分量 (N) */
  fyPrime: number
  /** Fx′ 在物理坐标系中的矢量（以力的作用点为原点） */
  projX: { x: number; y: number }
  /** Fy′ 在物理坐标系中的矢量（以力的作用点为原点） */
  projY: { x: number; y: number }
}

/** 多力合成的结果 */
export interface ForceResultant {
  /** 合力在原坐标系的 x 分量 (N) */
  netX: number
  /** 合力在原坐标系的 y 分量 (N) */
  netY: number
  /** 合力大小 (N) */
  magnitude: number
  /** 合力方向（度，0~360） */
  angleDeg: number
  /** 旋转坐标系下各力 x′ 分量之代数和 (N) */
  sumFxPrime: number
  /** 旋转坐标系下各力 y′ 分量之代数和 (N) */
  sumFyPrime: number
}

/** 滑块在斜面上静止时的三个力（重力 / 支持力 / 静摩擦力） */
export interface InclineEquilibrium {
  /** 重力大小 mg (N) */
  gravity: number
  /** 斜面对滑块的支持力 N = mg·cosθ (N) */
  normal: number
  /** 沿斜面向上的静摩擦力 f = mg·sinθ (N) */
  friction: number
}

const toRad = (deg: number) => (deg * Math.PI) / 180

/**
 * 把一个力分解到原坐标系与「旋转 axisAngleRad 后的坐标系」。
 *
 * 投影矢量按旋转基给出：x̂′ = (cosφ, sinφ)，ŷ′ = (−sinφ, cosφ)。
 *
 * @param fVal 力的大小 (N)
 * @param thetaDeg 力的方向（度，相对 +x 轴）
 * @param axisAngleRad 坐标系旋转角 (rad)，逆时针为正
 */
export function decomposeForce(
  fVal: number,
  thetaDeg: number,
  axisAngleRad: number,
): ForceComponents {
  const rad = toRad(thetaDeg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const relRad = rad - axisAngleRad
  const fxPrime = fVal * Math.cos(relRad)
  const fyPrime = fVal * Math.sin(relRad)

  const axisCos = Math.cos(axisAngleRad)
  const axisSin = Math.sin(axisAngleRad)

  return {
    fx: fVal * cos,
    fy: fVal * sin,
    fxPrime,
    fyPrime,
    // Fx′ 沿 x̂′ 方向
    projX: { x: fxPrime * axisCos, y: fxPrime * axisSin },
    // Fy′ 沿 ŷ′ 方向（垂直于 x̂′，逆时针 90°）
    projY: { x: -fyPrime * axisSin, y: fyPrime * axisCos },
  }
}

/**
 * 多力合成：同时给出原坐标系合力与旋转坐标系下的代数和。
 *
 * 两种口径的合力大小必然相同（旋转不改变矢量长度），右屏公式
 * `F_net = √(ΣFx′² + ΣFy′²)` 与本函数返回的 `magnitude` 一致。
 *
 * @param forces 力列表
 * @param axisAngleRad 坐标系旋转角 (rad)
 */
export function sumForces(forces: ForceVector[], axisAngleRad: number): ForceResultant {
  let netX = 0
  let netY = 0
  let sumFxPrime = 0
  let sumFyPrime = 0

  for (const { F, thetaDeg } of forces) {
    const c = decomposeForce(F, thetaDeg, axisAngleRad)
    netX += c.fx
    netY += c.fy
    sumFxPrime += c.fxPrime
    sumFyPrime += c.fyPrime
  }

  // atan2 归一到 0~360，避免看板出现负角度
  let angleDeg = (Math.atan2(netY, netX) * 180) / Math.PI
  if (angleDeg < 0) angleDeg += 360

  return {
    netX,
    netY,
    magnitude: Math.hypot(netX, netY),
    angleDeg,
    sumFxPrime,
    sumFyPrime,
  }
}

/**
 * 滑块在斜面上静止时的三个力（正交分解教学基准场景）。
 *
 * @param m 滑块质量 (kg)
 * @param thetaRad 斜面倾角 (rad)
 * @param g 重力加速度 (m/s²)，默认取物理层常量
 */
export function computeInclineEquilibrium(
  m: number,
  thetaRad: number,
  g: number = GRAVITY,
): InclineEquilibrium {
  const gravity = m * g
  return {
    gravity,
    normal: gravity * Math.cos(thetaRad),
    friction: gravity * Math.sin(thetaRad),
  }
}
