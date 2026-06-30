import { useMemo, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useShallow } from 'zustand/react/shallow'
import { precomputeLightRodRopeTrajectory, getLRRStateAtTime } from '@/physics/lightRodRope'
import type { LRRModelState } from '@/physics/lightRodRope'
import { GRAVITY } from '@/physics/constants'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'

const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 420
const T_MAX = 6
const FORCE_DRAW_SCALE = 2.5

export interface LightRodRopeParams {
  m1: number
  m2: number
  constraint: number
  L: number
  g: number
  showParticles: boolean
  theta0: number
  v0: number
  showGravity: boolean
  showTension: boolean
  showResolution: boolean
  showVelocityDecomp: boolean
}

export interface LightRodRopeLayout {
  pivotX: number
  pivotY: number
  L_pix: number
  R_p: number
  x_A: number
  y_A: number
  x_B: number
  y_B: number
  x_start_A: number
  y_start_A: number
  x_start_B: number
  y_start_B: number
  curHB: number
  curThetaB: number
}

export interface LightRodRopeForceVectors {
  F_A_radial: { x: number; y: number }
  F_A_tangential: { x: number; y: number }
  mag_F_A: number
  mag_F_A_rad: number
  mag_F_A_tan: number
  x_A_total: number
  y_A_total: number
  x_A_rad: number
  y_A_rad: number
  x_A_tan: number
  y_A_tan: number
  F_B_radial: { x: number; y: number }
  F_B_tangential: { x: number; y: number }
  mag_F_B: number
  mag_F_B_rad: number
  mag_F_B_tan: number
  x_B_total: number
  y_B_total: number
  x_B_rad: number
  y_B_rad: number
  x_B_tan: number
  y_B_tan: number
}

export interface LightRodRopeChartData {
  et1: { x: number; y: number }[]
  et2: { x: number; y: number }[]
  etot: { x: number; y: number }[]
  pt1: { x: number; y: number }[]
  pt2: { x: number; y: number }[]
  vHA: { x: number; y: number }[]
  vHB: { x: number; y: number }[]
  tTheta: { x: number; y: number }[]
  vAt: { x: number; y: number }[]
  vBt: { x: number; y: number }[]
  tOA: { x: number; y: number }[]
  tAB: { x: number; y: number }[]
}

export interface LightRodRopeChartMarker {
  axis: 'point' | 'vertical' | 'horizontal'
  x: number
  label: string
  color: string
}

export interface LightRodRopeParticle {
  x: number
  y: number
}

export interface UseLightRodRopePhysicsResult {
  params: LightRodRopeParams
  time: number
  trajectory: LRRModelState[]
  state: LRRModelState
  tEnd: number
  P_max: number
  E_max: number
  hasCollisionRecent: boolean
  chartMarkers: LightRodRopeChartMarker[]
  particles: LightRodRopeParticle[]
  layout: LightRodRopeLayout
  forceVectors: LightRodRopeForceVectors
  chartsData: LightRodRopeChartData
  vp: ReturnType<typeof useViewport>
  canvasSize: ReturnType<typeof useCanvasSize>[1]
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useLightRodRopePhysics(): UseLightRodRopePhysicsResult {
  const { params, time, setTime, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      setTime: s.setTime,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  })

  // 参数提取
  const m1 = params.m1 ?? 1.0
  const m2 = params.m2 ?? 1.0
  const constraint = params.constraint ?? 0
  const L = constraint === 0 ? (params.L ?? 1.2) : 1.2
  const g = GRAVITY
  const showParticles = params.showParticles !== 0
  const theta0 = params.theta0 ?? 30
  const v0 = params.v0 ?? 0.0
  const showGravity = params.showGravity !== 0
  const showTension = params.showTension !== 0
  const showResolution = params.showResolution !== 0
  const showVelocityDecomp = constraint === 2 && params.showVelocityDecomp !== 0

  const theta0Rad = useMemo(() => ((90 - theta0) * Math.PI) / 180, [theta0])

  // 预计算物理轨迹
  const trajectory = useMemo(() => {
    return precomputeLightRodRopeTrajectory(m1, m2, L, g, constraint, T_MAX, 0.02, theta0Rad, v0)
  }, [m1, m2, L, g, constraint, theta0Rad, v0])

  // 当前时刻插值状态
  const state = useMemo(() => {
    return getLRRStateAtTime(trajectory, time)
  }, [trajectory, time])

