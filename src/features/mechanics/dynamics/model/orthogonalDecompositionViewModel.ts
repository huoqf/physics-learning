import {
  computeInclineEquilibrium,
  decomposeForce,
  sumForces,
} from '@/physics/orthogonalDecomposition'

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
  // 分解与投影全部来自物理层，中屏与右屏看板同一实现
  const { fx, fy, fxPrime, fyPrime, projX, projY } = decomposeForce(
    fVal,
    thetaDeg,
    axisAngleRad,
  )

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
    xProjPhys: { x: originX + projX.x, y: originY + projX.y },
    yProjPhys: { x: originX + projY.x, y: originY + projY.y },
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
  const { fx, fy, fxPrime, fyPrime, projX, projY } = decomposeForce(
    fVal,
    thetaDeg,
    axisAngleRad,
  )

  const endPhysFromBlock = { x: blockCenterPhys.x + fx, y: blockCenterPhys.y + fy }
  const xProjPhysFromBlock = {
    x: blockCenterPhys.x + projX.x,
    y: blockCenterPhys.y + projX.y,
  }
  const yProjPhysFromBlock = {
    x: blockCenterPhys.x + projY.x,
    y: blockCenterPhys.y + projY.y,
  }

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
    xProjPhys: { x: projX.x, y: projX.y },
    yProjPhys: { x: projY.x, y: projY.y },
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

  // 合力：角量与分解都由物理层给出，避免"先算大小再反推分量"多写一遍三角
  const resultant = sumForces(
    [
      { F: f1, thetaDeg: theta1 },
      { F: f2, thetaDeg: theta2 },
      { F: f3, thetaDeg: theta3 },
    ],
    axisAngleRad,
  )
  const netFx = resultant.netX
  const netFy = resultant.netY
  const netVal = resultant.magnitude
  const netAngle = resultant.angleDeg
  const netFxPrime = resultant.sumFxPrime
  const netFyPrime = resultant.sumFyPrime

  // 合力自身在旋转坐标系下的分解（用于画投影虚线）
  const netDecomposed = decomposeForce(netVal, netAngle, axisAngleRad)

  const netForce: ForcePhysicsData = {
    name: 'F合',
    val: netVal,
    angle: netAngle,
    color: '',
    fx: netFx,
    fy: netFy,
    fxPrime: netFxPrime,
    fyPrime: netFyPrime,
    endPhys: { x: netFx, y: netFy },
    xProjPhys: { x: netDecomposed.projX.x, y: netDecomposed.projX.y },
    yProjPhys: { x: netDecomposed.projY.x, y: netDecomposed.projY.y },
  }

  // ==========================================
  // 模式 1：斜面平衡建系对比
  // ==========================================
  const slopeAngleRad = (theta * Math.PI) / 180
  // 三力大小由物理层给出（与右屏看板同一实现）
  const { gravity: gravityVal, normal: normalVal, friction: frictionVal } =
    computeInclineEquilibrium(m, slopeAngleRad)

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
