import { useState, useRef, useCallback } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS, CHART_COLORS } from '@/theme/physics'
import { physicsToCanvas } from '@/utils/coordinate'

export default function GravityAnimation() {
  const { params, setParams, updateParam, showVectors, showGrid, time } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { m1 = 1000, m2 = 10, r = 5, mode = 0, preset = 0, showChart = 1 } = params

  // ── 科学坐标转换 ──
  const scale = 26 // 物理坐标到 Canvas 像素的比例尺
  
  // 天体 1 放置在左侧 -r/2，天体 2 放置在右侧 r/2
  const pos1 = physicsToCanvas(-r / 2, 0, canvasSize.width, canvasSize.height, scale)
  const pos2 = physicsToCanvas(r / 2, 0, canvasSize.width, canvasSize.height, scale)

  const obj1X = pos1.cx
  const obj1Y = pos1.cy
  const obj2X = pos2.cx
  const obj2Y = pos2.cy

  // 天体半径
  let radius1 = 30
  let radius2 = 18

  if (mode === 1) {
    switch (preset) {
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

  // ── 拖拽交互状态 ──
  const [dragTarget, setDragTarget] = useState<'none' | 'obj1' | 'obj2'>('none')
  const isDraggingChartRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // ── 画中画 F-r 平方反比曲线定位与映射 ──
  const cardWidth = Math.max(220, canvasSize.width * 0.35)
  const cardHeight = Math.max(150, canvasSize.height * 0.33)
  const cardX = canvasSize.width - cardWidth - 20
  const cardY = 20

  const padLeft = 42
  const padRight = 18
  const padTop = 28
  const padBottom = 28

  const innerW = cardWidth - padLeft - padRight
  const innerH = cardHeight - padTop - padBottom

  const toCardX = useCallback((valR: number) => {
    return padLeft + ((valR - 1.5) / (18.0 - 1.5)) * innerW
  }, [innerW, padLeft])

  const toCardY = useCallback((valFNorm: number) => {
    // 归一化 F 范围是 [0, 1]，映射到 [padTop + innerH, padTop]
    return padTop + innerH - valFNorm * innerH
  }, [innerH, padTop])

  // ── 图表反向拖拽调距 ──
  const handleDragChart = useCallback((clientX: number, svgRect: DOMRect) => {
    const clickX = clientX - svgRect.left - cardX - padLeft
    const rRatio = clickX / innerW
    const targetR = 1.5 + rRatio * (18.0 - 1.5)
    const finalR = Math.max(1.5, Math.min(18.0, targetR))

    if (mode === 1 && preset !== 0) {
      setParams({
        ...params,
        r: finalR,
        preset: 0
      })
    } else {
      updateParam('r', finalR)
    }
  }, [cardX, padLeft, innerW, mode, preset, params, setParams, updateParam])

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
      const mouseX = e.clientX - rect.left
      let newR = r
      if (dragTarget === 'obj2') {
        newR = (2 * (mouseX - canvasSize.width / 2)) / scale
      } else if (dragTarget === 'obj1') {
        newR = (-2 * (mouseX - canvasSize.width / 2)) / scale
      }
      const finalR = Math.max(1.5, Math.min(18.0, newR))

      if (mode === 1 && preset !== 0) {
        setParams({ ...params, r: finalR, preset: 0 })
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

  // ── 辅助网格 ──
  const gridLines = []
  if (showGrid) {
    const gridSpacing = 40
    const cols = Math.floor(canvasSize.width / gridSpacing)
    const rows = Math.floor(canvasSize.height / gridSpacing)
    
    for (let i = 0; i <= cols; i++) {
      const x = i * gridSpacing
      gridLines.push(
        <line
          key={`grid-x-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasSize.height}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.5}
          strokeDasharray="2,3"
        />
      )
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * gridSpacing
      gridLines.push(
        <line
          key={`grid-y-${j}`}
          x1={0}
          y1={y}
          x2={canvasSize.width}
          y2={y}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.5}
          strokeDasharray="2,3"
        />
      )
    }
  }

  // ── 动态引力场向心流动波纹 ──
  const numRipples = 3
  const ripples1 = []
  const ripples2 = []

  for (let i = 0; i < numRipples; i++) {
    const phase1 = ((time * 0.6) + i / numRipples) % 1.0
    const maxR1 = radius1 + 80
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
    const maxR2 = radius2 + 60
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
    switch (preset) {
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

  // ── 产生平方反比图线路径 ──
  const generateChartPath = () => {
    const steps = 40
    const pts: string[] = []
    for (let i = 0; i <= steps; i++) {
      const tR = 1.5 + (i / steps) * (18.0 - 1.5)
      const tFNorm = (1.5 * 1.5) / (tR * tR)
      pts.push(`${toCardX(tR)},${toCardY(tFNorm)}`)
    }
    return `M ${pts.join(' L ')}`
  }

  // 当前状态小球
  const curFNorm = (1.5 * 1.5) / (r * r)
  const dotPx = toCardX(r)
  const dotPy = toCardY(curFNorm)

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

          <marker id="arrowhead-gravity-right" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker id="arrowhead-gravity-left" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.12" />
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
            fontSize="12"
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
            fontSize="12"
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            {mode === 1
              ? preset === 1
                ? '地球 m₁'
                : preset === 2
                  ? '太阳 m₁'
                  : preset === 3
                    ? '地球 m₁'
                    : preset === 4
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
            fontSize="12"
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            {mode === 1
              ? preset === 1
                ? '月球 m₂'
                : preset === 2
                  ? '地球 m₂'
                  : preset === 3
                    ? '卫星 m₂'
                    : preset === 4
                      ? '宇航员 m₂'
                      : '天体 m₂'
              : `m₂ = ${m2}`}
          </text>
        </g>

        {/* 6. 引力矢量 */}
        {showVectors && (
          <g>
            <line
              x1={obj1X + radius1}
              y1={obj1Y}
              x2={obj1X + radius1 + arrowLen}
              y2={obj1Y}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-gravity-right)"
            />
            <text
              x={obj1X + radius1 + arrowLen / 2}
              y={obj1Y - 8}
              fontSize="11"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_引
            </text>

            <line
              x1={obj2X - radius2}
              y1={obj2Y}
              x2={obj2X - radius2 - arrowLen}
              y2={obj2Y}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-gravity-left)"
            />
            <text
              x={obj2X - radius2 - arrowLen / 2}
              y={obj2Y - 8}
              fontSize="11"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_引
            </text>
          </g>
        )}

        {/* 7. 画中画：平方反比 F-r 曲线 (对齐圆周运动毛玻璃与精细刻度) */}
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
            
            {/* 标题 */}
            <text
              x={cardWidth / 2}
              y={16}
              fontSize={8}
              fill={CHART_COLORS.titleText}
              textAnchor="middle"
              fontWeight="bold"
              fontFamily="PingFang SC, sans-serif"
            >
              平方反比律 F - r 关系曲线
            </text>

            {/* 坐标轴 (CHART_COLORS.axisLine) */}
            {/* X 轴 */}
            <line
              x1={padLeft - 5}
              y1={padTop + innerH}
              x2={padLeft + innerW + 10}
              y2={padTop + innerH}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
            />
            {/* Y 轴 */}
            <line
              x1={padLeft}
              y1={padTop - 8}
              x2={padLeft}
              y2={padTop + innerH + 5}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
            />

            {/* 坐标轴箭头 */}
            <polygon points={`${padLeft + innerW + 10} ${padTop + innerH - 2.5}, ${padLeft + innerW + 14} ${padTop + innerH}, ${padLeft + innerW + 10} ${padTop + innerH + 2.5}`} fill={CHART_COLORS.axisArrow} />
            <polygon points={`${padLeft - 2.5} ${padTop - 8}, ${padLeft} ${padTop - 12}, ${padLeft + 2.5} ${padTop - 8}`} fill={CHART_COLORS.axisArrow} />

            {/* 轴物理量标签 */}
            <text x={padLeft + innerW + 10} y={padTop + innerH + 11} fontSize={7} fill={CHART_COLORS.labelText} textAnchor="end">间距 r</text>
            <text x={padLeft - 6} y={padTop - 8} fontSize={7} fill={CHART_COLORS.labelText} textAnchor="middle">力 F</text>

            {/* 零水平虚线参考 */}
            <line
              x1={padLeft}
              y1={toCardY(0)}
              x2={padLeft + innerW}
              y2={toCardY(0)}
              stroke={CHART_COLORS.zeroline}
              strokeWidth={0.6}
              strokeDasharray="2,2"
            />

            {/* X 轴起止刻度 Tick 线与数值标注 */}
            {/* 起点刻度 1.5 */}
            <line
              x1={toCardX(1.5)}
              y1={padTop + innerH}
              x2={toCardX(1.5)}
              y2={padTop + innerH + 3}
              stroke={CHART_COLORS.tickMark}
              strokeWidth={0.8}
            />
            <text
              x={toCardX(1.5)}
              y={padTop + innerH + 10}
              fontSize={7}
              fill={CHART_COLORS.tickLabel}
              textAnchor="middle"
            >
              1.5
            </text>

            {/* 终点刻度 18.0 */}
            <line
              x1={toCardX(18.0)}
              y1={padTop + innerH}
              x2={toCardX(18.0)}
              y2={padTop + innerH + 3}
              stroke={CHART_COLORS.tickMark}
              strokeWidth={0.8}
            />
            <text
              x={toCardX(18.0)}
              y={padTop + innerH + 10}
              fontSize={7}
              fill={CHART_COLORS.tickLabel}
              textAnchor="middle"
            >
              18.0
            </text>

            {/* Y 轴刻度：强引力 (1.0) 和 弱引力 (0) */}
            <line
              x1={padLeft - 3}
              y1={toCardY(1.0)}
              x2={padLeft}
              y2={toCardY(1.0)}
              stroke={CHART_COLORS.tickMark}
              strokeWidth={0.8}
            />
            <text
              x={padLeft - 5}
              y={toCardY(1.0) + 2.5}
              fontSize={7}
              fill={CHART_COLORS.tickLabel}
              textAnchor="end"
            >
              极大
            </text>

            <line
              x1={padLeft - 3}
              y1={toCardY(0.1)}
              x2={padLeft}
              y2={toCardY(0.1)}
              stroke={CHART_COLORS.tickMark}
              strokeWidth={0.8}
            />
            <text
              x={padLeft - 5}
              y={toCardY(0.1) + 2.5}
              fontSize={7}
              fill={CHART_COLORS.tickLabel}
              textAnchor="end"
            >
              极小
            </text>

            {/* 平滑的平方反比曲线 */}
            <path
              d={generateChartPath()}
              fill="none"
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={1.5}
              opacity={0.85}
            />

            {/* 曲线文本标签 */}
            <text
              x={toCardX(8.0)}
              y={toCardY(0.2) - 6}
              fontSize={7}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              opacity={0.7}
            >
              F ∝ 1/r²
            </text>

            {/* 拖动图表横轴热区 */}
            <rect
              x={padLeft}
              y={padTop}
              width={innerW}
              height={innerH}
              fill="transparent"
              className="cursor-ew-resize"
              onMouseDown={handleChartMouseDown}
            />

            {/* 当前状态投影线 */}
            <line
              x1={dotPx}
              y1={dotPy}
              x2={dotPx}
              y2={padTop + innerH}
              stroke={CHART_COLORS.reference}
              strokeWidth={0.6}
              strokeDasharray="2,2"
            />
            <line
              x1={padLeft}
              y1={dotPy}
              x2={dotPx}
              y2={dotPy}
              stroke={CHART_COLORS.reference}
              strokeWidth={0.6}
              strokeDasharray="2,2"
            />

            {/* 状态游标指示点 */}
            <circle cx={dotPx} cy={dotPy} r={3} fill={PHYSICS_COLORS.gravity} />
            <circle cx={dotPx} cy={dotPy} r={6} fill="none" stroke={PHYSICS_COLORS.gravity} strokeWidth={0.8} opacity={0.6}>
              <animate attributeName="r" values="3;8;3" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}