  // 动画阶段截断拦截
  const tEnd = useMemo(() => {
    if (trajectory.length === 0) return 0
    return trajectory[trajectory.length - 1].t
  }, [trajectory])

  useEffect(() => {
    if (time >= tEnd && tEnd > 0) {
      setTime(tEnd)
      setIsPlaying(false)
    }
  }, [time, tEnd, setTime, setIsPlaying])

  // 布局像素计算
  const pivotX = 180
  const pivotY = 166
  const L_pix = L * 180
  const R_p = 12

  const x_A = constraint === 1 ? pivotX - R_p : pivotX + state.x_A_rel * 180
  const y_A = pivotY + state.y_A_rel * 180
  const x_B = pivotX + state.x_B_rel * 180
  const y_B = pivotY + state.y_B_rel * 180

  const thetaB_val = state.thetaB
  const x_start_A = constraint === 1 ? pivotX - R_p : pivotX
  const y_start_A = pivotY
  const x_start_B = constraint === 1 ? pivotX + R_p * Math.sin(thetaB_val) : pivotX
  const y_start_B = constraint === 1 ? pivotY - R_p * Math.cos(thetaB_val) : pivotY

  const yB0 = useMemo(() => trajectory[0]?.y_B_rel ?? 0, [trajectory])
  const curHB = Math.max(0, state.y_B_rel - yB0)
  const curThetaB = Math.abs(90 - (state.thetaB * 180) / Math.PI)

  // 图表数据
  const chartsData = useMemo(() => {
    const et1: { x: number; y: number }[] = []
    const et2: { x: number; y: number }[] = []
    const etot: { x: number; y: number }[] = []
    const pt1: { x: number; y: number }[] = []
    const pt2: { x: number; y: number }[] = []
    const vHA: { x: number; y: number }[] = []
    const vHB: { x: number; y: number }[] = []
    const tTheta: { x: number; y: number }[] = []
    const vAt: { x: number; y: number }[] = []
    const vBt: { x: number; y: number }[] = []
    const tOA: { x: number; y: number }[] = []
    const tAB: { x: number; y: number }[] = []

    trajectory.forEach((pt) => {
      et1.push({ x: pt.t, y: pt.EA })
      et2.push({ x: pt.t, y: pt.EB })
      etot.push({ x: pt.t, y: pt.Etot })
      pt1.push({ x: pt.t, y: pt.powerA })
      pt2.push({ x: pt.t, y: pt.powerB })
      vHA.push({ x: Math.max(0, pt.y_B_rel - yB0), y: pt.vA })
      vHB.push({ x: Math.max(0, pt.y_B_rel - yB0), y: pt.vB })
      tTheta.push({ x: Math.abs(90 - (pt.thetaB * 180) / Math.PI), y: pt.T_B })
      vAt.push({ x: pt.t, y: pt.vA })
      vBt.push({ x: pt.t, y: pt.vB })
      tOA.push({ x: pt.t, y: pt.T_A })
      tAB.push({ x: pt.t, y: pt.T_B })
    })

    return { et1, et2, etot, pt1, pt2, vHA, vHB, tTheta, vAt, vBt, tOA, tAB }
  }, [trajectory, yB0])

  // 功率轴最大值
  const P_max = useMemo(() => {
    let maxVal = 0.1
    trajectory.forEach((pt) => {
      const absP = Math.abs(pt.powerB)
      if (absP > maxVal) {
        maxVal = absP
      }
    })
    return maxVal * 1.35
  }, [trajectory])

  // 能量范围
  const E_max = (trajectory[0]?.Etot ?? 1.0) * 1.35

  // 碰撞闪烁判定
  const hasCollisionRecent = useMemo(() => {
    if (constraint !== 2) return false
    const idx = trajectory.findIndex((pt) => pt.t <= time && pt.t > time - 0.15)
    if (idx !== -1 && trajectory[idx].eventB === 'tension') {
      return true
    }
    return false
  }, [trajectory, time, constraint])

  // 图表 markers
  const chartMarkers = useMemo(() => {
    if (constraint !== 2) return []
    const list: LightRodRopeChartMarker[] = []
    trajectory.forEach((pt) => {
      if (pt.eventB === 'tension') {
        list.push({
          axis: 'vertical',
          x: pt.t,
          label: '绳拉直',
          color: PHYSICS_COLORS.alertRed,
        })
      } else if (pt.eventB === 'slack') {
        list.push({
          axis: 'vertical',
          x: pt.t,
          label: '绳松弛',
          color: PHYSICS_COLORS.secantLine,
        })
      }
    })
    return list
  }, [trajectory, constraint])

