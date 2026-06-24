import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateNewtonSecond,
  calculateFriction,
  calculateAcceleratedMotion,
  calculateNewtonSecondVariableMotion,
} from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { Block } from '@/components/Physics/Block'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { computeScale } from '@/utils/coordinate'

// ── 布局常量 ──────────────────────────────────────────────────────────
const NEWTON_LAYOUT = {
  groundOffset: 80,    // px：地面距画布底部
  originX: 80,         // px：小车出发点（也是轨道左挡板位置）
  carWidth: 80,        // px：小车宽度
  safeMarginR: 200,    // px：小车终点右侧安全边距
} as const

const NEWTON_ARROW = {
  forceScale: 2.5,     // px/N：拉力/摩擦力像素比例
  velScale: 5.0,       // px/(m/s)：速度
  accelScale: 8.0,     // px/(m/s²)：加速度
  vertFixedLen: 45,    // px：G/FN 固定长度
} as const
// ──────────────────────────────────────────────────────────────────────

export default function NewtonSecondAnimation() {
    const {params, time, showVectors, showGrid} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)

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
  const scale = computeScale(canvasSize.width - 280, canvasSize.height, WORLD) // 280 = PANEL.right.standard，compact 模式需手动同步
  const groundY = canvasSize.height - NEWTON_LAYOUT.groundOffset
  const originX = NEWTON_LAYOUT.originX

  // 限制小车不跑出 Canvas 屏幕
  const maxCanvasS = canvasSize.width - NEWTON_LAYOUT.safeMarginR
  const canvasS = s * scale
  const displayCanvasS = Math.min(canvasS, maxCanvasS)

  // 小车尺寸
  const carWidth = NEWTON_LAYOUT.carWidth
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
            <VectorArrow
              origin={{ x: cx, y: cy }}
              vector={{ x: 1, y: 0 }}
              type="appliedForce"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.max(15, F_applied * NEWTON_ARROW.forceScale)}
            />
            <text
              x={cx + Math.max(15, F_applied * NEWTON_ARROW.forceScale) + 8}
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
                <VectorArrow
                  origin={{ x: cx, y: cy }}
                  vector={{ x: -1, y: 0 }}
                  type="friction"
sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={Math.max(15, f * NEWTON_ARROW.forceScale)}
                />
                <text
                  x={cx - Math.max(15, f * NEWTON_ARROW.forceScale) - 8}
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
            <VectorArrow
              origin={{ x: cx, y: cy }}
              vector={{ x: 0, y: -1 }}
              type="gravity"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={NEWTON_ARROW.vertFixedLen}
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
            <VectorArrow
              origin={{ x: cx, y: cy }}
              vector={{ x: 0, y: 1 }}
              type="normalForce"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={NEWTON_ARROW.vertFixedLen}
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
                <VectorArrow
                  origin={{ x: 0, y: 0 }}
                  vector={{ x: 1, y: 0 }}
                  type="force"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={Math.max(25, F_net * NEWTON_ARROW.forceScale)}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain * 1.5}
                />
                <text
                  x={Math.max(25, F_net * NEWTON_ARROW.forceScale) + 8}
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
              <VectorArrow
                origin={{ x: 0, y: 0 }}
                vector={{ x: 1, y: 0 }}
                type="velocity"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={Math.max(15, v * NEWTON_ARROW.velScale)}
              />
              <text
                x={Math.max(15, v * NEWTON_ARROW.velScale) + 8}
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
                <VectorArrow
                  origin={{ x: 0, y: 0 }}
                  vector={{ x: 1, y: 0 }}
                  type="acceleration"
                  sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={Math.max(15, a * NEWTON_ARROW.accelScale)}
              />
              <text
                x={Math.max(15, a * NEWTON_ARROW.accelScale) + 8}
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
      </svg>
    </div>
  )
}
