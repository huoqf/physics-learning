import { useMemo } from 'react'
import { OPTICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { hexToRgb } from '@/utils'
import type { SceneScale } from '@/scene'
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
  sceneScale: SceneScale
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

  // 1. 视觉几何定位常量
  const centerY = 200 // 光路部分的 Y 轴中心
  const slitX = 240   // 隔板/障碍物的 X 坐标
  const screenX = 580 // 侧视屏的 X 坐标

  // 计算视觉的障碍物或缝隙尺寸
  let d_vis = 10
  if (mode === 'single-slit') {
    // 单缝宽度视觉显示 (0.04mm - 0.25mm 映射到 4px - 26px)
    d_vis = obstacleSize * 100
  } else if (mode === 'circular') {
    // 圆孔孔径视觉显示 (0.04mm - 0.25mm 映射到 6px - 38px)
    d_vis = obstacleSize * 150
  } else if (mode === 'poisson') {
    // 圆板直径视觉显示 (0.04mm - 0.25mm 映射到 12px - 60px)
    d_vis = (obstacleSize / 0.15) * 35
  }

  // 2. 动态生成衍射条纹的 Canvas DataURL (高分辨率正面光屏)
  const stripeDataUrl = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 410 // 正面屏高度 (Y 轴: 120 ~ 530，共 410px)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const rgb = hexToRgb(wavelengthColor) || { r: 255, g: 0, b: 0 }
    const centerCanvasX = 50
    const centerCanvasY = 205 // 410 / 2
    const imgData = ctx.createImageData(100, 410)

    // 条纹间距缩放参数，与物理 Hook 保持完全一致
    const baseSpacingPx = 50
    const specSpacingPx = (screenDistance / (obstacleSize * 10)) * (wavelength / 650) * baseSpacingPx
    const spacingPx = Math.max(8, Math.min(300, specSpacingPx))

    for (let y = 0; y < 410; y++) {
      const dy = y - centerCanvasY
      for (let x = 0; x < 100; x++) {
        const dx = x - centerCanvasX
        const r = Math.sqrt(dx * dx + dy * dy)
        let intensity = 0

        if (mode === 'single-slit') {
          // 单缝衍射是一维的，光强只随垂直坐标 dy 变化
          if (Math.abs(dy) < 1e-4) {
            intensity = 1.0
          } else {
            const beta = (Math.PI * dy) / spacingPx
            const s = Math.sin(beta) / beta
            intensity = s * s
          }
        } else if (mode === 'circular') {
          // 圆孔衍射是二维对称的，光强随径向距离 r 变化
          if (Math.abs(r) < 1e-4) {
            intensity = 1.0
          } else {
            const beta = (3.8317 * r) / spacingPx
            const j1Val = j1(beta)
            const s = (2 * j1Val) / beta
            intensity = s * s
          }
        } else if (mode === 'poisson') {
          // 泊松亮斑：几何阴影内的极亮尖峰及阴影外的衍射环
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

        const idx = (y * 100 + x) * 4
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
    // 侧视屏上阴影的高度半径。基准 (0.15mm) 对应 25 像素
    return (obstacleSize / 0.15) * 25
  }, [mode, obstacleSize])

  return (
    <g>
      {/* ─── 0. 坐标网格 / 光轴 ─── */}
      <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="4 4" />

      {/* ─── 1. 激光光源 (左侧) ─── */}
      <rect x={40} y={centerY - 25} width={60} height={50} rx={4} fill={OPTICS_COLORS.mirror} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
      <rect x={100} y={centerY - 10} width={15} height={20} fill={OPTICS_COLORS.mirrorStroke} />
      <circle cx={110} cy={centerY} r={5} fill={wavelengthColor} />
      {/* 激光束 */}
      <line x1={115} y1={centerY} x2={slitX} y2={centerY} stroke={wavelengthColor} strokeWidth={4} opacity={0.8} />
      <line x1={115} y1={centerY} x2={slitX} y2={centerY} stroke={CANVAS_COLORS.white} strokeWidth={1.5} opacity={0.6} />
      <text x={70} y={centerY + 40} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">光源</text>

      {/* ─── 2. 障碍物隔板 (中部) ─── */}
      {mode === 'single-slit' && (
        <g>
          {/* 单缝挡板 (上下两块) */}
          <line x1={slitX} y1={80} x2={slitX} y2={centerY - d_vis / 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={320} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          {/* 缝隙高亮边缘 */}
          <circle cx={slitX} cy={centerY - d_vis / 2} r={1.5} fill={wavelengthColor} />
          <circle cx={slitX} cy={centerY + d_vis / 2} r={1.5} fill={wavelengthColor} />
          <text x={slitX - 12} y={centerY - d_vis / 2 - 5} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">单缝</text>
          <text x={slitX} y={340} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">单缝板</text>
          
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
          {/* 圆孔挡板 (上下挡板，中心稍微断开) */}
          <line x1={slitX} y1={80} x2={slitX} y2={centerY - d_vis / 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={320} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={6} strokeLinecap="round" />
          {/* 三维透视小圆孔 */}
          <ellipse cx={slitX} cy={centerY} rx={2} ry={d_vis / 2} fill={withAlpha(wavelengthColor, 0.4)} stroke={wavelengthColor} strokeWidth={1.5} />
          <text x={slitX - 12} y={centerY - d_vis / 2 - 5} fontSize={font(11)} fill={wavelengthColor} textAnchor="end">圆孔</text>
          <text x={slitX} y={340} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">圆孔板</text>
          
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
          {/* 支撑架 (灰色细线) */}
          <line x1={slitX} y1={80} x2={slitX} y2={centerY - d_vis / 2} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={slitX} y2={320} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          {/* 圆板剖面 (中间的小挡块) */}
          <rect x={slitX - 3} y={centerY - d_vis / 2} width={6} height={d_vis} rx={1} fill={OPTICS_COLORS.mirrorStroke} stroke={OPTICS_COLORS.mirror} strokeWidth={1} />
          <text x={slitX - 12} y={centerY - d_vis / 2 - 5} fontSize={font(11)} fill={OPTICS_COLORS.mirrorStroke} textAnchor="end">圆板障碍物</text>
          <text x={slitX} y={340} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle">圆板</text>

          {/* 圆板直径 D 尺寸标注 */}
          <g opacity={0.85}>
            <line x1={slitX - 12} y1={centerY - d_vis / 2} x2={slitX - 12} y2={centerY + d_vis / 2} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY - d_vis / 2 + 4} L ${slitX - 12} ${centerY - d_vis / 2} L ${slitX - 9} ${centerY - d_vis / 2 + 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <path d={`M ${slitX - 15} ${centerY + d_vis / 2 - 4} L ${slitX - 12} ${centerY + d_vis / 2} L ${slitX - 9} ${centerY + d_vis / 2 - 4}`} fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
            <text x={slitX - 20} y={centerY + 4} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end">D</text>
          </g>
        </g>
      )}

      {/* ─── 3. 波前扩散 (衍射波) ─── */}
      <g>
        {wavefronts.map(([r, dy], idx) => {
          // 随着扩散距离变远，波前变淡
          const opacity = Math.max(0, 1 - r / (screenX - slitX)) * 0.3
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

      {/* ─── 4. 光阴影与相干路径指引线 ─── */}
      {mode === 'poisson' ? (
        <g opacity={0.65}>
          {/* 几何阴影边界线 (激光被挡住的外侧边缘) */}
          <line x1={slitX} y1={centerY - d_vis / 2} x2={screenX} y2={centerY - R_shadow_side} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={screenX} y2={centerY + R_shadow_side} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={1} strokeDasharray="3 3" />
          {/* 几何阴影范围填充 */}
          <path
            d={`M ${slitX} ${centerY - d_vis / 2} L ${screenX} ${centerY - R_shadow_side} L ${screenX} ${centerY + R_shadow_side} L ${slitX} ${centerY + d_vis / 2} Z`}
            fill={withAlpha(OPTICS_COLORS.mirrorStroke, 0.08)}
          />
          {/* 衍射光波在中心点汇聚 (泊松亮斑的干涉光路) */}
          <line x1={slitX} y1={centerY - d_vis / 2} x2={screenX} y2={centerY} stroke={wavelengthColor} strokeWidth={1.2} />
          <line x1={slitX} y1={centerY + d_vis / 2} x2={screenX} y2={centerY} stroke={wavelengthColor} strokeWidth={1.2} />
          <text x={screenX - 10} y={centerY - 8} fontSize={font(10)} fill={wavelengthColor} textAnchor="end">泊松亮斑 (中心极大值)</text>
          <text x={screenX - 10} y={centerY - R_shadow_side + 12} fontSize={font(9)} fill={OPTICS_COLORS.mirrorStroke} textAnchor="end">几何阴影区</text>
        </g>
      ) : (
        <g opacity={0.6}>
          {/* 单缝/圆孔衍射：发散的边界指示线 */}
          <line x1={slitX} y1={centerY} x2={screenX} y2={centerY - 60} stroke={wavelengthColor} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={slitX} y1={centerY} x2={screenX} y2={centerY + 60} stroke={wavelengthColor} strokeWidth={1} strokeDasharray="2 2" />
          <line x1={slitX} y1={centerY} x2={screenX} y2={centerY} stroke={wavelengthColor} strokeWidth={1.5} />
          <text x={screenX - 10} y={centerY - 8} fontSize={font(10)} fill={wavelengthColor} textAnchor="end">中央极大</text>
        </g>
      )}

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
      <line x1={598} y1={80} x2={598} y2={560} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="3 3" />

      {/* ─── 8. 接收屏正面图 (x: 610 ~ 710，宽 100px) ─── */}
      <g>
        {/* 金属框 */}
        <rect x={608} y={118} width={104} height={414} rx={3} fill="none" stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={2} />
        {/* 衍射条纹 Canvas DataURL 贴图 */}
        {stripeDataUrl ? (
          <image
            href={stripeDataUrl}
            x={610}
            y={120}
            width={100}
            height={410}
            preserveAspectRatio="none"
          />
        ) : (
          <rect x={610} y={120} width={100} height={410} fill={DARK_SCREEN_BG} />
        )}
        <text x={660} y={555} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          光屏正面图
        </text>
      </g>

      {/* ─── 9. 光强分布曲线 (x: 730 ~ 800) ─── */}
      <g>
        {/* 光强分布基准线 */}
        <line x1={730} y1={120} x2={730} y2={530} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} />
        <path d="M 727 125 L 730 120 L 733 125" fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1} />
        
        {/* 虚线代表最大光强边界 I0 */}
        <line x1={800} y1={120} x2={800} y2={530} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="2 2" />
        <text x={800} y={110} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I₀</text>
        <text x={730} y={110} fontSize={font(10)} fill={CANVAS_COLORS.labelText} textAnchor="middle">I = 0</text>

        {/* 光强分布曲线 */}
        <path
          d={intensityPath}
          fill={withAlpha(wavelengthColor, 0.25)}
          stroke={wavelengthColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 辅助线：连接正中心亮斑与光强最大波峰 */}
        <line x1={710} y1={325} x2={800} y2={325} stroke={withAlpha(wavelengthColor, 0.5)} strokeWidth={1} strokeDasharray="3 3" />
        
        <text x={765} y={555} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          光强分布 (I)
        </text>
      </g>
    </g>
  )
}
