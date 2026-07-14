import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { GRAVITY } from '@/physics/constants'

export interface SystemIsolatedPhysicsResult {
  // 视口与尺寸
  vp: ReturnType<typeof useAnimationViewport>['vp']
  canvasSize: ReturnType<typeof useAnimationViewport>['canvasSize']
  containerRef: ReturnType<typeof useAnimationViewport>['containerRef']
  font: (size: number) => number
  animWidth: number
  animHeight: number
  sceneScale: ReturnType<typeof useSceneScale>

  // 物理参数
  modelType: number
  analysisView: number
  activeObject: number
  m1: number
  m2: number
  F: number
  theta: number
  mu: number
  time: number
  isPlaying: boolean

  // 计算中间态
  g: number
  thetaRad: number
  groundY: number // 物理 groundY

  // 场景元素位置与力
  model0: {
    w1: number
    h1: number
    w2: number
    h2: number
    m1_pos: { x: number; y: number }
    m2_pos: { x: number; y: number }
    ropeLeft: { x: number; y: number }
    ropeRight: { x: number; y: number }
    a: number
    T: number
    f1: number
    f2: number
    isMoving: boolean
  }
  model1: {
    w_block: number
    h_block: number
    slope_W: number
    slope_H: number
    slope_left_x: number
    slope_right_x: number
    block_pos: { x: number; y: number }
    N_slope: number
    f_slope: number
    N_ground: number
    f_ground: number
  }
  model2: {
    w_block: number
    h_block: number
    slope_W: number
    slope_H: number
    slope_left_x: number
    slope_right_x: number
    block_pos: { x: number; y: number }
    a: number
    ax: number
    ay: number
    N_slope: number
    f_slope: number
    N_ground: number
    f_ground: number
    isMoving: boolean
  }
}

