import { useCallback, useMemo, useRef } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, STROKE, FONT, DASH, CANVAS_COLORS } from '@/theme/physics'
import { calculateThinLens } from '@/physics/optics'
import { useThinLensPhysics } from './useThinLensPhysics'
import { RelationChart } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500
const RAIL_Y = 180
const CHART_TOP = 340
const CHART_H = 130
const SCALE_CM = 6

function lensShape(cx: number, cy: number, halfH: number, isConcave: boolean): string {
  const bow = isConcave ? -8 : 8
  const top = cy - halfH
  const bot = cy + halfH
  return `M ${cx} ${top} Q ${cx + bow} ${cy} ${cx} ${bot} Q ${cx - bow} ${cy} ${cx} ${top} Z`
}

function CandleShape({ x, y, h, sc, opacity = 1 }: {
  x: number; y: number; h: number; sc: number; opacity?: number
}) {
  const CANDLE_RX = 1
  const bodyW = 4 * sc
  const bodyH = h * 0.6
  const flameH = h * 0.4
  return (
    <g opacity={opacity}>
      <rect x={x - bodyW} y={y - bodyH} width={bodyW * 2} height={bodyH}
        fill={OPTICS_COLORS.candleBody} stroke={OPTICS_COLORS.candleBodyStroke}
        strokeWidth={STROKE.annotation} rx={CANDLE_RX} />
      <ellipse cx={x} cy={y - bodyH - flameH * 0.4} rx={flameH * 0.3} ry={flameH * 0.6}
        fill={OPTICS_COLORS.candleFlame} stroke={OPTICS_COLORS.candleFlameStroke}
        strokeWidth={STROKE.annotation} />
      <line x1={x} y1={y} x2={x} y2={y + 6 * sc}
        stroke={OPTICS_COLORS.candleStick} strokeWidth={2 * sc} />
    </g>
  )
}

function FocalMarks({ cx, cy, fSvgDist, font }: {
  cx: number; cy: number; fSvgDist: number; font: (v: number) => number
}) {
  const fLeft = cx - fSvgDist
  const fRight = cx + fSvgDist
  const f2Left = cx - 2 * fSvgDist
  const f2Right = cx + 2 * fSvgDist
  return (
    <g>
      {[fLeft, fRight].map((fx, i) => (
        <g key={`f-${i}`}>
          <line x1={fx} y1={cy - 6} x2={fx} y2={cy + 6}
            stroke={OPTICS_COLORS.focalPoint} strokeWidth={STROKE.annotation} />
          <text x={fx} y={cy + 18} textAnchor="middle" dominantBaseline="auto"
            fill={OPTICS_COLORS.focalPoint} fontSize={font(10)} fontFamily={FONT.family}>
            F
          </text>
        </g>
      ))}
      {[f2Left, f2Right].map((fx, i) => (
        <g key={`2f-${i}`}>
          <line x1={fx} y1={cy - 4} x2={fx} y2={cy + 4}
            stroke={OPTICS_COLORS.focalPoint} strokeWidth={STROKE.annotation} opacity={0.5} />
          <text x={fx} y={cy + 18} textAnchor="middle" dominantBaseline="auto"
            fill={OPTICS_COLORS.focalPoint} fontSize={font(9)} fontFamily={FONT.family} opacity={0.6}>
            2F
          </text>
        </g>
      ))}
    </g>
  )
}

