import { useMemo } from 'react'
import { DASH, FONT, OPACITY, PHYSICS_COLORS, STROKE } from '@/theme/physics'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { useCanvasSize } from '@/utils/useCanvasSize'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { VectorArrow, Ball, Block, SportsCar, ConductingRod, PhysicsGround, CapacitorPlates } from '@/components/Physics'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import type { ForceMotionState } from '@/physics'
import { useAnimationStore } from '@/stores'
import {
  FORCE_MOTION_OBJECT_SIZE_RATIO,
  FORCE_MOTION_VECTOR_MAX_RATIO,
} from './forceMotionLayout'

interface ForceMotionSandboxProps {
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

function vectorEnd(length: number, dx: number, dy: number) {
  const norm = Math.hypot(dx, dy)
  if (norm < 1e-6) return { x: 0, y: 0 }
  return { x: (dx / norm) * length, y: (dy / norm) * length }
}

function pathFrom(points: Array<{ cx: number; cy: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.cx.toFixed(1)} ${point.cy.toFixed(1)}`).join(' ')
}

function getSpringPath(x1: number, y1: number, x2: number, y2: number, turns = 10, springWidth = 6) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 5) return ''

  const ux = dx / len
  const uy = dy / len
  const vx = -uy
  const vy = ux

  const points = []
  const startLen = Math.min(10, len * 0.15)
  const endLen = Math.min(10, len * 0.15)
  const activeLen = len - startLen - endLen

  points.push({ x: x1, y: y1 })
  points.push({ x: x1 + ux * startLen, y: y1 + uy * startLen })

  const numPoints = turns * 2
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const dist = startLen + t * activeLen
    const cx = x1 + ux * dist
    const cy = y1 + uy * dist
    if (i === 0 || i === numPoints) {
      points.push({ x: cx, y: cy })
    } else {
      const offset = (i % 2 === 0 ? 1 : -1) * springWidth
      points.push({ x: cx + vx * offset, y: cy + vy * offset })
    }
  }

  points.push({ x: x2, y: y2 })
  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

export default function ForceMotionSandbox({ state, trajectory, domainTrajectory }: ForceMotionSandboxProps) {
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
  }), [width, height]);
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  const trackPath = pathFrom(view.track)

  // 根据运动模式，计算力箭头的颜色和标签
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

  // 模式 9 收尾变力的受力分解计算（分外力与阻力）
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

  // 模式 4 电场线计算
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

  // 模式 5, 6 圆周运动半径
  const circularRadius = view.scale * (params.env1 ?? 5)

  // 模式 9 磁场格点计算
  const magneticGrid = useMemo(() => {
    if (state.mode !== 'terminal-variable-force' || !(params.env3 > 0.5)) return []
    const points = []
    for (let x = 50; x < width; x += 85) {
      for (let y = 35; y < height; y += 60) {
        if (Math.abs(x - view.originX) > 50) { // 避开导轨区域，降噪
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

  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-xl border border-neutral-100 overflow-hidden">
      <svg width={width} height={height} className="w-full h-full select-none" role="img" aria-label="力与运动探究沙箱">
        <defs>
        </defs>

        {/* 坐标网格 */}
        <g opacity={OPACITY.grid}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = width * 0.1 * i
            return <line key={`vg-${i}`} x1={x} y1={0} x2={x} y2={height} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} />
          })}
          {Array.from({ length: 7 }, (_, i) => {
            const y = height * 0.15 * i
            return <line key={`hg-${i}`} x1={0} y1={y} x2={width} y2={y} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} />
          })}
        </g>

        {/* 坐标轴 (如果显示地面，则隐藏水平X坐标轴以免双线冲突) */}
        {!showGround && (
          <line x1={0} x2={width} y1={view.originY} y2={view.originY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        )}
        <line x1={view.originX} x2={view.originX} y1={0} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />

        {/* 物理支撑面/地面（含动态标尺刻度） */}
        {showGround && (
          <PhysicsGround
            x={0}
            y={groundY}
            width={width}
            appearance={{ showHatch: true }}
            ruler={(state.mode === 'uniform-accel-line' || state.mode === 'uniform-decel-line') ? {
              domain: [-view.originX / view.scale, (width - view.originX) / view.scale],
              tickInterval: tickInterval,
              minorTicks: 4,
              showAxisLine: true,
              unit: 'm',
              axisLabel: 'x',
              axisOffset: 0,
            } : undefined}
          />
        )}

        {/* 简谐振动模式的弹簧与固定墙体 */}
        {state.mode === 'simple-harmonic' && (
          <>
            {/* 墙体本体及拟物斜线条纹 */}
            <g opacity={0.8}>
              <line x1={xWall} y1={view.body.cy - 20} x2={xWall} y2={view.body.cy + 20} stroke={PHYSICS_COLORS.axis} strokeWidth={4} />
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={i} x1={xWall} y1={view.body.cy - 16 + i * 8} x2={xWall - 5} y2={view.body.cy - 12 + i * 8} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
              ))}
            </g>
            {/* 拟物弹簧折线 */}
            <path d={springPath} fill="none" stroke="#78716c" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* 斜抛运动发射器 (模式 3) */}
        {state.mode === 'constant-angle-curve' && (
          <g opacity={0.8} transform={`translate(${view.originX}, ${view.originY})`}>
            <line
              x1={0}
              y1={0}
              x2={20 * Math.cos((params.theta * Math.PI) / 180)}
              y2={-20 * Math.sin((params.theta * Math.PI) / 180)}
              stroke="#475569"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path d="M-10 0 L10 0 L5 -6 L-5 -6 Z" fill="#334155" />
          </g>
        )}

        {/* 偏转板与偏转极极板 (模式 4) */}
        {state.mode === 'projectile-like' && (
          <>
            <CapacitorPlates
              x={40}
              y={view.originY}
              width={width - 80}
              gap={height * 0.65}
              chargeSign={state.Fy > 0 ? -1 : 1}
              showField={true}
            />
            {/* 均匀分布的电场线 */}
            {electricFieldLines.map((line, idx) => {
              const isFyPositive = state.Fy > 0
              const y1 = isFyPositive ? line.y2 : line.y1
              const y2 = isFyPositive ? line.y1 : line.y2
              return (
                <g key={`ef-${idx}`} opacity={0.5}>
                  <line
                    x1={line.x}
                    y1={y1}
                    x2={line.x}
                    y2={y2}
                    stroke={PHYSICS_COLORS.electricFieldLine}
                    strokeWidth={1.5}
                    strokeDasharray={DASH.reference.join(' ')}
                  />
                  <polygon
                    points={`${line.x - 3.5},${isFyPositive ? (y1 + y2) / 2 + 3 : (y1 + y2) / 2 - 3} ${line.x + 3.5},${isFyPositive ? (y1 + y2) / 2 + 3 : (y1 + y2) / 2 - 3} ${line.x},${isFyPositive ? (y1 + y2) / 2 - 4 : (y1 + y2) / 2 + 4}`}
                    fill={PHYSICS_COLORS.electricFieldLine}
                  />
                </g>
              )
            })}
          </>
        )}

        {/* 圆周运动轨道与转轴心轴连杆拉绳 (模式 5, 6) */}
        {(state.mode === 'uniform-circular' || state.mode === 'variable-circular') && (
          <>
            {/* 圆周轨道线 */}
            <circle
              cx={view.originX}
              cy={view.originY}
              r={circularRadius}
              fill="none"
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1.5}
              strokeDasharray={DASH.guide.join(' ')}
              opacity={0.4}
            />
            {/* 拉绳/连杆 */}
            {(() => {
              const isRod = state.mode === 'variable-circular' && params.env2 > 0.5
              const isRopeSlack = state.mode === 'variable-circular' && !isRod && state.isTerminal

              if (isRod) {
                return (
                  <g opacity={0.95}>
                    <line x1={view.originX} y1={view.originY} x2={view.body.cx} y2={view.body.cy} stroke="#cbd5e1" strokeWidth={5} strokeLinecap="round" />
                    <line x1={view.originX} y1={view.originY} x2={view.body.cx} y2={view.body.cy} stroke="#475569" strokeWidth={1} strokeLinecap="round" />
                  </g>
                )
              } else {
                if (isRopeSlack) {
                  const slackPath = getSpringPath(view.originX, view.originY, view.body.cx, view.body.cy, 6, 3)
                  return (
                    <path
                      d={slackPath}
                      fill="none"
                      stroke={PHYSICS_COLORS.tension}
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      opacity={0.6}
                    />
                  )
                } else {
                  return (
                    <line
                      x1={view.originX}
                      y1={view.originY}
                      x2={view.body.cx}
                      y2={view.body.cy}
                      stroke={PHYSICS_COLORS.tension}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  )
                }
              }
            })()}
            {/* 圆心转轴销 */}
            <circle cx={view.originX} cy={view.originY} r={5} fill="#475569" stroke="#1e293b" strokeWidth={1.5} />
            <circle cx={view.originX} cy={view.originY} r={1.5} fill="#ffffff" />
          </>
        )}

        {/* 垂直下行马路 (模式 9 功率启动子模式) */}
        {state.mode === 'terminal-variable-force' && !(params.env3 > 0.5) && (
          <g opacity={0.6}>
            <line x1={view.originX - 45} y1={0} x2={view.originX - 45} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={2} />
            <line x1={view.originX + 45} y1={0} x2={view.originX + 45} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={2} />
            <line
              x1={view.originX}
              y1={0}
              x2={view.originX}
              y2={height}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1}
              strokeDasharray="10 8"
            />
          </g>
        )}

        {/* 垂直导轨与背景磁场 (模式 9 阻力单杆子模式) */}
        {state.mode === 'terminal-variable-force' && params.env3 > 0.5 && (
          <>
            <line x1={view.originX - 35} y1={0} x2={view.originX - 35} y2={height} stroke="#64748b" strokeWidth={3} />
            <line x1={view.originX + 35} y1={0} x2={view.originX + 35} y2={height} stroke="#64748b" strokeWidth={3} />
            
            {magneticGrid.map((p, idx) => (
              <g key={`b-cross-${idx}`} opacity={0.35} transform={`translate(${p.x}, ${p.y})`}>
                <circle r={6} fill="none" stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth={1} />
                <line x1={-3} y1={-3} x2={3} y2={3} stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth={1} />
                <line x1={3} y1={-3} x2={-3} y2={3} stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth={1} />
              </g>
            ))}
          </>
        )}

        {/* 轨迹线 */}
        {trackPath && (
          <path
            d={trackPath}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={STROKE.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
            opacity={OPACITY.trackHistory}
          />
        )}

        {/* 运动物体渲染 */}
        {(() => {
          if (state.mode === 'uniform-accel-line' || state.mode === 'uniform-decel-line') {
            const cartW = view.objectSize * 1.4
            const cartH = view.objectSize * 0.8
            return (
              <Block
                x={view.body.cx - cartW / 2}
                y={view.body.cy + view.objectSize * 0.5 - cartH}
                width={cartW}
                height={cartH}
                type="metalCart"
                label={`${params.m} kg`}
              />
            )
          }

          if (state.mode === 'terminal-variable-force') {
            const isPowerMode = !(params.env3 > 0.5)
            if (isPowerMode) {
              const carW = view.objectSize * 1.4
              const carH = view.objectSize * 0.65
              return (
                <g transform={`translate(${view.body.cx}, ${view.body.cy}) rotate(90)`}>
                  <SportsCar
                    x={-carW / 2}
                    y={-carH / 2}
                    width={carW}
                    height={carH}
                    velocity={state.v}
                    time={state.t}
                    showTailwind={true}
                  />
                </g>
              )
            } else {
              return (
                <>
                  <g transform={`translate(${view.body.cx}, ${view.body.cy}) rotate(90) translate(${-view.body.cx}, ${-height / 2})`}>
                    <ConductingRod
                      type="horizontal"
                      x={view.body.cx}
                      spacing={70}
                      height={height}
                      currentDir="in"
                    />
                  </g>
                  {/* 电位标注 */}
                  <g fontSize={font(FONT.axis)} fontWeight="bold" opacity={0.9}>
                    <text x={view.body.cx - 48} y={view.body.cy + 5} fill={PHYSICS_COLORS.negativeCharge} textAnchor="end">−</text>
                    <text x={view.body.cx + 48} y={view.body.cy + 5} fill={PHYSICS_COLORS.positiveCharge} textAnchor="start">+</text>
                  </g>
                </>
              )
            }
          }

          let ballPreset: 'steel' | 'oscillatorMetal' | 'brassWeight' | 'pendulumBob' = 'steel'
          if (state.mode === 'simple-harmonic') ballPreset = 'oscillatorMetal'
          else if (state.mode === 'constant-angle-curve') ballPreset = 'brassWeight'
          else if (state.mode === 'uniform-circular' || state.mode === 'variable-circular') ballPreset = 'pendulumBob'

          return (
            <Ball
              cx={view.body.cx}
              cy={view.body.cy}
              r={view.objectSize * 0.5}
              type={ballPreset}
            />
          )
        })()}

        {/* 合外力矢量 F/分力/合力 （依据物理语义涂色） */}
        {state.mode !== 'balance' && state.mode !== 'terminal-variable-force' && (
          <>
            <VectorArrow
              origin={{ x: view.body.cx, y: -view.body.cy }}
              vector={{ x: view.forceVector.x, y: -view.forceVector.y }}
              type="force"
              color={forceArrowColor}
              sceneScale={sceneScale}
              pixelLength={Math.sqrt(view.forceVector.x ** 2 + view.forceVector.y ** 2)}
            />
            <text
              x={view.body.cx + view.forceVector.x + FONT.small}
              y={view.body.cy + view.forceVector.y}
              fill={forceArrowColor}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >{forceLabel}</text>
          </>
        )}

        {/* 模式 9 收尾变力的受力分解渲染 */}
        {state.mode === 'terminal-variable-force' && terminalForceVectors && (
          <>
            {/* 1. 驱动外力 F_drive (向下) */}
            <VectorArrow
              origin={{ x: view.body.cx, y: -view.body.cy }}
              vector={{ x: 0, y: -terminalForceVectors.driveLen }}
              type="force"
              color={PHYSICS_COLORS.appliedForce}
              sceneScale={sceneScale}
              pixelLength={terminalForceVectors.driveLen}
            />
            <text
              x={view.body.cx + 8}
              y={view.body.cy + terminalForceVectors.driveLen}
              fill={PHYSICS_COLORS.appliedForce}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >{terminalForceVectors.isPowerMode ? 'F牵引' : 'F外'}</text>

            {/* 2. 阻力 F_resist (向上) */}
            <VectorArrow
              origin={{ x: view.body.cx, y: -view.body.cy }}
              vector={{ x: 0, y: terminalForceVectors.resistLen }}
              type="force"
              color={terminalForceVectors.isPowerMode ? PHYSICS_COLORS.airResistance : PHYSICS_COLORS.lorentzForce}
              sceneScale={sceneScale}
              pixelLength={terminalForceVectors.resistLen}
            />
            <text
              x={view.body.cx + 8}
              y={view.body.cy - terminalForceVectors.resistLen}
              fill={terminalForceVectors.isPowerMode ? PHYSICS_COLORS.airResistance : PHYSICS_COLORS.lorentzForce}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >{terminalForceVectors.isPowerMode ? 'f' : 'F安'}</text>

            {/* 3. 合力 F_net (向下，右侧偏移渲染) */}
            <VectorArrow
              origin={{ x: view.body.cx + 25, y: -view.body.cy }}
              vector={{ x: 0, y: -terminalForceVectors.netLen }}
              type="force"
              color={PHYSICS_COLORS.forceNet}
              sceneScale={sceneScale}
              pixelLength={terminalForceVectors.netLen}
            />
            <text
              x={view.body.cx + 33}
              y={view.body.cy + terminalForceVectors.netLen}
              fill={PHYSICS_COLORS.forceNet}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >F合</text>
          </>
        )}

        {/* 速度矢量 v — 蓝色 */}
        <VectorArrow
          origin={{ x: view.body.cx, y: -view.body.cy }}
          vector={{ x: view.speedVector.x, y: -view.speedVector.y }}
          type="velocity"
          sceneScale={sceneScale}
          pixelLength={Math.sqrt(view.speedVector.x ** 2 + view.speedVector.y ** 2)}
        />
        <text
          x={view.body.cx + view.speedVector.x + FONT.small}
          y={view.body.cy + view.speedVector.y}
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(FONT.axis)}
        >v</text>

        {/* 加速度矢量 a — 红色 */}
        <VectorArrow
          origin={{ x: view.body.cx, y: -view.body.cy }}
          vector={{ x: view.accelVector.x, y: -view.accelVector.y }}
          type="acceleration"
          sceneScale={sceneScale}
          pixelLength={Math.sqrt(view.accelVector.x ** 2 + view.accelVector.y ** 2)}
        />
        <text
          x={view.body.cx + view.accelVector.x + FONT.small}
          y={view.body.cy + view.accelVector.y}
          fill={PHYSICS_COLORS.acceleration}
          fontSize={font(FONT.axis)}
        >a</text>
      </svg>
    </div>
  )
}
