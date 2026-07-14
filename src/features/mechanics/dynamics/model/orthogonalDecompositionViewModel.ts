import { GRAVITY } from '@/physics/constants'

// ─── 物理坐标系类型（y↑ 正） ───

export interface ForcePhysicsData {
  name: string
  val: number
  angle: number
  color: string
  /** 标准物理分量 (x→, y↑) */
  fx: number
  fy: number
  /** 投影到旋转坐标系的分量 */
  fxPrime: number
  fyPrime: number
  /** 力端点物理坐标（从原点出发） */
  endPhys: { x: number; y: number }
  /** x' 轴投影点物理坐标 */
  xProjPhys: { x: number; y: number }
  /** y' 轴投影点物理坐标 */
  yProjPhys: { x: number; y: number }
}

export interface SlopeForcePhysicsData extends ForcePhysicsData {
  /** 力端点（从 blockCenter 出发） */
  endPhysFromBlock: { x: number; y: number }
  xProjPhysFromBlock: { x: number; y: number }
  yProjPhysFromBlock: { x: number; y: number }
}

export interface SlopeGeometryPhysics {
  /** 斜面左下端点物理坐标 */
  slopeLeftPhys: { x: number; y: number }
  slideW: number
  slideH: number
  inclineLength: number
  /** 斜面三个顶点的物理坐标字符串（逗号分隔） */
  slopePointsPhys: string
  /** 滑块中心物理坐标 */
  blockCenterPhys: { x: number; y: number }
}

export interface OrthogonalDecompositionPhysicsResult {
  mode: number
  /** 原点物理坐标（总是 0,0） */
  originPhys: { x: number; y: number }

  // 模式 0
  forces: ForcePhysicsData[]
  netForce: ForcePhysicsData
  axisAngleRad: number

  // 模式 1
  slopeAngleRad: number
  gravityVal: number
  normalVal: number
  frictionVal: number
  slopeForces: {
    G: SlopeForcePhysicsData
    FN: SlopeForcePhysicsData
    f: SlopeForcePhysicsData
  }
  slopeGeom: SlopeGeometryPhysics
}

// ─── 纯计算函数（无 React/DOM 依赖） ───

function computeForce(
  name: string,
  fVal: number,
  thetaDeg: number,
  color: string,
  axisAngleRad: number,
  originX: number,
  originY: number,
): ForcePhysicsData {
  const rad = (thetaDeg * Math.PI) / 180
  const fx = fVal * Math.cos(rad)
  const fy = fVal * Math.sin(rad)

  const relRad = rad - axisAngleRad
  const fxPrime = fVal * Math.cos(relRad)
  const fyPrime = fVal * Math.sin(relRad)

  // 物理投影坐标转为标准系坐标
  const projX_physX = fxPrime * Math.cos(axisAngleRad)
  const projX_physY = fxPrime * Math.sin(axisAngleRad)
  const projY_physX = -fyPrime * Math.sin(axisAngleRad)
  const projY_physY = fyPrime * Math.cos(axisAngleRad)

  return {
    name,
    val: fVal,
    angle: thetaDeg,
    color,
    fx,
    fy,
    fxPrime,
    fyPrime,
    endPhys: { x: originX + fx, y: originY + fy },
    xProjPhys: { x: originX + projX_physX, y: originY + projX_physY },
    yProjPhys: { x: originX + projY_physX, y: originY + projY_physY },
  }
}

function computeSlopeForce(
  name: string,
  fVal: number,
  thetaDeg: number,
  color: string,
  axisAngleRad: number,
  blockCenterPhys: { x: number; y: number },
): SlopeForcePhysicsData {
  const rad = (thetaDeg * Math.PI) / 180
  const fx = fVal * Math.cos(rad)
  const fy = fVal * Math.sin(rad)

  const relRad = rad - axisAngleRad
  const fxPrime = fVal * Math.cos(relRad)
  const fyPrime = fVal * Math.sin(relRad)

  const projX_physX = fxPrime * Math.cos(axisAngleRad)
  const projX_physY = fxPrime * Math.sin(axisAngleRad)
  const projY_physX = -fyPrime * Math.sin(axisAngleRad)
  const projY_physY = fyPrime * Math.cos(axisAngleRad)

  const endPhysFromBlock = { x: blockCenterPhys.x + fx, y: blockCenterPhys.y + fy }
  const xProjPhysFromBlock = { x: blockCenterPhys.x + projX_physX, y: blockCenterPhys.y + projX_physY }
  const yProjPhysFromBlock = { x: blockCenterPhys.x + projY_physX, y: blockCenterPhys.y + projY_physY }

  return {
    name,
    val: fVal,
    angle: thetaDeg,
    color,
    fx,
    fy,
    fxPrime,
    fyPrime,
    endPhys: { x: fx, y: fy },
    xProjPhys: { x: projX_physX, y: projX_physY },
    yProjPhys: { x: projY_physX, y: projY_physY },
    endPhysFromBlock,
    xProjPhysFromBlock,
    yProjPhysFromBlock,
  }
}

export interface ComputeOrthogonalDecompositionParams {
  // 模式 0
  f1: number
  theta1: number
  f2: number
  theta2: number
  f3: number
  theta3: number
  axisAngle: number

  // 模式 1
  theta: number
  m: number
  axisSelect: number

  mode: number
}

/**
 * 纯函数：计算正交分解的物理数据。
 * 返回物理坐标系（y↑ 正）下的所有力分量、投影和几何数据。
 * 不涉及 Canvas/SVG 坐标映射。
 */
