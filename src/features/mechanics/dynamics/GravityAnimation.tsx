import { VectorArrow, VectorDefs } from '@/components/Physics'
import { useState, useRef, useCallback, useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { clientToContainerPoint } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS, CHART_COLORS } from '@/theme/physics'
import { physicsToCanvas, computeScale } from '@/utils/coordinate'

import { RelationChart } from '@/components/Chart'
const R_DOMAIN: [number, number] = [1.5, 18.0]

// ── 布局常量 ──────────────────────────────────────────────────────────
const GRAVITY_LAYOUT = {
  scaleWidthRatio: 0.65,   // 比例：天体区宽度占画布宽度
  cardWidthRatio: 0.35,    // 比例：画中画卡片宽度占画布宽度
  cardHeightRatio: 0.33,   // 比例：画中画卡片高度占画布高度
  cardMargin: 20,          // px：画中画右边距
} as const

const GRAVITY_RIPPLE = {
  largeBodyExtra: 80,      // px：大天体涟漪增量（调参值，非物理推导）
  smallBodyExtra: 60,      // px：小天体涟漪增量（调参值，非物理推导）
} as const
// ──────────────────────────────────────────────────────────────────────

export default function GravityAnimation() {
    const {params, setParams, updateParam, showVectors, time} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    setParams: s.setParams,
    updateParam: s.updateParam,
    showVectors: s.showVectors,
    time: s.time,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { font } = canvasSize

  const { m1 = 1000, m2 = 10, r = 5, mode = 0, preset: presetParam = 0, showChart = 1 } = params

  // ── 科学坐标转换 ──
  const WORLD = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 } as const
  const scale = computeScale(vp.visibleW * GRAVITY_LAYOUT.scaleWidthRatio, vp.visibleH, WORLD)
  
  // 天体 1 放置在左侧 -r/2，天体 2 放置在右侧 r/2
  const pos1 = physicsToCanvas(-r / 2, 0, vp.visibleW, vp.visibleH, scale)
  const pos2 = physicsToCanvas(r / 2, 0, vp.visibleW, vp.visibleH, scale)

  const obj1X = pos1.cx
  const obj1Y = pos1.cy
  const obj2X = pos2.cx
  const obj2Y = pos2.cy

  // 天体半径
  let radius1 = 30
  let radius2 = 18

  if (mode === 1) {
    switch (presetParam) {
      case 1:
        radius1 = 34
        radius2 = 14
        break
      case 2:
        radius1 = 38
        radius2 = 12
        break
      case 3:
        radius1 = 34
        radius2 = 8
        break
      case 4:
        radius1 = 34
        radius2 = 6
        break
      default:
        radius1 = 30
        radius2 = 18
        break
    }
  } else {
    radius1 = Math.min(Math.log(m1 + 1) * 4.8, 38)
    radius2 = Math.min(Math.log(m2 + 1) * 4.8, 28)
  }

  const gravSceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: preset.width, physicsHeight: preset.height, refMagnitudes: { gravity: 1 } })

  // ── 拖拽交互状态 ──
  const [dragTarget, setDragTarget] = useState<'none' | 'obj1' | 'obj2'>('none')
  const isDraggingChartRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // ── 画中画 F-r 平方反比曲线定位 ──
  const cardWidth = Math.max(220, vp.visibleW * GRAVITY_LAYOUT.cardWidthRatio)
  const cardHeight = Math.max(150, vp.visibleH * GRAVITY_LAYOUT.cardHeightRatio)
  const cardX = vp.visibleX + vp.visibleW - cardWidth - GRAVITY_LAYOUT.cardMargin
  const cardY = vp.visibleY + GRAVITY_LAYOUT.cardMargin

  // RelationChart 数据：F ∝ 1/r² 归一化曲线
  const frPoints = useMemo(() => {
    const steps = 40
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const tR = R_DOMAIN[0] + (i / steps) * (R_DOMAIN[1] - R_DOMAIN[0])
      const tFNorm = (R_DOMAIN[0] * R_DOMAIN[0]) / (tR * tR)
      pts.push({ x: tR, y: tFNorm })
    }
    return pts
  }, [])

  // ── 图表反向拖拽调距 ──
  const handleDragChart = useCallback((clientX: number, svgRect: DOMRect) => {
    // foreignObject 占据卡片内部 x=4, w=cardWidth-8，用比例估算 r
    const { x: containerX } = clientToContainerPoint(clientX, 0, svgRect)
    const clickX = containerX - cardX - 4
    const rRatio = clickX / (cardWidth - 8)
    const targetR = R_DOMAIN[0] + rRatio * (R_DOMAIN[1] - R_DOMAIN[0])
    const finalR = Math.max(R_DOMAIN[0], Math.min(R_DOMAIN[1], targetR))

    if (mode === 1 && presetParam !== 0) {
      setParams({
        ...params,
        r: finalR,
        preset: presetParam
      })
    } else {
      updateParam('r', finalR)
    }
  }, [cardX, cardWidth, mode, presetParam, params, setParams, updateParam])

  const handleMouseDown = (target: 'obj1' | 'obj2') => {
    if (isDraggingChartRef.current) return
    setDragTarget(target)
  }

  const handleChartMouseDown = (e: React.MouseEvent<SVGElement>) => {
    if (dragTarget !== 'none') return
    isDraggingChartRef.current = true
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    handleDragChart(e.clientX, rect)
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    if (dragTarget !== 'none') {
      // 1. 处理天体拖拽
      const { x: mouseX } = clientToContainerPoint(e.clientX, 0, rect)
      let newR = r
      if (dragTarget === 'obj2') {
        newR = (2 * (mouseX - vp.centerX)) / scale
      } else if (dragTarget === 'obj1') {
        newR = (-2 * (mouseX - vp.centerX)) / scale
      }
      const finalR = Math.max(R_DOMAIN[0], Math.min(R_DOMAIN[1], newR))

      if (mode === 1 && presetParam !== 0) {
        setParams({ ...params, r: finalR, preset: presetParam })
      } else {
        updateParam('r', finalR)
      }
    } else if (isDraggingChartRef.current) {
      // 2. 处理画中画拖拽
      handleDragChart(e.clientX, rect)
    }
  }

  const handleSvgMouseUp = () => {
    setDragTarget('none')
    isDraggingChartRef.current = false
  }

  // ── 辅助网格（已移除）──
  const gridLines = null

  // ── 动态引力场向心流动波纹 ──
  const numRipples = 3
  const ripples1 = []
  const ripples2 = []

  for (let i = 0; i < numRipples; i++) {
    const phase1 = ((time * 0.6) + i / numRipples) % 1.0
    const maxR1 = radius1 + GRAVITY_RIPPLE.largeBodyExtra
    const minR1 = radius1 + 5
    const currentR1 = maxR1 - phase1 * (maxR1 - minR1)
    const opacity1 = phase1 < 0.15 ? (phase1 / 0.15) * 0.22 : (1 - phase1) / 0.85 * 0.22

    ripples1.push(
      <circle
        key={`ripple1-${i}`}
        cx={obj1X}
        cy={obj1Y}
        r={currentR1}
        fill="none"
        stroke={PHYSICS_COLORS.gravity}
        strokeWidth={0.8}
        strokeDasharray="3,5"
        opacity={opacity1}
      />
    )

    const phase2 = ((time * 0.6) + (i + 0.5) / numRipples) % 1.0
    const maxR2 = radius2 + GRAVITY_RIPPLE.smallBodyExtra
    const minR2 = radius2 + 5
    const currentR2 = maxR2 - phase2 * (maxR2 - minR2)
    const opacity2 = phase2 < 0.15 ? (phase2 / 0.15) * 0.22 : (1 - phase2) / 0.85 * 0.22

    ripples2.push(
      <circle
        key={`ripple2-${i}`}
        cx={obj2X}
        cy={obj2Y}
        r={currentR2}
        fill="none"
        stroke={PHYSICS_COLORS.gravity}
        strokeWidth={0.8}
        strokeDasharray="3,5"
        opacity={opacity2}
      />
    )
  }

  // ── 计算引力矢量的长度 ──
  let F_rel = 1
  if (mode === 1) {
    let m1_real = 5.97e24
    let m2_real = 7.35e22
    switch (presetParam) {
      case 1: m1_real = 5.97e24; m2_real = 7.35e22; break
      case 2: m1_real = 1.99e30; m2_real = 5.97e24; break
      case 3: m1_real = 5.97e24; m2_real = 1.00e3; break
      case 4: m1_real = 5.97e24; m2_real = 80; break
      default:
        m1_real = m1 * 1e21
        m2_real = m2 * 1e20
        break
    }
    F_rel = (m1_real / 5.97e24) * (m2_real / 7.35e22) / (r * r)
  } else {
    F_rel = (m1 * m2) / (r * r)
  }

  const arrowLen = 15 + Math.min(Math.log10(F_rel + 1) * 15, 65)

  // 当前归一化力
  // curFNorm removed: cursor handled by RelationChart

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
      >
        <defs>
          <radialGradient id="planet1-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[0]} />
            <stop offset="45%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[1]} />
            <stop offset="85%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.stroke} />
          </radialGradient>
          
          <radialGradient id="planet2-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[0]} />
            <stop offset="45%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[1]} />
            <stop offset="85%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[3]} />
          </radialGradient>

          <VectorDefs colors={[PHYSICS_COLORS.gravity]} />
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={SCENE_COLORS.effects.shadowLight} />
          </filter>
        </defs>

        {/* 1. 网格背景 */}
        {gridLines}

        {/* 2. 引力场流动涟漪 */}
        <g>{ripples1}</g>
        <g>{ripples2}</g>

        {/* 3. 中轴参考线 */}
        <line
          x1={obj1X}
          y1={obj1Y}
          x2={obj2X}
          y2={obj2Y}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray="4,4"
        />

        {/* 距离标注 */}
        <g>
          <line
            x1={obj1X}
            y1={obj1Y + 75}
            x2={obj2X}
            y2={obj2Y + 75}
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={1.2}
          />
          <line x1={obj1X} y1={obj1Y + 70} x2={obj1X} y2={obj1Y + 80} stroke={PHYSICS_COLORS.axis} strokeWidth={1.2} />
          <line x1={obj2X} y1={obj2Y + 70} x2={obj2X} y2={obj2Y + 80} stroke={PHYSICS_COLORS.axis} strokeWidth={1.2} />
          <text
            x={(obj1X + obj2X) / 2}
            y={obj1Y + 92}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="Inter, sans-serif"
          >
            r = {r.toFixed(1)} {mode === 1 ? '× 10⁷ m' : '相对单位'}
          </text>
        </g>

        {/* 4. 天体 1 */}
        <g>
          <circle
            cx={obj1X}
            cy={obj1Y}
            r={radius1}
            fill="url(#planet1-grad)"
            stroke={SCENE_COLORS.sphere.earthTech.stroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            onMouseDown={() => handleMouseDown('obj1')}
            style={{ cursor: dragTarget === 'obj1' ? 'grabbing' : 'grab' }}
          />
          <text
            x={obj1X}
            y={obj1Y - radius1 - 10}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            {mode === 1
              ? presetParam === 1
                ? '地球 m₁'
                : presetParam === 2
                  ? '太阳 m₁'
                  : presetParam === 3
                    ? '地球 m₁'
                    : presetParam === 4
                      ? '地球 m₁'
                      : '天体 m₁'
              : `m₁ = ${m1}`}
          </text>
        </g>

        {/* 5. 天体 2 */}
        <g>
          <circle
            cx={obj2X}
            cy={obj2Y}
            r={radius2}
            fill="url(#planet2-grad)"
            stroke={SCENE_COLORS.sphere.planetCool.stroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            onMouseDown={() => handleMouseDown('obj2')}
            style={{ cursor: dragTarget === 'obj2' ? 'grabbing' : 'grab' }}
          />
          <text
            x={obj2X}
            y={obj2Y - radius2 - 10}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            {mode === 1
              ? presetParam === 1
                ? '月球 m₂'
                : presetParam === 2
                  ? '地球 m₂'
                  : presetParam === 3
                    ? '卫星 m₂'
                    : presetParam === 4
                      ? '宇航员 m₂'
                      : '天体 m₂'
              : `m₂ = ${m2}`}
          </text>
        </g>

        {/* 6. 引力矢量 */}
        {showVectors && (
          <g>
            <VectorArrow
              originPixel={{ x: obj1X + radius1, y: obj1Y }}
              vector={{ x: 1, y: 0 }}
              type="gravity"
              sceneScale={gravSceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              pixelLength={arrowLen}
            />
            <text
              x={obj1X + radius1 + arrowLen / 2}
              y={obj1Y - 8}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_引
            </text>

            <VectorArrow
              originPixel={{ x: obj2X - radius2, y: obj2Y }}
              vector={{ x: -1, y: 0 }}
              type="gravity"
              sceneScale={gravSceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              pixelLength={arrowLen}
            />
            <text
              x={obj2X - radius2 - arrowLen / 2}
              y={obj2Y - 8}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_引
            </text>
          </g>
        )}

        {/* 7. 画中画：平方反比 F-r 曲线（RelationChart） */}
        {showChart === 1 && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            {/* 毛玻璃卡片背景 */}
            <rect
              width={cardWidth}
              height={cardHeight}
              fill={SCENE_COLORS.labels.glassPanelBg}
              rx={8}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
              filter="url(#card-shadow)"
            />

            {/* RelationChart 主体 */}
            <foreignObject
              x={4} y={4}
              width={cardWidth - 8} height={cardHeight - 8}
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ width: '100%', height: '100%' }}>
                <RelationChart
                  points={frPoints}
                  xDomain={[R_DOMAIN[0], R_DOMAIN[1]]}
                  yDomain={[0, 1]}
                  xLabel="间距 r"
                  yLabel="力 F (归一化)"
                  title="平方反比律 F - r 关系曲线"
                  color={PHYSICS_COLORS.gravity}
                  strokeWidth={1.5}
                  cursorX={r}
                  cursorLabel={(_x, y) => `F=${y.toFixed(3)}`}
                  markers={[]}
                />
              </div>
            </foreignObject>

            {/* 拖动图表热区 */}
            <rect
              x={0}
              y={0}
              width={cardWidth}
              height={cardHeight}
              fill="transparent"
              className="cursor-ew-resize"
              onMouseDown={handleChartMouseDown}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
