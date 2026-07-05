import { useCallback, useMemo, useRef } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, DASH, CANVAS_COLORS, FONT, SCENE_COLORS, STROKE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateThinLens } from '@/physics/optics'
import { useThinLensPhysics } from './useThinLensPhysics'
import { RelationChart } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'

import { useThinLensRays } from './hooks/useThinLensRays'
import { CandleShape, FocalMarks } from './components/ThinLensShapes'
import { lensShape } from './components/lensGeometry'
import { ThinLensRail } from './components/ThinLensRail'
import { ThinLensRays } from './components/ThinLensRays'

const RAIL_Y = 200
const CHART_TOP = 340
const CHART_H = 130
const SCALE_CM = 4.5

export default function ThinLensAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const svgRef = useRef<SVGSVGElement>(null)
  const isDraggingRef = useRef<'object' | 'lens' | false>(false)

  const mode = (params.mode ?? 0) as 0 | 1
  const isConcave = (params.isConcave ?? 0) === 1
  const fCm = params.f ?? 10
  const uCm = params.u ?? 30
  const LCm = params.L ?? 50

  const { font } = canvasSize

  const cx = 400
  const cy = RAIL_Y

  const physics = useThinLensPhysics()

  const u = mode === 1 ? Math.max(1, Math.min(LCm - 1, uCm)) : uCm
  const f = isConcave ? -fCm : fCm

  const lensResult = calculateThinLens(f / 100, u / 100)
  const vCm = isFinite(lensResult.v) ? lensResult.v * 100 : (lensResult.v > 0 ? 200 : -200)
  const isValid = lensResult.valid && isFinite(lensResult.v) && Math.abs(vCm) <= 200

  const objSvgX = mode === 0 ? cx - uCm * SCALE_CM : 120
  const lensSvgX = mode === 0 ? cx : objSvgX + uCm * SCALE_CM
  const screenSvgX = mode === 0 ? cx + vCm * SCALE_CM : objSvgX + LCm * SCALE_CM
  const imgSvgX = screenSvgX
  const fSvgDist = (fCm / 100) * SCALE_CM * 100

  const isReal = vCm > 0 && isValid
  const candleH = 40
  const imgH = Math.abs(lensResult.m) * candleH
  const x_focus = lensSvgX + vCm * SCALE_CM

  const blurRadius = useMemo(() => {
    if (mode === 0) return 0
    const dxCm = Math.abs(x_focus - screenSvgX) / SCALE_CM
    const br = dxCm * 0.4
    return br < 0.25 ? 0 : Math.min(10, br)
  }, [mode, x_focus, screenSvgX])

  const imageOpacity = useMemo(() => {
    if (mode === 0) return isReal ? 1.0 : 0.5
    return Math.max(0.12, 1 - blurRadius * 0.08)
  }, [mode, isReal, blurRadius])

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'object' | 'lens') => {
    e.preventDefault()
    isDraggingRef.current = type
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const svgX = svgPt.x

    if (mode === 0) {
      if (isDraggingRef.current === 'object') {
        const deltaX = cx - svgX
        const uNew = Math.max(1, Math.min(80, deltaX / SCALE_CM))
        useAnimationStore.getState().updateParam('u', uNew)
      }
    } else {
      if (isDraggingRef.current === 'lens') {
        const uNew = Math.max(1, Math.min(LCm - 1, (svgX - objSvgX) / SCALE_CM))
        useAnimationStore.getState().updateParam('u', uNew)
      }
    }
  }, [mode, cx, LCm, objSvgX])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const { chartData, currentChartPoint, conjugate } = physics

  const rays = useThinLensRays({
    isValid, mode, objSvgX, uCm, fSvgDist, isReal, imgH, isConcave, imgSvgX, lensSvgX, screenSvgX, cy, fCm, candleH, VIEW_WIDTH: 800, SCALE_CM
  })

  const chartPoints = chartData
  const showCursor = currentChartPoint.x > 0 && currentChartPoint.y > 0

  const linearMax = useMemo(() => {
    return 1 / (fCm / 100 * 1.01) * 1.1
  }, [fCm])

  const hyperbolaDomain = useMemo(() => {
    const uMin = fCm * 1.01
    const uMax = fCm * 4
    return { uMin, uMax, vMax: uMax }
  }, [fCm])

  const hyperbolaMarkers = useMemo<RelationMarker[]>(() => {
    const out: RelationMarker[] = [
      { axis: 'horizontal', y: 2 * fCm, label: 'L_min=4f', color: OPTICS_COLORS.focalPoint },
    ]
    if (conjugate.valid) {
      const isNear1 = Math.abs(uCm - conjugate.u1 * 100) < 1.5
      const isNear2 = Math.abs(uCm - conjugate.u2 * 100) < 1.5

      out.push({
        axis: 'point', x: conjugate.u1 * 100, y: conjugate.v1 * 100,
        label: '①', color: isNear1 ? OPTICS_COLORS.wavelengthRed : OPTICS_COLORS.lightRayRefracted,
      })
      out.push({
        axis: 'point', x: conjugate.u2 * 100, y: conjugate.v2 * 100,
        label: '②', color: isNear2 ? OPTICS_COLORS.wavelengthGreen : OPTICS_COLORS.lightRayRefracted,
      })
    }
    return out
  }, [fCm, conjugate, uCm])

  const dashGuide = `${DASH.reference[0]} ${DASH.reference[1]}`

  return (
    <div ref={containerRef} className="w-full h-full touch-none"
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
          <defs>
            <filter id="optics-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComponentTransfer in="blur" result="boost">
                <feFuncA type="linear" slope="1.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="boost" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="lens-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={OPTICS_COLORS.lens} stopOpacity="0.4" />
              <stop offset="30%" stopColor={OPTICS_COLORS.lens} stopOpacity="0.65" />
              <stop offset="70%" stopColor={OPTICS_COLORS.lens} stopOpacity="0.75" />
              <stop offset="100%" stopColor={OPTICS_COLORS.lensStroke} stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="rail-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.neutral[700]} />
              <stop offset="25%" stopColor={colors.neutral[400]} />
              <stop offset="60%" stopColor={colors.neutral[300]} />
              <stop offset="85%" stopColor={colors.neutral[500]} />
              <stop offset="100%" stopColor={colors.neutral[800]} />
            </linearGradient>

            {mode === 1 && (
              <filter id="dynamic-screen-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={blurRadius} />
              </filter>
            )}
          </defs>

          <g>
            <ThinLensRail mode={mode} VIEW_WIDTH={800} cy={cy} cx={cx} SCALE_CM={SCALE_CM} font={font} />

            {mode === 0 && fCm > 0 && (
              <FocalMarks cx={lensSvgX} cy={cy} fSvgDist={fSvgDist} font={font} />
            )}

            <g
              onMouseDown={(e) => handleMouseDown(e, mode === 1 ? 'lens' : 'object')}
              style={{ cursor: mode === 1 ? 'ew-resize' : 'default' }}
              transform={`translate(${lensSvgX - cx}, 0)`}
            >
              <line x1={cx} y1={cy - 75} x2={cx} y2={cy + 75}
                stroke={OPTICS_COLORS.lensStroke} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              <path
                d={lensShape(cx, cy, 60, isConcave)}
                fill="url(#lens-grad)" stroke={OPTICS_COLORS.lensStroke} strokeWidth={2.5}
                filter={`drop-shadow(0px 2px 4px ${withAlpha('#2563EB', 0.2)})`}
              />
              <path
                d={isConcave
                  ? `M ${cx - 3} ${cy - 50} Q ${cx + 3} ${cy} ${cx - 3} ${cy + 50}`
                  : `M ${cx - 3} ${cy - 50} Q ${cx + 1} ${cy} ${cx - 3} ${cy + 50}`
                }
                fill="none" stroke={colors.neutral.white} strokeWidth={1.5} opacity={0.65}
              />
              {mode === 1 && (
                <g className="hover:opacity-100 opacity-60 transition-opacity">
                  <path d={`M ${cx - 15} ${cy - 68} L ${cx - 22} ${cy - 65} L ${cx - 15} ${cy - 62}`} fill="none" stroke={OPTICS_COLORS.lensStroke} strokeWidth={1.5} />
                  <path d={`M ${cx + 15} ${cy - 68} L ${cx + 22} ${cy - 65} L ${cx + 15} ${cy - 62}`} fill="none" stroke={OPTICS_COLORS.lensStroke} strokeWidth={1.5} />
                  <line x1={cx - 20} y1={cy - 65} x2={cx + 20} y2={cy - 65} stroke={OPTICS_COLORS.lensStroke} strokeWidth={1.5} />
                  <circle cx={cx} cy={cy - 65} r={3} fill={OPTICS_COLORS.lensStroke} />
                </g>
              )}
              <text x={cx + 15} y={cy - 50} textAnchor="start" dominantBaseline="auto"
                fill={OPTICS_COLORS.lensStroke} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
                {isConcave ? '凹透镜' : '凸透镜'} (f={fCm}cm)
              </text>
            </g>

            <g
              onMouseDown={(e) => { if (mode === 0) handleMouseDown(e, 'object') }}
              style={{ cursor: mode === 0 ? 'ew-resize' : 'default' }}
            >
              <CandleShape x={objSvgX} y={cy} h={candleH} />
              {mode === 0 && (
                <g className="hover:opacity-100 opacity-65 transition-opacity">
                  <line x1={objSvgX - 15} y1={cy + 15} x2={objSvgX + 15} y2={cy + 15} stroke={CANVAS_COLORS.annotation} strokeWidth={1.5} />
                  <path d={`M ${objSvgX - 12} ${cy + 12} L ${objSvgX - 16} ${cy + 15} L ${objSvgX - 12} ${cy + 18}`} fill="none" stroke={CANVAS_COLORS.annotation} strokeWidth={1.5} />
                  <path d={`M ${objSvgX + 12} ${cy + 12} L ${objSvgX + 16} ${cy + 15} L ${objSvgX + 12} ${cy + 18}`} fill="none" stroke={CANVAS_COLORS.annotation} strokeWidth={1.5} />
                </g>
              )}
              <text x={objSvgX} y={cy - candleH - 12} textAnchor="middle" dominantBaseline="auto"
                fill={CANVAS_COLORS.annotation} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
                物体 (u={u.toFixed(1)}cm)
              </text>
            </g>

            {mode === 0 && (
              <g>
                <line x1={objSvgX} y1={cy + 30} x2={lensSvgX} y2={cy + 30}
                  stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation}
                  strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`} />
                <text x={(objSvgX + lensSvgX) / 2} y={cy + 24} textAnchor="middle" dominantBaseline="auto"
                  fill={CANVAS_COLORS.annotation} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
                  u={u.toFixed(1)}cm
                </text>
              </g>
            )}

            {/* 渲染三条特殊追迹光路 */}
            <ThinLensRays rays={rays} dashGuide={dashGuide} />

            {/* 渲染成像（烛身）与像距标注 */}
            {isValid && (
              <g>
                {mode === 0 ? (
                  <g>
                    <CandleShape x={imgSvgX} y={cy} h={imgH} inverted={isReal} opacity={imageOpacity} />
                    <line x1={lensSvgX} y1={cy + 40} x2={imgSvgX} y2={cy + 40}
                      stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation}
                      strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`} />
                    <text x={(lensSvgX + imgSvgX) / 2} y={cy + 34} textAnchor="middle" dominantBaseline="auto"
                      fill={CANVAS_COLORS.annotation} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
                      v={vCm > 180 ? '→∞' : `${Math.abs(vCm).toFixed(1)}cm`}
                    </text>
                    <text x={imgSvgX} y={isReal ? cy + imgH + 20 : cy - imgH - 12} textAnchor="middle" dominantBaseline="auto"
                      fill={isReal ? OPTICS_COLORS.lightRayRefracted : OPTICS_COLORS.criticalAngle}
                      fontSize={font(9)} fontFamily={FONT.family} fontWeight="bold">
                      {isReal ? '倒立' : '正立'}{Math.abs(lensResult.m) > 1 ? '放大' : Math.abs(lensResult.m) < 1 ? '缩小' : '等大'}{isReal ? '实像' : '虚像'}
                    </text>
                  </g>
                ) : (
                  <g>
                    <g>
                      <line x1={screenSvgX} y1={cy} x2={screenSvgX} y2={cy + 40} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={3} />
                      <rect x={screenSvgX - 15} y={cy + 40} width={30} height={6} fill={SCENE_COLORS.materials.structStroke} rx={1} />
                      <rect
                        x={screenSvgX - 4} y={cy - 65} width={8} height={130}
                        fill={SCENE_COLORS.materials.structBgLight} stroke={SCENE_COLORS.materials.structFill} strokeWidth={1.5}
                        filter={`drop-shadow(0px 2px 4px ${withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.15)})`}
                      />
                      <line x1={screenSvgX - 4} y1={cy} x2={screenSvgX + 4} y2={cy} stroke={CANVAS_COLORS.trackHistory} strokeWidth={0.5} />
                      <line x1={screenSvgX} y1={cy - 60} x2={screenSvgX} y2={cy + 60} stroke={CANVAS_COLORS.trackHistory} strokeWidth={0.5} />
                      <text x={screenSvgX} y={cy - 72} textAnchor="middle" dominantBaseline="auto"
                        fill={SCENE_COLORS.materials.structStrokeMid} fontSize={font(9)} fontFamily={FONT.family} fontWeight="bold">
                        光屏 (L={LCm}cm)
                      </text>
                    </g>
                    <g>
                      <CandleShape
                        x={screenSvgX} y={cy} h={imgH}
                        inverted={true}
                        opacity={imageOpacity}
                        showGlow={blurRadius < 1.0}
                        filter={blurRadius > 0.2 ? "url(#dynamic-screen-blur)" : undefined}
                      />
                      <text x={screenSvgX} y={cy + imgH + 20} textAnchor="middle" dominantBaseline="auto"
                        fill={blurRadius < 0.5 ? OPTICS_COLORS.lightRayRefracted : OPTICS_COLORS.lightRayNormal}
                        fontSize={font(9)} fontFamily={FONT.family} fontWeight="bold">
                        {blurRadius < 0.5
                          ? `清晰实像 (${Math.abs(lensResult.m) > 1 ? '放大' : '缩小'})`
                          : '模糊光斑 (未聚焦)'}
                      </text>
                    </g>
                  </g>
                )}
              </g>
            )}

            {mode === 1 && conjugate.valid && (() => {
              const img2X = objSvgX + (conjugate.u2 * 100) * SCALE_CM
              const isNear2 = Math.abs(lensSvgX - img2X) < 8
              return (
                <g opacity={isNear2 ? 0.3 : 0.6}>
                  <line x1={img2X} y1={cy - 62} x2={img2X} y2={cy + 62}
                    stroke={OPTICS_COLORS.wavelengthGreen} strokeWidth={1} strokeDasharray="4 2" />
                  <text x={img2X} y={cy - 68} textAnchor="middle" dominantBaseline="auto"
                    fill={OPTICS_COLORS.wavelengthGreen} fontSize={font(8)} fontFamily={FONT.family} fontWeight="bold">
                    成像位置②
                  </text>
                </g>
              )
            })()}
            {mode === 1 && conjugate.valid && (() => {
              const img1X = objSvgX + (conjugate.u1 * 100) * SCALE_CM
              const isNear1 = Math.abs(lensSvgX - img1X) < 8
              return (
                <g opacity={isNear1 ? 0.3 : 0.6}>
                  <line x1={img1X} y1={cy - 62} x2={img1X} y2={cy + 62}
                    stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1} strokeDasharray="4 2" />
                  <text x={img1X} y={cy - 68} textAnchor="middle" dominantBaseline="auto"
                    fill={OPTICS_COLORS.lightRayRefracted} fontSize={font(8)} fontFamily={FONT.family} fontWeight="bold">
                    成像位置①
                  </text>
                </g>
              )
            })()}

            {/* ── 下方图表区域：通过 foreignObject 嵌入 RelationChart ── */}
            {chartPoints.length >= 2 && (
              <foreignObject
                x={20} y={CHART_TOP - 20}
                width={760} height={CHART_H + 50}
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
                      series="warm"
                      strokeWidth={2.5}
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
                      series="warm"
                      strokeWidth={2.5}
                    />
                  )}
                </div>
              </foreignObject>
            )}
          </g>
      </svg>
    </div>
  )
}
