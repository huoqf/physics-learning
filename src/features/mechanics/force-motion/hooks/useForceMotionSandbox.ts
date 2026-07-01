import { useMemo } from 'react'
import { FONT, PHYSICS_COLORS } from '@/theme/physics'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { useCanvasSize } from '@/utils/useCanvasSize'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { createSceneScale } from '@/scene'
import type { SceneConfig, SceneScale } from '@/scene'
import type { ForceMotionState } from '@/physics'
import { useAnimationStore } from '@/stores'
import {
  FORCE_MOTION_OBJECT_SIZE_RATIO,
  FORCE_MOTION_VECTOR_MAX_RATIO,
} from '../forceMotionLayout'

export interface ForceMotionSandboxProps {
  state: ForceMotionState
  /** 实时轨迹（按 currentTime 截断），用于绘制历史轨迹线 */
  trajectory: ForceMotionState[]
  /**
   * 完整观察窗口轨迹（仅随 params 变化），用于 scale 定标，
   * 不传则回退到 `trajectory`。
   * 与 ForceMotionTripleChart 的 domainPoints 共用 observationTime，
   * 避免长时模式让物体超出动画区域。
   */
  domainTrajectory?: ForceMotionState[]
}

/**
 * 将方向向量 (dx, dy) 归一化后，取指定像素长度的端点坐标。
 * @param length 期望的矢量像素长度
 * @param dx 方向向量 x 分量（物理坐标系）
 * @param dy 方向向量 y 分量（物理坐标系）
 * @returns 归一化后的端点 `{ x, y }`，零向量返回原点
 */
export function vectorEnd(length: number, dx: number, dy: number) {
  const norm = Math.hypot(dx, dy)
  if (norm < 1e-6) return { x: 0, y: 0 }
  return { x: (dx / norm) * length, y: (dy / norm) * length }
}

/**
 * 将画布坐标点数组转换为 SVG path 的 `d` 属性字符串。
 * @param points 画布坐标点数组，每项含 `cx`（像素 x）、`cy`（像素 y）
 * @returns 形如 `"M 100.0 200.0 L 150.3 180.2 ..."` 的路径字符串
 */
