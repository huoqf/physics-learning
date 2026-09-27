/**
 * 螺线管与线圈磁极判定结果
 */
export interface CoilPolarity {
  /** 左端是否为 N 极 */
  isLeftNorth: boolean
  /** 左端磁极标识 ('N' | 'S' | 'none') */
  leftPole: 'N' | 'S' | 'none'
  /** 右端磁极标识 ('S' | 'N' | 'none') */
  rightPole: 'S' | 'N' | 'none'
  /** 是否存在有效电流 */
  hasCurrent: boolean
}

/**
 * 根据线圈正面向上绕制约定与右手螺旋定则（安培定则），计算通电螺线管/线圈两端的磁极。
 *
 * 绕向与极性约定（本项目 CoilBase / Solenoid / SolenoidFieldLines 统一标准）：
 * - 默认线圈缠绕方向为「正面半环自下向上绕（顺时针视角）」；
 * - current > 0：电流为正向，正面半环电流向上，由右手螺旋定则判定内部磁场向左，故左端为 N 极、右端为 S 极；
 * - current < 0：电流反向，正面半环电流向下，内部磁场向右，左端为 S 极、右端为 N 极；
 * - current === 0：无磁场，两端无极性。
 *
 * ⚠️ 注意：绕向与几何已固化于本函数中。若后续新增反向缠绕的线圈组件，请勿直接复用本函数，或需先对传入电流取反。
 *
 * @param current 电流强度 (A)，正负代表方向
 * @param threshold 零电流判定阈值 (A)，默认 1e-4
 */
export function getCoilPolarity(current: number, threshold = 1e-4): CoilPolarity {
  if (Math.abs(current) < threshold) {
    return {
      isLeftNorth: false,
      leftPole: 'none',
      rightPole: 'none',
      hasCurrent: false,
    }
  }
  const isLeftNorth = current > 0
  return {
    isLeftNorth,
    leftPole: isLeftNorth ? 'N' : 'S',
    rightPole: isLeftNorth ? 'S' : 'N',
    hasCurrent: true,
  }
}
