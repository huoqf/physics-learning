import { useMemo } from 'react'
import { PHYSICS_COLORS, OPTICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { hexToRgb } from '@/utils'
import type { SceneScale } from '@/scene'
import type { DoubleSlitInterferencePhysicsResult } from '../hooks/useDoubleSlitInterferencePhysics'

/** 暗色光屏背景 */
const DARK_SCREEN_BG = '#000000'

interface DoubleSlitInterferenceSceneProps {
  physics: DoubleSlitInterferencePhysicsResult
  canvasSize: {
    font: (size: number) => number
    width: number
    height: number
  }
  wavelength: number
  slitDistance: number
  screenDistance: number
  sceneScale: SceneScale
}

export function DoubleSlitInterferenceScene({
  physics,
  canvasSize,
  wavelength,
  slitDistance,
  screenDistance,
}: DoubleSlitInterferenceSceneProps) {
  const { font } = canvasSize
  const { wavelengthColor, wavefronts, intensityPath } = physics

  // 1. 视觉缩放常数
  const centerY = 200 // 光路部分的 Y 轴中心
  const slitX = 240   // 双缝板的 X 坐标
  const screenX = 580 // 光屏侧视的 X 坐标
  
  // 视觉缝距 (0.1mm - 0.5mm 映射到 12px - 50px)
  const d_vis = slitDistance * 100

  // 视觉条纹像素间距 (针对高度 410px，中心 325px 的屏幕正面图)
  const baseSpacingPx = 30
  let fringeSpacingPx = (screenDistance / slitDistance) * (wavelength / 650) * baseSpacingPx
  fringeSpacingPx = Math.max(6, Math.min(400, fringeSpacingPx))

  // 2. 动态生成干涉条纹的 Canvas DataURL
  const stripeDataUrl = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 410 // 屏幕正面图高度
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const rgb = hexToRgb(wavelengthColor) || { r: 255, g: 0, b: 0 }
    const centerScreenY = 205 // 410 / 2
    const imgData = ctx.createImageData(1, 410)

    for (let y = 0; y < 410; y++) {
      const dy = y - centerScreenY
      const val = Math.cos((Math.PI * dy) / fringeSpacingPx)
      const intensity = val * val // cos^2 相对光强
      
      const idx = y * 4
      imgData.data[idx] = Math.round(rgb.r * intensity)
      imgData.data[idx + 1] = Math.round(rgb.g * intensity)
      imgData.data[idx + 2] = Math.round(rgb.b * intensity)
      imgData.data[idx + 3] = 255
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL()
  }, [wavelengthColor, fringeSpacingPx])

  // 3. 产生指引虚线 (加强区/减弱区)
  // 侧视屏高度为 160px，从 120 到 280，中心在 200
  // 侧视条纹间距
  const sideFringeSpacingPx = fringeSpacingPx * 0.4 
  const guideLines = useMemo(() => {
    const lines = []
    // 产生 k = -1, -0.5, 0, 0.5, 1 的指引路径
    const orders = [-1, -0.5, 0, 0.5, 1]
    for (const k of orders) {
      const targetY = centerY + k * sideFringeSpacingPx
      const isConstructive = k % 1 === 0 // 整数阶为相长干涉（亮纹）
      lines.push({
        targetY,
        isConstructive,
        label: k === 0 ? '加强区 (k=0)' : k > 0 ? `加强区 (k=${k})` : `加强区 (k=${k})`,
        textY: targetY,
        k,
      })
    }
    return lines
  }, [sideFringeSpacingPx])

  return (
    <g>
      {/* ─── 0. 坐标网格 ─── */}
      <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="4 4" />

      {/* ─── 1. 激光光源 (左侧) ─── */}
      {/* 激光器外观 */}
      <rect x={40} y={centerY - 25} width={60} height={50} rx={4} fill={OPTICS_COLORS.mirror} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
      <rect x={100} y={centerY - 10} width={15} height={20} fill={OPTICS_COLORS.mirrorStroke} />
      <circle cx={110} cy={centerY} r={5} fill={wavelengthColor} />
      {/* 激光出射束 */}
      <line x1={115} y1={centerY} x2={slitX} y2={centerY} stroke={wavelengthColor} strokeWidth={3} opacity={0.8} />
      <line x1={115} y1={centerY} x2={slitX} y2={centerY} stroke={CANVAS_COLORS.white} strokeWidth={1} opacity={0.6} />
      <text x={70} y={centerY + 40} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光源</text>

      {/* ─── 2. 双缝挡板 (中部) ─── */}
      {/* 挡板主体 */}
      <line x1={slitX} y1={80} x2={slitX} y2={centerY - d_vis / 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
      <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={320} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
      {/* 遮光板中央连接部分 */}
      {d_vis > 12 && (
        <line x1={slitX} y1={centerY - d_vis / 2 + 3} x2={slitX} y2={centerY + d_vis / 2 - 3} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={4} />
      )}
      
      {/* 双缝 S1, S2 高亮缝眼 */}
      <circle cx={slitX} cy={centerY - d_vis / 2} r={2} fill={wavelengthColor} />
      <circle cx={slitX} cy={centerY + d_vis / 2} r={2} fill={wavelengthColor} />
      
      {/* 狭缝标注 */}
      <text x={slitX - 15} y={centerY - d_vis / 2 - 5} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">S₁</text>
      <text x={slitX - 15} y={centerY + d_vis / 2 + 12} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">S₂</text>
      <text x={slitX - 10} y={340} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">双缝板</text>

      {/* 缝距 d 尺寸标注 */}
      <g opacity={0.85}>
        <line x1={slitX - 12} y1={centerY - d_vis / 2} x2={slitX - 12} y2={centerY + d_vis / 2} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${slitX - 15} ${centerY - d_vis / 2 + 4} L ${slitX - 12} ${centerY - d_vis / 2} L ${slitX - 9} ${centerY - d_vis / 2 + 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${slitX - 15} ${centerY + d_vis / 2 - 4} L ${slitX - 12} ${centerY + d_vis / 2} L ${slitX - 9} ${centerY + d_vis / 2 - 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <text x={slitX - 22} y={centerY + 4} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end">d</text>
      </g>

      {/* ─── 3. 波前扩散 (相干光波) ─── */}
      <g>
        {wavefronts.map((r, idx) => {
          // 随着扩散越远，波前光强逐渐减弱
          const opacity = Math.max(0, 1 - r / (screenX - slitX)) * 0.35
          return (
            <g key={idx}>
              {/* S1 发出的圆弧波前 */}
              <path
                d={`M ${slitX} ${centerY - d_vis / 2 - r} A ${r} ${r} 0 0 1 ${slitX + r} ${centerY - d_vis / 2}`}
                fill="none"
                stroke={wavelengthColor}
                strokeWidth={1.5}
                opacity={opacity}
              />
              <path
                d={`M ${slitX + r} ${centerY - d_vis / 2} A ${r} ${r} 0 0 1 ${slitX} ${centerY - d_vis / 2 + r}`}
                fill="none"
                stroke={wavelengthColor}
                strokeWidth={1.5}
                opacity={opacity}
              />

              {/* S2 发出的圆弧波前 */}
              <path
                d={`M ${slitX} ${centerY + d_vis / 2 - r} A ${r} ${r} 0 0 1 ${slitX + r} ${centerY + d_vis / 2}`}
                fill="none"
                stroke={wavelengthColor}
                strokeWidth={1.5}
                opacity={opacity}
              />
              <path
                d={`M ${slitX + r} ${centerY + d_vis / 2} A ${r} ${r} 0 0 1 ${slitX} ${centerY + d_vis / 2 + r}`}
                fill="none"
                stroke={wavelengthColor}
                strokeWidth={1.5}
                opacity={opacity}
              />
            </g>
          )
        })}
      </g>

      {/* ─── 4. 指引线 (加强/减弱路径) ─── */}
      <g opacity={0.6}>
        {guideLines.map((line, idx) => {
          const isCenter = line.k === 0
          const color = line.isConstructive ? wavelengthColor : PHYSICS_COLORS.lightRayNormal
          const dash = line.isConstructive ? undefined : '3 3'
          return (
            <g key={idx}>
              {/* 从双缝中心到光屏上的路径 */}
              <line
                x1={slitX}
                y1={centerY}
                x2={screenX}
                y2={line.targetY}
                stroke={color}
                strokeWidth={isCenter ? 1.5 : 1}
                strokeDasharray={dash}
              />
              {/* 仅在屏幕上方和下方标注典型干涉阶数 */}
              {isCenter && (
                <text
                  x={screenX - 10}
                  y={line.targetY - 6}
                  fontSize={font(10)}
                  fill={wavelengthColor}
                  textAnchor="end"
                >
                  中央亮纹 (k=0)
                </text>
              )}
              {line.k === 1 && (
                <text
                  x={screenX - 10}
                  y={line.targetY - 6}
                  fontSize={font(9)}
                  fill={wavelengthColor}
                  textAnchor="end"
                >
                  第一级亮纹 (k=1)
                </text>
              )}
              {line.k === 0.5 && (
                <text
                  x={screenX - 10}
                  y={line.targetY - 4}
                  fontSize={font(9)}
                  fill={PHYSICS_COLORS.lightRayNormal}
                  textAnchor="end"
                >
                  第一级暗纹 (k=0.5)
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* ─── 5. 缝屏距离 L 标注 ─── */}
      <g opacity={0.8} transform={`translate(0, 60)`}>
        <line x1={slitX} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.labelText} strokeWidth={1} strokeDasharray="2 2" />
        <path d={`M ${slitX + 6} ${centerY - 3} L ${slitX} ${centerY} L ${slitX + 6} ${centerY + 3}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${screenX - 6} ${centerY - 3} L ${screenX} ${centerY} L ${screenX - 6} ${centerY + 3}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <text x={(slitX + screenX) / 2} y={centerY - 8} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">缝屏距离 L</text>
      </g>

      {/* ─── 6. 侧视光屏 (右侧) ─── */}
      <line x1={screenX} y1={80} x2={screenX} y2={320} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={4} />
      <text x={screenX} y={340} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光屏 (侧视)</text>

      {/* ─── 7. 屏幕正面图与光强曲线分割线 ─── */}
      <line x1={605} y1={80} x2={605} y2={560} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="3 3" />

      {/* ─── 8. 接收屏正面图 (x: 640 ~ 680) ─── */}
      <g>
        {/* 金属框 */}
        <rect x={638} y={118} width={44} height={414} rx={3} fill="none" stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
        {/* 干涉条纹 DataURL 贴图 */}
        {stripeDataUrl ? (
          <image
            href={stripeDataUrl}
            x={640}
            y={120}
            width={40}
            height={410}
            preserveAspectRatio="none"
          />
        ) : (
          <rect x={640} y={120} width={40} height={410} fill={DARK_SCREEN_BG} />
        )}
        <text x={660} y={555} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          光屏正面图
        </text>
      </g>

      {/* ─── 9. 光强分布曲线 (x: 690 ~ 790) ─── */}
      <g>
        {/* 光强分布基准线 */}
        <line x1={720} y1={120} x2={720} y2={530} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} />
        <path d="M 717 125 L 720 120 L 723 125" fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1} />
        
        {/* 虚线代表最大光强边界 I0 */}
        <line x1={790} y1={120} x2={790} y2={530} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="2 2" />
        <text x={790} y={110} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I₀</text>
        <text x={720} y={110} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I = 0</text>

        {/* 光强分布曲线 */}
        <path
          d={intensityPath}
          fill={withAlpha(wavelengthColor, 0.25)}
          stroke={wavelengthColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 对齐标线：在中央亮纹处画一条虚线连接条纹与曲线波峰 */}
        <line x1={680} y1={325} x2={790} y2={325} stroke={withAlpha(wavelengthColor, 0.6)} strokeWidth={1} strokeDasharray="3 3" />
        
        <text x={745} y={555} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          光强分布 (I)
        </text>
      </g>
    </g>
  )
}
