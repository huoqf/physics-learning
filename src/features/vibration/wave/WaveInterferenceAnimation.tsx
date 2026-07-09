import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { setupCanvasDPR } from '@/hooks/useCanvasDPR'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, WAVE_COLORS, CANVAS_COLORS, STROKE } from '@/theme/physics'
import { Ball } from '@/components/Physics'
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
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  cssW: number,
  cssH: number,
  fieldParams: TwoSourceParams,
  amplitude: number,
  t: number,
) {
  const ctx = setupCanvasDPR(canvasRef, cssW, cssH)
  if (!ctx) return
  ctx.fillStyle = CANVAS_COLORS.objectFill
  ctx.fillRect(0, 0, cssW, cssH)

  const cols = 90
  const rows = 120
  const img = ctx.createImageData(cols, rows)

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const xn = i / (cols - 1)
      const yn = j / (rows - 1)
      const x = xn * X_MAX
      const y = (0.5 - yn) * 2 * Y_MAX
      const val = sampleTwoSourceField(x, y, t, fieldParams)
      const n = Math.max(-1, Math.min(1, val / Math.max(amplitude * 1.5, 0.2)))
      const bright = Math.floor(130 + n * 100)
      const idx = (j * cols + i) * 4
      img.data[idx] = Math.floor(bright * 0.4)
      img.data[idx + 1] = Math.floor(bright * 0.5)
      img.data[idx + 2] = Math.min(255, bright + 50)
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

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font, width: cssW, height: cssH } = canvasSize
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      canvasRef,
      cssW,
      cssH,
      fieldParams,
      A,
      useAnimationStore.getState().time,
    )
  }

  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt > 0 && dt <= 0.1) {
      const store = useAnimationStore.getState()
      store.setTime(store.time + dt * store.direction)
    }
    paintRef.current()
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  useEffect(() => {
    paintRef.current()
  }, [fieldParams, A, time, isPlaying, cssW, cssH])

  const toDesign = (x: number, y: number) => ({
    cx: 30 + (x / X_MAX) * (DW - 60),
    cy: DH / 2 - (y / Y_MAX) * (DH * 0.4),
  })
  const p1 = toDesign(s1.x, s1.y)
  const p2 = toDesign(s2.x, s2.y)

  const probe = { x: 1.0, y: 0.15 }
  const r1 = Math.hypot(probe.x - s1.x, probe.y - s1.y)
  const r2 = Math.hypot(probe.x - s2.x, probe.y - s2.y)
  const delta = computeTwoSourcePathDifference(r1, r2)
  const cond = computeInterferenceCondition(delta, lambda)
  const mid = toDesign(0.6, 0)

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-50 rounded-lg shadow-inner overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      />
      <svg className="absolute inset-0 w-full h-full block select-none pointer-events-none">
        <g transform={vp.transform}>
          <Ball cx={p1.cx} cy={p1.cy} r={8} type="oscillatorMetal" stroke={WAVE_COLORS.waveform} strokeWidth={2} />
          <Ball cx={p2.cx} cy={p2.cy} r={8} type="oscillatorMetal" stroke={WAVE_COLORS.waveformB} strokeWidth={2} />
          <text x={p1.cx + 12} y={p1.cy + 4} fill={WAVE_COLORS.waveform} fontSize={font(10)}>
            S₁
          </text>
          <text x={p2.cx + 12} y={p2.cy + 4} fill={WAVE_COLORS.waveformB} fontSize={font(10)}>
            S₂
          </text>

          {showNodes && (
            <g opacity={0.7}>
              <line
                x1={p1.cx}
                y1={mid.cy}
                x2={DW - 30}
                y2={mid.cy}
                stroke={WAVE_COLORS.antinodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="5 4"
              />
              <text x={DW - 90} y={mid.cy - 6} fill={WAVE_COLORS.antinodePoint} fontSize={font(9)}>
                中央加强
              </text>
              <line
                x1={p1.cx}
                y1={mid.cy - 55}
                x2={DW - 30}
                y2={mid.cy - 40}
                stroke={WAVE_COLORS.nodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <line
                x1={p1.cx}
                y1={mid.cy + 55}
                x2={DW - 30}
                y2={mid.cy + 40}
                stroke={WAVE_COLORS.nodePoint}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3 3"
                opacity={0.6}
              />
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

          <line
            x1={DW - 36}
            y1={50}
            x2={DW - 36}
            y2={DH - 50}
            stroke={PHYSICS_COLORS.wavelength}
            strokeWidth={STROKE.annotation}
            strokeDasharray="4 3"
          />
        </g>
      </svg>
    </div>
  )
}
