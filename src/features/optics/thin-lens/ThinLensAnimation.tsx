import { useCallback, useMemo, useRef } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, STROKE, FONT, DASH, CANVAS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateThinLens } from '@/physics/optics'
import { useThinLensPhysics } from './useThinLensPhysics'
import { RelationChart } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500
const THIN_LENS_DESIGN = { width: VIEW_WIDTH, height: VIEW_HEIGHT } as const
const RAIL_Y = 200
const CHART_TOP = 340
const CHART_H = 130
const SCALE_CM = 4.5

function lensShape(cx: number, cy: number, halfH: number, isConcave: boolean): string {
  const bow = isConcave ? -8 : 8
  const top = cy - halfH
  const bot = cy + halfH
  return `M ${cx} ${top} Q ${cx + bow} ${cy} ${cx} ${bot} Q ${cx - bow} ${cy} ${cx} ${top} Z`
}

function CandleShape({ x, y, h, opacity = 1, inverted = false, showGlow = true, filter }: {
  x: number; y: number; h: number; opacity?: number; inverted?: boolean; showGlow?: boolean; filter?: string
}) {
  const CANDLE_RX = 1
  const bodyW = 5
  const bodyH = h * 0.65
  const flameH = h * 0.35
  const transform = inverted ? `translate(${x}, ${y}) scale(1, -1) translate(${-x}, ${-y})` : undefined

  return (
    <g opacity={opacity} transform={transform} filter={filter}>
      {/* 蜡烛烛身 */}
      <rect x={x - bodyW} y={y - bodyH} width={bodyW * 2} height={bodyH}
        fill={OPTICS_COLORS.candleBody} stroke={OPTICS_COLORS.candleBodyStroke}
        strokeWidth={STROKE.objectLine} rx={CANDLE_RX} />
      {/* 火焰外发光 */}
      {showGlow && (
        <ellipse cx={x} cy={y - bodyH - flameH * 0.4} rx={flameH * 0.5} ry={flameH * 0.8}
          fill={OPTICS_COLORS.candleFlame} opacity={0.3} filter="url(#optics-glow)" />
      )}
      {/* 火焰 */}
      <ellipse cx={x} cy={y - bodyH - flameH * 0.4} rx={flameH * 0.25} ry={flameH * 0.55}
        fill={OPTICS_COLORS.candleFlame} stroke={OPTICS_COLORS.candleFlameStroke}
        strokeWidth={1.5} filter={showGlow ? "url(#optics-glow)" : undefined} />
      {/* 烛台底座 */}
      <line x1={x} y1={y} x2={x} y2={y + 6}
        stroke={OPTICS_COLORS.candleStick} strokeWidth={2} strokeLinecap="round" />
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
          <text x={fx} y={cy - 12} textAnchor="middle" dominantBaseline="auto"
            fill={OPTICS_COLORS.focalPoint} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
            {i === 0 ? 'F₁' : 'F₂'}
          </text>
        </g>
      ))}
      {[f2Left, f2Right].map((fx, i) => (
        <g key={`2f-${i}`}>
          <line x1={fx} y1={cy - 4} x2={fx} y2={cy + 4}
            stroke={OPTICS_COLORS.focalPoint} strokeWidth={STROKE.annotation} opacity={0.5} />
          <text x={fx} y={cy - 12} textAnchor="middle" dominantBaseline="auto"
            fill={OPTICS_COLORS.focalPoint} fontSize={font(9)} fontFamily={FONT.family} opacity={0.6} fontWeight="bold">
            {i === 0 ? '2F₁' : '2F₂'}
          </text>
        </g>
      ))}
    </g>
  )
}

