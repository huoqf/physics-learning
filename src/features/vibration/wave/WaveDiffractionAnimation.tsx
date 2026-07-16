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
import { worldToDesign, type SceneScale } from '@/scene'
import { sampleDiffractionField, type DiffractionFieldParams } from '@/physics/wave'

/** splitH 设计坐标 420×650（与 CANVAS_PRESETS.splitH 一致） */
const DW = 420
const DH = 650
const X_MAX = 1.2
const Y_MAX = 0.9

function paintDiffractionField(
  setupFrame: () => CanvasRenderingContext2D | null,
  cssW: number,
  cssH: number,
  fieldParams: DiffractionFieldParams,
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

      const val = sampleDiffractionField(x, y, t, fieldParams)
      const n = Math.max(-1, Math.min(1, val / Math.max(amplitude, 0.2)))

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
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font, width: cssW, height: cssH } = canvasSize
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customScaleX: DW / X_MAX,
    customScaleY: (DH * 0.85) / (2 * Y_MAX),
    customOriginX: 0,
    customOriginY: DH / 2,
  })

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

  // 根据标准坐标系统计算挡板及缝位置，杜绝硬编码
  const slitDesign = worldToDesign(slitX, 0, sceneScale)
  const slitDesignX = slitDesign.px
  
  const slitTopDesign = worldToDesign(slitX, d / 2, sceneScale)
  const slitTopY = slitTopDesign.py
  
  const slitBottomDesign = worldToDesign(slitX, -d / 2, sceneScale)
  const slitBottomY = slitBottomDesign.py

  const barrierColor = SCENE_COLORS.optical.screenStroke

  // 接收屏在距离缝刚好 0.75 米处（即物理坐标 x = slitX + 0.75 = 1.10 米）
  const screenDesign = worldToDesign(slitX + 0.75, 0, sceneScale)
  const screenX = screenDesign.px

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      canvasRef={canvasRef}
      className="bg-slate-50 rounded-lg shadow-inner overflow-hidden"
    >
      <defs>
        <linearGradient id="barrier-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="30%" stopColor="#64748B" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>

      {/* 上挡板 */}
      <rect
        x={slitDesignX - 8}
        y={20}
        width={16}
        height={Math.max(0, slitTopY - 20)}
        fill="url(#barrier-grad)"
        stroke={barrierColor}
        strokeWidth={STROKE.objectLine}
        rx={2}
      />
      {/* 下挡板 */}
      <rect
        x={slitDesignX - 8}
        y={slitBottomY}
        width={16}
        height={Math.max(0, DH - 20 - slitBottomY)}
        fill="url(#barrier-grad)"
        stroke={barrierColor}
        strokeWidth={STROKE.objectLine}
        rx={2}
      />

      <line
        x1={28}
        y1={40}
        x2={28}
        y2={DH - 40}
        stroke={WAVE_COLORS.waveform}
        strokeWidth={STROKE.vectorMain}
      />
      <text x={32} y={36} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold">
        入射平面波
      </text>

      <text
        x={slitDesignX}
        y={slitTopY - 8}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(10)}
        fontWeight="bold"
      >
        {`d = ${d_cm.toFixed(1)} cm`}
      </text>

      <text x={DW - 70} y={40} fill={WAVE_COLORS.waveform} fontSize={font(10)} fontWeight="bold">
        衍射波
      </text>

      {showProbe && (
        <>
          <line
            x1={screenX}
            y1={40}
            x2={screenX}
            y2={DH - 40}
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
        </>
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
    </AnimationSvgCanvas>
  )
}
