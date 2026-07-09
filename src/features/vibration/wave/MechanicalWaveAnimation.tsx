import { useCallback, useMemo, useRef, useState } from 'react'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { useViewportPointer } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE } from '@/theme/physics'
import { Ball, VectorArrow } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { createSceneScaleFromViewport } from '@/scene'
import {
  computeWaveParticleStates,
  computeWavelength,
  DEFAULT_WAVE_PARTICLE_COUNT,
  DEFAULT_TRACKED_PARTICLE_INDEX,
  DEFAULT_WAVE_CHAIN_LENGTH,
  type MechanicalWaveMode,
} from '@/physics/wave'

/** 设计坐标：splitV 700×325 */
const DESIGN_W = 700
const DESIGN_H = 325

/** 振幅 UI 参数单位 cm → 物理 m */
function cmToM(cm: number): number {
  return cm / 100
}

export default function MechanicalWaveAnimation() {
  const { params, isPlaying, time, speed } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)
  const getSvgPoint = useViewportPointer(svgRef)

  const A_cm = params.A ?? 2
  const f = params.f ?? 1
  const v = params.v ?? 2
  const mode = (params.mode ?? 0) as MechanicalWaveMode
  const showLinks = (params.showLinks ?? 1) === 1
  const showLambda = (params.showLambda ?? 0) === 1
  const lockSource = (params.lockSource ?? 0) === 1
  const phi0Deg = params.phi0 ?? 0
  const phase0 = (phi0Deg * Math.PI) / 180

  const A = cmToM(A_cm)
  const lambda = computeWavelength(f, v)

  const waveParams = useMemo(
    () => ({
      amplitude: A,
      frequency: f,
      waveSpeed: v,
      phase0,
      mode,
    }),
    [A, f, v, phase0, mode],
  )

  // 手动拖拽振源位移（m）；null 表示跟随时钟驱动
  const [manualY, setManualY] = useState<number | null>(null)
  const draggingRef = useRef(false)

  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    store.setTime(store.time + dt * store.direction)
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying && !draggingRef.current, speed })

  const particles = useMemo(
    () =>
      computeWaveParticleStates(time, waveParams, {
        count: DEFAULT_WAVE_PARTICLE_COUNT,
        length: DEFAULT_WAVE_CHAIN_LENGTH,
      }),
    [time, waveParams],
  )

  // 场景：水平链居中，x: 40..660 → 物理 0..L
  const padL = 50
  const padR = 40
  const chainPixelW = DESIGN_W - padL - padR
  const originX = padL
  const originY = DESIGN_H * 0.55
  const scaleX = chainPixelW / DEFAULT_WAVE_CHAIN_LENGTH
  // y 像素：振幅映射，最大约 70px
  const scaleY = 70 / Math.max(A, 0.005)

  const sceneScale = useMemo(() => {
    const base = createSceneScaleFromViewport(vp, 'centerScale', {
      designWidth: DESIGN_W,
      designHeight: DESIGN_H,
      worldWidth: DEFAULT_WAVE_CHAIN_LENGTH * 1.2,
      worldHeight: 0.2,
      refMagnitudes: {
        velocity: 5,
      },
      maxVectorLength: 90,
    })
    base.originX = originX
    base.originY = originY - 70
    base.scaleX = scaleX
    base.scaleY = scaleY
    return base
  }, [vp, originX, originY, scaleX, scaleY])

  const toCx = useCallback((x: number) => originX + x * scaleX, [originX, scaleX])
  const toCy = useCallback((y: number) => originY - y * scaleY, [originY, scaleY])

  const displayParticles = useMemo(() => {
    if (manualY === null || particles.length === 0) return particles
    // 拖拽时仅改写振源，其余仍由因果波决定；为即时反馈也改写源点
    return particles.map((p, i) => (i === 0 ? { ...p, y: manualY } : p))
  }, [particles, manualY])

  const linkPath = useMemo(() => {
    if (!showLinks || displayParticles.length < 2) return ''
    return displayParticles
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toCx(p.x).toFixed(1)} ${toCy(p.y).toFixed(1)}`)
      .join(' ')
  }, [displayParticles, showLinks, toCx, toCy])

  const tracked = displayParticles[DEFAULT_TRACKED_PARTICLE_INDEX]
  const source = displayParticles[0]

  const onPointerDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (lockSource) return
    const pt = getSvgPoint(e.clientX, e.clientY)
    if (!pt || !source) return
    const sx = toCx(source.x)
    const sy = toCy(source.y)
    if (Math.hypot(pt.x - sx, pt.y - sy) > 22) return
    draggingRef.current = true
    useAnimationStore.getState().setIsPlaying(false)
    const yPhys = (originY - pt.y) / scaleY
    setManualY(Math.max(-A, Math.min(A, yPhys)))
  }

  const onPointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return
    const pt = getSvgPoint(e.clientX, e.clientY)
    if (!pt) return
    const yPhys = (originY - pt.y) / scaleY
    setManualY(Math.max(-A, Math.min(A, yPhys)))
  }

  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    // 松手后恢复时钟驱动
    setManualY(null)
  }

  // 波长标注：从 x=0 到 x=λ（若 λ 在链长内）
  const lambdaPx = lambda > 0 ? lambda * scaleX : 0
  const showLambdaMark = showLambda && mode === 0 && lambda > 0 && lambda <= DEFAULT_WAVE_CHAIN_LENGTH

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      svgRef={svgRef}
      className="bg-slate-50 rounded-lg shadow-inner"
      onMouseDown={onPointerDown}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
    >
      {/* 平衡位置参考线 */}
      <line
        x1={padL}
        y1={originY}
        x2={DESIGN_W - padR}
        y2={originY}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.axis}
        strokeDasharray="4 3"
      />

      {/* 弹性纽带 */}
      {showLinks && linkPath && (
        <path
          d={linkPath}
          fill="none"
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.objectLine}
          strokeDasharray="3 2"
          opacity={0.85}
        />
      )}

      {/* 质点 P 竖直轨道 */}
      {tracked && (
        <line
          x1={toCx(tracked.x)}
          y1={originY - 80}
          x2={toCx(tracked.x)}
          y2={originY + 80}
          stroke={PHYSICS_COLORS.amplitude}
          strokeWidth={STROKE.annotation}
          strokeDasharray="2 3"
          opacity={0.45}
        />
      )}

      {/* 波长标注 */}
      {showLambdaMark && (
        <g>
          <line
            x1={padL}
            y1={originY + 95}
            x2={padL + lambdaPx}
            y2={originY + 95}
            stroke={PHYSICS_COLORS.wavelength}
            strokeWidth={STROKE.annotation}
            markerEnd="none"
          />
          <text
            x={padL + lambdaPx / 2}
            y={originY + 110}
            textAnchor="middle"
            fill={PHYSICS_COLORS.wavelength}
            fontSize={font(11)}
          >
            {`λ = ${lambda.toFixed(2)} m`}
          </text>
        </g>
      )}

      {/* 波速矢量 */}
      <VectorArrow
        origin={{ x: DEFAULT_WAVE_CHAIN_LENGTH * 0.35, y: 0.09 }}
        vector={{ x: v, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        label="v"
        font={font}
      />

      {/* 质点链 */}
      {displayParticles.map((p) => {
        const isSource = p.index === 0
        const isTracked = p.index === DEFAULT_TRACKED_PARTICLE_INDEX
        const r = isSource || isTracked ? 9 : 7
        return (
          <g key={p.index}>
            <Ball
              cx={toCx(p.x)}
              cy={toCy(p.y)}
              r={r}
              type={isSource ? 'oscillatorMetal' : 'steel'}
              stroke={
                isSource
                  ? PHYSICS_COLORS.forceNet
                  : isTracked
                    ? PHYSICS_COLORS.amplitude
                    : undefined
              }
              strokeWidth={isSource || isTracked ? 2 : 1}
              style={{ cursor: isSource && !lockSource ? 'ns-resize' : undefined }}
            />
          </g>
        )
      })}

      {/* 标注 */}
      {source && (
        <text
          x={toCx(source.x)}
          y={toCy(source.y) - 16}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight={600}
        >
          振源 S
        </text>
      )}
      {tracked && (
        <text
          x={toCx(tracked.x)}
          y={toCy(tracked.y) - 16}
          textAnchor="middle"
          fill={PHYSICS_COLORS.amplitude}
          fontSize={font(11)}
          fontWeight={600}
        >
          质点 P
        </text>
      )}
    </AnimationSvgCanvas>
  )
}