function LightRays({ objSvgX, objTopY, cx, cy, imgSvgX, imgTopY, imgH, isReal, fSvgDist, fCm, lensM, scale, font }: {
  objSvgX: number; objTopY: number; cx: number; cy: number
  imgSvgX: number; imgTopY: number; imgH: number; isReal: boolean
  fSvgDist: number; fCm: number; lensM: number; scale: number; font: (v: number) => number
}) {
  const rayLen = Math.abs(imgSvgX - cx) + 60
  const dashGuide = `${DASH.guide[0]} ${DASH.guide[1]}`

  return (
    <g>
      {/* 光线1：平行于主光轴 → 过焦点 */}
      <line x1={objSvgX} y1={objTopY} x2={cx} y2={objTopY}
        stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} />
      <line x1={cx} y1={objTopY} x2={cx + rayLen} y2={objTopY}
        stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.reference}
        strokeDasharray={dashGuide} opacity={0.3} />
      {isReal ? (
        <line x1={cx} y1={objTopY} x2={imgSvgX} y2={cy}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} />
      ) : (
        <line x1={cx} y1={objTopY} x2={cx - rayLen * 0.4} y2={objTopY + (cy - objTopY) * 0.4}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain}
          strokeDasharray={dashGuide} opacity={0.5} />
      )}

      {/* 光线2：过光心 → 不偏折 */}
      <line x1={objSvgX} y1={objTopY} x2={cx} y2={objTopY}
        stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} />
      {isReal ? (
        <line x1={cx} y1={objTopY} x2={imgSvgX} y2={imgTopY}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} />
      ) : (
        <line x1={cx} y1={objTopY} x2={cx + rayLen * 0.5} y2={objTopY - (objTopY - cy) * 0.5}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain}
          strokeDasharray={dashGuide} opacity={0.5} />
      )}

      {/* 光线3：过焦点 → 平行于主光轴 */}
      {fCm > 0 && (
        <>
          <line x1={objSvgX} y1={objTopY} x2={cx - fSvgDist} y2={cy}
            stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} />
          <line x1={cx - fSvgDist} y1={cy} x2={cx} y2={cy - (objTopY - cy) * fSvgDist / (cx - objSvgX)}
            stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.reference}
            strokeDasharray={dashGuide} opacity={0.3} />
          {isReal && (
            <line x1={cx} y1={cy - (objTopY - cy) * fSvgDist / (cx - objSvgX)}
              x2={imgSvgX} y2={cy}
              stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} />
          )}
        </>
      )}

      {/* 像（蜡烛） */}
      <CandleShape x={imgSvgX} y={cy} h={imgH} sc={scale} opacity={isReal ? 1 : 0.4} />

      {/* 像距标注 */}
      <line x1={cx} y1={cy + 40 * scale} x2={imgSvgX} y2={cy + 40 * scale}
        stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`} />
      <text x={(cx + imgSvgX) / 2} y={cy + 35 * scale} textAnchor="middle" dominantBaseline="auto"
        fill={CANVAS_COLORS.annotation} fontSize={font(10)} fontFamily={FONT.family}>
        v={Math.abs(imgSvgX - cx) / (SCALE_CM * scale) * 100 > 200 ? '→∞' : `${(Math.abs(imgSvgX - cx) / (SCALE_CM * scale) * 100).toFixed(1)}cm`}
      </text>

      {/* 像的性质标注 */}
      <text x={imgSvgX} y={cy + imgH + 20 * scale} textAnchor="middle" dominantBaseline="auto"
        fill={isReal ? OPTICS_COLORS.lightRayRefracted : OPTICS_COLORS.criticalAngle}
        fontSize={font(9)} fontFamily={FONT.family}>
        {isReal ? '实像' : '虚像'} {Math.abs(lensM) > 1 ? '放大' : Math.abs(lensM) < 1 ? '缩小' : '等大'}
      </text>
    </g>
  )
}

export default function ThinLensAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: VIEW_WIDTH, height: VIEW_HEIGHT })
  const physics = useThinLensPhysics()
  const svgRef = useRef<SVGSVGElement>(null)
  const isDraggingRef = useRef(false)

  const mode = (params.mode ?? 0) as 0 | 1
  const isConcave = (params.isConcave ?? 0) === 1
  const fCm = params.f ?? 10
  const uCm = params.u ?? 30
  const LCm = params.L ?? 50

  const { width, height, font } = canvasSize
  const scale = Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT)

  const cx = width / 2
  const cy = RAIL_Y * scale

  const f = isConcave ? -fCm : fCm
  const u = mode === 1 ? (physics.conjugate.valid ? physics.conjugate.u1 * 100 : uCm) : uCm

  const lensResult = calculateThinLens(f / 100, u / 100)
  const vCm = isFinite(lensResult.v) ? lensResult.v * 100 : (lensResult.v > 0 ? 200 : -200)
  const isValid = lensResult.valid && isFinite(lensResult.v) && Math.abs(vCm) <= 200

  const objSvgX = cx - (u / 100) * SCALE_CM * scale
  const imgSvgX = isValid ? cx + (vCm / 100) * SCALE_CM * scale : cx
  const fSvgDist = (fCm / 100) * SCALE_CM * scale

  const isReal = vCm > 0 && isValid

  const candleH = 40 * scale
  const imgH = Math.abs(lensResult.m) * candleH

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 1) return
    e.preventDefault()
    isDraggingRef.current = true
  }, [mode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !svgRef.current || mode !== 1) return
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * VIEW_WIDTH
    const lensCenterSvgX = cx
    const deltaCm = ((svgX - lensCenterSvgX) / (SCALE_CM * scale)) * 100
    const uNew = Math.max(1, Math.min(LCm - 1, uCm + deltaCm))
    useAnimationStore.getState().updateParam('u', uNew)
  }, [mode, cx, scale, LCm, uCm])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const { chartData, currentChartPoint, conjugate } = physics

  // ── RelationChart 数据准备 ────────────────────────────────────────────
  // chartData 形状统一为 {x, y}，可直接喂给 RelationChart
  const chartPoints = chartData

  // 是否显示当前点圆点：原逻辑要求 x>0 && y>0
  const showCursor = currentChartPoint.x > 0 && currentChartPoint.y > 0

  // 线性模式：xDomain 和 yDomain（原 LinearChart 内部计算）
  const linearMax = useMemo(() => {
    const xMax = 1 / (fCm / 100 * 1.01) * 1.1
    return xMax
  }, [fCm])

  // 双曲线模式：xDomain 和 yDomain（原 HyperbolaChart 内部计算）
  const hyperbolaDomain = useMemo(() => {
    const uMin = fCm * 1.01
    const uMax = fCm * 4
    return { uMin, uMax, vMax: uMax }
  }, [fCm])

  // 双曲线模式 markers：L_min=4f 水平参考线 + 共轭法 ①② 两个独立标记点
  const hyperbolaMarkers = useMemo<RelationMarker[]>(() => {
    const out: RelationMarker[] = [
      { axis: 'horizontal', y: 2 * fCm, label: 'L_min=4f', color: OPTICS_COLORS.focalPoint },
    ]
    if (conjugate.valid) {
      out.push({
        axis: 'point', x: conjugate.u1 * 100, y: conjugate.v1 * 100,
        label: '①', color: OPTICS_COLORS.lightRayRefracted,
      })
      out.push({
        axis: 'point', x: conjugate.u2 * 100, y: conjugate.v2 * 100,
        label: '②', color: OPTICS_COLORS.wavelengthGreen,
      })
    }
    return out
  }, [fCm, conjugate])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* 主光轴 */}
        <line
          x1={20} y1={cy} x2={width - 20} y2={cy}
          stroke={OPTICS_COLORS.opticalAxis}
          strokeWidth={STROKE.reference}
        />

        {/* F 刻度 */}
        {fCm > 0 && (
          <FocalMarks cx={cx} cy={cy} fSvgDist={fSvgDist} font={font} />
        )}

        {/* 透镜 */}
        <g
          onMouseDown={handleMouseDown}
          style={{ cursor: mode === 1 ? 'ew-resize' : 'default' }}
        >
          <line x1={cx} y1={cy - 55 * scale} x2={cx} y2={cy + 55 * scale}
            stroke={OPTICS_COLORS.lensStroke} strokeWidth={STROKE.objectLine} />
          <path
            d={lensShape(cx, cy, 50 * scale, isConcave)}
            fill={OPTICS_COLORS.lens} stroke={OPTICS_COLORS.lensStroke} strokeWidth={STROKE.objectLine}
            opacity={0.6}
          />
          <text x={cx + 12} y={cy - 55 * scale} textAnchor="start" dominantBaseline="auto"
            fill={OPTICS_COLORS.lensStroke} fontSize={font(10)} fontFamily={FONT.family}>
            {isConcave ? '凹透镜' : '凸透镜'}
          </text>
        </g>

        {/* 蜡烛（物体） */}
        <CandleShape x={objSvgX} y={cy} h={candleH} sc={scale} />

        {/* 物距标注 */}
        <g>
          <line x1={objSvgX} y1={cy + 30 * scale} x2={cx} y2={cy + 30 * scale}
            stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation}
            strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`} />
          <text x={(objSvgX + cx) / 2} y={cy + 25 * scale} textAnchor="middle" dominantBaseline="auto"
            fill={CANVAS_COLORS.annotation} fontSize={font(10)} fontFamily={FONT.family}>
            u={u.toFixed(1)}cm
          </text>
        </g>

        {/* 三条特殊光线 + 像 */}
        {isValid && (
          <LightRays
            objSvgX={objSvgX} objTopY={cy - candleH}
            cx={cx} cy={cy}
            imgSvgX={imgSvgX} imgTopY={isReal ? cy - imgH : cy + imgH}
            imgH={imgH} isReal={isReal}
            fSvgDist={fSvgDist} fCm={fCm}
            lensM={lensResult.m} scale={scale} font={font}
          />
        )}

        {/* 共轭法：第二次成像位置标注 */}
        {mode === 1 && conjugate.valid && (() => {
          const v2Cm = conjugate.v2 * 100
          const img2X = cx + (v2Cm / 100) * SCALE_CM * scale
          return (
            <g>
              <line x1={img2X} y1={cy - 8} x2={img2X} y2={cy + 8}
                stroke={OPTICS_COLORS.lightRayReflected} strokeWidth={STROKE.annotation} />
              <text x={img2X} y={cy - 12} textAnchor="middle" dominantBaseline="auto"
                fill={OPTICS_COLORS.lightRayReflected} fontSize={font(9)} fontFamily={FONT.family}>
                v₂={v2Cm.toFixed(1)}
              </text>
            </g>
          )
        })()}

        {/* ── 下方图表区域：通过 foreignObject 嵌入 RelationChart ── */}
        {chartPoints.length >= 2 && (
          <foreignObject
            x={20} y={CHART_TOP - 20}
            width={VIEW_WIDTH - 40} height={CHART_H + 50}
          >
            <div style={{ width: '100%', height: '100%' }}>
              {mode === 0 ? (
                <RelationChart
                  points={chartPoints}
                  xLabel="1/u (cm⁻¹)"
                  yLabel="1/v (cm⁻¹)"
                  title="1/v - 1/u 线性图"
                  xDomain={[0, linearMax]}
                  yDomain={[0, linearMax]}
                  cursorX={showCursor ? currentChartPoint.x : undefined}
                  cursorLabel={(x, y) => `(${x.toFixed(2)}, ${y.toFixed(2)})`}
                  color={OPTICS_COLORS.lightRay}
                  strokeWidth={2}
                />
              ) : (
                <RelationChart
                  points={chartPoints}
                  xLabel="u (cm)"
                  yLabel="v (cm)"
                  title="v - u 双曲线图"
                  xDomain={[hyperbolaDomain.uMin, hyperbolaDomain.uMax]}
                  yDomain={[0, hyperbolaDomain.vMax]}
                  cursorX={showCursor ? currentChartPoint.x : undefined}
                  cursorLabel={(x, y) => `u=${x.toFixed(1)}, v=${y.toFixed(1)}`}
                  markers={hyperbolaMarkers}
                  color={OPTICS_COLORS.lightRay}
                  strokeWidth={2}
                />
              )}
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  )
}
