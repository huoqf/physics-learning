import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  SCENE_COLORS,
  VT_CHART_COLORS,
  STROKE,
  OPACITY,
  DASH,
  FONT,
} from '@/theme/physics'
import { calcGByLatitude, calcGByAltitude, GRAVITY } from '@/physics'
import { useFreeFallPhysics } from './useFreeFallPhysics'
import { getPhysicsAtTime } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { VelocityTimeChart } from '@/components/Chart'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

// ─── 物理常量 ────────────────────────────────────────────────────────────────
/** 管高度 (m) */
const TUBE_HEIGHT = 2.0

/** 最大同时显示水滴数 */
const MAX_DROPS = 8

/** 水滴基础半径 (px) */
const DROP_RADIUS = 6

/** 水花效果持续时间 (s) */
const SPLASH_DURATION = 0.35

/** 水花粒子数 */
const SPLASH_PARTICLES = 6

/** 频闪间隔 (s) */
const FLASH_INTERVAL = 0.1

// ─── 水滴数据结构 ────────────────────────────────────────────────────────────
interface Droplet {
  /** 生成时刻 (s) */
  birthTime: number
}

interface SplashEffect {
  /** 水滴到达管底的时刻 (s) */
  triggerTime: number
  /** 水滴到达时的 x 坐标 (px) */
  x: number
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function FreeFallDripAnimation() {
    const {params, time, showVectors, setIsPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 100, height: 100 })
  const { font } = canvasSize

  // ── 参数 ──────────────────────────────────────────────────────────────────
  const dripPeriod = params.dripPeriod ?? 0.5
  const latitude = params.latitude ?? 45
  const altitude = params.altitude ?? 0

  // ── 计算有效 g (使用下沉后的纯物理函数) ────────────────────────────────────────────
  const g0 = useMemo(() => calcGByLatitude(latitude), [latitude])
  const g = useMemo(() => calcGByAltitude(g0, altitude), [g0, altitude])

  // 将计算出的 g 同步回 params，供侧边栏显示
  const updateParam = useAnimationStore((s) => s.updateParam)
  useEffect(() => {
    if (Math.abs(g - (params.g ?? GRAVITY)) > 0.001) {
      updateParam('g', Math.round(g * 1000) / 1000)
    }
  }, [g, params.g, updateParam])

  // ── 布局分区（左动画 + 右数据）────────────────────────────────────────
  const stageRatio = 0.5
  const stageWidth = canvasSize.width * stageRatio
  const gapWidth = canvasSize.width * 0.02
  const dataX = stageWidth + gapWidth
  const dataWidth = canvasSize.width - dataX

  // ── 左侧动画舞台布局 ────────────────────────────────────────────────────
  const tubeCenterX = stageWidth * 0.5
  const tubeWidthPx = Math.min(stageWidth * 0.28, 120)
  const tubeLeft = tubeCenterX - tubeWidthPx / 2
  const tubeRight = tubeCenterX + tubeWidthPx / 2

  const tubeTopY = canvasSize.height * 0.15
  const tubeBottomY = canvasSize.height * 0.88
  const tubePixelHeight = tubeBottomY - tubeTopY

  // 物理坐标到像素的缩放
  const scale = tubePixelHeight / TUBE_HEIGHT

