import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { GRAVITY } from '@/physics/constants'
import { refFromPeak } from '@/utils/vectorRefs'

/**
 * 场景几何（物理米）—— 三个模型与画布量程共用同一份定义。
 *
 * 画布量程必须由这里的斜面高度推导（见下方「等比锁定」），
 * 若量程另写一份常量，一旦斜面尺寸变化，顶部的箭头就会被裁到画面外。
 */
const SCENE_GEOM = {
  /** 地面高度（物理米，y 轴向上） */
  groundY: 1.6,
  /** 斜面水平投影宽度 */
  slopeWidth: 3.6,
  /** 斜面滑块边长 */
  blockSize: 0.6,
} as const

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

  /**
   * 力矢量基准（N）——「单滑杆极值扫描」，滑杆量程与 registry paramMeta 一致。
   *
   * 为什么不能用当前参数当基准：本页四种力都是**静态量**（不随时间变化），
   * 基准若跟着参数一起变，箭头长度就恒定了 —— 调 m、F、μ 时看不出力的变化，
   * 而这正是「整体法 vs 隔离法」要讲的东西。
   *
   * 为什么不用「全滑杆同时取端点」的角点：重力 = (m₁+m₂)g 在 m₁=m₂=10 kg 时是
   * 默认帧的 3.3 倍，据此定基准会让默认帧的箭头再缩一半。单滑杆扫描（一次只推一个滑杆）
   * 与学生的实际操作同构，峰值与默认帧同量级。
   */
  const MASS_MAX = 10
  const weightDefault = (m1 + m2) * g
  // N_地 = (m₁+m₂)g 是页面上最大的法向力（斜面分量 m₂g·cosθ 恒小于它），也是四种力里的峰值
  const normalForcePeak = Math.max(weightDefault, (MASS_MAX + m2) * g, (m1 + MASS_MAX) * g)
  /**
   * 四种力共用同一基准 = 重力的峰值（页面上最大的力）。
   *
   * 本页的核心结论就是「F = 15 N 小于整体重力 58.8 N，所以系统不动」——
   * 若每个力各按自己的量程定基准（F 按 30 N、G 按 137 N），F 的箭反而比 G 的箭长，
   * 画面等于在说反话。受力分析页的所有力必须共用一把尺。
   */
  const forceRefCommon = refFromPeak(normalForcePeak)

  const groundY = SCENE_GEOM.groundY

  /**
   * 画布等比锁定（与斜抛页同法）—— 本页必须 scaleX === scaleY。
   *
   * 为什么必须：斜面三角形是用 scaleX / scaleY 分别换算 w_px / h_px 画出来的，
   * 而滑块与 N、f 箭头是按屏幕空间 rotate(θ) 画的，两者只在等比时才重合。
   * 原先写死 physicsWidth: 12 / physicsHeight: 8（宽高比 1.5）塞进 splitV 的
   * 840:325（2.58）可视区 → scaleX = 70、scaleY = 40.6，30° 的斜面在屏幕上被压成
   * arctan(40.6/70 · tan30°) = 18.5°，滑块却仍按 30° 旋转 —— 整个扎进斜面里，
   * 支持力也不再垂直于斜面，「整体法 vs 隔离法」的几何前提直接被画错。
   *
   * 做法：按「水平量程」和「竖直量程」各估一个等比比例尺，取小的那个，
   * 再由比例尺反推 physicsWidth / physicsHeight，两者之比恒等于设计稿宽高比。
   * 竖直量程随 θ 变化（斜面越高需要的天空越多），故 θ 很大时整幅画面等比缩小，
   * 而不是把画面拉变形。
   *
   * 量程基准取 preset（840×325 设计稿）而不是可视区：本页是中屏上下分区布局，
   * 可视区比设计稿高得多，用 anchor='viewport' 会把物理原点钉在可视区最底部，
   * 整个场景被压到画面下方、上方留一大片空白。锚在 'design' 上则始终落在设计稿内。
   */
  const MAX_ARROW = 96 // 矢量归一化上限（设计像素），显式传入以免与 Hook 默认值双真源
  // 最长竖直力箭 = MAX_ARROW × 0.7（gravity / appliedForce 的视觉权重），再给标签留 24px
  const ARROW_TOP_PX = MAX_ARROW * 0.7 + 24
  const NEED_WIDTH = 12.5 // 连接体最远滑到 x≈10.1 m，再留出 F 箭头与标签的位置
  /** 地面以下只需留 0.4 m 给地面影线（原点若放在 y=0 就白占 1.2 m，等比锁定时整个场景被压小） */
  const BELOW_GROUND = 0.4
  const contentTop =
    groundY + SCENE_GEOM.slopeWidth * Math.tan(thetaRad) + SCENE_GEOM.blockSize
  const needHeight = contentTop - groundY + BELOW_GROUND
  const scaleUniform = Math.min(
    preset.width / NEED_WIDTH,
    Math.max(preset.height - ARROW_TOP_PX, preset.height * 0.5) / needHeight,
  )
  const physicsWidth = preset.width / Math.max(scaleUniform, 1e-6)
  const physicsHeight = preset.height / Math.max(scaleUniform, 1e-6)
  // 原点下移到「地面以下 0.4 m」，把省下的竖直量程全部让给主体与顶部箭头
  const originY = preset.height + (groundY - BELOW_GROUND) * scaleUniform

  // 1. 物理比例尺（x 轴 0..physicsWidth，y 轴 0..physicsHeight，单位米，等比）
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'design',
    originSource: 'custom',
    originX: 0,
    originY,
    physicsWidth,
    physicsHeight,
    maxVectorLength: MAX_ARROW,
    refMagnitudes: {
      gravity: forceRefCommon,
      normalForce: forceRefCommon,
      friction: forceRefCommon,
      appliedForce: forceRefCommon,
      tension: forceRefCommon,
    },
  })

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
  }, [m1, m2, F, mu, g, groundY, time, isPlaying])

  // ------------------ 模型 1: 静力学叠放平衡 (推斜面) ------------------
  const model1 = useMemo(() => {
    const w_block = SCENE_GEOM.blockSize
    const h_block = SCENE_GEOM.blockSize
    const slope_W = SCENE_GEOM.slopeWidth
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
  }, [m1, m2, F, thetaRad, g, groundY])

  // ------------------ 模型 2: 系统牛顿第二定律 (斜面下滑) ------------------
  const model2 = useMemo(() => {
    const w_block = SCENE_GEOM.blockSize
    const h_block = SCENE_GEOM.blockSize
    const slope_W = SCENE_GEOM.slopeWidth
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
  }, [m1, m2, mu, thetaRad, g, groundY, time, isPlaying])

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
