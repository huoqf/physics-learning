import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateNewtonSecond,
  calculateFriction,
  calculateAcceleratedMotion,
  calculateNewtonSecondVariableMotion,
} from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'
import { Block } from '@/components/Physics/Block'
import { computeScale } from '@/utils/coordinate'

export default function NewtonSecondAnimation() {
    const {params, time, showVectors, showGrid} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const {
    F = 10,
    m = 2,
    mu = 0,
    advancedMode = 0,
    modelIdx = 0,
    k = 2,
    F0 = 15,
    omega = 1.5,
  } = params

  let F_applied = F
  let f = 0
  let F_net = 0
  let a = 0
  let v = 0
  let s = 0

  if (advancedMode === 1) {
    const motion = calculateNewtonSecondVariableMotion(
      modelIdx as 0 | 1,
      { m, mu, k, F0, omega },
      time
    )
    F_applied = motion.F_applied
    f = motion.f
    F_net = motion.F_net
    a = motion.a
    v = motion.v
    s = motion.s
  } else {
    const g = 9.8
    const N = m * g
    const frictionRes = calculateFriction(mu, N, true)
    f = frictionRes.f
    F_applied = F
    F_net = Math.max(0, F_applied - f)
    const newtonRes = calculateNewtonSecond(F_net, m)
    a = newtonRes.a
    const motionRes = calculateAcceleratedMotion(0, a, time)
    v = motionRes.v
    s = motionRes.s
  }

  const WORLD = { xMin: 0, xMax: 15, yMin: 0, yMax: 5 } as const
  const scale = computeScale(canvasSize.width - 280, canvasSize.height, WORLD)
  const groundY = canvasSize.height - 80
  const originX = 80

  // 限制小车不跑出 Canvas 屏幕
  const maxCanvasS = canvasSize.width - 200
  const canvasS = s * scale
  const displayCanvasS = Math.min(canvasS, maxCanvasS)

  // 小车尺寸
  const carWidth = 80
  const carHeight = 35 + m * 5
  const carX = originX + displayCanvasS
  const carY = groundY - carHeight
  const cx = carX + carWidth / 2
  const cy = carY + carHeight / 2

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 20; i++) {
      const xPos = originX + (i * (canvasSize.width - 130)) / 20
      gridLines.push(
        <line
          key={`vline-${i}`}
          x1={xPos}
          y1={groundY - 20}
          x2={xPos}
          y2={groundY + 10}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* 精密实验室格线 */}
        {gridLines}

        {/* 轨道 */}
        <line
          x1={originX - 20}
          y1={groundY}
          x2={canvasSize.width - 30}
          y2={groundY}
          stroke={SCENE_COLORS.surface.groundStroke}
          strokeWidth={STROKE.groundLine}
        />
        {/* 轨道左侧挡板 */}
        <line
          x1={originX - 20}
          y1={groundY - 30}
          x2={originX - 20}
          y2={groundY}
          stroke={SCENE_COLORS.surface.groundStroke}
          strokeWidth={STROKE.groundLine}
        />

        {/* 滑块小车：使用不锈钢金属渐变材质填充 */}
        <Block
          x={carX}
          y={carY}
          width={carWidth}
          height={carHeight}
          type="metal"
          label={`${m} kg`}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />

        {showVectors && (
          <g>
            {/* 1. 拉力 F (外力) */}
            <line
              x1={cx}
              y1={cy}
              x2={cx + Math.max(15, F_applied * 2.5)}
              y2={cy}
              stroke={PHYSICS_COLORS.appliedForce}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-applied)"
            />
            <text
              x={cx + Math.max(15, F_applied * 2.5) + 8}
              y={cy + 4}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.appliedForce}
              fontWeight="bold"
            >
              F={F_applied.toFixed(1)}N
            </text>

            {/* 2. 摩擦力 f (当存在摩擦力时) */}
            {f > 0.01 && (
              <>
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx - Math.max(15, f * 2.5)}
                  y2={cy}
                  stroke={PHYSICS_COLORS.friction}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-friction)"
                />
                <text
                  x={cx - Math.max(15, f * 2.5) - 8}
                  y={cy + 4}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.friction}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  f={f.toFixed(1)}N
                </text>
              </>
            )}

            {/* 3. 重力 G = mg (向下，深绿) */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + 45}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrowhead-gravity)"
            />
            <text
              x={cx}
              y={cy + 60}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              G={(m * 9.8).toFixed(1)}N
            </text>

            {/* 4. 支持力 F_N (向上，青绿) */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - 45}
              stroke={PHYSICS_COLORS.normalForce}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrowhead-normal)"
            />
            <text
              x={cx}
              y={cy - 52}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.normalForce}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_N={(m * 9.8).toFixed(1)}N
            </text>

            {/* 5. 合力 F_合 (亮橙，加粗，画在地面下方) */}
            {F_net > 0.01 && (
              <g transform={`translate(${cx - 30}, ${groundY + 20})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={Math.max(25, F_net * 2.5)}
                  y2={0}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain * 1.5}
                  markerEnd="url(#arrowhead-netforce)"
                />
                <text
                  x={Math.max(25, F_net * 2.5) + 8}
                  y={4}
                  fontSize={FONT.bodySize}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  F合={F_net.toFixed(1)}N
                </text>
              </g>
            )}

            {/* 6. 速度 v 矢量 (经典蓝，画在车顶上方) */}
            <g transform={`translate(${carX}, ${carY - 15})`}>
              <line
                x1={0}
                y1={0}
                x2={Math.max(15, v * 5)}
                y2={0}
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                markerEnd="url(#arrowhead-velocity)"
              />
              <text
                x={Math.max(15, v * 5) + 8}
                y={4}
                fontSize={FONT.axisSize}
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
              >
                v={v.toFixed(2)} m/s
              </text>
            </g>

            {/* 7. 加速度 a 矢量 (警示红，画在速度上方) */}
            {a > 0.01 && (
              <g transform={`translate(${carX}, ${carY - 32})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={Math.max(15, a * 8)}
                  y2={0}
                  stroke={PHYSICS_COLORS.acceleration}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-acceleration)"
                />
                <text
                  x={Math.max(15, a * 8) + 8}
                  y={4}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.acceleration}
                  fontWeight="bold"
                >
                  a={a.toFixed(2)} m/s²
                </text>
              </g>
            )}
          </g>
        )}

        <defs>


          {/* 各矢量箭头定义 */}
          <marker
            id="arrowhead-applied"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.appliedForce} />
          </marker>
          <marker
            id="arrowhead-friction"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="8 0, 0 3, 8 6" fill={PHYSICS_COLORS.friction} />
          </marker>
          <marker
            id="arrowhead-gravity"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker
            id="arrowhead-normal"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.normalForce} />
          </marker>
          <marker
            id="arrowhead-netforce"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker
            id="arrowhead-velocity"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker
            id="arrowhead-acceleration"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