  const dripScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: stageWidth, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: {
      velocity: Math.sqrt(2 * g * TUBE_HEIGHT),
      acceleration: GRAVITY,
      gravity: GRAVITY,
    },
  }
  const dripSceneScale = createSceneScale(dripScene)

  // 龙头位置
  const faucetY = tubeTopY - 20
  const faucetWidth = 30
  const faucetHeight = 14

  // ── 物理引擎预计算应用 ─────────────────────────────────────────────────────
  // 滴水法中，初速度 v0=0，无空气阻力 dragK=0，质量 m=1
  const { points, groundTime } = useFreeFallPhysics(0, g, 0, 1, TUBE_HEIGHT, time)

  // ── 水滴与水花管理 ──────────────────────────────────────────────────────────
  const { droplets, splashes, nearestDrop } = useMemo(() => {
    const drops: Droplet[] = []
    const splashes: SplashEffect[] = []

    if (time > 0) {
      const lastBirth = Math.floor(time / dripPeriod) * dripPeriod
      for (let bt = 0; bt <= lastBirth + 1e-9; bt += dripPeriod) {
        const age = time - bt
        if (age >= groundTime) {
          splashes.push({ triggerTime: bt + groundTime, x: tubeCenterX })
        } else {
          drops.push({ birthTime: bt })
        }
      }
    }

    const visibleDrops = drops.slice(-MAX_DROPS)

    // 找最近的水滴（离管底最近的）
    let nearest: Droplet | null = null
    let nearestY = -1
    for (const d of visibleDrops) {
      const age = time - d.birthTime
      const state = getPhysicsAtTime(points, age, groundTime)
      if (state.y > nearestY) {
        nearestY = state.y
        nearest = d
      }
    }

    return { droplets: visibleDrops, splashes, nearestDrop: nearest }
  }, [time, dripPeriod, points, groundTime, tubeCenterX])

  // ── 最近水滴的实时物理状态 ─────────────────────────────────────────────────
  const nearestPhysics = useMemo(() => {
    if (!nearestDrop) return { v: 0, y: 0, a: g, fDrag: 0, swayAngle: 0, swayDx: 0, isLanded: false }
    const age = time - nearestDrop.birthTime
    return getPhysicsAtTime(points, age, groundTime)
  }, [nearestDrop, time, points, groundTime, g])

  // ── 活跃水花 ──────────────────────────────────────────────────────────────
  const activeSplashes = useMemo(() => {
    return splashes.filter(
      (s) => time >= s.triggerTime && time <= s.triggerTime + SPLASH_DURATION
    )
  }, [splashes, time])

  // ── 刻度标记 ──────────────────────────────────────────────────────────────
  const scaleMarks = useMemo(() => {
    const marks: { y: number; label: string }[] = []
    for (let h = 0; h <= TUBE_HEIGHT + 0.01; h += 0.5) {
      marks.push({ y: h, label: h.toFixed(1) })
    }
    return marks
  }, [])

  // ── 频闪数据表离散行（抽取） ────────────────────────────────────────────────
  const flashData = useMemo(() => {
    const intervalMs = Math.round(FLASH_INTERVAL * 100)
    return points.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % intervalMs === 0)
  }, [points, time])

  // ── 落地自动暂停 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (time > 0 && time >= groundTime) {
      setIsPlaying(false)
    }
  }, [time, groundTime, setIsPlaying])

  // ── 轨迹（最近水滴） ─────────────────────────────────────────────────────
  const trail = useMemo(() => {
    if (!nearestDrop) return []
    const age = time - nearestDrop.birthTime
    return points
      .filter((p) => p.t <= age + 1e-9)
      .map((p) => ({ x: tubeCenterX, y: tubeTopY + p.y * scale }))
  }, [nearestDrop, time, points, tubeCenterX, tubeTopY, scale])

  // ── v-t 图参数 ────────────────────────────────────────────────────────
  const vtChartTop = canvasSize.height * 0.03
  const vtChartHeight = canvasSize.height * 0.62
  const vtXMax = useMemo(() => {
    const effectiveXMax = Math.max(Math.min(groundTime * 1.2, 8), 2)
    return Math.round(effectiveXMax * 10) / 10
  }, [groundTime])

  // 用于绘制的点：按 time 截断
  const vtPoints = useMemo(() => {
    return points.filter((p) => p.t <= Math.min(time, vtXMax) + 1e-9)
  }, [points, time, vtXMax])

  // 用于坐标轴定标的“完整”点：仅按 vtXMax 截尾，不随 time 变化，避免 Y 轴动态扩张
  const vtDomainPoints = useMemo(() => {
    return points.filter((p) => p.t <= vtXMax + 1e-9)
  }, [points, vtXMax])

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">

        {/* ========== defs ========== */}
        <defs>
          {/* 水滴写实径向渐变 */}
          <radialGradient id="drop-gradient" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[0]} />
            <stop offset="30%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[1]} />
            <stop offset="75%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[3]} />
          </radialGradient>
          {/* 龙头渐变 */}
          <linearGradient id="faucet-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </linearGradient>
          {/* 玻璃管背景渐变 */}
          <linearGradient id="glass-tube-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.22" />
            <stop offset="8%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.08" />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.0" />
            <stop offset="92%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.08" />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration]} />

        {/* ========== 左侧动画舞台 ========== */}

        {/* 精密实验室标尺网格背景 */}
        {Array.from({ length: 21 }).map((_, idx) => {
          const gridY = tubeTopY + (tubePixelHeight * idx) / 20
          return (
            <line
              key={`grid-${idx}`}
              x1={tubeLeft} y1={gridY} x2={tubeRight} y2={gridY}
              stroke="rgba(148, 163, 184, 0.05)"
              strokeWidth={1}
            />
          )
        })}

        {/* 1. 滴水龙头 */}
        <g>
          {/* 龙头主体 */}
          <rect
            x={tubeCenterX - faucetWidth / 2} y={faucetY - faucetHeight}
            width={faucetWidth} height={faucetHeight} rx={3}
            fill="url(#faucet-gradient)" stroke={SCENE_COLORS.sphere.steel.stroke}
            strokeWidth={STROKE.objectThin}
          />
          {/* 喷嘴 */}
          <rect
            x={tubeCenterX - 4} y={faucetY} width={8} height={8} rx={1}
            fill={SCENE_COLORS.circuit.meterFrame} stroke={SCENE_COLORS.circuit.wire}
            strokeWidth={STROKE.objectThin}
          />
          {/* 正在形成与拉伸的水滴 */}
          {time > 0 && (() => {
            const phase = (time % dripPeriod) / dripPeriod
            const formingR = DROP_RADIUS * 0.35 + DROP_RADIUS * 0.65 * phase
            const stretch = 1.0 + phase * 0.4 // 凝聚变长
            return (
              <ellipse
                cx={tubeCenterX} cy={faucetY + 8 + formingR * 0.5 * stretch}
                rx={formingR * 0.8 / Math.sqrt(stretch)} ry={formingR * stretch}
                fill="url(#drop-gradient)" opacity={0.8 + 0.2 * phase}
              />
            )
          })()}
        </g>

        {/* 2. 带刻度玻璃竖管 */}
        <g>
          <rect
            x={tubeLeft} y={tubeTopY} width={tubeWidthPx} height={tubePixelHeight}
            fill="url(#glass-tube-grad)" stroke={PHYSICS_COLORS.labelText}
            strokeWidth={STROKE.objectLine} rx={6} opacity={0.8}
          />
          {/* 玻璃亮线 */}
          <line
            x1={tubeLeft + 3} y1={tubeTopY + 6} x2={tubeLeft + 3} y2={tubeBottomY - 6}
            stroke={colors.neutral.white} strokeWidth={1.5} opacity={0.3}
          />
          <line x1={tubeLeft} y1={tubeBottomY} x2={tubeRight} y2={tubeBottomY}
            stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
          {/* 刻度 */}
          {scaleMarks.map((mark) => {
            const py = tubeTopY + mark.y * scale
            return (
              <g key={`mark-${mark.label}`}>
                <line x1={tubeLeft - 6} y1={py} x2={tubeLeft} y2={py}
                  stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tick} opacity={0.6} />
                <text x={tubeLeft - 10} y={py + 3} fontSize={FONT.small}
                  fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
                  {mark.label}m
                </text>
              </g>
            )
          })}
        </g>

        {/* 管标题 */}
        <text x={tubeCenterX} y={tubeTopY - 38} fontSize={FONT.axis}
          fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold" opacity={0.7}>
          滴水法测 g
        </text>

        {/* 4. 水滴轨迹线（最近水滴） */}
        {trail.length >= 2 && (
          <polyline
            points={trail.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={STROKE.trackHistory} opacity={OPACITY.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
          />
        )}

        {/* 3. 多个下落中的水滴（带滴落初期的拉伸形变） */}
        {droplets.map((drop, i) => {
          const age = time - drop.birthTime
          const state = getPhysicsAtTime(points, age, groundTime)
          const pixelY = tubeTopY + state.y * scale
          if (pixelY > tubeBottomY || pixelY < tubeTopY) return null
          const isNearest = nearestDrop === drop
          
          // 水滴拉伸变长动效：速度高或处于初期年龄(0~0.2s)时，拉伸变形，之后表面张力回弹
          const stretch = 1.0 + Math.max(0, 0.45 * Math.sin(Math.min(1, age / 0.25) * Math.PI))
          const rx = (DROP_RADIUS * 0.85) / Math.sqrt(stretch)
          const ry = DROP_RADIUS * stretch

          return (
            <g key={`drop-${i}`}>
              <ellipse
                cx={tubeCenterX} cy={pixelY}
                rx={rx} ry={ry}
                fill="url(#drop-gradient)" opacity={isNearest ? 1 : 0.75}
              />
              {isNearest && (
                <circle
                  cx={tubeCenterX} cy={pixelY}
                  r={DROP_RADIUS + 4}
                  fill="none" stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.8}
                />
              )}
            </g>
          )
        })}

        {/* 5. 最近水滴速度矢量箭头 */}
        {showVectors && nearestDrop && nearestPhysics.v > 0.3 && (() => {
          const age = time - nearestDrop.birthTime
          const state = getPhysicsAtTime(points, age, groundTime)
          const pixelY = tubeTopY + state.y * scale
          if (pixelY > tubeBottomY || pixelY < tubeTopY) return null
          const arrowLen = Math.min(state.v * 5, tubeBottomY - pixelY - 10)
          if (arrowLen < 5) return null
          return (
            <g>
              <VectorArrow
                origin={{ x: tubeCenterX + DROP_RADIUS + 8, y: -pixelY }}
                vector={{ x: 0, y: -state.v }}
                type="velocity"
                sceneScale={dripSceneScale}
                strokeWidth={STROKE.vectorMain}
              />
              <text x={tubeCenterX + DROP_RADIUS + 18} y={pixelY + arrowLen / 2 + 3}
                fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
            </g>
          )
        })()}

        {/* 5b. 最近水滴重力矢量箭头 */}
        {showVectors && nearestDrop && (() => {
          const age = time - nearestDrop.birthTime
          const state = getPhysicsAtTime(points, age, groundTime)
          const pixelY = tubeTopY + state.y * scale
          if (pixelY > tubeBottomY || pixelY < tubeTopY) return null
          return (
            <g>
              <VectorArrow
                origin={{ x: tubeCenterX - DROP_RADIUS - 8, y: -pixelY }}
                vector={{ x: 0, y: -g }}
                type="gravity"
                sceneScale={dripSceneScale}
                strokeWidth={STROKE.vectorSub}
              />
              <text x={tubeCenterX - DROP_RADIUS - 18} y={pixelY + 14}
                fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">g</text>
            </g>
          )
        })()}

        {/* 6. 管底水花溅射效果（抛物线重力拟真） */}
        {activeSplashes.map((splash, i) => {
          const elapsed = time - splash.triggerTime
          const progress = elapsed / SPLASH_DURATION
          const opacity = 1 - progress
          return (
            <g key={`splash-${i}-${splash.triggerTime.toFixed(2)}`}>
              {Array.from({ length: SPLASH_PARTICLES }).map((_, p) => {
                // 水平对称角度分布
                const angle = (Math.PI / (SPLASH_PARTICLES + 1)) * (p + 1)
                const speed = 75 + p * 15 // px/s
                const tEl = elapsed
                
                // 抛物线积分：水平匀速，垂直方向受重力加速度下弯
                const dx = Math.cos(angle) * speed * tEl
                const dy = -Math.sin(angle) * speed * tEl + 0.5 * 520 * tEl * tEl
                
                const px = splash.x + dx
                const py = tubeBottomY + dy
                
                // 大小随时间收缩消散
                const r = Math.max(1, 2.5 * (1 - progress))
                return (
                  <circle key={`sp-${p}`} cx={px} cy={Math.min(py, tubeBottomY + 5)} r={r}
                    fill={PHYSICS_COLORS.velocityY} opacity={opacity * 0.9} />
                )
              })}
            </g>
          )
        })}

        {/* ========== 右侧数据/图表区 ========== */}

        {/* 频闪数据表格 */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={canvasSize.height * 0.32}
            fill="white" stroke={CHART_COLORS.gridLine} rx={4} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis}
            fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            频闪数据记录表
          </text>

          <rect y={24} width={dataWidth} height={18} fill={CHART_COLORS.gridLine} opacity={0.15} />
          <line x1={0} y1={42} x2={dataWidth} y2={42}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <text x={dataWidth * 0.15} y={37} fontSize={FONT.small}
            fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">t(s)</text>
          <text x={dataWidth * 0.4} y={37} fontSize={FONT.small}
            fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">v(m/s)</text>
          <text x={dataWidth * 0.65} y={37} fontSize={FONT.small}
            fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">y(m)</text>
          <text x={dataWidth * 0.88} y={37} fontSize={FONT.small}
            fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">Δy(m)</text>

          {flashData.map((row, i) => {
            const isCurrent = i === flashData.length - 1
            const deltaY = i > 0 ? row.y - flashData[i - 1].y : 0
            const availableH = canvasSize.height * 0.32 - 55
            const maxRows = Math.min(flashData.length, Math.floor(availableH / 16))
            const displayRows = flashData.slice(-maxRows)
            if (!displayRows.includes(row)) return null
            const idx = displayRows.indexOf(row)
            const rowY = 50 + idx * 16
            return (
              <g key={`row-${i}`}>
                {isCurrent && (
                  <rect x={0} y={rowY - 12} width={dataWidth} height={18}
                    fill={VT_CHART_COLORS.areaShade} opacity={0.25} />
                )}
                <text x={dataWidth * 0.15} y={rowY} fontSize={font(9)} fontFamily="monospace"
                  textAnchor="middle" fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText}
                  fontWeight={isCurrent ? 'bold' : 'normal'}>
                  {row.t.toFixed(1)}
                </text>
                <text x={dataWidth * 0.4} y={rowY} fontSize={font(9)} fontFamily="monospace"
                  textAnchor="middle" fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText}
                  fontWeight={isCurrent ? 'bold' : 'normal'}>
                  {row.v.toFixed(2)}
                </text>
                <text x={dataWidth * 0.65} y={rowY} fontSize={font(9)} fontFamily="monospace"
                  textAnchor="middle" fill={isCurrent ? PHYSICS_COLORS.displacement : CHART_COLORS.labelText}
                  fontWeight={isCurrent ? 'bold' : 'normal'}>
                  {row.y.toFixed(3)}
                </text>
                <text x={dataWidth * 0.88} y={rowY} fontSize={font(9)} fontFamily="monospace"
                  textAnchor="middle" fill={i > 0 ? CHART_COLORS.compareB : CHART_COLORS.labelText}
                  fontWeight={isCurrent ? 'bold' : 'normal'}>
                  {i > 0 ? deltaY.toFixed(3) : '-'}
                </text>
                <line x1={0} y1={rowY + 4} x2={dataWidth} y2={rowY + 4}
                  stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.chartRef} />
              </g>
            )
          })}
        </g>

        {/* v-t 图 */}
        <foreignObject x={dataX} y={vtChartTop + canvasSize.height * 0.32 + 12} width={dataWidth} height={vtChartHeight}>
          <div style={{ width: '100%', height: '100%' }}>
            <VelocityTimeChart
              points={vtPoints}
              domainPoints={vtDomainPoints}
              currentTime={Math.min(time, vtXMax)}
              tMax={vtXMax}
              title="速度－时间图像 (v-t 图)"
              showArea
              showGrid
            />
          </div>
        </foreignObject>

        {/* 底部文字标注（5个） */}
        <text x={dataX + 8} y={canvasSize.height * 0.97} fontSize={FONT.small}
          fill={PHYSICS_COLORS.velocity} fontFamily="monospace" fontWeight="bold">
          T = {dripPeriod.toFixed(1)} s
        </text>
        <text x={dataX + dataWidth * 0.25} y={canvasSize.height * 0.97} fontSize={FONT.small}
          fill={PHYSICS_COLORS.velocity} fontFamily="monospace" fontWeight="bold">
          v = {nearestPhysics.v.toFixed(2)} m/s
        </text>
        <text x={dataX + dataWidth * 0.5} y={canvasSize.height * 0.97} fontSize={FONT.small}
          fill={PHYSICS_COLORS.displacement} fontFamily="monospace" fontWeight="bold">
          h = {nearestPhysics.y.toFixed(3)} m
        </text>
        <text x={dataX + dataWidth * 0.75} y={canvasSize.height * 0.97} fontSize={FONT.small}
          fill={PHYSICS_COLORS.acceleration} fontFamily="monospace" fontWeight="bold">
          g = {g.toFixed(3)} m/s²
        </text>
        <text x={dataX + dataWidth} y={canvasSize.height * 0.97} fontSize={FONT.small}
          fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
          φ = {latitude.toFixed(0)}°
        </text>

      </svg>
    </div>
  )
}
