import { useMemo } from 'react'
import { PHYSICS_COLORS, OPTICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { hexToRgb } from '@/utils'
import type { DoubleSlitInterferencePhysicsResult } from '../hooks/useDoubleSlitInterferencePhysics'
import type { CanvasPreset } from '@/hooks/useAnimationViewport'

interface DoubleSlitInterferenceSceneProps {
  physics: DoubleSlitInterferencePhysicsResult
  canvasSize: {
    font: (size: number) => number
    width: number
    height: number
  }
  preset: CanvasPreset
  wavelength: number
  slitDistance: number
  screenDistance: number
  time: number
}

export function DoubleSlitInterferenceScene({
  physics,
  canvasSize,
  preset,
  wavelength,
  slitDistance,
  screenDistance,
  time,
}: DoubleSlitInterferenceSceneProps) {
  const { font } = canvasSize
  const { wavelengthColor } = physics

  // ── 布局常数 — 基于设计坐标系 (840×650) ──────────────────────────────
  const DESIGN_H = preset.height  // 650
  const centerY = DESIGN_H / 2    // 325
  const screenHalf = 140
  const screenTop = centerY - screenHalf    // 185
  const screenBottom = centerY + screenHalf // 465

  // ── 视觉布局参数（从物理参数映射到设计坐标） ─────────────────────────
  const visualLayout = useMemo(() => {
    const slitX = 230
    // 缝屏视觉距离 L_vis (px) 随物理缝屏距离 L(0.5 ~ 2.0m) 动态延伸 (270px ~ 330px)
    const L_vis = 270 + (screenDistance - 0.5) * 40
    const screenX = slitX + L_vis

    // 视觉双缝间距 d_vis (px) 随 d(0.1 ~ 0.5mm) 在 12px ~ 36px 平滑渐变
    const d_vis = 12 + ((slitDistance - 0.1) / 0.4) * 24

    // 视觉条纹像素间距 fringeSpacingPx (基准 14px，对应默认参数下 ~35px)
    const baseSpacingPx = 14
    let fringeSpacingPx = (screenDistance / slitDistance) * (wavelength / 650) * baseSpacingPx
    fringeSpacingPx = Math.max(8, Math.min(160, fringeSpacingPx))

    // 反推实现几何相干对齐的波前视觉波长 visWavelength
    const visWavelength = Math.max(4, (fringeSpacingPx * d_vis) / L_vis)

    return { slitX, screenX, d_vis, fringeSpacingPx, visWavelength, L_vis }
  }, [wavelength, slitDistance, screenDistance])

  const { slitX, screenX, d_vis, fringeSpacingPx, visWavelength, L_vis } = visualLayout

  // ── 光强分布曲线 SVG Path ────────────────────────────────────────────
  const intensityPath = useMemo(() => {
    const startY = 120
    const endY = 530
    const intensityMaxX = 70
    const curveBaseX = 720
    const points: string[] = []

    for (let y = startY; y <= endY; y += 2) {
      const dy = y - centerY
      const val = Math.cos((Math.PI * dy) / fringeSpacingPx)
      const intensity = val * val
      const x = curveBaseX + intensity * intensityMaxX
      points.push(`${x.toFixed(1)},${y}`)
    }
    return `M ${curveBaseX},${startY} L ` + points.join(' L ') + ` L ${curveBaseX},${endY} Z`
  }, [fringeSpacingPx, centerY])

  // ── 波前扩散动画 ─────────────────────────────────────────────────────
  const wavefronts = useMemo(() => {
    const visSpeed = 35
    const waveOffset = (time * visSpeed) % visWavelength
    const maxRadius = L_vis + 20
    const result: number[] = []
    let r = waveOffset > 0 ? waveOffset : visWavelength
    while (r < maxRadius) {
      result.push(r)
      r += visWavelength
    }
    return result
  }, [time, visWavelength, L_vis])

  // ── 动态生成干涉条纹的 Canvas DataURL ────────────────────────────────
  const stripeDataUrl = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 410
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const rgb = hexToRgb(wavelengthColor) || { r: 255, g: 0, b: 0 }
    const centerScreenY = 205
    const imgData = ctx.createImageData(1, 410)

    for (let y = 0; y < 410; y++) {
      const dy = y - centerScreenY
      const val = Math.cos((Math.PI * dy) / fringeSpacingPx)
      const intensity = val * val
      const idx = y * 4
      imgData.data[idx] = Math.round(rgb.r * intensity)
      imgData.data[idx + 1] = Math.round(rgb.g * intensity)
      imgData.data[idx + 2] = Math.round(rgb.b * intensity)
      imgData.data[idx + 3] = 255
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL()
  }, [wavelengthColor, fringeSpacingPx])

  // ── 干涉阶数指引线 ───────────────────────────────────────────────────
  const guideLines = useMemo(() => {
    const lines = []
    const orders = [0, 1, -1, 0.5, -0.5, 2, -2]
    for (const k of orders) {
      const targetY = centerY + k * fringeSpacingPx
      if (targetY >= 120 && targetY <= 530) {
        const isConstructive = k % 1 === 0
        let label = `k=${k}`
        if (k === 0) label = '中央亮纹 (k=0)'
        else if (k === 1) label = '第1级亮纹 (k=1)'
        else if (k === -1) label = '第1级亮纹 (k=-1)'
        else if (k === 0.5) label = '第1级暗纹 (k=0.5)'
        else if (k === -0.5) label = '第1级暗纹 (k=-0.5)'

        lines.push({ targetY, isConstructive, label, k })
      }
    }
    return lines
  }, [fringeSpacingPx, centerY])

  return (
    <g>
      {/* ─── 0. 坐标中心轴 ─── */}
      <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="4 4" />

      {/* ─── 1. 激光光源 (左侧) ─── */}
      <rect x={40} y={centerY - 25} width={60} height={50} rx={4} fill={OPTICS_COLORS.mirror} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
      <rect x={100} y={centerY - 10} width={15} height={20} fill={OPTICS_COLORS.mirrorStroke} />
      <circle cx={110} cy={centerY} r={5} fill={wavelengthColor} />
      <line x1={115} y1={centerY} x2={slitX} y2={centerY} stroke={wavelengthColor} strokeWidth={3} opacity={0.8} />
      <line x1={115} y1={centerY} x2={slitX} y2={centerY} stroke={CANVAS_COLORS.white} strokeWidth={1} opacity={0.6} />
      <text x={70} y={centerY + 40} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光源</text>

      {/* ─── 2. 双缝挡板 ─── */}
      <line x1={slitX} y1={screenTop} x2={slitX} y2={centerY - d_vis / 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
      <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={screenBottom} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
      {d_vis > 14 && (
        <line x1={slitX} y1={centerY - d_vis / 2 + 3} x2={slitX} y2={centerY + d_vis / 2 - 3} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={4} />
      )}
      <circle cx={slitX} cy={centerY - d_vis / 2} r={2.5} fill={wavelengthColor} />
      <circle cx={slitX} cy={centerY + d_vis / 2} r={2.5} fill={wavelengthColor} />
      <text x={slitX - 15} y={centerY - d_vis / 2 - 5} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">S₁</text>
      <text x={slitX - 15} y={centerY + d_vis / 2 + 12} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">S₂</text>
      <text x={slitX - 10} y={screenBottom + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">双缝板</text>

      <g opacity={0.85}>
        <line x1={slitX - 12} y1={centerY - d_vis / 2} x2={slitX - 12} y2={centerY + d_vis / 2} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${slitX - 15} ${centerY - d_vis / 2 + 4} L ${slitX - 12} ${centerY - d_vis / 2} L ${slitX - 9} ${centerY - d_vis / 2 + 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${slitX - 15} ${centerY + d_vis / 2 - 4} L ${slitX - 12} ${centerY + d_vis / 2} L ${slitX - 9} ${centerY + d_vis / 2 - 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <text x={slitX - 20} y={centerY + 4} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end">d</text>
      </g>

      {/* ─── 3. 波前扩散 (相干光波弧) ─── */}
      <g>
        {wavefronts.map((r, idx) => {
          const opacity = Math.max(0, 1 - r / (screenX - slitX)) * 0.4
          return (
            <g key={idx}>
              <path d={`M ${slitX} ${centerY - d_vis / 2 - r} A ${r} ${r} 0 0 1 ${slitX + r} ${centerY - d_vis / 2}`} fill="none" stroke={wavelengthColor} strokeWidth={1.5} opacity={opacity} />
              <path d={`M ${slitX + r} ${centerY - d_vis / 2} A ${r} ${r} 0 0 1 ${slitX} ${centerY - d_vis / 2 + r}`} fill="none" stroke={wavelengthColor} strokeWidth={1.5} opacity={opacity} />
              <path d={`M ${slitX} ${centerY + d_vis / 2 - r} A ${r} ${r} 0 0 1 ${slitX + r} ${centerY + d_vis / 2}`} fill="none" stroke={wavelengthColor} strokeWidth={1.5} opacity={opacity} />
              <path d={`M ${slitX + r} ${centerY + d_vis / 2} A ${r} ${r} 0 0 1 ${slitX} ${centerY + d_vis / 2 + r}`} fill="none" stroke={wavelengthColor} strokeWidth={1.5} opacity={opacity} />
            </g>
          )
        })}
      </g>

      {/* ─── 4. 指引射线与全屏相位对齐线 ─── */}
      <g opacity={0.7}>
        {guideLines.map((line, idx) => {
          const isCenter = line.k === 0
          const color = line.isConstructive ? wavelengthColor : PHYSICS_COLORS.lightRayNormal
          const dash = line.isConstructive ? undefined : '3 3'
          return (
            <g key={idx}>
              <line x1={slitX} y1={centerY} x2={screenX} y2={line.targetY} stroke={color} strokeWidth={isCenter ? 1.5 : 1} strokeDasharray={dash} />
              <line x1={screenX} y1={line.targetY} x2={790} y2={line.targetY} stroke={withAlpha(color, isCenter ? 0.6 : 0.3)} strokeWidth={1} strokeDasharray="2 2" />
              {(isCenter || line.k === 1 || line.k === 0.5) && (
                <text x={screenX - 8} y={line.targetY - 5} fontSize={font(9)} fill={color} textAnchor="end">{line.label}</text>
              )}
            </g>
          )
        })}
      </g>

      {/* ─── 5. 缝屏距离 L 动态标注 ─── */}
      <g opacity={0.85} transform={`translate(0, 65)`}>
        <line x1={slitX} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.labelText} strokeWidth={1} strokeDasharray="2 2" />
        <path d={`M ${slitX + 6} ${centerY - 3} L ${slitX} ${centerY} L ${slitX + 6} ${centerY + 3}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${screenX - 6} ${centerY - 3} L ${screenX} ${centerY} L ${screenX - 6} ${centerY + 3}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <text x={(slitX + screenX) / 2} y={centerY - 8} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">缝屏距离 L</text>
      </g>

      {/* ─── 6. 侧视光屏 ─── */}
      <line x1={screenX} y1={screenTop} x2={screenX} y2={screenBottom} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={4} />
      <text x={screenX} y={screenBottom + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光屏 (侧视)</text>

      {/* ─── 7. 区域分割虚线 ─── */}
      <line x1={605} y1={80} x2={605} y2={560} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="3 3" />

      {/* ─── 8. 接收屏正面图 (x: 640 ~ 680) ─── */}
      <g>
        <rect x={638} y={118} width={44} height={414} rx={3} fill="none" stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
        {stripeDataUrl ? (
          <image href={stripeDataUrl} x={640} y={120} width={40} height={410} preserveAspectRatio="none" />
        ) : (
          <rect x={640} y={120} width={40} height={410} fill={SCENE_COLORS.optical.screenDarkFill} />
        )}
        <text x={660} y={555} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">光屏正面图</text>
      </g>

      {/* ─── 9. 光强分布曲线 (x: 690 ~ 790) ─── */}
      <g>
        <line x1={720} y1={120} x2={720} y2={530} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} />
        <path d="M 717 125 L 720 120 L 723 125" fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1} />
        <line x1={790} y1={120} x2={790} y2={530} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="2 2" />
        <text x={790} y={110} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I₀</text>
        <text x={720} y={110} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I = 0</text>
        <path d={intensityPath} fill={withAlpha(wavelengthColor, 0.25)} stroke={wavelengthColor} strokeWidth={2} strokeLinejoin="round" />
        <text x={745} y={555} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">光强分布 (I)</text>
      </g>
    </g>
  )
}