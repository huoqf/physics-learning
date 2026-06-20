import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateFallVelocity,
  calculateAverageImpactForce,
  calculateCollisionTime,
  calculateFluidImpactForce,
} from '@/physics/momentumTheorem'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
  STROKE,
  FONT,
} from '@/theme/physics'

/** 动量定理动画布局常量 */
const MT_LAYOUT = {
  /** Canvas 安全余量 (px) */
  canvasPadding: 50,
  /** 地面线 Y 偏移 (px) */
  groundOffset: 80,
  /** 球基础半径 (px) */
  ballBaseRadius: 16,
  /** 质量缩放半径系数 (px/kg) */
  massRadiusScale: 2,
  /** 缓冲垫高度 (px) */
  cushionHeight: 20,
  /** 缓冲垫最大压缩量 (px) */
  cushionMaxCompression: 30,
  /** 下落缩放因子 (px per m) */
  fallScale: 40,
  /** 力条最大长度 (px) */
  forceBarMaxLength: 100,
  /** 进阶模式：挡板宽度 (px) */
  plateWidth: 16,
  /** 进阶模式：挡板高度 (px) */
  plateHeight: 80,
  /** 进阶模式：管口宽度 (px) */
  nozzleWidth: 30,
  /** 进阶模式：粒子半径 (px) */
  particleRadius: 3,
  /** 进阶模式：弹簧线段长度 (px) */
  springSegmentLen: 8,
  /** 进阶模式：弹簧圈数 */
  springCoils: 6,
  /** 重力加速度 (m/s²) */
  g: 9.8,
} as const

/** 粒子数据结构 */
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  hit: boolean
}