export function computeOrthogonalDecomposition({
  f1, theta1, f2, theta2, f3, theta3, axisAngle,
  theta, m, axisSelect,
  mode,
}: ComputeOrthogonalDecompositionParams): OrthogonalDecompositionPhysicsResult {
  const axisAngleRad = (axisAngle * Math.PI) / 180

  // 原点在物理坐标系中总是 (0, 0)
  const originPhys = { x: 0, y: 0 }

  // ==========================================
  // 模式 0：多力合成与建系优化
  // ==========================================
  const F1 = computeForce('F₁', f1, theta1, '', axisAngleRad, 0, 0)
  const F2 = computeForce('F₂', f2, theta2, '', axisAngleRad, 0, 0)
  const F3 = computeForce('F₃', f3, theta3, '', axisAngleRad, 0, 0)

  const netFx = F1.fx + F2.fx + F3.fx
  const netFy = F1.fy + F2.fy + F3.fy
  const netVal = Math.sqrt(netFx * netFx + netFy * netFy)
  let netAngle = (Math.atan2(netFy, netFx) * 180) / Math.PI
  if (netAngle < 0) netAngle += 360

  const netFxPrime = F1.fxPrime + F2.fxPrime + F3.fxPrime
  const netFyPrime = F1.fyPrime + F2.fyPrime + F3.fyPrime

  const netRad = (netAngle * Math.PI) / 180
  const netFxPhys = netVal * Math.cos(netRad)
  const netFyPhys = netVal * Math.sin(netRad)
  const netFxPrimePhys = netVal * Math.cos(netRad - axisAngleRad)
  const netFyPrimePhys = netVal * Math.sin(netRad - axisAngleRad)

  const projNetX_physX = netFxPrimePhys * Math.cos(axisAngleRad)
  const projNetX_physY = netFxPrimePhys * Math.sin(axisAngleRad)
  const projNetY_physX = -netFyPrimePhys * Math.sin(axisAngleRad)
  const projNetY_physY = netFyPrimePhys * Math.cos(axisAngleRad)

  const netForce: ForcePhysicsData = {
    name: 'F合',
    val: netVal,
    angle: netAngle,
    color: '',
    fx: netFx,
    fy: netFy,
    fxPrime: netFxPrime,
    fyPrime: netFyPrime,
    endPhys: { x: netFxPhys, y: netFyPhys },
    xProjPhys: { x: projNetX_physX, y: projNetX_physY },
    yProjPhys: { x: projNetY_physX, y: projNetY_physY },
  }

  // ==========================================
  // 模式 1：斜面平衡建系对比
  // ==========================================
  const slopeAngleRad = (theta * Math.PI) / 180
  const gravityVal = m * GRAVITY
  const normalVal = gravityVal * Math.cos(slopeAngleRad)
  const frictionVal = gravityVal * Math.sin(slopeAngleRad)

  const BLOCK_CENTER_PHYS = { x: -2, y: 1 } as const
  const blockCenterPhys = BLOCK_CENTER_PHYS

  const currentAxisAngle = axisSelect === 0 ? -theta : 0
  const currentAxisAngleRad = (currentAxisAngle * Math.PI) / 180

  // 斜面几何（物理坐标）
  const INCLINE_PHYSICAL_LENGTH = 12
  const inclineLength = INCLINE_PHYSICAL_LENGTH
  const slideW = inclineLength * Math.cos(slopeAngleRad)
  const slideH = inclineLength * Math.sin(slopeAngleRad)

  // 滑块半高对应的物理偏移（防止穿透斜面）
  const BLOCK_HALF_HEIGHT_PX = 18
  const scale = 1 // 此处仅用于物理计算，实际 scale 由 hook 传入
  const blockHalfHeightPhys = BLOCK_HALF_HEIGHT_PX / scale
  const verticalOffset = blockHalfHeightPhys / Math.cos(slopeAngleRad)

  const slopeLeftPhys = {
    x: blockCenterPhys.x - (inclineLength / 2) * Math.cos(slopeAngleRad),
    y: blockCenterPhys.y - (inclineLength / 2) * Math.sin(slopeAngleRad) - verticalOffset,
  }
  const slopePointsPhys = `${slopeLeftPhys.x},${slopeLeftPhys.y} ${slopeLeftPhys.x + slideW},${slopeLeftPhys.y} ${slopeLeftPhys.x},${slopeLeftPhys.y + slideH} ${slopeLeftPhys.x},${slopeLeftPhys.y}`

  const thetaG = 270
  const thetaFN = 90 - theta
  const thetaF = 180 - theta

  const G = computeSlopeForce('G', gravityVal, thetaG, '', currentAxisAngleRad, blockCenterPhys)
  const FN = computeSlopeForce('FN', normalVal, thetaFN, '', currentAxisAngleRad, blockCenterPhys)
  const f = computeSlopeForce('f', frictionVal, thetaF, '', currentAxisAngleRad, blockCenterPhys)

  return {
    mode,
    originPhys,
    forces: [F1, F2, F3],
    netForce,
    axisAngleRad,
    slopeAngleRad,
    gravityVal,
    normalVal,
    frictionVal,
    slopeForces: { G, FN, f },
    slopeGeom: {
      slopeLeftPhys,
      slideW,
      slideH,
      inclineLength,
      slopePointsPhys,
      blockCenterPhys,
    },
  }
}