  // 能量传输粒子
  const particles = useMemo(() => {
    if (constraint !== 0 || !showParticles || Math.abs(state.powerB) <= 0.05) return []
    const list: LightRodRopeParticle[] = []
    const dx = x_B - x_A
    const dy = y_B - y_A
    const isForward = state.powerB > 0
    for (let i = 0; i < 5; i++) {
      const progress = (time * 2.5 + i * 0.2) % 1.0
      const offsetRatio = isForward ? progress : 1.0 - progress
      list.push({
        x: x_A + dx * offsetRatio,
        y: y_A + dy * offsetRatio,
      })
    }
    return list
  }, [constraint, showParticles, time, x_A, y_A, x_B, y_B, state.powerB])

  // 受力分解坐标
  const F_A_radial = state.F_A_radial ?? { x: 0, y: 0 }
  const F_A_tangential = state.F_A_tangential ?? { x: 0, y: 0 }
  const mag_F_A = Math.sqrt(state.F_A.x * state.F_A.x + state.F_A.y * state.F_A.y)
  const mag_F_A_rad = Math.sqrt(F_A_radial.x * F_A_radial.x + F_A_radial.y * F_A_radial.y)
  const mag_F_A_tan = Math.sqrt(F_A_tangential.x * F_A_tangential.x + F_A_tangential.y * F_A_tangential.y)

  const x_A_total = x_A + state.F_A.x * FORCE_DRAW_SCALE
  const y_A_total = y_A - state.F_A.y * FORCE_DRAW_SCALE
  const x_A_rad = x_A + F_A_radial.x * FORCE_DRAW_SCALE
  const y_A_rad = y_A - F_A_radial.y * FORCE_DRAW_SCALE
  const x_A_tan = x_A + F_A_tangential.x * FORCE_DRAW_SCALE
  const y_A_tan = y_A - F_A_tangential.y * FORCE_DRAW_SCALE

  const F_B_radial = state.F_B_radial ?? { x: 0, y: 0 }
  const F_B_tangential = state.F_B_tangential ?? { x: 0, y: 0 }
  const mag_F_B = Math.sqrt(state.F_B.x * state.F_B.x + state.F_B.y * state.F_B.y)
  const mag_F_B_rad = Math.sqrt(F_B_radial.x * F_B_radial.x + F_B_radial.y * F_B_radial.y)
  const mag_F_B_tan = Math.sqrt(F_B_tangential.x * F_B_tangential.x + F_B_tangential.y * F_B_tangential.y)

  const x_B_total = x_B + state.F_B.x * FORCE_DRAW_SCALE
  const y_B_total = y_B - state.F_B.y * FORCE_DRAW_SCALE
  const x_B_rad = x_B + F_B_radial.x * FORCE_DRAW_SCALE
  const y_B_rad = y_B - F_B_radial.y * FORCE_DRAW_SCALE
  const x_B_tan = x_B + F_B_tangential.x * FORCE_DRAW_SCALE
  const y_B_tan = y_B - F_B_tangential.y * FORCE_DRAW_SCALE

  return {
    params: {
      m1,
      m2,
      constraint,
      L,
      g,
      showParticles,
      theta0,
      v0,
      showGravity,
      showTension,
      showResolution,
      showVelocityDecomp,
    },
    time,
    trajectory,
    state,
    tEnd,
    P_max,
    E_max,
    hasCollisionRecent,
    chartMarkers,
    particles,
    layout: {
      pivotX,
      pivotY,
      L_pix,
      R_p,
      x_A,
      y_A,
      x_B,
      y_B,
      x_start_A,
      y_start_A,
      x_start_B,
      y_start_B,
      curHB,
      curThetaB,
    },
    forceVectors: {
      F_A_radial,
      F_A_tangential,
      mag_F_A,
      mag_F_A_rad,
      mag_F_A_tan,
      x_A_total,
      y_A_total,
      x_A_rad,
      y_A_rad,
      x_A_tan,
      y_A_tan,
      F_B_radial,
      F_B_tangential,
      mag_F_B,
      mag_F_B_rad,
      mag_F_B_tan,
      x_B_total,
      y_B_total,
      x_B_rad,
      y_B_rad,
      x_B_tan,
      y_B_tan,
    },
    chartsData,
    vp,
    canvasSize,
    containerRef,
  }
}