export default function MomentumTheoremAnimation() {
    const {params, time, showVectors} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const {
    m = 2,
    h = 2,
    k = 5,
    rho = 1000,
    S = 0.01,
    v_fluid = 5,
    alpha = 0,
    advancedMode = 0,
  } = params

  const isAdvanced = advancedMode === 1
  const groundY = canvasSize.height - MT_LAYOUT.groundOffset

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: 0,
      y: 0,
      width: canvasSize.width - MT_LAYOUT.canvasPadding * 2,
      height: canvasSize.height - MT_LAYOUT.canvasPadding,
    },
    originX: 0,
    originY: groundY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
    refMagnitudes: {
      velocity: 15,
      force: 200,
    },
  }), [canvasSize.width, canvasSize.height, groundY]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ── 基础模式：缓冲垫碰撞 ──────────────────────────────────
  const fallV = calculateFallVelocity(h, MT_LAYOUT.g)
  const collisionDt = calculateCollisionTime(m, k)
  const F_avg = calculateAverageImpactForce(m, fallV, collisionDt, MT_LAYOUT.g)

  // 动画阶段：0→1 下落，1→2 碰撞压缩，2→3 回弹
  const fallTime = Math.sqrt(2 * h / MT_LAYOUT.g)
  const totalTime = fallTime + collisionDt * 2

  const currentT = time % (totalTime + 1)
  let ballY: number
  let phase: 'falling' | 'compressing' | 'recovering' | 'done'
  let cushionCompression = 0

  const R_ball = MT_LAYOUT.ballBaseRadius + m * MT_LAYOUT.massRadiusScale
  const cushionTopY = groundY - MT_LAYOUT.cushionHeight
  const ballRestY = cushionTopY - R_ball

  if (currentT < fallTime) {
    phase = 'falling'
    const dy = 0.5 * MT_LAYOUT.g * currentT * currentT
    ballY = ballRestY - (h * MT_LAYOUT.fallScale) + dy * MT_LAYOUT.fallScale
  } else if (currentT < fallTime + collisionDt) {
    phase = 'compressing'
    const dt = currentT - fallTime
    const ratio = dt / collisionDt
    cushionCompression = ratio * MT_LAYOUT.cushionMaxCompression
    ballY = ballRestY + cushionCompression
  } else if (currentT < fallTime + collisionDt * 2) {
    phase = 'recovering'
    const dt = currentT - fallTime - collisionDt
    const ratio = 1 - dt / collisionDt
    cushionCompression = ratio * MT_LAYOUT.cushionMaxCompression
    ballY = ballRestY + cushionCompression
  } else {
    phase = 'done'
    ballY = ballRestY
    cushionCompression = 0
  }

  const ballCenterX = canvasSize.width * 0.35

  // ── 进阶模式：流体冲击 ──────────────────────────────────────
  const impactForce = calculateFluidImpactForce(rho, S, v_fluid, alpha)

  // 挡板位置
  const plateX = canvasSize.width * 0.65
  const plateTopY = groundY - MT_LAYOUT.plateHeight - 20
  const plateBottomY = groundY - 20

  // 弹簧形变量（与冲击力成正比）
  const maxSpringCompression = 25
  const maxForceRef = rho * 0.05 * 10 * 10 * 2 // 最大可能力
  const springCompression = Math.min(
    (impactForce / maxForceRef) * maxSpringCompression,
    maxSpringCompression
  )

  // 粒子系统
  const particles = useMemo(() => {
    const result: Particle[] = []
    const nParticles = 12
    const nozzleX = canvasSize.width * 0.25
    const nozzleY = (plateTopY + plateBottomY) / 2

    for (let i = 0; i < nParticles; i++) {
      const phase = (time * 2 + i * 0.3) % 3
      const pxPerUnit = (plateX - nozzleX) / 3

      if (phase < 2) {
        // 飞行中
        const x = nozzleX + phase * pxPerUnit
        const y = nozzleY + (i % 3 - 1) * 8
        result.push({ x, y, vx: v_fluid * 10, vy: 0, age: phase, hit: false })
      } else {
        // 碰后
        const hitX = plateX - 5
        const dt = phase - 2
        const reboundVx = alpha * v_fluid * 10
        const x = hitX - reboundVx * dt
        const y = nozzleY + (i % 3 - 1) * 8 + dt * 15 * (i % 2 === 0 ? 1 : -1)
        result.push({ x, y, vx: -reboundVx, vy: dt * 15, age: phase, hit: true })
      }
    }
    return result
  }, [time, v_fluid, alpha, plateX, plateTopY, plateBottomY])

  // 弹簧路径
  const springPath = useMemo(() => {
    const springStartX = plateX + MT_LAYOUT.plateWidth + 5
    const springEndX = springStartX + 60 - springCompression
    const springY = (plateTopY + plateBottomY) / 2
    const points: string[] = [`M ${springStartX},${springY}`]
    const segLen = (springEndX - springStartX) / (MT_LAYOUT.springCoils * 2)
    for (let i = 0; i < MT_LAYOUT.springCoils * 2; i++) {
      const x = springStartX + (i + 1) * segLen
      const y = springY + (i % 2 === 0 ? -8 : 8)
      points.push(`L ${x},${y}`)
    }
    points.push(`L ${springEndX},${springY}`)
    return points.join(' ')
  }, [springCompression, plateX, plateTopY, plateBottomY])

  // 矢量映射
  const fMaxRef = 200
  const mapForceBar = (val: number) => (Math.abs(val) / fMaxRef) * MT_LAYOUT.forceBarMaxLength

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* ========== defs ========== */}
        <defs>
          <radialGradient id="steel-sphere-grad-mt" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>
          <linearGradient id="fluid-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PHYSICS_COLORS.velocity} stopOpacity="0.6" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.velocity} stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* ========== 地面线 ========== */}
        <line
          x1={MT_LAYOUT.canvasPadding}
          y1={groundY}
          x2={canvasSize.width - MT_LAYOUT.canvasPadding}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* ========== 基础模式：缓冲垫碰撞 ========== */}
        {!isAdvanced && (
          <g>
            {/* 缓冲垫 */}
            <rect
              x={ballCenterX - 40}
              y={cushionTopY + cushionCompression}
              width={80}
              height={MT_LAYOUT.cushionHeight - cushionCompression}
              rx={4}
              fill={PHYSICS_COLORS.elasticForce}
              opacity={0.4}
              stroke={PHYSICS_COLORS.elasticForce}
              strokeWidth={1}
            />

            {/* 下落球 */}
            <circle
              cx={ballCenterX}
              cy={ballY}
              r={R_ball}
              fill="url(#steel-sphere-grad-mt)"
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={ballCenterX}
              y={ballY + 4}
              fontSize={FONT.smallSize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              m
            </text>

            {/* 速度箭头 */}
            {showVectors && phase === 'falling' && fallV > 0 && (
              <VectorArrow
                origin={{ x: ballCenterX, y: groundY - ballY - R_ball - 4 }}
                vector={{ x: 0, y: -fallV }}
                type="velocity"
                sceneScale={sceneScale}
              />
            )}

            {/* 碰撞力条 */}
            {showVectors && (phase === 'compressing' || phase === 'recovering') && (
              <VectorArrow
                origin={{ x: ballCenterX, y: groundY - ballY + R_ball + 4 }}
                vector={{ x: 0, y: F_avg }}
                type="appliedForce"
                sceneScale={sceneScale}
              />
            )}

            {/* 高度标注线 */}
            <line
              x1={ballCenterX - R_ball - 20}
              y1={ballRestY - h * MT_LAYOUT.fallScale}
              x2={ballCenterX - R_ball - 20}
              y2={ballRestY}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <text
              x={ballCenterX - R_ball - 25}
              y={(ballRestY - h * MT_LAYOUT.fallScale / 2)}
              fontSize={FONT.smallSize}
              fill={PHYSICS_COLORS.axis}
              textAnchor="end"
            >
              h
            </text>

            {/* Δt 标注 */}
            {(phase === 'compressing' || phase === 'recovering') && (
              <text
                x={ballCenterX + R_ball + 15}
                y={cushionTopY + 10}
                fontSize={FONT.smallSize}
                fill={PHYSICS_COLORS.impulse}
                fontWeight="bold"
              >
                Δt = {collisionDt.toFixed(2)} s
              </text>
            )}
          </g>
        )}

        {/* ========== 进阶模式：流体冲击 ========== */}
        {isAdvanced && (
          <g>
            {/* 管口 */}
            <rect
              x={canvasSize.width * 0.2}
              y={(plateTopY + plateBottomY) / 2 - MT_LAYOUT.nozzleWidth / 2}
              width={30}
              height={MT_LAYOUT.nozzleWidth}
              rx={3}
              fill={SCENE_COLORS.materials.steelSphereGrad[1]}
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={canvasSize.width * 0.2 + 15}
              y={(plateTopY + plateBottomY) / 2 - MT_LAYOUT.nozzleWidth / 2 - 6}
              fontSize={FONT.smallSize}
              fill={PHYSICS_COLORS.labelTextLight}
              textAnchor="middle"
            >
              管口
            </text>

            {/* 流体柱（从管口到挡板） */}
            <rect
              x={canvasSize.width * 0.2 + 30}
              y={(plateTopY + plateBottomY) / 2 - MT_LAYOUT.nozzleWidth / 2 + 2}
              width={plateX - canvasSize.width * 0.2 - 35}
              height={MT_LAYOUT.nozzleWidth - 4}
              fill="url(#fluid-grad)"
              rx={2}
            />

            {/* 粒子 */}
            {particles.map((p, i) => (
              <circle
                key={`particle-${i}`}
                cx={p.x}
                cy={p.y}
                r={MT_LAYOUT.particleRadius}
                fill={p.hit ? PHYSICS_COLORS.impulse : PHYSICS_COLORS.velocity}
                opacity={p.hit ? 0.5 : 0.8}
              />
            ))}

            {/* 挡板 */}
            <rect
              x={plateX - springCompression}
              y={plateTopY}
              width={MT_LAYOUT.plateWidth}
              height={MT_LAYOUT.plateHeight}
              rx={3}
              fill={SCENE_COLORS.materials.steelSphereGrad[1]}
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />

            {/* 固定支架 */}
            <rect
              x={plateX + MT_LAYOUT.plateWidth + 55}
              y={plateTopY - 10}
              width={12}
              height={MT_LAYOUT.plateHeight + 20}
              fill={PHYSICS_COLORS.labelTextLight}
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={1}
            />
            {/* 支架斜线纹理 */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`hatch-${i}`}
                x1={plateX + MT_LAYOUT.plateWidth + 55}
                y1={plateTopY - 10 + i * (MT_LAYOUT.plateHeight + 20) / 5}
                x2={plateX + MT_LAYOUT.plateWidth + 55 + 12}
                y2={plateTopY - 10 + (i + 1) * (MT_LAYOUT.plateHeight + 20) / 5}
                stroke={PHYSICS_COLORS.labelText}
                strokeWidth={0.8}
              />
            ))}

            {/* 弹簧 */}
            <path
              d={springPath}
              fill="none"
              stroke={PHYSICS_COLORS.elasticForce}
              strokeWidth={2}
            />

            {/* 冲击力箭头 */}
            {showVectors && (
              <g>
                <VectorArrow
                  origin={{ x: plateX - springCompression - 5, y: (plateTopY + plateBottomY) / 2 - groundY }}
                  vector={{ x: -impactForce, y: 0 }}
                  type="appliedForce"
                  sceneScale={sceneScale}
                />
                <text
                  x={plateX - springCompression - 10 - mapForceBar(impactForce) / 2}
                  y={(plateTopY + plateBottomY) / 2 - 10}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.appliedForce}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  F = {impactForce.toFixed(1)} N
                </text>

                {/* 流速标注 */}
                <text
                  x={(canvasSize.width * 0.2 + 30 + plateX) / 2}
                  y={(plateTopY + plateBottomY) / 2 - MT_LAYOUT.nozzleWidth / 2 - 8}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v = {v_fluid.toFixed(1)} m/s
                </text>

                {/* Δm 标注框 */}
                <rect
                  x={(canvasSize.width * 0.2 + 30 + plateX) / 2 - 15}
                  y={(plateTopY + plateBottomY) / 2 - MT_LAYOUT.nozzleWidth / 2 + 2}
                  width={30}
                  height={MT_LAYOUT.nozzleWidth - 4}
                  fill="none"
                  stroke={PHYSICS_COLORS.momentum}
                  strokeWidth={1.5}
                  strokeDasharray="3,2"
                />
                <text
                  x={(canvasSize.width * 0.2 + 30 + plateX) / 2}
                  y={(plateTopY + plateBottomY) / 2 + MT_LAYOUT.nozzleWidth / 2 + 14}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.momentum}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Δm
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
