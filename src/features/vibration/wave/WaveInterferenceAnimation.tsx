import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAnimationViewport, useCanvasViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { WAVE_COLORS, CANVAS_COLORS, STROKE, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { hexToRgb } from '@/utils'
import { Ball } from '@/components/Physics'
import { worldToDesign, type SceneScale } from '@/scene'
import {
  sampleTwoSourceField,
  computeTwoSourcePathDifference,
  computeInterferenceCondition,
  type TwoSourceParams,
} from '@/physics/wave'

const DW = 350
const DH = 650
const X_MAX = 1.2
const Y_MAX = 0.9

function paintInterferenceField(
  setupFrame: () => CanvasRenderingContext2D | null,
  cssW: number,
  cssH: number,
  fieldParams: TwoSourceParams,
  amplitude: number,
  t: number,
  sceneScale: SceneScale,
) {
  const ctx = setupFrame()
  if (!ctx) return
  ctx.fillStyle = colors.neutral[50]
  ctx.fillRect(0, 0, cssW, cssH)

  const cols = 90
  const rows = 120
  const img = ctx.createImageData(cols, rows)

  // 从 theme token 提取 RGB 值，禁止硬编码
  const bg = hexToRgb(colors.neutral[100])!
  const pos = hexToRgb(colors.primary[500])!
  const neg = hexToRgb(colors.danger[500])!

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = (i / (cols - 1)) * DW
      const cy = (j / (rows - 1)) * DH
      // 根据标准坐标系统的映射关系求得物理坐标
      const x = (cx - sceneScale.originX) / sceneScale.scaleX
      const y = (sceneScale.originY - cy) / sceneScale.scaleY

      const val = sampleTwoSourceField(x, y, t, fieldParams)
      const n = Math.max(-1, Math.min(1, val / Math.max(amplitude * 1.5, 0.2)))

      let r = bg.r
      let g = bg.g
      let b = bg.b
      if (n >= 0) {
        r = bg.r + n * (pos.r - bg.r)
        g = bg.g + n * (pos.g - bg.g)
        b = bg.b + n * (pos.b - bg.b)
      } else {
        const absN = -n
        r = bg.r + absN * (neg.r - bg.r)
        g = bg.g + absN * (neg.g - bg.g)
        b = bg.b + absN * (neg.b - bg.b)
      }

      const idx = (j * cols + i) * 4
      img.data[idx] = Math.floor(r)
      img.data[idx + 1] = Math.floor(g)
      img.data[idx + 2] = Math.floor(b)
      img.data[idx + 3] = 255
    }
  }

  const off = document.createElement('canvas')
  off.width = cols
  off.height = rows
  const octx = off.getContext('2d')
  if (!octx) return
  octx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(off, 0, 0, cssW, cssH)
}

