import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import {
  calculateMotorCircuit,
  MOTOR_CIRCUIT_CONSTANTS,
  type MotorCircuitResult,
} from '@/physics'
import { MOTOR_LAYOUT } from './layout'

export interface CurrentPulsePoint {
  x: number
  y: number
}

export interface MotorCircuitViewState {
  U: number
  mass: number
  r_M: number
  R_protect: number
  motorState: number
  showEquivalent: boolean
  showForces: boolean
  res: MotorCircuitResult
  rotorAngleDeg: number
  pulleyAngleDeg: number
  rulerPhase: number
  currentPulses: CurrentPulsePoint[]
}

/** 根据矩形周长归一化进度 s ∈ [0, 1) 返回顺时针回路上的坐标点 */
function pointAlongCircuitLoop(s: number): CurrentPulsePoint {
  const { leftX, rightX, topY, bottomY } = MOTOR_LAYOUT.circuit
  const w = rightX - leftX
  const h = bottomY - topY
  const perimeter = 2 * (w + h)
  let d = ((s % 1) + 1) % 1 * perimeter

  // 顶横边：左上 -> 右上（电流从电源正极向左出，经左侧干路向上，顶边向右入电机）
  if (d <= w) return { x: leftX + d, y: topY }
  d -= w
  // 右竖边：右上 -> 右下
  if (d <= h) return { x: rightX, y: topY + d }
  d -= h
  // 底横边：右下 -> 左下
  if (d <= w) return { x: rightX - d, y: bottomY }
  d -= w
  // 左竖边：左下 -> 左上
  return { x: leftX, y: bottomY - d }
}

/** 电动机电路物理状态与动画派生量 Hook */
export function useMotorCircuitPhysics(): MotorCircuitViewState {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)

  const motorState = params.motorState ?? 1
  const U = params.U ?? MOTOR_CIRCUIT_CONSTANTS.defaultU
  const mass = params.mass ?? MOTOR_CIRCUIT_CONSTANTS.defaultMass
  const r_M = params.r_M ?? MOTOR_CIRCUIT_CONSTANTS.defaultRM
  const R_protect = params.R_protect ?? MOTOR_CIRCUIT_CONSTANTS.defaultRProtect
  const showEquivalent = (params.showEquivalent ?? 0) === 1
  const showForces = (params.showForces ?? 1) === 1

  const res = useMemo(
    () =>
      calculateMotorCircuit({
        U,
        R_protect,
        r_M,
        motorState,
        mass,
      }),
    [U, R_protect, r_M, motorState, mass],
  )

  // 转子与滑轮同轴同步转动（ω 单位 rad/s，限制显示视觉上限防频闪）
  const visualDegPerSec = res.isStalled ? 0 : Math.min(720, (res.omega * 180) / Math.PI)
  const rotorAngleDeg = (time * visualDegPerSec) % 360
  const pulleyAngleDeg = rotorAngleDeg

  // 重物标尺滚动相位（仅正常上升时向上卷动，标尺相对向下移动）
  const rulerPhase = res.isStalled ? 0 : (time * res.v_lift * 42) % 16

  // 主回路电流脉冲点（流速与电流 I 严格正相关）
  const currentPulses = useMemo(() => {
    if (!res.valid || res.I <= 0.01) return []
    const pulseCount = 12
    const loopFreq = Math.min(0.9, res.I * 0.085)
    const points: CurrentPulsePoint[] = []
    for (let i = 0; i < pulseCount; i++) {
      const s = (i / pulseCount + time * loopFreq) % 1
      points.push(pointAlongCircuitLoop(s))
    }
    return points
  }, [res.valid, res.I, time])

  return {
    U,
    mass,
    r_M,
    R_protect,
    motorState,
    showEquivalent,
    showForces,
    res,
    rotorAngleDeg,
    pulleyAngleDeg,
    rulerPhase,
    currentPulses,
  }
}
