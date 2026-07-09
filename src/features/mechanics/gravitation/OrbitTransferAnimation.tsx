import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow } from '@/components/Physics'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE, DASH, SCENE_COLORS } from '@/theme/physics'
import { createSceneScaleFromViewport } from '@/scene'
import { EARTH_RADIUS } from '@/physics/constants'
import {
  computeHohmannElements,
  computeTransferState,
  isNearApoapsis,
  megaMetersToMeters,
  type OrbitTransferPhase,
} from '@/physics/orbitTransfer'
import { EarthSvg, SatelliteSvg } from './SatelliteShapes'

/** splitH 设计坐标 */
const DW = 350
const DH = 650

export default function OrbitTransferAnimation() {
  const { params, isPlaying, time, speed, updateParam, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
      updateParam: s.updateParam,
      showVectors: s.showVectors,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  // r 以 ×10⁶ m 为单位（与 anim-satellite 一致）
  const r1mm = params.r1 ?? 7.0
  const r3mm = params.r3 ?? 14.0
  const phase = (params.phase ?? 0) as OrbitTransferPhase
  const tBurn1 = params.tBurn1 ?? 0
  const tBurn2 = params.tBurn2 ?? -1
  const showEllipse = (params.showEllipse ?? 1) === 1
  const showGravity = (params.showGravity ?? 1) === 1
  const requestBurn = params.requestBurn ?? 0
  const burnFlash = params.burnFlash ?? 0

  const r1 = megaMetersToMeters(Math.min(r1mm, r3mm - 0.2))
  const r3 = megaMetersToMeters(Math.max(r3mm, r1mm + 0.2))
  const hohmann = useMemo(() => computeHohmannElements({ r1, r3 }), [r1, r3])

  const tBurn2Eff = tBurn2 >= 0 ? tBurn2 : null
  const state = useMemo(
    () => computeTransferState({ r1, r3 }, phase, time, tBurn1, tBurn2Eff),
    [r1, r3, phase, time, tBurn1, tBurn2Eff],
  )

  // 远地点门控 → canBurn2
  const canBurn2 =
    phase === 1 && isNearApoapsis(state.trueAnomaly, 0.18) ? 1 : 0
  useEffect(() => {
    if ((params.canBurn2 ?? 0) !== canBurn2) {
      updateParam('canBurn2', canBurn2)
    }
  }, [canBurn2, params.canBurn2, updateParam])

  // 消费 requestBurn 脉冲
  const handlingBurn = useRef(false)
  useEffect(() => {
    if (!requestBurn || handlingBurn.current) return
    handlingBurn.current = true
    const store = useAnimationStore.getState()
    if (requestBurn === 1 && (store.params.phase ?? 0) === 0) {
      store.updateParam('phase', 1)
      store.updateParam('tBurn1', store.time)
      store.updateParam('burnFlash', 1)
      store.setIsPlaying(true)
    } else if (
      requestBurn === 2 &&
      (store.params.phase ?? 0) === 1 &&
      (store.params.canBurn2 ?? 0) === 1
    ) {
      store.updateParam('phase', 2)
      store.updateParam('tBurn2', store.time)
      store.updateParam('burnFlash', 1)
      store.setIsPlaying(true)
    }
    store.updateParam('requestBurn', 0)
    // 喷焰闪一下后清除
    window.setTimeout(() => {
      useAnimationStore.getState().updateParam('burnFlash', 0)
      handlingBurn.current = false
    }, 400)
  }, [requestBurn])

  // r1/r3 变化：回到低轨（与 paramMeta resetOnChange 时间重置配合）
  const prevR = useRef({ r1mm, r3mm })
  useEffect(() => {
    if (prevR.current.r1mm !== r1mm || prevR.current.r3mm !== r3mm) {
      prevR.current = { r1mm, r3mm }
      updateParam('phase', 0)
      updateParam('tBurn1', 0)
      updateParam('tBurn2', -1)
      updateParam('canBurn2', 0)
      updateParam('requestBurn', 0)
      updateParam('burnFlash', 0)
    }
  }, [r1mm, r3mm, updateParam])

  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    // 教学时间缩放：物理轨道很快，用 timeScale
    const timeScale = 80
    store.setTime(store.time + dt * store.direction * timeScale)
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  // 像素比例：使 r3 圆落入画布
  const cx = DW / 2
  const cy = DH / 2
  const maxR = Math.max(r3, r1) * 1.15
  const scale = Math.min((DW * 0.42) / maxR, (DH * 0.42) / maxR)
  const earthPx = Math.max(18, EARTH_RADIUS * scale)

  const sceneScale = useMemo(() => {
    const base = createSceneScaleFromViewport(vp, 'centerScale', {
      designWidth: DW,
      designHeight: DH,
      worldWidth: maxR * 2.4,
      worldHeight: maxR * 2.4,
      refMagnitudes: {
        velocity: hohmann.vp || 8000,
        gravity: 1,
      },
      maxVectorLength: 48,
    })
    base.originX = cx
    base.originY = cy
    base.scaleX = scale
    base.scaleY = scale
    return base
  }, [vp, maxR, scale, hohmann.vp, cx, cy])

  const satX = cx + state.x * scale
  const satY = cy - state.y * scale
  const angleRad = Math.atan2(state.vy, state.vx)

  // 椭圆路径（焦点在地心）
  const ellipsePath = useMemo(() => {
    if (hohmann.a <= 0) return ''
    const a = hohmann.a
    const e = hohmann.e
    const b = a * Math.sqrt(Math.max(0, 1 - e * e))
    const steps = 96
    const pts: string[] = []
    for (let i = 0; i <= steps; i++) {
      const E = (2 * Math.PI * i) / steps
      const x = a * (Math.cos(E) - e)
      const y = b * Math.sin(E)
      const px = cx + x * scale
      const py = cy - y * scale
      pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
    }
    return pts.join(' ') + ' Z'
  }, [hohmann.a, hohmann.e, scale, cx, cy])

  // 喷焰：速度反向
  const flashOn = burnFlash === 1
  const speedMag = Math.hypot(state.vx, state.vy) || 1
  const thrDir = { x: -state.vx / speedMag, y: -state.vy / speedMag }

  const r1px = r1 * scale
  const r3px = r3 * scale

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="bg-slate-50 rounded-lg shadow-inner"
    >
      <defs>
        <radialGradient id="orbit-earth-ocean-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.earthOceanGrad[0]} />
          <stop offset="55%" stopColor={SCENE_COLORS.materials.earthOceanGrad[1]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.earthOceanGrad[2]} />
        </radialGradient>
        {/* EarthSvg 期望 id=earth-ocean-grad */}
        <radialGradient id="earth-ocean-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.earthOceanGrad[0]} />
          <stop offset="55%" stopColor={SCENE_COLORS.materials.earthOceanGrad[1]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.earthOceanGrad[2]} />
        </radialGradient>
      </defs>

      {/* 高圆轨 3 */}
      <circle
        cx={cx}
        cy={cy}
        r={r3px}
        fill="none"
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.grid}
        strokeDasharray={DASH.trackHistory?.join?.(' ') ?? '4 4'}
        opacity={0.55}
      />
      <text
        x={cx + r3px * 0.72}
        y={cy - r3px * 0.72}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(9)}
      >
        轨 3
      </text>

      {/* 低圆轨 1 */}
      <circle
        cx={cx}
        cy={cy}
        r={r1px}
        fill="none"
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.axis}
        opacity={0.75}
      />
      <text
        x={cx + r1px * 0.75}
        y={cy - r1px * 0.55}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(9)}
      >
        轨 1
      </text>

      {/* 转移椭圆 */}
      {showEllipse && ellipsePath && (
        <path
          d={ellipsePath}
          fill="none"
          stroke={PHYSICS_COLORS.wavelength}
          strokeWidth={STROKE.objectThin}
          strokeDasharray="5 3"
          opacity={phase === 0 ? 0.45 : 0.9}
        />
      )}
      {showEllipse && (
        <text
          x={cx - hohmann.a * scale * 0.35}
          y={cy + 14}
          fill={PHYSICS_COLORS.wavelength}
          fontSize={font(9)}
        >
          轨 2 椭圆
        </text>
      )}

      {/* 近/远地点标记 */}
      <circle cx={cx + r1px} cy={cy} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.8} />
      <text x={cx + r1px + 6} y={cy + 4} fill={CANVAS_COLORS.labelText} fontSize={font(8)}>
        P
      </text>
      <circle cx={cx - r3px} cy={cy} r={3} fill={PHYSICS_COLORS.wavelength} opacity={0.8} />
      <text x={cx - r3px - 14} y={cy + 4} fill={CANVAS_COLORS.labelText} fontSize={font(8)}>
        A
      </text>

      <EarthSvg centerX={cx} centerY={cy} earthRadiusPx={earthPx} />

      {/* 飞船 */}
      <g transform={`translate(${satX}, ${satY})`}>
        {flashOn && (
          <g>
            <polygon
              points={`0,0 ${thrDir.x * 16},${-thrDir.y * 16} ${thrDir.x * 8 - thrDir.y * 4},${-thrDir.y * 8 - thrDir.x * 4}`}
              fill={PHYSICS_COLORS.forceNet}
              opacity={0.85}
            />
            <line
              x1={0}
              y1={0}
              x2={thrDir.x * 18}
              y2={-thrDir.y * 18}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={2}
              opacity={0.7}
            />
          </g>
        )}
        <SatelliteSvg angleRad={angleRad} scale={0.7} />
      </g>

      {/* 矢量 */}
      {(showVectors || showGravity) && (
        <g>
          {showGravity && (
            <VectorArrow
              origin={{ x: state.x, y: state.y }}
              vector={{ x: -state.x, y: -state.y }}
              type="gravity"
              sceneScale={sceneScale}
              label="F引"
              font={font}
            />
          )}
          {showVectors && (
            <VectorArrow
              origin={{ x: state.x, y: state.y }}
              vector={{ x: state.vx, y: state.vy }}
              type="velocity"
              sceneScale={sceneScale}
              label="v"
              font={font}
              color={PHYSICS_COLORS.velocity}
            />
          )}
        </g>
      )}

      {/* 阶段角标 */}
      <text x={12} y={22} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight={600}>
        {phase === 0 ? '阶段：低轨巡航' : phase === 1 ? '阶段：转移椭圆' : '阶段：高轨巡航'}
      </text>
      <text x={12} y={38} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)}>
        {`v = ${(state.v / 1000).toFixed(2)} km/s · η = ${state.eta.toFixed(2)}`}
      </text>
      {phase === 1 && canBurn2 === 1 && (
        <text x={12} y={54} fill={PHYSICS_COLORS.forceNet} fontSize={font(9)} fontWeight={600}>
          已到远地点 — 可再次点火
        </text>
      )}
    </AnimationSvgCanvas>
  )
}