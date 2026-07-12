import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useCanvasViewport } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { SECOND_LAW_COLORS, SCENE_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import {
  initHeatConductionParticles,
  initDiffusionParticles,
  stepParticles,
  computeMicrostates,
  temperatureToColor,
  computeTemperatureDiff,
  computeParticleDistribution,
  type Particle,
  type Scenario,
} from '@/physics/secondLaw'

const SECOND_LAW_DESIGN = { width: 700, height: 400 } as const

// ─── 常量 ─────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 160
const T_HOT = 500
const T_COLD = 200
const EQUILIBRIUM_DELTA_T = 15
const UNIFORMITY_THRESHOLD = 0.05

// ─── 布局比例 ──────────────────────────────────────────────────────────
const LAYOUT = {
  containerLeftRatio:   0.08,
  containerTopRatio:    0.12,
  containerWidthRatio:  0.84,
  containerHeightRatio: 0.72,
  labelTopRatio:        0.03,
  statusBottomRatio:    0.92,
}

// ─── 快照环形缓冲 ─────────────────────────────────────────────────────
const SNAPSHOT_BUFFER_SIZE = 300

export default function SecondLawAnimation() {
  const { params, isPlaying, time, direction } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      direction: s.direction,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: SECOND_LAW_DESIGN.width,
    designHeight: SECOND_LAW_DESIGN.height,
  })

  const scene = params.scene ?? 0
  const scenario: Scenario = scene === 0 ? 'heat-conduction' : 'gas-diffusion'

  // ─── 粒子状态 ──────────────────────────────────────────────────────
  const particlesRef = useRef<Particle[]>([])
  const snapshotsRef = useRef<Particle[][]>([])
  const snapshotIndexRef = useRef(0)
  const [, setTick] = useState(0)

  // 初始化粒子
  useEffect(() => {
    if (scenario === 'heat-conduction') {
      particlesRef.current = initHeatConductionParticles(PARTICLE_COUNT, 0.5, 42)
    } else {
      particlesRef.current = initDiffusionParticles(PARTICLE_COUNT, 123)
    }
    snapshotsRef.current = []
    snapshotIndexRef.current = 0
    setTick((t) => t + 1)
  }, [scenario])

  // ─── 逆向播放时读取快照 ──────────────────────────────────────────
  const isReversing = direction === -1 && isPlaying

  // ─── 粒子物理步进 ─────────────────────────────────────────────────
  const stepPhysics = useCallback(
    (dt: number) => {
      const partitionOpen = scenario === 'gas-diffusion' ? true : false
      stepParticles(particlesRef.current, dt, scenario, partitionOpen)
    },
    [scenario],
  )

  // ─── 动画帧回调 ────────────────────────────────────────────────────
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      if (direction === 1) {
        // 正向：步进物理 + 保存快照
        stepPhysics(dt)
        const snapshot = particlesRef.current.map((p) => ({ ...p }))
        if (snapshotsRef.current.length >= SNAPSHOT_BUFFER_SIZE) {
          snapshotsRef.current.shift()
        }
        snapshotsRef.current.push(snapshot)
      } else {
        // 逆向：从快照回读
        if (snapshotsRef.current.length > 0) {
          snapshotIndexRef.current = Math.max(
            0,
            snapshotsRef.current.length - 1,
          )
          const snapshot = snapshotsRef.current[snapshotIndexRef.current]
          particlesRef.current = snapshot.map((p) => ({ ...p }))
          snapshotsRef.current.pop()
        }
      }

      setTick((t) => t + 1)
    },
    [direction, stepPhysics],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying, speed: 1 })

  // ─── 无序度计算 ──────────────────────────────────────────────────
  const entropy = useMemo(
    () => computeMicrostates(particlesRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [particlesRef.current.length, time],
  )

  // ─── 布局计算 ──────────────────────────────────────────────────────
  const container = useMemo(() => ({
    x: vp.visibleX + vp.visibleW * LAYOUT.containerLeftRatio,
    y: vp.visibleY + vp.visibleH * LAYOUT.containerTopRatio,
    w: vp.visibleW * LAYOUT.containerWidthRatio,
    h: vp.visibleH * LAYOUT.containerHeightRatio,
  }), [vp.visibleX, vp.visibleY, vp.visibleW, vp.visibleH])

  const midX = container.x + container.w / 2

  // ─── Canvas 渲染 ──────────────────────────────────────────────────
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  useEffect(() => {
    const ctx = setupFrame()
    if (!ctx) return

    // 绘制容器背景
    if (scenario === 'gas-diffusion') {
      // 左侧：气体区
      ctx.fillStyle = SECOND_LAW_COLORS.containerFill
      ctx.fillRect(container.x, container.y, container.w / 2, container.h)
      // 右侧：真空区
      ctx.fillStyle = SECOND_LAW_COLORS.vacuum
      ctx.globalAlpha = 0.15
      ctx.fillRect(midX, container.y, container.w / 2, container.h)
      ctx.globalAlpha = 1
    } else {
      // 热传导：左右分区背景
      ctx.fillStyle = SECOND_LAW_COLORS.hotZone
      ctx.fillRect(container.x, container.y, container.w / 2, container.h)
      ctx.fillStyle = SECOND_LAW_COLORS.coldZone
      ctx.fillRect(midX, container.y, container.w / 2, container.h)
    }

    // 绘制粒子
    const particleRadius = Math.max(2, Math.min(4, container.w / PARTICLE_COUNT * 0.8))
    for (const p of particlesRef.current) {
      const px = container.x + p.x * container.w
      const py = container.y + p.y * container.h

      if (scenario === 'heat-conduction') {
        ctx.fillStyle = temperatureToColor(p.temperature, T_HOT, T_COLD)
      } else {
        ctx.fillStyle = SECOND_LAW_COLORS.coldParticle
      }
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(px, py, particleRadius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [scenario, container, midX, time, setupFrame])

  // ─── 平衡态检测 ─────────────────────────────────────────────────
  const isEquilibrium = useMemo(() => {
    if (scenario === 'heat-conduction') {
      const { deltaT } = computeTemperatureDiff(particlesRef.current)
      return deltaT < EQUILIBRIUM_DELTA_T
    }
    const { ratio } = computeParticleDistribution(particlesRef.current)
    return ratio < UNIFORMITY_THRESHOLD
  }, [scenario])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Canvas 粒子层 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* SVG 叠加层：容器边框、隔板、标注、警告框 */}
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0"
        style={{ zIndex: 10 }}
      >
        {/* 场景标题 */}
        <text
          x={vp.visibleX + vp.visibleW / 2}
          y={vp.visibleY + vp.visibleH * LAYOUT.labelTopRatio + 10}
          fontSize={font(13)}
          fontWeight="bold"
          fill={colors.neutral[800]}
          textAnchor="middle"
          fontFamily={FONT.family}
        >
          {scenario === 'heat-conduction'
            ? '演示一：热量传导方向（自发过程）'
            : '演示二：气体自由膨胀（自发过程）'}
        </text>

        {/* 容器边框 */}
        <rect
          x={container.x}
          y={container.y}
          width={container.w}
          height={container.h}
          fill="none"
          stroke={SECOND_LAW_COLORS.containerWall}
          strokeWidth={STROKE.objectLine}
          rx={4}
        />

        {/* 隔板（气体扩散场景） */}
        {scenario === 'gas-diffusion' && (
          <line
            x1={midX}
            y1={container.y}
            x2={midX}
            y2={container.y + container.h}
            stroke={SECOND_LAW_COLORS.partition}
            strokeWidth={STROKE.objectLine}
            strokeDasharray="6 4"
          />
        )}

        {/* 热传导隔板 */}
        {scenario === 'heat-conduction' && (
          <line
            x1={midX}
            y1={container.y}
            x2={midX}
            y2={container.y + container.h}
            stroke={SECOND_LAW_COLORS.partition}
            strokeWidth={1}
            opacity={0.4}
          />
        )}

        {/* 左右温度/粒子标注 */}
        {scenario === 'heat-conduction' ? (
          <>
            <text
              x={container.x + container.w * 0.25}
              y={container.y + container.h + 16}
              fontSize={font(10)}
              fill={SECOND_LAW_COLORS.hotParticle}
              textAnchor="middle"
              fontFamily={FONT.family}
            >
              高温端 (500K)
            </text>
            <text
              x={container.x + container.w * 0.75}
              y={container.y + container.h + 16}
              fontSize={font(10)}
              fill={SECOND_LAW_COLORS.coldParticle}
              textAnchor="middle"
              fontFamily={FONT.family}
            >
              低温端 (200K)
            </text>
          </>
        ) : (
          <>
            <text
              x={container.x + container.w * 0.25}
              y={container.y + container.h + 16}
              fontSize={font(10)}
              fill={SECOND_LAW_COLORS.coldParticle}
              textAnchor="middle"
              fontFamily={FONT.family}
            >
              气体（左侧）
            </text>
            <text
              x={container.x + container.w * 0.75}
              y={container.y + container.h + 16}
              fontSize={font(10)}
              fill={colors.neutral[400]}
              textAnchor="middle"
              fontFamily={FONT.family}
            >
              真空（右侧）
            </text>
          </>
        )}

        {/* 状态标注 */}
        <text
          x={vp.visibleX + vp.visibleW / 2}
          y={vp.visibleY + vp.visibleH * LAYOUT.statusBottomRatio}
          fontSize={font(11)}
          fill={isEquilibrium ? SECOND_LAW_COLORS.equilibriumLabel : SCENE_COLORS.materials.structStrokeLight}
          textAnchor="middle"
          fontWeight={isEquilibrium ? 'bold' : 'normal'}
          fontFamily={FONT.family}
        >
          {isEquilibrium
            ? '✓ 已达热平衡 / 均匀分布'
            : `无序度 S = ${entropy.normalizedEntropy.toFixed(3)}  |  Ω = e^${entropy.lnOmega.toFixed(1)}`}
        </text>

        {/* 逆向警告框 */}
        {isReversing && (
          <g>
            <rect
              x={vp.visibleX + vp.visibleW * 0.15}
              y={vp.visibleY + vp.visibleH * 0.35}
              width={vp.visibleW * 0.7}
              height={vp.visibleH * 0.18}
              fill={SECOND_LAW_COLORS.warningBg}
              stroke={SECOND_LAW_COLORS.warningBorder}
              strokeWidth={2}
              rx={8}
              opacity={0.92}
            />
            <text
              x={vp.visibleX + vp.visibleW / 2}
              y={vp.visibleY + vp.visibleH * 0.42}
              fontSize={font(15)}
              fontWeight="bold"
              fill={SECOND_LAW_COLORS.warningText}
              textAnchor="middle"
              fontFamily={FONT.family}
            >
              非自发过程：违反热力学第二定律
            </text>
            <text
              x={vp.visibleX + vp.visibleW / 2}
              y={vp.visibleY + vp.visibleH * 0.48}
              fontSize={font(11)}
              fill={SECOND_LAW_COLORS.warningText}
              textAnchor="middle"
              fontFamily={FONT.family}
              opacity={0.8}
            >
              在没有外界干预的情况下，热量不会自动从低温传向高温
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