export default function WaveInterferenceAnimation() {
  const { params, isPlaying, time, speed } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
    })),
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font, width: cssW, height: cssH } = canvasSize
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customScaleX: (DW - 60) / X_MAX,
    customScaleY: (DH * 0.8) / (2 * Y_MAX),
    customOriginX: 30,
    customOriginY: DH / 2,
  })

  const a_cm = params.a ?? 12
  const lambda_cm = params.lambda ?? 5
  const A = params.A ?? 1
  const showNodes = (params.showNodes ?? 1) === 1
  const showDelta = (params.showDelta ?? 0) === 1

  const a = a_cm / 100
  const lambda = lambda_cm / 100
  const waveSpeed = 0.8
  const sourceX = 0.15
  const s1 = useMemo(() => ({ x: sourceX, y: -a / 2 }), [a])
  const s2 = useMemo(() => ({ x: sourceX, y: a / 2 }), [a])

  const fieldParams = useMemo(
    () => ({
      source1: s1,
      source2: s2,
      wavelength: lambda,
      amplitude: A,
      waveSpeed,
      phaseDiff: 0,
    }),
    [s1, s2, lambda, A],
  )

  const paintRef = useRef<() => void>(() => {})
  paintRef.current = () => {
    if (cssW <= 0 || cssH <= 0) return
    paintInterferenceField(
      setupFrame,
      cssW,
      cssH,
      fieldParams,
      A,
      useAnimationStore.getState().time,
      sceneScale,
    )
  }

  const handleFrame = useCallback(() => {
    paintRef.current()
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  useEffect(() => {
    paintRef.current()
  }, [fieldParams, A, time, isPlaying, cssW, cssH, sceneScale])

  const p1 = worldToDesign(s1.x, s1.y, sceneScale)
  const p2 = worldToDesign(s2.x, s2.y, sceneScale)

  const getHyperbolaPath = useCallback(
    (deltaVal: number) => {
      const deltaAbs = Math.abs(deltaVal)
      if (deltaAbs >= a) return ''
      const Ah = deltaAbs / 2
      const Bh = Math.sqrt((a / 2) ** 2 - Ah ** 2)

      const points: string[] = []
      const steps = 30
      for (let i = 0; i <= steps; i++) {
        const x = sourceX + ((X_MAX - sourceX) * i) / steps
        const term = (x - sourceX) / Bh
        const yPhys = Ah * Math.sqrt(1 + term * term)
        const y = deltaVal > 0 ? -yPhys : yPhys // deltaVal > 0 对应 y < 0 的分支；deltaVal < 0 对应 y > 0
        const pt = worldToDesign(x, y, sceneScale)
        points.push(`${pt.px.toFixed(1)},${pt.py.toFixed(1)}`)
      }
      return 'M ' + points.join(' L ')
    },
    [a, sourceX, sceneScale]
  )

  const probe = { x: 1.0, y: 0.15 }
  const r1 = Math.hypot(probe.x - s1.x, probe.y - s1.y)
  const r2 = Math.hypot(probe.x - s2.x, probe.y - s2.y)
  const delta = computeTwoSourcePathDifference(r1, r2)
  const cond = computeInterferenceCondition(delta, lambda)

  // 接收屏物理坐标在距离波源 1.0 米处（即 x = sourceX + 1.0 = 1.15 米）
  const screenDesign = worldToDesign(sourceX + 1.0, 0, sceneScale)
  const screenX = screenDesign.px

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      canvasRef={canvasRef}
      className="bg-slate-50 rounded-lg shadow-inner overflow-hidden"
    >
      <Ball cx={p1.px} cy={p1.py} r={8} type="oscillatorMetal" stroke={WAVE_COLORS.waveform} strokeWidth={2.5} />
      <Ball cx={p2.px} cy={p2.py} r={8} type="oscillatorMetal" stroke={WAVE_COLORS.waveformB} strokeWidth={2.5} />
      <text x={p1.px + 12} y={p1.py + 4} fill={WAVE_COLORS.waveform} fontSize={font(10)} fontWeight="bold">
        S₁
      </text>
      <text x={p2.px + 12} y={p2.py + 4} fill={WAVE_COLORS.waveformB} fontSize={font(10)} fontWeight="bold">
        S₂
      </text>

      {showNodes && (
        <g opacity={0.85}>
          {/* 中央加强线 */}
          <path
            d={`M ${worldToDesign(sourceX, 0, sceneScale).px.toFixed(1)},${(DH / 2).toFixed(1)} L ${screenX.toFixed(1)},${(DH / 2).toFixed(1)}`}
            stroke={WAVE_COLORS.antinodePoint}
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="none"
          />
          <text
            x={screenX - 60}
            y={DH / 2 - 6}
            fill={WAVE_COLORS.antinodePoint}
            fontSize={font(9)}
            fontWeight="bold"
          >
            中央加强
          </text>

          {/* 第一级加强线 δ = ±λ */}
          {lambda < a && (
            <>
              <path
                d={getHyperbolaPath(-lambda)}
                stroke={WAVE_COLORS.antinodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="4 3"
                opacity={0.7}
                fill="none"
              />
              <path
                d={getHyperbolaPath(lambda)}
                stroke={WAVE_COLORS.antinodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="4 3"
                opacity={0.7}
                fill="none"
              />
            </>
          )}

          {/* 第一级减弱线 δ = ±0.5λ */}
          {0.5 * lambda < a && (
            <>
              <path
                d={getHyperbolaPath(-0.5 * lambda)}
                stroke={WAVE_COLORS.nodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3 3"
                opacity={0.65}
                fill="none"
              />
              <path
                d={getHyperbolaPath(0.5 * lambda)}
                stroke={WAVE_COLORS.nodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3 3"
                opacity={0.65}
                fill="none"
              />
            </>
          )}

          {/* 第二级减弱线 δ = ±1.5λ */}
          {1.5 * lambda < a && (
            <>
              <path
                d={getHyperbolaPath(-1.5 * lambda)}
                stroke={WAVE_COLORS.nodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3 3"
                opacity={0.4}
                fill="none"
              />
              <path
                d={getHyperbolaPath(1.5 * lambda)}
                stroke={WAVE_COLORS.nodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3 3"
                opacity={0.4}
                fill="none"
              />
            </>
          )}
        </g>
      )}

      {showDelta && (
        <text
          x={DW / 2}
          y={28}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
        >
          {`δ = r₂−r₁ ≈ ${(delta * 100).toFixed(1)} cm  ·  ${
            cond === 'constructive' ? '加强' : cond === 'destructive' ? '减弱' : '部分'
          }`}
        </text>
      )}

      <text
        x={DW / 2}
        y={DH - 16}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
      >
        {`a = ${a_cm.toFixed(1)} cm  ·  λ = ${lambda_cm.toFixed(1)} cm`}
      </text>

      {/* 接收屏 */}
      <line
        x1={screenX}
        y1={50}
        x2={screenX}
        y2={DH - 50}
        stroke={SCENE_COLORS.optical.screenStroke}
        strokeWidth={STROKE.annotation}
        strokeDasharray="4 3"
      />
      <text
        x={screenX + 8}
        y={DH / 2}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(9)}
        writingMode="vertical-rl"
        textAnchor="middle"
      >
        接收屏
      </text>
    </AnimationSvgCanvas>
  )
}
