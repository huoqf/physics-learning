import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { setupCanvasDPR } from '@/hooks/useCanvasDPR'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, WAVE_COLORS, CANVAS_COLORS, STROKE, SCENE_COLORS } from '@/theme/physics'
import { sampleDiffractionField, type DiffractionFieldParams } from '@/physics/wave'

/** splitH 设计坐标 350×650（与 CANVAS_PRESETS.splitH 一致） */
const DW = 350
const DH = 650
const X_MAX = 1.2
const Y_MAX = 0.9

function paintDiffractionField(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  cssW: number,
  cssH: number,
  fieldParams: DiffractionFieldParams,
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
      const val = sampleDiffractionField(x, y, t, fieldParams)
      const n = Math.max(-1, Math.min(1, val / Math.max(amplitude, 0.2)))
      const bright = Math.floor(140 + n * 90)
      const idx = (j * cols + i) * 4
      img.data[idx] = Math.floor(bright * 0.35)
      img.data[idx + 1] = Math.floor(bright * 0.55)
      img.data[idx + 2] = Math.min(255, bright + 40)
      img.data[idx + 3] = 255
    }
  }

  // 将低分辨率采样放大到 CSS 尺寸
  const off = document.createElement('canvas')
  off.width = cols
  off.height = rows
  const octx = off.getContext('2d')
  if (!octx) return
  octx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(off, 0, 0, cssW, cssH)
}

export default function WaveDiffractionAnimation() {
  const { params, isPlaying, time, speed } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
    })),
  )

  // containerRef 挂在外层 relative 容器；SVG 与 Canvas 平级叠层
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font, width: cssW, height: cssH } = canvasSize
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const d_cm = params.d ?? 8
  const lambda_cm = params.lambda ?? 4
  const A = params.A ?? 1
  const showProbe = (params.showProbe ?? 1) === 1

  const d = d_cm / 100
  const lambda = lambda_cm / 100
  const slitX = 0.35
  const waveSpeed = 0.8

  const fieldParams = useMemo(
    () => ({
      slitWidth: d,
      wavelength: lambda,
      amplitude: A,
      slitX,
      slitY: 0,
      waveSpeed,
    }),
    [d, lambda, A],
  )

  const paintRef = useRef<() => void>(() => {})
  paintRef.current = () => {
    if (cssW <= 0 || cssH <= 0) return
    paintDiffractionField(
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

  // 设计坐标 → 叠加 SVG 使用与 vp.transform 相同的设计空间
  const slitDesignX = 120
  const midY = DH / 2
  const slitHalfPx = Math.max(6, (d / (2 * Y_MAX)) * (DH * 0.85) * 0.5)
  const barrierColor = SCENE_COLORS.optical.screenStroke
  const barrierFill = SCENE_COLORS.materials.structFill

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-50 rounded-lg shadow-inner overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      />
      {/* SVG 叠加层：标注与挡板（设计坐标 + vp.transform） */}
      <svg className="absolute inset-0 w-full h-full block select-none pointer-events-none">
        <g transform={vp.transform}>
          <rect
            x={slitDesignX - 8}
            y={20}
            width={16}
            height={Math.max(0, midY - slitHalfPx - 20)}
            fill={barrierFill}
            stroke={barrierColor}
            strokeWidth={STROKE.objectLine}
          />
          <rect
            x={slitDesignX - 8}
            y={midY + slitHalfPx}
            width={16}
            height={Math.max(0, DH - 20 - (midY + slitHalfPx))}
            fill={barrierFill}
            stroke={barrierColor}
            strokeWidth={STROKE.objectLine}
          />

          <line
            x1={28}
            y1={40}
            x2={28}
            y2={DH - 40}
            stroke={WAVE_COLORS.waveform}
            strokeWidth={STROKE.vectorMain}
          />
          <text x={32} y={36} fill={CANVAS_COLORS.labelText} fontSize={font(10)}>
            入射平面波
          </text>

          <text
            x={slitDesignX}
            y={midY - slitHalfPx - 8}
            textAnchor="middle"
            fill={CANVAS_COLORS.labelText}
            fontSize={font(10)}
          >
            {`d = ${d_cm.toFixed(1)} cm`}
          </text>

          <text x={DW - 70} y={40} fill={WAVE_COLORS.waveform} fontSize={font(10)}>
            衍射波
          </text>

          {showProbe && (
            <line
              x1={DW - 36}
              y1={40}
              x2={DW - 36}
              y2={DH - 40}
              stroke={PHYSICS_COLORS.wavelength}
              strokeWidth={STROKE.annotation}
              strokeDasharray="4 3"
            />
          )}

          <text
            x={DW / 2}
            y={DH - 16}
            textAnchor="middle"
            fill={CANVAS_COLORS.labelTextLight}
            fontSize={font(10)}
          >
            {`λ = ${lambda_cm.toFixed(1)} cm  ·  d/λ ≈ ${(d / Math.max(lambda, 1e-9)).toFixed(2)}`}
          </text>
        </g>
      </svg>
    </div>
  )
}