export function useSystemIsolatedPhysics(): SystemIsolatedPhysicsResult {
  const { params, time, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
    }))
  )

  // 严格采用中屏上下分区布局预设 splitV
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const {
    modelType = 0,
    analysisView = 0,
    activeObject = 0,
    m1 = 2,
    m2 = 4,
    F = 15,
    theta = 30,
    mu = 0.15,
  } = params

  const g = GRAVITY
  const thetaRad = (theta * Math.PI) / 180

  // 1. 建立符合最新架构铁律的物理比例尺 (物理空间 x: 0..12, y: 0..8 米)
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: 12,
    physicsHeight: 8,
  })

  const groundY = 1.6 // 地面的物理高度 (m)

  // ------------------ 模型 0: 同加速连接体 (拉车) ------------------
  const model0 = useMemo(() => {
    const w1 = 0.8
    const h1 = 0.8
    const w2 = 0.8
    const h2 = 0.8
    const ropeL = 1.5
    const startX = 2.0

    const f1Max = mu * m1 * g
    const f2Max = mu * m2 * g
    const totalFrictionMax = f1Max + f2Max
    const isMovingPhysically = F > totalFrictionMax

    const a = isMovingPhysically ? (F - totalFrictionMax) / (m1 + m2) : 0
    const T = isMovingPhysically ? (m1 * F) / (m1 + m2) : (m1 / (m1 + m2)) * F

    // 计算当前物理位移
    const maxTravel = 5.0
    const rawDisplacement = 0.5 * a * (time ** 2)
    const displacement = Math.min(rawDisplacement, maxTravel)
    const isMoving = isPlaying && time > 0 && rawDisplacement < maxTravel && isMovingPhysically

    const m1_pos = { x: startX + displacement, y: groundY }
    const m2_pos = { x: m1_pos.x + w1 + ropeL, y: groundY }

    return {
      w1,
      h1,
      w2,
      h2,
      m1_pos,
      m2_pos,
      ropeLeft: { x: m1_pos.x + w1, y: groundY + h1 / 2 },
      ropeRight: { x: m2_pos.x, y: groundY + h2 / 2 },
      a,
      T,
      f1: f1Max,
      f2: f2Max,
      isMoving,
    }
  }, [m1, m2, F, mu, g, time, isPlaying])

  // ------------------ 模型 1: 静力学叠放平衡 (推斜面) ------------------
  const model1 = useMemo(() => {
    const w_block = 0.6
    const h_block = 0.6
    const slope_W = 3.6
    const slope_H = slope_W * Math.tan(thetaRad)

    // 斜面左下角固定在 5.0m，右下角在 5.0 + slope_W
    const slope_left_x = 5.0
    const slope_right_x = slope_left_x + slope_W

    // 滑块叠放在斜坡正中央 (斜边长度一半位置)
    const L_slope = slope_W / Math.cos(thetaRad)
    const s_center = L_slope / 2

    // 相对顶点的偏移量
    const relX = s_center * Math.cos(thetaRad)
    const relY = s_center * Math.sin(thetaRad)

    // 考虑滑块贴在斜坡表面，将滑块垂直斜坡斜向上平移半高度
    const block_center_physics = {
      x: slope_left_x + relX + (h_block / 2) * Math.sin(thetaRad),
      y: groundY + slope_H - relY + (h_block / 2) * Math.cos(thetaRad),
    }

    const N_slope = m1 * g * Math.cos(thetaRad)
    const f_slope = m1 * g * Math.sin(thetaRad)
    const N_ground = (m1 + m2) * g
    const f_ground = F

    return {
      w_block,
      h_block,
      slope_W,
      slope_H,
      slope_left_x,
      slope_right_x,
      block_pos: block_center_physics,
      N_slope,
      f_slope,
      N_ground,
      f_ground,
    }
  }, [m1, m2, F, thetaRad, g])

  // ------------------ 模型 2: 系统牛顿第二定律 (斜面下滑) ------------------
  const model2 = useMemo(() => {
    const w_block = 0.6
    const h_block = 0.6
    const slope_W = 3.6
    const slope_H = slope_W * Math.tan(thetaRad)

    const slope_left_x = 5.0
    const slope_right_x = slope_left_x + slope_W

    const L_slope = slope_W / Math.cos(thetaRad)

    // 滑动条件：sin(theta) > mu * cos(theta)
    const hasMotion = Math.sin(thetaRad) > mu * Math.cos(thetaRad)
    const a = hasMotion ? g * (Math.sin(thetaRad) - mu * Math.cos(thetaRad)) : 0
    const ax = a * Math.cos(thetaRad)
    const ay = a * Math.sin(thetaRad)

    // 滑块从左上顶端 (s=0) 滑到右下底端 (s = L_slope - 边缘留白)
    const margin = 0.5
    const maxTravel = L_slope - margin
    const rawTravel = time > 0 ? 0.5 * a * (time ** 2) : 0
    const travel = Math.min(rawTravel, maxTravel)
    const isMoving = isPlaying && time > 0 && rawTravel < maxTravel && hasMotion

    // 顶点出发，向右下运动，沿斜面坐标变化
    // 顶点物理位置 (顶端留出少许余量)
    const topX = slope_left_x + margin * Math.cos(thetaRad)
    const topY = groundY + slope_H - margin * Math.sin(thetaRad)

    // 滑块中心位置 (顶端出发，向右下移动)
    const blockX = topX + travel * Math.cos(thetaRad) + (h_block / 2) * Math.sin(thetaRad)
    const blockY = topY - travel * Math.sin(thetaRad) + (h_block / 2) * Math.cos(thetaRad)

    // 受力大小
    const N_slope = m1 * g * Math.cos(thetaRad)
    const f_slope = hasMotion ? mu * m1 * g * Math.cos(thetaRad) : m1 * g * Math.sin(thetaRad)
    const f_ground = m1 * ax
    const N_ground = (m1 + m2) * g - m1 * ay

    return {
      w_block,
      h_block,
      slope_W,
      slope_H,
      slope_left_x,
      slope_right_x,
      block_pos: { x: blockX, y: blockY },
      a,
      ax,
      ay,
      N_slope,
      f_slope,
      N_ground,
      f_ground,
      isMoving,
    }
  }, [m1, m2, mu, thetaRad, g, time, isPlaying])

  return {
    vp,
    canvasSize,
    containerRef,
    font,
    animWidth: vp.visibleW,
    animHeight: vp.visibleH,
    sceneScale,

    modelType,
    analysisView,
    activeObject,
    m1,
    m2,
    F,
    theta,
    mu,
    time,
    isPlaying,

    g,
    thetaRad,
    groundY,

    model0,
    model1,
    model2,
  }
}