export function pathFrom(points: Array<{ cx: number; cy: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.cx.toFixed(1)} ${point.cy.toFixed(1)}`).join(' ')
}

/**
 * 生成弹簧折线的 SVG path 数据。
 * 起点与终点之间绘制锯齿形弹簧，首尾各留 15% 直线段作为端头。
 * @param x1 起点 x
 * @param y1 起点 y
 * @param x2 终点 x
 * @param y2 终点 y
 * @param turns 弹簧圈数，默认 10
 * @param springWidth 弹簧振幅（像素），默认 6
 * @returns SVG path `d` 字符串；若两点距离 < 5px 则返回空串
 */
export function getSpringPath(x1: number, y1: number, x2: number, y2: number, turns = 10, springWidth = 6) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 5) return ''

  const ux = dx / len
  const uy = dy / len
  const vx = -uy
  const vy = ux

  const pts = []
  const startLen = Math.min(10, len * 0.15)
  const endLen = Math.min(10, len * 0.15)
  const activeLen = len - startLen - endLen

  pts.push({ x: x1, y: y1 })
  pts.push({ x: x1 + ux * startLen, y: y1 + uy * startLen })

  const numPoints = turns * 2
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const dist = startLen + t * activeLen
    const cx = x1 + ux * dist
    const cy = y1 + uy * dist
    if (i === 0 || i === numPoints) {
      pts.push({ x: cx, y: cy })
    } else {
      const offset = (i % 2 === 0 ? 1 : -1) * springWidth
      pts.push({ x: cx + vx * offset, y: cy + vy * offset })
    }
  }

  pts.push({ x: x2, y: y2 })
  return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

export interface ForceMotionSandboxData {
  containerRef: React.RefObject<HTMLDivElement | null>
  width: number
  height: number
  font: (size: number) => number
  view: {
    shortEdge: number
    objectSize: number
    originX: number
    originY: number
    scale: number
    body: { cx: number; cy: number }
    track: Array<{ cx: number; cy: number }>
    forceVector: { x: number; y: number }
    speedVector: { x: number; y: number }
    accelVector: { x: number; y: number }
  }
  sceneScale: SceneScale
  trackPath: string
  forceArrowColor: string
  forceLabel: string
  terminalForceVectors: { driveLen: number; resistLen: number; netLen: number; isPowerMode: boolean } | null
  groundY: number
  xWall: number
  springPath: string
  electricFieldLines: Array<{ x: number; y1: number; y2: number }>
  circularRadius: number
  magneticGrid: Array<{ x: number; y: number }>
  showGround: boolean
  tickInterval: number
  params: Record<string, number>
}

export function useForceMotionSandbox({ state, trajectory, domainTrajectory }: ForceMotionSandboxProps): ForceMotionSandboxData {
  const [containerRef, size] = useCanvasSize(CANVAS_PRESETS.wide)
  const { width, height, font } = size
  const params = useAnimationStore((s) => s.params)

  const view = useMemo(() => {
    const shortEdge = Math.max(1, Math.min(width, height))
    const objectSize = Math.max(FONT.large, shortEdge * FORCE_MOTION_OBJECT_SIZE_RATIO)
    let originXRatio = 0.5
    let originYRatio = 0.5

    switch (state.mode) {
      case 'balance':
      case 'uniform-accel-line':
      case 'uniform-decel-line':
      case 'projectile-like':
      case 'linear-variable-force':
        originXRatio = 0.15
        originYRatio = 0.5
        break
      case 'constant-angle-curve': // 斜抛
        originXRatio = 0.15
        originYRatio = 0.75
        break
      case 'terminal-variable-force': // 收尾下落
        originXRatio = 0.5
        originYRatio = 0.15
        break
      case 'uniform-circular':
      case 'variable-circular':
      case 'simple-harmonic':
      default:
        originXRatio = 0.5
        originYRatio = 0.5
        break
    }

    const originX = width * originXRatio
    const originY = height * originYRatio

    // 定标用完整窗口轨迹（按 observationTime 提前算好的整段），回退到实时 trajectory
    const rangeSource = domainTrajectory ?? trajectory
    const xValues = rangeSource.map((point) => point.x)
    const yValues = rangeSource.map((point) => -point.y)
    // 当前状态也纳入（防止 currentTime 超出 observationTime 时物体瞬间越界）
    xValues.push(state.x)
    yValues.push(-state.y)

    // 精确的轨迹边界自适应缩放（防止超出偏置后的原点和可用 Canvas 边界）
    let maxScaleX = Infinity
    let maxScaleY = Infinity

    const leftMargin = 0.08
    const rightMargin = 0.92
    xValues.forEach((x) => {
      if (x > 0.01) {
        const allowed = ((rightMargin - originXRatio) * width) / x
        if (allowed < maxScaleX) maxScaleX = allowed
      } else if (x < -0.01) {
        const allowed = ((originXRatio - leftMargin) * width) / Math.abs(x)
        if (allowed < maxScaleX) maxScaleX = allowed
      }
    })

    const topMargin = 0.12
    const bottomMargin = 0.88
    yValues.forEach((y) => {
      if (y > 0.01) {
        const allowed = ((bottomMargin - originYRatio) * height) / y
        if (allowed < maxScaleY) maxScaleY = allowed
      } else if (y < -0.01) {
        const allowed = ((originYRatio - topMargin) * height) / Math.abs(y)
        if (allowed < maxScaleY) maxScaleY = allowed
      }
    })

    // 防御兜底，防止除零或无限值
    const scaleX = Number.isFinite(maxScaleX) ? maxScaleX : (width * 0.4)
    const scaleY = Number.isFinite(maxScaleY) ? maxScaleY : (height * 0.4)
    const scale = Math.max(0.001, Math.min(scaleX, scaleY))

    const body = physicsToCanvasWithOrigin(state.x, -state.y, originX, originY, scale)
    const track = trajectory.map((point) =>
      physicsToCanvasWithOrigin(point.x, -point.y, originX, originY, scale)
    )

    const vectorMax = shortEdge * FORCE_MOTION_VECTOR_MAX_RATIO

    // 三个矢量箭头（F合、v、a）
    const forceVector = vectorEnd(
      Math.min(vectorMax, Math.max(FONT.labelBold, Math.abs(state.F) * scale * 0.02)),
      state.Fx,
      state.Fy
    )
    const speedVector = vectorEnd(
      Math.min(vectorMax, Math.max(FONT.labelBold, state.v * scale * 0.12)),
      state.vx,
      state.vy
    )
    const accelVector = vectorEnd(
      Math.min(vectorMax, Math.max(FONT.labelBold, Math.abs(state.a) * scale * 0.08)),
      state.ax,
      state.ay
    )

    return {
      shortEdge,
      objectSize,
      originX,
      originY,
      scale,
      body,
      track,
      forceVector,
      speedVector,
      accelVector,
    }
  }, [height, state, trajectory, domainTrajectory, width])

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width, height },
    originX: 0,
    originY: 0,
    worldWidth: width,
    worldHeight: height,
  }), [width, height])
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

  const trackPath = pathFrom(view.track)

  const forceArrowColor = useMemo(() => {
    switch (state.mode) {
      case 'balance':
        return PHYSICS_COLORS.forceNet
      case 'uniform-accel-line':
        return PHYSICS_COLORS.appliedForce
      case 'uniform-decel-line':
        return PHYSICS_COLORS.friction
      case 'constant-angle-curve':
        return PHYSICS_COLORS.gravity
      case 'projectile-like':
        return PHYSICS_COLORS.electricForce
      case 'uniform-circular':
      case 'variable-circular':
        return PHYSICS_COLORS.tension
      case 'simple-harmonic':
        return PHYSICS_COLORS.elasticForce
      case 'linear-variable-force':
        return PHYSICS_COLORS.appliedForce
      case 'terminal-variable-force':
        return PHYSICS_COLORS.forceNet
      default:
        return PHYSICS_COLORS.forceNet
    }
  }, [state.mode])

  const forceLabel = useMemo(() => {
    switch (state.mode) {
      case 'balance':
        return 'F合'
      case 'uniform-accel-line':
        return 'F'
      case 'uniform-decel-line':
        return 'f'
      case 'constant-angle-curve':
        return 'G'
      case 'projectile-like':
        return 'F电'
      case 'uniform-circular':
      case 'variable-circular':
        return 'T'
      case 'simple-harmonic':
        return 'F弹'
      case 'linear-variable-force':
        return 'F'
      case 'terminal-variable-force':
        return 'F合'
      default:
        return 'F'
    }
  }, [state.mode])

  const terminalForceVectors = useMemo(() => {
    if (state.mode !== 'terminal-variable-force') return null

    // env1 = 功率 P 或 驱动力 F_drive, env2 = 阻力 f 或 kf, env3 = 子模式 (0功率/1阻力)
    const isPowerMode = !(params.env3 > 0.5)

    let F_drive = 0
    let F_resist = 0

    if (isPowerMode) {
      F_drive = params.env1 / Math.max(state.v, 0.5)
      F_resist = params.env2
    } else {
      F_drive = params.env1
      F_resist = params.env2 * state.v
    }

    const vectorMax = view.shortEdge * FORCE_MOTION_VECTOR_MAX_RATIO
    const scaleFactor = view.scale * 0.02

    const F_drive_len = Math.min(vectorMax, Math.max(FONT.labelBold, F_drive * scaleFactor))
    const F_resist_len = Math.min(vectorMax, Math.max(FONT.labelBold, F_resist * scaleFactor))
    const F_net_len = Math.min(vectorMax, Math.max(FONT.labelBold, Math.abs(state.F) * scaleFactor))

    return {
      driveLen: F_drive_len,
      resistLen: F_resist_len,
      netLen: F_net_len,
      isPowerMode,
    }
  }, [state.mode, state.v, state.F, params, view.shortEdge, view.scale])

  const groundY = view.originY + view.objectSize * 0.5
  const xWall = view.originX - 180
  const springPath = state.mode === 'simple-harmonic' ? getSpringPath(xWall, view.body.cy, view.body.cx - view.objectSize * 0.5, view.body.cy, 12, 8) : ''

  const electricFieldLines = useMemo(() => {
    if (state.mode !== 'projectile-like') return []
    const gap = height * 0.65
    const topY = view.originY - gap / 2
    const bottomY = view.originY + gap / 2
    const lines = []
    const count = 5
    const spacing = (width - 120) / (count + 1)
    for (let i = 1; i <= count; i++) {
      lines.push({ x: 60 + i * spacing, y1: topY, y2: bottomY })
    }
    return lines
  }, [state.mode, width, height, view.originY])

  const circularRadius = view.scale * (params.env1 ?? 5)

  const magneticGrid = useMemo(() => {
    if (state.mode !== 'terminal-variable-force' || !(params.env3 > 0.5)) return []
    const points = []
    for (let x = 50; x < width; x += 85) {
      for (let y = 35; y < height; y += 60) {
        if (Math.abs(x - view.originX) > 50) {
          points.push({ x, y })
        }
      }
    }
    return points
  }, [state.mode, params.env3, width, height, view.originX])

  const showGround = ['balance', 'uniform-accel-line', 'uniform-decel-line', 'constant-angle-curve', 'simple-harmonic', 'linear-variable-force'].includes(state.mode)

  const spanX = width / view.scale
  const tickInterval = useMemo(() => {
    if (spanX <= 5) return 0.5
    if (spanX <= 15) return 1
    if (spanX <= 30) return 2
    if (spanX <= 75) return 5
    if (spanX <= 150) return 10
    if (spanX <= 300) return 20
    return 50
  }, [spanX])

  return {
    containerRef,
    width,
    height,
    font,
    view,
    sceneScale,
    trackPath,
    forceArrowColor,
    forceLabel,
    terminalForceVectors,
    groundY,
    xWall,
    springPath,
    electricFieldLines,
    circularRadius,
    magneticGrid,
    showGround,
    tickInterval,
    params,
  }
}
