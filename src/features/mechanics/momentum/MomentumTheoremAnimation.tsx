import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
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
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { RelationChart, ChartArea } from '@/components/Chart'
import { Spring } from '@/components/UI'

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
  offsetY: number
  vx: number
  vy: number
  age: number
  hit: boolean
}

export default function MomentumTheoremAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)

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

  // 基于截面积 S 计算动态尺寸（平方根缩放，视觉更自然）
  const sScale = Math.sqrt(S / 0.01) // 以 S=0.01 为基准
  const nozzleHeight = Math.max(20, Math.min(40, 32 * sScale)) // 管口高度
  const fluidHeight = Math.max(14, Math.min(28, 26 * sScale)) // 流体柱高度
  const particleR = Math.max(2, Math.min(4, 3 * sScale)) // 粒子半径

  // 1. 动态计算右侧卡片宽度与 Viewport 避让
  const cardWidth = Math.max(300, canvasSize.width * 0.42)
  const vp = useViewport(canvasSize, {
    designWidth: 600,
    designHeight: 450,
    overlayRight: Math.round(cardWidth + 24),
  })

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: vp.visibleX,
      y: vp.visibleY,
      width: vp.visibleW,
      height: vp.visibleH,
    },
    originX: 0,
    originY: groundY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
    refMagnitudes: {
      velocity: 15,
      force: 200,
    },
  }), [vp.visibleX, vp.visibleY, vp.visibleW, vp.visibleH, groundY, canvasSize.width, canvasSize.height]);

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

  // 基础模式小球 X 坐标自适应 viewport
  const ballCenterX = vp.centerX

  // ── 基础模式 F-t 数据采样与冲量计算 ──────────────────────────
  const F_max = F_avg * 2

  const basicFtPointsAll = useMemo(() => {
    return [
      { x: 0, y: 0 },
      { x: fallTime, y: 0 },
      { x: fallTime + collisionDt, y: F_max },
      { x: fallTime + collisionDt * 2, y: 0 },
      { x: totalTime, y: 0 },
    ]
  }, [fallTime, collisionDt, F_max, totalTime])

  const basicFtPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    if (currentT <= fallTime) {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: currentT, y: 0 })
    } else if (currentT <= fallTime + collisionDt) {
      const curF = F_max * ((currentT - fallTime) / collisionDt)
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: 0 })
      pts.push({ x: currentT, y: curF })
    } else if (currentT <= fallTime + collisionDt * 2) {
      const curF = F_max * (1 - (currentT - fallTime - collisionDt) / collisionDt)
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: 0 })
      pts.push({ x: fallTime + collisionDt, y: F_max })
      pts.push({ x: currentT, y: curF })
    } else {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: 0 })
      pts.push({ x: fallTime + collisionDt, y: F_max })
      pts.push({ x: fallTime + collisionDt * 2, y: 0 })
      pts.push({ x: Math.min(currentT, totalTime), y: 0 })
    }
    return pts
  }, [fallTime, collisionDt, F_max, currentT, totalTime])



  const basicVtPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    if (currentT <= fallTime) {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: currentT, y: -currentT * MT_LAYOUT.g })
    } else if (currentT <= fallTime + collisionDt * 2) {
      const dt = currentT - fallTime
      const curV = -fallV + (fallV / collisionDt) * dt
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: -fallV })
      pts.push({ x: currentT, y: curV })
    } else {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: -fallV })
      pts.push({ x: fallTime + collisionDt * 2, y: fallV })
      pts.push({ x: Math.min(currentT, totalTime), y: fallV })
    }
    return pts
  }, [fallTime, collisionDt, fallV, currentT, totalTime])




  // ── 进阶模式：流体冲击 ──────────────────────────────────────
  const impactForce = calculateFluidImpactForce(rho, S, v_fluid, alpha)

  // 挡板与管口 X 坐标自适应 viewport
  const plateX = vp.visibleX + vp.visibleW * 0.72
  const nozzleX = vp.visibleX + vp.visibleW * 0.22
  const nozzleY = groundY - 60

  // 弹簧形变量（与冲击力成正比）
  const maxSpringCompression = 25
  const maxForceRef = rho * 0.05 * 10 * 10 * 2 // 最大可能力
  const springCompression = Math.min(
    (impactForce / maxForceRef) * maxSpringCompression,
    maxSpringCompression
  )

  // 粒子系统：流速 v 越大，粒子越密，运动越快
  const particles = useMemo(() => {
    const result: Particle[] = []
    
    // 粒子发射间隔与流速成反比（流速大，粒子密）
    const tGap = 0.6 / v_fluid
    // 粒子在飞行段的寿命（从管口内部开始飞行，至挡板的左表面）
    const flyTime = (plateX + springCompression - (nozzleX - 15)) / (v_fluid * 10)
    // 粒子在碰撞反弹后的寿命
    const reboundTime = 0.8
    const lifeTime = flyTime + reboundTime

    // 计算当前时间窗口内所有处于生命周期中的粒子
    const minI = Math.max(0, Math.floor((time - lifeTime) / tGap))
    const maxI = Math.ceil(time / tGap)

    for (let i = minI; i <= maxI; i++) {
      const tEmit = i * tGap
      const age = time - tEmit
      if (age < 0 || age >= lifeTime) continue

      if (age < flyTime) {
        // 飞行中：发射起点在管子内部 (nozzleX - 15)
        const x = (nozzleX - 15) + (age / flyTime) * (plateX + springCompression - (nozzleX - 15))
        const offsetY = ((i % 3) - 1) * 8
        result.push({ x, offsetY, vx: v_fluid * 10, vy: 0, age, hit: false })
      } else {
        // 反弹中
        const dt = age - flyTime
        const reboundVx = alpha * v_fluid * 10
        const x = (plateX + springCompression) - reboundVx * dt
        const offsetY = ((i % 3) - 1) * 8 + dt * 25 * ((i % 2) === 0 ? 1 : -1)
        result.push({ x, offsetY, vx: -reboundVx, vy: dt * 25, age, hit: true })
      }
    }
    return result
  }, [time, v_fluid, alpha, plateX, nozzleX, springCompression])

  // 弹簧路径（已由 Spring 组件接管，不再生成 SVG Path，保留 springCompression 供挡板使用）

  // 计算极短时间 dtWindow 内刚刚撞击挡板的粒子数并求出累计质量 dm
  // 使用分数粒子计数法（Fractional Counting），消除离散粒子计数的跳变
  const { barWidth, dm } = useMemo(() => {
    const dtWindow = 0.15 // 极短时间 Δt (s)
    const tGap = 0.6 / v_fluid

    // 分数粒子计数：直接计算浮点数范围，消除 floor/ceil 的离散跳变
    // smoothCount = dtWindow / tGap，对于等间距发射是恒定值
    const smoothCount = dtWindow / tGap

    // 每一个粒子的虚拟质量（单次累积高度，随 v_fluid 同步上升）
    const massPerParticle = v_fluid * 0.05
    const totalDm = smoothCount * massPerParticle

    // 条形图最大宽度
    const maxBarW = 160
    // 设最大 dm 参考值对应 v=10, smoothCount = 0.15 / (0.6 / 10) = 2.5
    // maxDm = 2.5 * (10 * 0.05) = 1.25
    const barW = Math.min(maxBarW, (totalDm / 1.25) * maxBarW)

    return {
      barWidth: barW,
      dm: totalDm,
    }
  }, [v_fluid])

  // ── 进阶模式 F-t 数据采样 ─────────────────────────────────────
  const advancedXMax = 5
  const currentT_adv = time % advancedXMax

  const advancedFtPointsAll = useMemo(() => {
    return [
      { x: 0, y: impactForce },
      { x: advancedXMax, y: impactForce },
    ]
  }, [impactForce])

  const advancedFtPoints = useMemo(() => {
    return [
      { x: 0, y: impactForce },
      { x: currentT_adv, y: impactForce },
    ]
  }, [impactForce, currentT_adv])

  // ── 进阶模式 p-t 数据采样 ──────────────────────────
  const advancedPtPoints = useMemo(() => {
    return [
      { x: 0, y: 0 },
      { x: currentT_adv, y: impactForce * currentT_adv },
    ]
  }, [impactForce, currentT_adv])



  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-neutral-50 rounded-xl">
      {/* ========== 左侧物理动画容器 (大 SVG) ========== */}
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 pointer-events-none select-none"
      >
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
          {/* 缓冲垫立体渐变填充，基于 colors.ts 中代表弹力的弹性支持力色 */}
          <linearGradient id="cushion-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PHYSICS_COLORS.elasticForce} stopOpacity="0.75" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.elasticForce} stopOpacity="0.25" />
          </linearGradient>
          {/* 金属零件立体反射渐变，严格使用 SCENE_COLORS */}
          <linearGradient id="metal-grad-mt" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="35%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
          </linearGradient>
        </defs>

        {/* ========== 物理地面 ========== */}
        <PhysicsGround
          x={vp.visibleX + 16}
          y={groundY}
          width={vp.visibleW - 32}
          type="ground"
          appearance={{
            color: PHYSICS_COLORS.labelText,
            fillColor: PHYSICS_COLORS.labelTextLight,
            showHatch: true,
          }}
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
              fill="url(#cushion-grad)"
              stroke={PHYSICS_COLORS.elasticForce}
              strokeWidth={1.5}
            />

            {/* 缓冲垫文字与指示标注 */}
            <line
              x1={ballCenterX + 42}
              y1={cushionTopY + 10}
              x2={ballCenterX + 52}
              y2={cushionTopY + 10}
              stroke={PHYSICS_COLORS.elasticForce}
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={ballCenterX + 55}
              y={cushionTopY + 13}
              fontSize={canvasSize.font(11)}
              fill={PHYSICS_COLORS.elasticForce}
              textAnchor="start"
              fontWeight="bold"
            >
              缓冲垫
            </text>

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
              fontSize={canvasSize.font(11)}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              m
            </text>

            {/* 速度矢量箭头 */}
            {showVectors && phase === 'falling' && fallV > 0 && (
              <VectorArrow
                origin={{ x: ballCenterX, y: groundY - ballY - R_ball - 4 }}
                vector={{ x: 0, y: -fallV }}
                type="velocity"
                sceneScale={sceneScale}
              />
            )}

            {/* 碰撞力条（支持力） */}
            {showVectors && (phase === 'compressing' || phase === 'recovering') && (
              <VectorArrow
                origin={{ x: ballCenterX, y: groundY - ballY + R_ball + 4 }}
                vector={{ x: 0, y: F_avg }}
                type="normalForce"
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
              fontSize={canvasSize.font(11)}
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
                fontSize={canvasSize.font(11)}
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
            {/* 1. 物理组件组 (全部基于 nozzleY 局部坐标系) */}
            <g transform={`translate(0, ${nozzleY})`}>
              {/* 玻璃管道背景与管壁高光线 */}
              <rect
                x={nozzleX + 15}
                y={-nozzleHeight / 2}
                width={Math.max(0, plateX + springCompression - nozzleX - 15)}
                height={nozzleHeight}
                fill="rgba(219, 234, 254, 0.12)"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth={1}
                rx={1.5}
              />
              <line
                x1={nozzleX + 15}
                y1={-nozzleHeight / 2}
                x2={plateX + springCompression}
                y2={-nozzleHeight / 2}
                stroke="rgba(255, 255, 255, 0.65)"
                strokeWidth={1.5}
              />
              <line
                x1={nozzleX + 15}
                y1={nozzleHeight / 2}
                x2={plateX + springCompression}
                y2={nozzleHeight / 2}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth={1.5}
              />

              {/* 蓝色流体柱 (比玻璃管稍细) */}
              <rect
                x={nozzleX + 15}
                y={-fluidHeight / 2}
                width={Math.max(0, plateX + springCompression - nozzleX - 15)}
                height={fluidHeight}
                fill="url(#fluid-grad)"
                rx={1}
              />

              {/* 粒子在其内部及碰撞后飞行 */}
              {particles.map((p, i) => (
                <circle
                  key={`particle-${i}`}
                  cx={p.x}
                  cy={p.offsetY}
                  r={particleR}
                  fill={p.hit ? PHYSICS_COLORS.impulse : PHYSICS_COLORS.velocity}
                  opacity={p.hit ? 0.5 : 0.8}
                />
              ))}

              {/* 管口 (精致喷嘴设计) */}
              {/* 法兰固定环 */}
              <rect
                x={nozzleX - 18}
                y={-nozzleHeight / 2 - 3}
                width={6}
                height={nozzleHeight + 6}
                rx={1.5}
                fill={SCENE_COLORS.materials.steelSphereGrad[2]}
                stroke={SCENE_COLORS.materials.steelSphereGrad[3]}
                strokeWidth={1}
              />
              {/* 喷嘴主体 */}
              <rect
                x={nozzleX - 12}
                y={-nozzleHeight / 2}
                width={27}
                height={nozzleHeight}
                rx={3}
                fill="url(#metal-grad-mt)"
                stroke={SCENE_COLORS.materials.steelSphereGrad[3]}
                strokeWidth={1.5}
              />
              <text
                x={nozzleX}
                y={-24}
                fontSize={canvasSize.font(11)}
                fill={PHYSICS_COLORS.labelTextLight}
                textAnchor="middle"
                fontWeight="bold"
              >
                管口
              </text>

              {/* 挡板 (金属材质，随受力右移) */}
              <rect
                x={plateX + springCompression}
                y={-40}
                width={MT_LAYOUT.plateWidth}
                height={MT_LAYOUT.plateHeight}
                rx={3}
                fill="url(#metal-grad-mt)"
                stroke={SCENE_COLORS.materials.steelSphereGrad[3]}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
              />

              {/* 弹簧 (随着挡板向右移动而被压缩) */}
              <Spring
                x1={plateX + springCompression + MT_LAYOUT.plateWidth}
                y1={0}
                x2={plateX + MT_LAYOUT.plateWidth + 65}
                y2={0}
                coils={8}
                radius={8}
              />

              {/* 物理标注组 */}
              {/* 冲击力数值标注 */}
              <text
                x={plateX + springCompression + MT_LAYOUT.plateWidth / 2}
                y={-55}
                fontSize={canvasSize.font(12)}
                fill={PHYSICS_COLORS.appliedForce}
                fontWeight="bold"
                textAnchor="middle"
              >
                F = {impactForce.toFixed(1)} N
              </text>

              {/* 流速标注 */}
              <text
                x={nozzleX}
                y={-55}
                fontSize={canvasSize.font(12)}
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
                textAnchor="middle"
              >
                v = {v_fluid.toFixed(1)} m/s
              </text>

              {/* Δm 标注框与文字 (随挡板移动自适应居中) */}
              <rect
                x={(nozzleX + 15 + plateX + springCompression) / 2 - fluidHeight / 2}
                y={-fluidHeight / 2}
                width={fluidHeight}
                height={fluidHeight}
                fill="none"
                stroke={PHYSICS_COLORS.momentum}
                strokeWidth={1.5}
                strokeDasharray="3,2"
              />
              <text
                x={(nozzleX + 15 + plateX + springCompression) / 2}
                y={30}
                fontSize={canvasSize.font(12)}
                fill={PHYSICS_COLORS.momentum}
                fontWeight="bold"
                textAnchor="middle"
              >
                Δm
              </text>

              {/* 实时微元质量条形图 (Δm/Δt，在管道上方悬浮) */}
              <g transform={`translate(${(nozzleX + 15 + plateX + springCompression) / 2 - 80}, -95)`}>
                {/* 背景槽 */}
                <rect
                  x={0}
                  y={0}
                  width={160}
                  height={12}
                  rx={3}
                  fill={PHYSICS_COLORS.grid}
                  opacity={0.6}
                />
                {/* 实时填充条 */}
                <rect
                  x={0}
                  y={0}
                  width={barWidth}
                  height={12}
                  rx={3}
                  fill={PHYSICS_COLORS.impulse}
                  opacity={0.85}
                />
                {/* 刷新外框 */}
                <rect
                  x={0}
                  y={0}
                  width={160}
                  height={12}
                  rx={3}
                  fill="none"
                  stroke={PHYSICS_COLORS.impulse}
                  strokeWidth={1}
                  opacity={0.4}
                />
                {/* 高考核心公式定格标注 */}
                <text
                  x={80}
                  y={-8}
                  fontSize={canvasSize.font(10)}
                  fill={PHYSICS_COLORS.labelTextLight}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  微元质量 Δm/Δt = ρSv = {(rho * S * v_fluid).toFixed(3)} kg/s
                </text>
                <text
                  x={barWidth + 4}
                  y={9}
                  fontSize={canvasSize.font(9)}
                  fill={PHYSICS_COLORS.impulse}
                  fontWeight="bold"
                  textAnchor="start"
                >
                  Δm = {dm.toFixed(3)} kg
                </text>
              </g>
            </g>

            {/* 2. 外部物理支架与矢量 (使用全局坐标系) */}
            <PhysicsGround
              x={plateX + MT_LAYOUT.plateWidth + 65}
              y={nozzleY - 50}
              width={12}
              type="wall"
              wall={{ height: 100, hatchCount: 6, hatchSide: 'right' }}
              appearance={{ color: PHYSICS_COLORS.labelText, fillColor: PHYSICS_COLORS.labelTextLight, showHatch: true }}
            />

            {/* 冲击力矢量箭头 */}
            {showVectors && (
              <VectorArrow
                origin={{ x: plateX + springCompression, y: nozzleY - groundY }}
                vector={{ x: impactForce, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
              />
            )}
          </g>
        )}
      </svg>

      {/* ========== 右侧浮动 HTML 面板卡片 (F-t & v-t 图表) ========== */}
      <div
        className="absolute top-4 right-4 bottom-4 bg-white/95 border border-neutral-200/80 rounded-2xl shadow-xl p-4 flex flex-col gap-4 overflow-y-auto"
        style={{ width: cardWidth }}
      >
        {!isAdvanced ? (
          /* 基础模式：同时展示 v-t 和 F-t 图像 */
          <>
            {/* v-t 图表区域 */}
            <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
              <RelationChart
                points={basicVtPoints}
                xDomain={[0, totalTime]}
                yDomain={[-fallV * 1.25, fallV * 1.25]}
                xLabel="时间 t (s)"
                yLabel="速度 v (m/s)"
                title="速度 v-t 图像"
                cursorX={Math.min(currentT, totalTime)}
                cursorLabel={(_, y) => `v = ${y.toFixed(2)} m/s`}
                series="primary"
                color={PHYSICS_COLORS.velocity}
                showGrid
              />
            </div>

            {/* F-t 图表区域 */}
            <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
              <RelationChart
                points={basicFtPoints}
                xDomain={[0, totalTime]}
                yDomain={[0, F_max * 1.15]}
                xLabel="时间 t (s)"
                yLabel="碰撞力 F (N)"
                title="碰撞力 F-t 图像"
                cursorX={Math.min(currentT, totalTime)}
                cursorLabel={(_, y) => `F = ${y.toFixed(1)} N`}
                series="primary"
                color={PHYSICS_COLORS.normalForce}
                showGrid
                underlay={
                  currentT > fallTime && (
                    <ChartArea
                      points={basicFtPointsAll}
                      xRange={[fallTime, Math.min(currentT, fallTime + collisionDt * 2)]}
                      baseline={0}
                      variant="impulse"
                      intensity="normal"
                    />
                  )
                }
              />
            </div>
          </>
        ) : (
          /* 进阶模式：同时展示 p-t 和 F-t 图像 */
          <>
            {/* p-t 图表区域 */}
            <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
              <RelationChart
                points={advancedPtPoints}
                xDomain={[0, advancedXMax]}
                yDomain={[0, Math.max(10, impactForce * advancedXMax * 1.15)]}
                xLabel="时间 t (s)"
                yLabel="传递动量 p (kg·m/s)"
                title="动量 p-t 图像"
                cursorX={currentT_adv}
                cursorLabel={(_, y) => `p = ${y.toFixed(2)} kg·m/s`}
                series="primary"
                color={PHYSICS_COLORS.momentum}
                showGrid
              />
            </div>

            {/* F-t 图表区域 */}
            <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
              <RelationChart
                points={advancedFtPoints}
                xDomain={[0, advancedXMax]}
                yDomain={[0, Math.max(200, impactForce * 1.25)]}
                xLabel="时间 t (s)"
                yLabel="冲击力 F (N)"
                title="恒力冲击 F-t 图像"
                cursorX={currentT_adv}
                cursorLabel={(_, y) => `F = ${y.toFixed(1)} N`}
                series="primary"
                color={PHYSICS_COLORS.appliedForce}
                showGrid
                underlay={
                  currentT_adv > 0 && (
                    <ChartArea
                      points={advancedFtPointsAll}
                      xRange={[0, currentT_adv]}
                      baseline={0}
                      variant="impulse"
                      intensity="normal"
                    />
                  )
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
