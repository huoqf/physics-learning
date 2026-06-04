import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateAcceleratedMotion } from '@/physics'
import { solveQuadraticTime } from '@/math/numerical'
import { PHYSICS_COLORS, STROKE } from '@/theme/physics'

export default function UniformAccelerationAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { v0 = 0, a = 1.5 } = params

  // 完全动态计算，不写死任何像素值
  const paddingPercent = 0.07
  const padding = canvasSize.width * paddingPercent
  const groundYPercent = 0.75
  const groundY = canvasSize.height * groundYPercent

  // 物体尺寸基于画布尺寸动态计算
  const objectWidthPercent = 0.07
  const objectWidth = canvasSize.width * objectWidthPercent
  const objectHeight = objectWidth

  // 缩放比例基于画布宽度动态计算
  const scalePercent = 0.035
  const scale = canvasSize.width * scalePercent

  const startX = padding
  const maxVisibleX = canvasSize.width - padding
  const maxDisplacement = (maxVisibleX - startX) / scale
  const { s: currentS } = calculateAcceleratedMotion(v0, a, time)
  const isAtBoundary = currentS >= maxDisplacement || currentS <= 0
  const displayTime = isAtBoundary
    ? currentS >= maxDisplacement
      ? solveQuadraticTime(v0, a, maxDisplacement)
      : solveQuadraticTime(v0, a, 0)
    : time
  const { v: displayV, s: displayS } = calculateAcceleratedMotion(v0, a, displayTime)
  const effectiveS = Math.max(0, Math.min(maxDisplacement, currentS))
  const currentX = startX + effectiveS * scale

  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  // 字体大小动态计算
  const fontSize = Math.max(10, canvasSize.width * 0.017)

  // 网格线数量基于画布尺寸动态计算
  const gridLines = []
  if (showGrid) {
    const gridCount = Math.max(10, Math.floor(canvasSize.width / 50))
    for (let i = 0; i <= gridCount; i++) {
      const xPos = startX + (i * (maxVisibleX - startX)) / gridCount
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - objectHeight * 1.6}
          x2={xPos}
          y2={groundY + objectHeight * 0.4}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={`${fontSize * 0.3},${fontSize * 0.3}`}
        />
      )
    }
  }

  // 箭头尺寸动态计算
  const arrowMarkerSize = fontSize * 0.8

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 地面线 */}
        <line
          x1={padding * 0.5}
          y1={groundY}
          x2={canvasSize.width - padding * 0.5}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* 起始线 */}
        <line
          x1={startX}
          y1={groundY - objectHeight * 2}
          x2={startX}
          y2={groundY + objectHeight * 0.4}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray={`${fontSize * 0.7},${fontSize * 0.35}`}
        />

        {/* 原点标签 */}
        <text
          x={startX - fontSize}
          y={groundY + fontSize * 1.5}
          fontSize={fontSize}
          fill={PHYSICS_COLORS.axis}
          textAnchor="middle"
        >
          0
        </text>

        {/* 运动物体 */}
        <rect
          x={currentX}
          y={groundY - objectHeight}
          width={objectWidth}
          height={objectHeight}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={STROKE.objectLine}
          rx={fontSize * 0.5}
        />

        {/* 速度箭头 */}
        {showVectors && displayV !== 0 && (
          <g>
            <line
              x1={currentX + objectWidth}
              y1={groundY - objectHeight * 0.6}
              x2={currentX + objectWidth + displayV * scale * 0.2}
              y2={groundY - objectHeight * 0.6}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-ua-v)"
            />
            <text
              x={currentX + objectWidth + displayV * scale * 0.2 + fontSize * 1.2}
              y={groundY - objectHeight * 0.6 + fontSize * 0.35}
              fontSize={fontSize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {/* 加速度箭头 */}
        {showVectors && a !== 0 && (
          <g>
            <line
              x1={currentX + objectWidth * 0.5}
              y1={groundY - objectHeight * 1.4}
              x2={currentX + objectWidth * 0.5 + a * scale * 0.5}
              y2={groundY - objectHeight * 1.4}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-ua-a)"
            />
            <text
              x={currentX + objectWidth * 0.5 + a * scale * 0.5 + fontSize * 1.2}
              y={groundY - objectHeight * 1.4 + fontSize * 0.35}
              fontSize={fontSize}
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>
          </g>
        )}

        {/* 箭头标记定义 */}
        <defs>
          <marker
            id="arrowhead-ua-v"
            markerWidth={arrowMarkerSize}
            markerHeight={arrowMarkerSize * 0.7}
            refX={arrowMarkerSize * 0.9}
            refY={arrowMarkerSize * 0.35}
            orient="auto"
          >
            <polygon
              points={`0 0, ${arrowMarkerSize} ${arrowMarkerSize * 0.35}, 0 ${arrowMarkerSize * 0.7}`}
              fill={PHYSICS_COLORS.velocity}
            />
          </marker>
          <marker
            id="arrowhead-ua-a"
            markerWidth={arrowMarkerSize}
            markerHeight={arrowMarkerSize * 0.7}
            refX={arrowMarkerSize * 0.9}
            refY={arrowMarkerSize * 0.35}
            orient="auto"
          >
            <polygon
              points={`0 0, ${arrowMarkerSize} ${arrowMarkerSize * 0.35}, 0 ${arrowMarkerSize * 0.7}`}
              fill={PHYSICS_COLORS.acceleration}
            />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
