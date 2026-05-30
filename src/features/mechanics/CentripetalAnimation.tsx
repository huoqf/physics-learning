import { useEffect, useState, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function CentripetalAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const { r = 2, v = 3, m = 1 } = params
  const omega = v / r
  const a_c = v * v / r
  const F_c = m * a_c
  const T = (2 * Math.PI * r) / v

  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2
  const scale = 60
  const angle = omega * time
  const x = r * Math.cos(angle)
  const y = r * Math.sin(angle)
  const ballX = centerX + x * scale
  const ballY = centerY - y * scale

  const gridCircles = []
  if (showGrid) {
    for (let i = 1; i <= 4; i++) {
      gridCircles.push(
        <circle
          key={`grid-${i}`}
          cx={centerX}
          cy={centerY}
          r={i * scale}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridCircles}

        <circle
          cx={centerX}
          cy={centerY}
          r={r * scale}
          fill="none"
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />

        <line
          x1={centerX - r * scale - 30}
          y1={centerY}
          x2={centerX + r * scale + 30}
          y2={centerY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={2}
        />
        <line
          x1={centerX}
          y1={centerY - r * scale - 30}
          x2={centerX}
          y2={centerY + r * scale + 30}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={2}
        />

        <text x={centerX + r * scale + 15} y={centerY + 5} fontSize="14" fill={PHYSICS_COLORS.axis}>x</text>
        <text x={centerX + 10} y={centerY - r * scale - 15} fontSize="14" fill={PHYSICS_COLORS.axis}>y</text>

        <line
          x1={centerX}
          y1={centerY}
          x2={ballX}
          y2={ballY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        <circle
          cx={ballX}
          cy={ballY}
          r={12 + m * 3}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={ballX}
          y={ballY + 4}
          fontSize="10"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m={m}
        </text>

        {showVectors && (
          <g>
            <line
              x1={ballX}
              y1={ballY}
              x2={ballX - y * omega * 80}
              y2={ballY - x * omega * 80}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cp-v)"
            />
            <text
              x={ballX - y * omega * 80 - 25}
              y={ballY - x * omega * 80}
              fontSize="14"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>

            <line
              x1={ballX}
              y1={ballY}
              x2={centerX}
              y2={centerY}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cp-r)"
            />
            <text
              x={(ballX + centerX) / 2 - 10}
              y={(ballY + centerY) / 2}
              fontSize="14"
              fill={PHYSICS_COLORS.displacement}
              fontWeight="bold"
            >
              r
            </text>

            <line
              x1={ballX}
              y1={ballY}
              x2={ballX - x * a_c * 30}
              y2={ballY + y * a_c * 30}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cp-a)"
            />
            <text
              x={ballX - x * a_c * 30 - 25}
              y={ballY + y * a_c * 30 + 5}
              fontSize="14"
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>

            <line
              x1={ballX}
              y1={ballY}
              x2={ballX - x * F_c * 5}
              y2={ballY + y * F_c * 5}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cp-f)"
            />
            <text
              x={ballX - x * F_c * 5 - 25}
              y={ballY + y * F_c * 5 - 5}
              fontSize="14"
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              F
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">向心加速度与向心力</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.displacement}>
              r = {r}m
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.velocity}>
              v = {v}m/s
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.objectStroke}>
              m = {m}kg
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.axis}>
              ω = v/r = {omega.toFixed(2)} rad/s
            </text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a = v²/r = {a_c.toFixed(2)} m/s²
            </text>
            <text x={0} y={135} fontSize="12" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F = ma = {F_c.toFixed(2)} N
            </text>
            <text x={0} y={160} fontSize="12" fill={PHYSICS_COLORS.axis}>
              T = 2πr/v = {T.toFixed(2)} s
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-cp-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-cp-r" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.displacement} />
          </marker>
          <marker id="arrowhead-cp-a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrowhead-cp-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
