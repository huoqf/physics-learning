import { useMemo } from 'react'
import { OPTICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { hexToRgb } from '@/utils'
import type { DiffractionPhysicsResult } from '../hooks/useDiffractionPhysics'

/** 暗色光屏背景 */
const DARK_SCREEN_BG = '#000000'

interface DiffractionSceneProps {
  physics: DiffractionPhysicsResult
  canvasSize: {
    font: (size: number) => number
    width: number
    height: number
  }
  mode: 'single-slit' | 'circular' | 'poisson'
  wavelength: number
  obstacleSize: number
  screenDistance: number
}

/**
 * 一阶贝塞尔函数 J1(x) 的高精度数值逼近 (用于 Canvas 渲染)
 */
function j1(x: number): number {
  const ax = Math.abs(x)
  if (ax < 8.0) {
    const y = x * x
    const ans1 = 1.0 - y / 8.0 + (y * y) / 192.0 - (y * y * y) / 9216.0 + (y * y * y * y) / 737280.0
    return x * 0.5 * ans1
  } else {
    const theta = ax - (3.0 * Math.PI) / 4.0
    return Math.sqrt(2.0 / (Math.PI * ax)) * Math.cos(theta) * (x < 0 ? -1 : 1)
  }
}

export function DiffractionScene({
  physics,
  canvasSize,
  mode,
  wavelength,
  obstacleSize,
  screenDistance,
}: DiffractionSceneProps) {
  const { font } = canvasSize
  const { wavelengthColor, wavefronts, intensityPath } = physics

  // 1. 视景几何定位常量 (840×650 响应式动态平移)
  const centerY = 325 // 光路主光轴的 Y 轴中心
  const slitX = 200   // 隔板/障碍物的 X 坐标
  
  // 侧视屏的 X 坐标随缝屏距离 L (0.5m ~ 2.0m) 动态缩放平移 (X: 380px ~ 600px)
  const screenX = Math.round(200 + 180 + (screenDistance - 0.5) * 140)

  const screenTopY = 85
  const screenBottomY = 565
  const screenHeight = 480

  // 计算视觉的障碍物或缝隙尺寸
  let d_vis = 10
  if (mode === 'single-slit') {
    d_vis = obstacleSize * 100
  } else if (mode === 'circular') {
    d_vis = obstacleSize * 150
  } else if (mode === 'poisson') {
    d_vis = (obstacleSize / 0.15) * 35
  }

  // 2. 动态生成衍射条纹的 Canvas DataURL (正面光屏 95×480)
  const stripeDataUrl = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const canvas = document.createElement('canvas')
    canvas.width = 95
    canvas.height = screenHeight // 正面屏高度 (Y 轴: 85 ~ 565，共 480px)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const rgb = hexToRgb(wavelengthColor) || { r: 255, g: 0, b: 0 }
    const centerCanvasX = 47.5
    const centerCanvasY = 240 // 480 / 2
    const imgData = ctx.createImageData(95, screenHeight)

    // 条纹间距缩放参数，与物理 Hook 保持完全一致
    const baseSpacingPx = 50
    const specSpacingPx = (screenDistance / (obstacleSize * 10)) * (wavelength / 650) * baseSpacingPx
    const spacingPx = Math.max(8, Math.min(300, specSpacingPx))

    for (let y = 0; y < screenHeight; y++) {
      const dy = y - centerCanvasY
      for (let x = 0; x < 95; x++) {
        const dx = x - centerCanvasX
        const r = Math.sqrt(dx * dx + dy * dy)
        let intensity = 0

        if (mode === 'single-slit') {
          if (Math.abs(dy) < 1e-4) {
            intensity = 1.0
          } else {
            const beta = (Math.PI * dy) / spacingPx
            const s = Math.sin(beta) / beta
            intensity = s * s
          }
        } else if (mode === 'circular') {
          if (Math.abs(r) < 1e-4) {
            intensity = 1.0
          } else {
            const beta = (3.8317 * r) / spacingPx
            const j1Val = j1(beta)
            const s = (2 * j1Val) / beta
            intensity = s * s
          }
        } else if (mode === 'poisson') {
          const R_shadow = (obstacleSize / 0.15) * 45
          const w_spot = 2.5
          const I_spot = 0.85 * Math.exp(-(r * r) / (w_spot * w_spot))
          const I_shadow = I_spot + 0.05 * Math.cos((3 * Math.PI * r) / R_shadow) * Math.cos((3 * Math.PI * r) / R_shadow) * (1 - r / R_shadow)

          const w_period = 15.0
          const I_outside = 1.0 + (0.35 * R_shadow) / Math.max(1, r) * Math.cos((2 * Math.PI * (r - R_shadow)) / w_period) * Math.exp(-(r - R_shadow) / (2.5 * R_shadow))

          const t = 1 / (1 + Math.exp(-(r - R_shadow) / 2))
          intensity = (1 - t) * I_shadow + t * I_outside
          intensity = Math.max(0, Math.min(1.5, intensity))
        }

        const idx = (y * 95 + x) * 4
        imgData.data[idx] = Math.round(Math.min(255, rgb.r * intensity))
        imgData.data[idx + 1] = Math.round(Math.min(255, rgb.g * intensity))
        imgData.data[idx + 2] = Math.round(Math.min(255, rgb.b * intensity))
        imgData.data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL()
  }, [wavelengthColor, mode, wavelength, obstacleSize, screenDistance])

  // 3. 计算辅助几何阴影区域 (用于泊松亮斑模式下的指示)
  const R_shadow_side = useMemo(() => {
    if (mode !== 'poisson') return 0
    return (obstacleSize / 0.15) * 45
  }, [mode, obstacleSize])

  return (
    <g>
      {/* ─── 0. 坐标网格 / 主光轴 ─── */}
      <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="4 4" />

      {/* ─── 1. 激光光源 (左侧 x: 30 ~ 90) ─── */}
      <rect x={30} y={centerY - 25} width={60} height={50} rx={4} fill={OPTICS_COLORS.mirror} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
      <rect x={90} y={centerY - 10} width={15} height={20} fill={OPTICS_COLORS.mirrorStroke} />
      <circle cx={100} cy={centerY} r={5} fill={wavelengthColor} />
      {/* 激光束 */}
      <line x1={105} y1={centerY} x2={slitX} y2={centerY} stroke={wavelengthColor} strokeWidth={4} opacity={0.85} />
      <line x1={105} y1={centerY} x2={slitX} y2={centerY} stroke={CANVAS_COLORS.white} strokeWidth={1.5} opacity={0.7} />
      <text x={60} y={centerY + 42} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光源</text>

      {/* ─── 2. 障碍物隔板 (中部 x = 200) ─── */}
      {mode === 'single-slit' && (
        <g>
          {/* 单缝挡板 (上下两块) */}
          <line x1={slitX} y1={screenTopY} x2={slitX} y2={centerY - d_vis / 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={screenBottomY} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          {/* 缝隙高亮边缘 */}
          <circle cx={slitX} cy={centerY - d_vis / 2} r={1.5} fill={wavelengthColor} />
          <circle cx={slitX} cy={centerY + d_vis / 2} r={1.5} fill={wavelengthColor} />
          <text x={slitX - 12} y={centerY - d_vis / 2 - 6} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">单缝</text>
          <text x={slitX} y={screenBottomY + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">单缝板</text>
          
          {/* 缝宽 a 尺寸标注 */}
          <g opacity={0.85}>
            <line x1={slitX - 12} y1={centerY - d_vis / 2} x2={slitX - 12} y2={centerY + d_vis / 2} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY - d_vis / 2 + 4} L ${slitX - 12} ${centerY - d_vis / 2} L ${slitX - 9} ${centerY - d_vis / 2 + 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY + d_vis / 2 - 4} L ${slitX - 12} ${centerY + d_vis / 2} L ${slitX - 9} ${centerY + d_vis / 2 - 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <text x={slitX - 20} y={centerY + 4} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end">a</text>
          </g>
        </g>
      )}

      {mode === 'circular' && (
        <g>
          {/* 圆孔挡板 */}
          <line x1={slitX} y1={screenTopY} x2={slitX} y2={centerY - d_vis / 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={screenBottomY} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          {/* 三维透视小圆孔 */}
          <ellipse cx={slitX} cy={centerY} rx={2} ry={d_vis / 2} fill={withAlpha(wavelengthColor, 0.4)} stroke={wavelengthColor} strokeWidth={1.5} />
          <text x={slitX - 12} y={centerY - d_vis / 2 - 6} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">圆孔</text>
          <text x={slitX} y={screenBottomY + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">圆孔板</text>
          
          {/* 孔径 d 尺寸标注 */}
          <g opacity={0.85}>
            <line x1={slitX - 12} y1={centerY - d_vis / 2} x2={slitX - 12} y2={centerY + d_vis / 2} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY - d_vis / 2 + 4} L ${slitX - 12} ${centerY - d_vis / 2} L ${slitX - 9} ${centerY - d_vis / 2 + 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY + d_vis / 2 - 4} L ${slitX - 12} ${centerY + d_vis / 2} L ${slitX - 9} ${centerY + d_vis / 2 - 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <text x={slitX - 20} y={centerY + 4} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end">d</text>
          </g>
        </g>
      )}

      {mode === 'poisson' && (
        <g>
          {/* 支撑架 */}
          <line x1={slitX} y1={screenTopY} x2={slitX} y2={centerY - d_vis / 2} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={screenBottomY} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          {/* 圆板剖面 */}
          <rect x={slitX - 3} y={centerY - d_vis / 2} width={6} height={d_vis} rx={1} fill={OPTICS_COLORS.mirrorStroke} stroke={OPTICS_COLORS.mirror} strokeWidth={1} />
          <text x={slitX - 12} y={centerY - d_vis / 2 - 6} fontSize={font(11)} fill={OPTICS_COLORS.mirrorStroke} textAnchor="end">圆板障碍物</text>
          <text x={slitX} y={screenBottomY + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">圆板</text>

          {/* 圆板直径 D 尺寸标注 */}
          <g opacity={0.85}>
            <line x1={slitX - 12} y1={centerY - d_vis / 2} x2={slitX - 12} y2={centerY + d_vis / 2} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY - d_vis / 2 + 4} L ${slitX - 12} ${centerY - d_vis / 2} L ${slitX - 9} ${centerY - d_vis / 2 + 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY + d_vis / 2 - 4} L ${slitX - 12} ${centerY + d_vis / 2} L ${slitX - 9} ${centerY + d_vis / 2 - 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <text x={slitX - 20} y={centerY + 4} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end">D</text>
          </g>
        </g>
      )}

      {/* ─── 3. 波前扩散 (衍射波 限制在 slitX ~ screenX) ─── */}
      <g>
        {wavefronts.map(([r, dy], idx) => {
          const opacity = Math.max(0, 1 - r / (screenX - slitX)) * 0.35
          const cy = centerY + dy

          return (
            <g key={idx}>
              {/* 向右扩散的圆弧波前 */}
              <path
                d={`M ${slitX} ${cy - r} A ${r} ${r} 0 0 1 ${slitX + r} ${cy}`}
                fill="none"
                stroke={wavelengthColor}
                strokeWidth={1.5}
                opacity={opacity}
              />
              <path
                d={`M ${slitX + r} ${cy} A ${r} ${r} 0 0 1 ${slitX} ${cy + r}`}
                fill="none"
                stroke={wavelengthColor}
                strokeWidth={1.5}
                opacity={opacity}
              />
            </g>
          )
        })}
      </g>

      {/* ─── 4. 光阴影与相干路径指引线 (动态响应 screenX) ─── */}
      {mode === 'poisson' ? (
        <g opacity={0.65}>
          {/* 几何阴影边界线 */}
          <line x1={slitX} y1={centerY - d_vis / 2} x2={screenX} y2={centerY - R_shadow_side} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={screenX} y2={centerY + R_shadow_side} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={1} strokeDasharray="3 3" />
          {/* 几何阴影范围填充 */}
          <path
            d={`M ${slitX} ${centerY - d_vis / 2} L ${screenX} ${centerY - R_shadow_side} L ${screenX} ${centerY + R_shadow_side} L ${slitX} ${centerY + d_vis / 2} Z`}
            fill={withAlpha(OPTICS_COLORS.mirrorStroke, 0.08)}
          />
          {/* 衍射光波在中心点汇聚 */}
          <line x1={slitX} y1={centerY - d_vis / 2} x2={screenX} y2={centerY} stroke={wavelengthColor} strokeWidth={1.2} />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={screenX} y2={centerY} stroke={wavelengthColor} strokeWidth={1.2} />
          <text x={screenX - 10} y={centerY - 8} fontSize={font(10)} fill={wavelengthColor} textAnchor="end">泊松亮斑 (中心极大值)</text>
          <text x={screenX - 10} y={centerY - R_shadow_side + 14} fontSize={font(9)} fill={OPTICS_COLORS.mirrorStroke} textAnchor="end">几何阴影区</text>
        </g>
      ) : (
        <g opacity={0.6}>
          {/* 单缝/圆孔衍射：发散的边界指示线 */}
          <line x1={slitX} y1={centerY} x2={screenX} y2={centerY - 120} stroke={wavelengthColor} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={slitX} y1={centerY} x2={screenX} y2={centerY + 120} stroke={wavelengthColor} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={slitX} y1={centerY} x2={screenX} y2={centerY} stroke={wavelengthColor} strokeWidth={1.5} />
          <text x={screenX - 10} y={centerY - 8} fontSize={font(10)} fill={wavelengthColor} textAnchor="end">中央极大</text>
        </g>
      )}

      {/* ─── 5. 缝屏距离 L 动态标注与尺寸双向箭头 ─── */}
      <g opacity={0.85} transform={`translate(0, ${screenBottomY - 10})`}>
        <line x1={slitX} y1={0} x2={screenX} y2={0} stroke={CANVAS_COLORS.labelText} strokeWidth={1} strokeDasharray="2 2" />
        <path d={`M ${slitX + 6} -3 L ${slitX} 0 L ${slitX + 6} 3`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <path d={`M ${screenX - 6} -3 L ${screenX} 0 L ${screenX - 6} 3`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <text x={(slitX + screenX) / 2} y={-8} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          L = {screenDistance.toFixed(1)} m
        </text>
      </g>

      {/* ─── 6. 侧视光屏 (动态 x = screenX) ─── */}
      <line x1={screenX} y1={screenTopY} x2={screenX} y2={screenBottomY} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={4} />
      <text x={screenX} y={screenBottomY + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光屏 (侧视)</text>

      {/* ─── 7. 屏幕正面图与光强曲线固定区域分隔线 (x = 615) ─── */}
      <line x1={615} y1={screenTopY} x2={615} y2={screenBottomY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="3 3" />

      {/* ─── 8. 接收屏正面图 (x: 625 ~ 720，宽 95px，高 480px) ─── */}
      <g>
        {/* 金属框 */}
        <rect x={623} y={screenTopY - 2} width={99} height={screenHeight + 4} rx={3} fill="none" stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
        {/* 衍射条纹 Canvas DataURL 贴图 */}
        {stripeDataUrl ? (
          <image
            href={stripeDataUrl}
            x={625}
            y={screenTopY}
            width={95}
            height={screenHeight}
            preserveAspectRatio="none"
          />
        ) : (
          <rect x={625} y={screenTopY} width={95} height={screenHeight} fill={DARK_SCREEN_BG} />
        )}
        <text x={672} y={screenBottomY + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          光屏正面图
        </text>
      </g>

      {/* ─── 9. 光强分布曲线 (x: 735 ~ 825) ─── */}
      <g>
        {/* 光强分布基准线 */}
        <line x1={690} y1={screenTopY} x2={690} y2={screenBottomY} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} />
        <path d="M 687 90 L 690 85 L 693 90" fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1} />
        
        {/* 虚线代表最大光强边界 I0 */}
        <line x1={780} y1={screenTopY} x2={780} y2={screenBottomY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="2 2" />
        <text x={780} y={screenTopY - 10} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I₀</text>
        <text x={690} y={screenTopY - 10} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I = 0</text>

        {/* 光强分布曲线 */}
        <path
          d={intensityPath}
          fill={withAlpha(wavelengthColor, 0.25)}
          stroke={wavelengthColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 辅助线：连接正中心亮斑与光强最大波峰 */}
        <line x1={680} y1={centerY} x2={780} y2={centerY} stroke={withAlpha(wavelengthColor, 0.5)} strokeWidth={1} strokeDasharray="3 3" />
        
        <text x={740} y={screenBottomY + 20} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          光强分布 (I)
        </text>
      </g>
    </g>
  )
}