export default function ThinLensAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.extraWide)
  const svgRef = useRef<SVGSVGElement>(null)
  const isDraggingRef = useRef<'object' | 'lens' | false>(false)

  const vp = useViewport(canvasSize, {
    designWidth: THIN_LENS_DESIGN.width,
    designHeight: THIN_LENS_DESIGN.height,
  })

  const mode = (params.mode ?? 0) as 0 | 1
  const isConcave = (params.isConcave ?? 0) === 1
  const fCm = params.f ?? 10
  const uCm = params.u ?? 30
  const LCm = params.L ?? 50

  const { font } = canvasSize

  const cx = VIEW_WIDTH / 2
  const cy = RAIL_Y

  const physics = useThinLensPhysics()

  // 区分模式计算物距和镜头中心
  const u = mode === 1 ? Math.max(1, Math.min(LCm - 1, uCm)) : uCm
  const f = isConcave ? -fCm : fCm

  const lensResult = calculateThinLens(f / 100, u / 100)
  const vCm = isFinite(lensResult.v) ? lensResult.v * 100 : (lensResult.v > 0 ? 200 : -200)
  const isValid = lensResult.valid && isFinite(lensResult.v) && Math.abs(vCm) <= 200

  // 坐标定义
  const objSvgX = mode === 0 ? cx - uCm * SCALE_CM : 120
  const lensSvgX = mode === 0 ? cx : objSvgX + uCm * SCALE_CM
  const screenSvgX = mode === 0 ? cx + vCm * SCALE_CM : objSvgX + LCm * SCALE_CM
  const imgSvgX = screenSvgX
  const fSvgDist = (fCm / 100) * SCALE_CM * 100

  const isReal = vCm > 0 && isValid
  const candleH = 40
  const imgH = Math.abs(lensResult.m) * candleH
  const x_focus = lensSvgX + vCm * SCALE_CM

  // 共轭法模式：计算光屏上的模糊半径和不透明度
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

  // 拖动处理
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
    // 画布像素坐标 → 设计空间坐标（逆 vp.transform）
    const svgX = (svgPt.x - vp.tx) / vp.scale

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
  }, [mode, cx, LCm, objSvgX, vp.tx, vp.scale])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const { chartData, currentChartPoint, conjugate } = physics

  // ── 三条特殊光线几何追迹 ────────────────────────────────────────────
  const rays = useMemo(() => {
    if (!isValid) return null

    const objTopY = cy - candleH
    const focalDist = fSvgDist
    const imgTopY = isReal ? cy + imgH : cy - imgH

    let r1_refracted: Array<{ x: number; y: number }> = []
    let r1_extended: Array<{ x: number; y: number }> = []

    let r2_refracted: Array<{ x: number; y: number }> = []
    let r2_extended: Array<{ x: number; y: number }> = []

    let r3_incident: Array<{ x: number; y: number }> = []
    let r3_refracted: Array<{ x: number; y: number }> = []
    let r3_extended: Array<{ x: number; y: number }> = []
    let r3_guide: Array<{ x: number; y: number }> = []

    const isCloseToFocus = !isConcave && Math.abs(uCm - fCm) < 0.5

    if (mode === 1) {
      // 共轭模式：光屏固定在 screenSvgX，折射光线汇聚至 x_focus 后射向屏幕
      // 1. 光线1：平行于主光轴 → 折射过右焦点
      const k1 = candleH / focalDist
      const y_end1 = objTopY + k1 * (screenSvgX - lensSvgX)
      r1_refracted = [
        { x: lensSvgX, y: objTopY },
        { x: screenSvgX, y: y_end1 }
      ]

      // 2. 光线2：过光心 → 方向不偏折
      const k2 = candleH / (lensSvgX - objSvgX)
      const y_end2 = cy + k2 * (screenSvgX - lensSvgX)
      r2_refracted = [
        { x: lensSvgX, y: cy },
        { x: screenSvgX, y: y_end2 }
      ]

      // 3. 光线3：过焦点 → 折射平行于主光轴
      if (!isCloseToFocus) {
        const y_lens3 = cy + (candleH * focalDist) / (uCm * SCALE_CM - focalDist)
        if (Math.abs(y_lens3 - cy) < 220) {
          r3_incident = [
            { x: objSvgX, y: objTopY },
            { x: lensSvgX - focalDist, y: cy },
            { x: lensSvgX, y: y_lens3 }
          ]
          r3_refracted = [
            { x: lensSvgX, y: y_lens3 },
            { x: screenSvgX, y: y_lens3 }
          ]
        }
      }
    } else {
      // 基础模式
      // 1. 光线1：平行光轴
      if (!isConcave) {
        if (isReal) {
          const x_end = Math.min(VIEW_WIDTH - 15, imgSvgX + 40)
          const k = (imgTopY - objTopY) / (imgSvgX - lensSvgX)
          const y_end = imgTopY + k * (x_end - imgSvgX)
          r1_refracted = [
            { x: lensSvgX, y: objTopY },
            { x: imgSvgX, y: imgTopY },
            { x: x_end, y: y_end }
          ]
        } else {
          const x_end = VIEW_WIDTH - 15
          const y_end = objTopY + (candleH / focalDist) * (x_end - lensSvgX)
          r1_refracted = [
            { x: lensSvgX, y: objTopY },
            { x: x_end, y: y_end }
          ]
          r1_extended = [
            { x: lensSvgX, y: objTopY },
            { x: imgSvgX, y: imgTopY }
          ]
        }
      } else {
        const x_end = VIEW_WIDTH - 15
        const y_end = objTopY + (-candleH / focalDist) * (x_end - lensSvgX)
        r1_refracted = [
          { x: lensSvgX, y: objTopY },
          { x: x_end, y: y_end }
        ]
        r1_extended = [
          { x: lensSvgX, y: objTopY },
          { x: imgSvgX, y: imgTopY },
          { x: lensSvgX - focalDist, y: cy }
        ]
      }

      // 2. 光线2：过光心
      const k_center = candleH / (lensSvgX - objSvgX)
      if (isReal) {
        const x_end = Math.min(VIEW_WIDTH - 15, imgSvgX + 40)
        const y_end = cy + k_center * (x_end - lensSvgX)
        r2_refracted = [
          { x: lensSvgX, y: cy },
          { x: imgSvgX, y: imgTopY },
          { x: x_end, y: y_end }
        ]
      } else {
        const x_end = VIEW_WIDTH - 15
        const y_end = cy + k_center * (x_end - lensSvgX)
        r2_refracted = [
          { x: lensSvgX, y: cy },
          { x: x_end, y: y_end }
        ]
        r2_extended = [
          { x: lensSvgX, y: cy },
          { x: imgSvgX, y: imgTopY }
        ]
      }

      // 3. 光线3：过焦点
      if (!isCloseToFocus) {
        if (!isConcave) {
          if (isReal) {
            const y_lens3 = cy + (candleH * focalDist) / (uCm * SCALE_CM - focalDist)
            if (Math.abs(y_lens3 - cy) < 220) {
              r3_incident = [
                { x: objSvgX, y: objTopY },
                { x: lensSvgX - focalDist, y: cy },
                { x: lensSvgX, y: y_lens3 }
              ]
              const x_end = Math.min(VIEW_WIDTH - 15, imgSvgX + 40)
              r3_refracted = [
                { x: lensSvgX, y: y_lens3 },
                { x: x_end, y: y_lens3 }
              ]
            }
          } else {
            const y_lens3 = cy - (candleH * focalDist) / (focalDist - uCm * SCALE_CM)
            if (Math.abs(y_lens3 - cy) < 220) {
              r3_incident = [
                { x: objSvgX, y: objTopY },
                { x: lensSvgX, y: y_lens3 }
              ]
              r3_guide = [
                { x: objSvgX, y: objTopY },
                { x: lensSvgX - focalDist, y: cy }
              ]
              const x_end = VIEW_WIDTH - 15
              r3_refracted = [
                { x: lensSvgX, y: y_lens3 },
                { x: x_end, y: y_lens3 }
              ]
              r3_extended = [
                { x: lensSvgX, y: y_lens3 },
                { x: imgSvgX, y: y_lens3 }
              ]
            }
          }
        } else {
          const y_lens3 = cy - (candleH * focalDist) / (uCm * SCALE_CM + focalDist)
          if (Math.abs(y_lens3 - cy) < 220) {
            r3_incident = [
              { x: objSvgX, y: objTopY },
              { x: lensSvgX, y: y_lens3 }
            ]
            r3_guide = [
              { x: lensSvgX, y: y_lens3 },
              { x: lensSvgX + focalDist, y: cy }
            ]
            const x_end = VIEW_WIDTH - 15
            r3_refracted = [
              { x: lensSvgX, y: y_lens3 },
              { x: x_end, y: y_lens3 }
            ]
            r3_extended = [
              { x: lensSvgX, y: y_lens3 },
              { x: imgSvgX, y: y_lens3 }
            ]
          }
        }
      }
    }

    return {
      r1: { incident: [{ x: objSvgX, y: objTopY }, { x: lensSvgX, y: objTopY }], refracted: r1_refracted, extended: r1_extended },
      r2: { incident: [{ x: objSvgX, y: objTopY }, { x: lensSvgX, y: cy }], refracted: r2_refracted, extended: r2_extended },
      r3: { incident: r3_incident, refracted: r3_refracted, extended: r3_extended, guide: r3_guide },
      imgTopY
    }
  }, [isValid, mode, objSvgX, uCm, fSvgDist, isReal, imgH, isConcave, imgSvgX, lensSvgX, screenSvgX])

  // ── RelationChart 数据准备 ────────────────────────────────────────────
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

  // 双曲线模式 markers 交互高亮
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
        label: '②', color: isNear2 ? OPTICS_COLORS.wavelengthRed : OPTICS_COLORS.wavelengthGreen,
      })
    }
    return out
  }, [fCm, conjugate, uCm])

  const dashGuide = `${DASH.guide[0]} ${DASH.guide[1]}`

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={vp.transform}>
        <defs>
          {/* 光线及火焰微光特效 */}
          <filter id="optics-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="1.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="boost" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 拟真玻璃透镜渐变 */}
          <linearGradient id="lens-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#E0F2FE" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#BAE6FD" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.35" />
          </linearGradient>

          {/* 金属导轨渐变 */}
          <linearGradient id="rail-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="25%" stopColor="#94A3B8" />
            <stop offset="60%" stopColor="#CBD5E1" />
            <stop offset="85%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* 动态高斯模糊调焦滤镜 */}
          {mode === 1 && (
            <filter id="dynamic-screen-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={blurRadius} />
            </filter>
          )}
        </defs>

        <g>
          {/* 金属光学导轨与毫米刻度 */}
          <g>
            <rect
              x={15} y={cy + 8} width={VIEW_WIDTH - 30} height={14}
              fill="url(#rail-grad)" rx={2} stroke="#0F172A" strokeWidth={1}
            />
            {/* 导轨中心凹槽 */}
            <line
              x1={20} y1={cy + 15} x2={VIEW_WIDTH - 20} y2={cy + 15}
              stroke="#0F172A" strokeWidth={1.5}
            />
            {/* 导轨厘米刻度尺 */}
            {(() => {
              const ticks = []
              const stepCm = 1
              if (mode === 0) {
                // 0cm 在透镜中心 (cx = 400)，两侧标数
                for (let cm = -60; cm <= 60; cm += stepCm) {
                  const tx = cx + cm * SCALE_CM
                  if (tx < 20 || tx > VIEW_WIDTH - 20) continue
                  const isBig = cm % 10 === 0
                  const isMedium = cm % 5 === 0 && !isBig
                  const tickH = isBig ? 8 : isMedium ? 5 : 3

                  ticks.push(
                    <line
                      key={`tick-${cm}`}
                      x1={tx} y1={cy + 8}
                      x2={tx} y2={cy + 8 + tickH}
                      stroke={isBig ? "#0F172A" : "#475569"}
                      strokeWidth={isBig ? 1.5 : 0.8}
                    />
                  )

                  if (isBig) {
                    ticks.push(
                      <text
                        key={`label-${cm}`}
                        x={tx} y={cy + 30}
                        fontSize={font(8)}
                        fill="#334155"
                        textAnchor="middle"
                        fontFamily={FONT.family}
                        fontWeight="bold"
                      >
                        {Math.abs(cm)}
                      </text>
                    )
                  }
                }
              } else {
                // 共轭法：0cm 从物体处 (100) 起算，直到右侧 100cm
                for (let cm = 0; cm <= 100; cm += stepCm) {
                  const tx = 100 + cm * SCALE_CM
                  if (tx < 20 || tx > VIEW_WIDTH - 20) continue
                  const isBig = cm % 10 === 0
                  const isMedium = cm % 5 === 0 && !isBig
                  const tickH = isBig ? 8 : isMedium ? 5 : 3

                  ticks.push(
                    <line
                      key={`tick-${cm}`}
                      x1={tx} y1={cy + 8}
                      x2={tx} y2={cy + 8 + tickH}
                      stroke={isBig ? "#0F172A" : "#475569"}
                      strokeWidth={isBig ? 1.5 : 0.8}
                    />
                  )

                  if (isBig) {
                    ticks.push(
                      <text
                        key={`label-${cm}`}
                        x={tx} y={cy + 30}
                        fontSize={font(8)}
                        fill="#334155"
                        textAnchor="middle"
                        fontFamily={FONT.family}
                        fontWeight="bold"
                      >
                        {cm}
                      </text>
                    )
                  }
                }
              }
              return ticks
            })()}
            {/* 主光轴虚线 */}
            <line
              x1={15} y1={cy} x2={VIEW_WIDTH - 15} y2={cy}
              stroke={OPTICS_COLORS.opticalAxis}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.7}
            />
          </g>

          {/* F 刻度标记（仅基础模式凸透镜） */}
          {mode === 0 && fCm > 0 && (
            <FocalMarks cx={lensSvgX} cy={cy} fSvgDist={fSvgDist} font={font} />
          )}

          {/* 玻璃透镜 */}
          <g
            onMouseDown={(e) => handleMouseDown(e, mode === 1 ? 'lens' : 'object')}
            style={{ cursor: mode === 1 ? 'ew-resize' : 'default' }}
            transform={`translate(${lensSvgX - cx}, 0)`}
          >
            {/* 垂直参考光心线 */}
            <line x1={cx} y1={cy - 75} x2={cx} y2={cy + 75}
              stroke={OPTICS_COLORS.lensStroke} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            {/* 透镜形状 */}
            <path
              d={lensShape(cx, cy, 60, isConcave)}
              fill="url(#lens-grad)" stroke={OPTICS_COLORS.lensStroke} strokeWidth={2.5}
              filter="drop-shadow(0px 2px 4px rgba(2, 132, 199, 0.2))"
            />
            {/* 高光条 */}
            <path
              d={isConcave
                ? `M ${cx - 3} ${cy - 50} Q ${cx + 3} ${cy} ${cx - 3} ${cy + 50}`
                : `M ${cx - 3} ${cy - 50} Q ${cx + 1} ${cy} ${cx - 3} ${cy + 50}`
              }
              fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.65}
            />
            {/* 透镜拖动指示手势 */}
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

          {/* 蜡烛（物体） */}
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

          {/* 物距标注（Mode 0） */}
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
          {rays && (
            <g>
              {/* 光线1 */}
              <path d={`M ${rays.r1.incident[0].x} ${rays.r1.incident[0].y} L ${rays.r1.incident[1].x} ${rays.r1.incident[1].y}`}
                stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
              {rays.r1.refracted.length > 0 && (
                <path d={'M ' + rays.r1.refracted.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
              )}
              {rays.r1.extended.length > 0 && (
                <path d={'M ' + rays.r1.extended.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.65} />
              )}

              {/* 光线2 */}
              <path d={`M ${rays.r2.incident[0].x} ${rays.r2.incident[0].y} L ${rays.r2.incident[1].x} ${rays.r2.incident[1].y}`}
                stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
              {rays.r2.refracted.length > 0 && (
                <path d={'M ' + rays.r2.refracted.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
              )}
              {rays.r2.extended.length > 0 && (
                <path d={'M ' + rays.r2.extended.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.65} />
              )}

              {/* 光线3 */}
              {rays.r3.incident.length > 0 && (
                <path d={'M ' + rays.r3.incident.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
              )}
              {rays.r3.refracted.length > 0 && (
                <path d={'M ' + rays.r3.refracted.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
              )}
              {rays.r3.extended.length > 0 && (
                <path d={'M ' + rays.r3.extended.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.65} />
              )}
              {rays.r3.guide.length > 0 && (
                <path d={'M ' + rays.r3.guide.map(p => `${p.x} ${p.y}`).join(' L ')}
                  stroke={OPTICS_COLORS.lightRay} strokeWidth={1.2} strokeDasharray={dashGuide} opacity={0.5} />
              )}
            </g>
          )}

          {/* 渲染成像（烛身）与像距标注 */}
          {isValid && (
            <g>
              {mode === 0 ? (
                // 基础模式成像
                <g>
                  <CandleShape x={imgSvgX} y={cy} h={imgH} inverted={isReal} opacity={imageOpacity} />
                  {/* 像距标线 */}
                  <line x1={lensSvgX} y1={cy + 40} x2={imgSvgX} y2={cy + 40}
                    stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation}
                    strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`} />
                  <text x={(lensSvgX + imgSvgX) / 2} y={cy + 34} textAnchor="middle" dominantBaseline="auto"
                    fill={CANVAS_COLORS.annotation} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
                    v={vCm > 180 ? '→∞' : `${Math.abs(vCm).toFixed(1)}cm`}
                  </text>
                  {/* 像性质标注 */}
                  <text x={imgSvgX} y={isReal ? cy + imgH + 20 : cy - imgH - 12} textAnchor="middle" dominantBaseline="auto"
                    fill={isReal ? OPTICS_COLORS.lightRayRefracted : OPTICS_COLORS.criticalAngle}
                    fontSize={font(9)} fontFamily={FONT.family} fontWeight="bold">
                    {isReal ? '倒立' : '正立'}{Math.abs(lensResult.m) > 1 ? '放大' : Math.abs(lensResult.m) < 1 ? '缩小' : '等大'}{isReal ? '实像' : '虚像'}
                  </text>
                </g>
              ) : (
                // 共轭测焦距模式：屏幕固定，投射模糊/清晰的像
                <g>
                  {/* 物理光屏 */}
                  <g>
                    <line x1={screenSvgX} y1={cy} x2={screenSvgX} y2={cy + 40} stroke="#475569" strokeWidth={3} />
                    <rect x={screenSvgX - 15} y={cy + 40} width={30} height={6} fill="#1E293B" rx={1} />
                    <rect
                      x={screenSvgX - 4} y={cy - 65} width={8} height={130}
                      fill="#F8FAFC" stroke="#334155" strokeWidth={1.5}
                      filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))"
                    />
                    <line x1={screenSvgX - 4} y1={cy} x2={screenSvgX + 4} y2={cy} stroke="#94A3B8" strokeWidth={0.5} />
                    <line x1={screenSvgX} y1={cy - 60} x2={screenSvgX} y2={cy + 60} stroke="#94A3B8" strokeWidth={0.5} />
                    <text x={screenSvgX} y={cy - 72} textAnchor="middle" dominantBaseline="auto"
                      fill="#475569" fontSize={font(9)} fontFamily={FONT.family} fontWeight="bold">
                      光屏 (L={LCm}cm)
                    </text>
                  </g>

                  {/* 屏幕上的实像 (带动态模糊) */}
                  <g>
                    <CandleShape
                      x={screenSvgX} y={cy} h={imgH}
                      inverted={true}
                      opacity={imageOpacity}
                      showGlow={blurRadius < 1.0}
                      filter={blurRadius > 0.2 ? "url(#dynamic-screen-blur)" : undefined}
                    />
                    {/* 像的聚焦状态标注 */}
                    <text x={screenSvgX} y={cy + imgH + 20} textAnchor="middle" dominantBaseline="auto"
                      fill={blurRadius < 0.5 ? OPTICS_COLORS.lightRayRefracted : "#94A3B8"}
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

          {/* 共轭法：第二次成像理论位置虚影辅助标记（仅共轭模式显示） */}
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
        </g>
      </svg>
    </div>
  )
}
