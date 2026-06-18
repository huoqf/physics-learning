import { useCanvasSize } from '@/utils'
import { computeScale } from '@/utils/coordinate'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, FONT, SCENE_COLORS, CHART_COLORS } from '@/theme/physics'
import { calculateFrictionPullModel, calculateFrictionInclineModel } from '@/physics'
import { GRAVITY } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Block } from '@/components/Physics/Block'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

/** 力矢量视觉缩放比 (1 N = 1.6 px) */
const FORCE_VECTOR_SCALE = 1.6

export default function FrictionAnimation() {
    const {params, time, showVectors, showGrid} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 420 })

  const pullScale = computeScale(canvasSize.width - 200, 1, { xMin: 0, xMax: 5, yMin: 0, yMax: 1 })
  const inclineScale = computeScale(canvasSize.height * 0.6, 1, { xMin: 0, xMax: 3, yMin: 0, yMax: 1 })

  const frictionScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: { force: 30, friction: 30, normalForce: 30, gravity: 30 },
  }
  const frictionSceneScale = createSceneScale(frictionScene)

  const mode = params.mode ?? 0 // 0=水平外力, 1=斜面倾角
  const m = params.m ?? 5
  const mu = params.mu ?? 0.3
  const g = params.g ?? GRAVITY
  const F_applied = params.F_applied ?? 15
  const angle = params.angle ?? 15

  const weight = m * g

  // ── 科学网格背景 ──
  const gridLines = []
  if (showGrid) {
    const gridSpacing = 40
    const cols = Math.floor(canvasSize.width / gridSpacing)
    const rows = Math.floor(canvasSize.height / gridSpacing)
    for (let i = 0; i <= cols; i++) {
      gridLines.push(
        <line
          key={`grid-x-${i}`}
          x1={i * gridSpacing} y1={0} x2={i * gridSpacing} y2={canvasSize.height}
          stroke={PHYSICS_COLORS.grid} strokeWidth={0.5} strokeDasharray="3,4"
        />
      )
    }
    for (let j = 0; j <= rows; j++) {
      gridLines.push(
        <line
          key={`grid-y-${j}`}
          x1={0} y1={j * gridSpacing} x2={canvasSize.width} y2={j * gridSpacing}
          stroke={PHYSICS_COLORS.grid} strokeWidth={0.5} strokeDasharray="3,4"
        />
      )
    }
  }

  // ─── 物理逻辑与运动状态计算 ───

  // 1. 模式一：水平面拉力模型
  const {
    F_normal: F_normal_m1,
    f_actual: f_actual_m1,
    a: acceleration_m1,
    isSliding: isSliding_m1
  } = calculateFrictionPullModel(m, mu, F_applied, g)

  // 运动距离计算 (4秒循环一次)
  const loopTime_m1 = time % 4.0
  const displacement_m1 = 0.5 * acceleration_m1 * loopTime_m1 * loopTime_m1 * pullScale

  // 水平运动坐标
  const groundY_m1 = canvasSize.height - 110
  const boxStartX_m1 = 140
  const boxSize = 44
  const boxX_m1 = boxStartX_m1 + displacement_m1
  const boxY_m1 = groundY_m1 - boxSize

  // 2. 模式二：斜面倾角模型
  const angleRad = (angle * Math.PI) / 180
  const {
    F_normal: F_normal_m2,
    f_actual: f_actual_m2,
    a: acceleration_m2,
    isSliding: isSliding_m2
  } = calculateFrictionInclineModel(m, mu, angle, g)

  // 下滑距离计算 (4秒循环一次)
  const loopTime_m2 = time % 4.0
  const displacement_m2 = isSliding_m2 ? 0.5 * acceleration_m2 * loopTime_m2 * loopTime_m2 * inclineScale : 0

  // 斜面局部几何参数 —— 全部基于 canvasSize 动态计算
  const pivotX = canvasSize.width * 0.18 // 支点水平位置：画布宽度的18%
  const pivotY = canvasSize.height * 0.82 // 支点垂直位置：距底部18%
  const boardLength = canvasSize.width * 0.55 // 斜面板长度：画布宽度的55%
  const boxLocalStartX = boardLength * 0.22 // 木箱初始沿斜面距离：板长的22%
  const boxLocalX = boxLocalStartX + displacement_m2
  const groundLineY = canvasSize.height - 8 // 地面线位置

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>

          {/* 钢体滑轨渐变 */}
          <linearGradient id="steel-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          {/* 力的矢量箭头 */}
          <VectorDefs colors={[PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.friction, PHYSICS_COLORS.normalForce, PHYSICS_COLORS.gravity]} />
        </defs>

        {/* 网格 */}
        {gridLines}

        {/* ─── 模式一：水平面拉力模型渲染 ─── */}
        {mode === 0 && (
          <g>
            {/* 水平地面平台 */}
            <rect
              x={60} y={groundY_m1} width={canvasSize.width - 120} height={18}
              fill="url(#steel-rail)" stroke={SCENE_COLORS.pendulum.pivotStroke} strokeWidth={1.2} rx={2}
            />

            {/* 地面阴影斜线纹理 */}
            <g opacity={0.15}>
              {Array.from({ length: 22 }).map((_, i) => (
                <line
                  key={`floor-line-${i}`}
                  x1={75 + i * 20} y1={groundY_m1 + 18}
                  x2={65 + i * 20} y2={groundY_m1 + 32}
                  stroke={PHYSICS_COLORS.labelText} strokeWidth={1.5}
                />
              ))}
            </g>

            {/* 绘制木箱阻尼摩擦力粒子 (仅在滑动时显示在箱后) */}
            {isSliding_m1 && (
              <g opacity={0.4}>
                <circle cx={boxX_m1 - 15} cy={groundY_m1 - 4} r={2} fill={PHYSICS_COLORS.friction} />
                <circle cx={boxX_m1 - 30} cy={groundY_m1 - 3} r={1.5} fill={PHYSICS_COLORS.friction} />
                <circle cx={boxX_m1 - 8} cy={groundY_m1 - 6} r={2.5} fill={PHYSICS_COLORS.friction} />
              </g>
            )}

            {/* 木箱 (滑块) */}
            <Block
              x={boxX_m1 - boxSize / 2}
              y={boxY_m1}
              width={boxSize}
              height={boxSize}
              type="wood"
              label={`m = ${m}kg`}
              stroke={PHYSICS_COLORS.forceNetArrow}
              strokeWidth={1.8}
            />

            {/* 拉力拉绳 (连向右端) */}
            <line
              x1={boxX_m1 + boxSize / 2} y1={groundY_m1 - boxSize / 2}
              x2={canvasSize.width - 60} y2={groundY_m1 - boxSize / 2}
              stroke={SCENE_COLORS.surface.smoothMark} strokeWidth={1} strokeDasharray="3,3"
            />

            {/* 力的矢量绘制 (基准比例: 1.6) */}
            {showVectors && (
              <g>
                {/* 1. 外拉力 F_applied (向右，作用在箱子右侧中心) */}
                <VectorArrow
                  origin={{ x: boxX_m1 + boxSize / 2, y: -(groundY_m1 - boxSize / 2) }}
                  vector={{ x: F_applied, y: 0 }}
                  type="appliedForce"
                  sceneScale={frictionSceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={F_applied * FORCE_VECTOR_SCALE}
                />
                <text
                  x={boxX_m1 + boxSize / 2 + F_applied * FORCE_VECTOR_SCALE + 6} y={groundY_m1 - boxSize / 2 + 4}
                  fontSize={FONT.axisSize} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold"
                >
                  F
                </text>

                {/* 2. 摩擦力 f (向左，作用在接触面) */}
                {f_actual_m1 > 0.5 && (
                  <VectorArrow
                    origin={{ x: boxX_m1, y: -groundY_m1 }}
                    vector={{ x: -f_actual_m1, y: 0 }}
                    type="friction"
                    sceneScale={frictionSceneScale}
                    strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                    pixelLength={f_actual_m1 * FORCE_VECTOR_SCALE}
                  />
                )}
                {f_actual_m1 > 3 && (
                  <text
                    x={boxX_m1 - f_actual_m1 * FORCE_VECTOR_SCALE - 15} y={groundY_m1 - 4}
                    fontSize={FONT.axisSize} fill={PHYSICS_COLORS.friction} fontWeight="bold"
                  >
                    f
                  </text>
                )}

                {/* 3. 支持力 F_N (向上) */}
                <VectorArrow
                  origin={{ x: boxX_m1, y: -(groundY_m1 - boxSize / 2) }}
                  vector={{ x: 0, y: F_normal_m1 }}
                  type="normalForce"
                  sceneScale={frictionSceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={F_normal_m1 * FORCE_VECTOR_SCALE}
                />
                <text
                  x={boxX_m1 - 16} y={groundY_m1 - boxSize / 2 - F_normal_m1 * FORCE_VECTOR_SCALE + 4}
                  fontSize={FONT.axisSize} fill={PHYSICS_COLORS.normalForce} fontWeight="bold"
                >
                  F_N
                </text>

                {/* 4. 重力 G (向下) */}
                <VectorArrow
                  origin={{ x: boxX_m1, y: -(groundY_m1 - boxSize / 2) }}
                  vector={{ x: 0, y: -weight }}
                  type="gravity"
                  sceneScale={frictionSceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={weight * FORCE_VECTOR_SCALE}
                />
                <text
                  x={boxX_m1 + 8} y={groundY_m1 - boxSize / 2 + weight * FORCE_VECTOR_SCALE}
                  fontSize={FONT.axisSize} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
                >
                  G
                </text>
              </g>
            )}
          </g>
        )}

        {/* ─── 模式二：斜面倾角模型渲染 ─── */}
        {mode === 1 && (
          <g>
            {/* 地面基座：从支点延伸到画布底部的固定基座 */}
            <rect
              x={pivotX - canvasSize.width * 0.06}
              y={pivotY}
              width={canvasSize.width * 0.12}
              height={groundLineY - pivotY}
              fill={CHART_COLORS.gridLine}
              stroke={SCENE_COLORS.surface.smoothMark}
              strokeWidth={1}
              rx={2}
            />
            {/* 地面线 */}
            <line
              x1={0} y1={groundLineY} x2={canvasSize.width} y2={groundLineY}
              stroke={SCENE_COLORS.materials.sliderMetalGrad[2]} strokeWidth={2}
            />
            {/* 地面阴影纹理 */}
            <g opacity={0.12}>
              {Array.from({ length: Math.floor(canvasSize.width / 18) + 1 }).map((_, i) => (
                <line
                  key={`ground-line-${i}`}
                  x1={i * 18} y1={groundLineY}
                  x2={i * 18 - 10} y2={groundLineY + 14}
                  stroke={SCENE_COLORS.pendulum.pivotStroke} strokeWidth={1.5}
                />
              ))}
            </g>
            {/* 轴销旋转点 */}
            <circle cx={pivotX} cy={pivotY} r={5} fill={PHYSICS_COLORS.gravity} stroke={PHYSICS_COLORS.labelText} strokeWidth={1.5} />
            <text x={pivotX} y={pivotY + 16} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">支点</text>

            {/* 使用旋转 transform 绘制斜面板和木箱 */}
            <g transform={`translate(${pivotX}, ${pivotY}) rotate(${-angle})`}>
              {/* 斜面板轨道 (在局部坐标系中为水平长矩形) */}
              <rect
                x={0} y={-8} width={boardLength} height={12}
                fill="url(#steel-rail)" stroke={SCENE_COLORS.pendulum.pivotStroke} strokeWidth={1.2} rx={1}
              />

              {/* 木箱 (沿斜面板下滑) */}
              <Block
                x={boxLocalX - boxSize / 2}
                y={-boxSize - 8}
                width={boxSize}
                height={boxSize}
                type="wood"
                label="m"
                stroke={PHYSICS_COLORS.forceNetArrow}
                strokeWidth={1.8}
              />

              {/* 局部坐标系下的力矢量绘制：F_N 和 f 相对于斜面，在旋转坐标系中绘制 */}
              {showVectors && (
                <g>
                  {/* 1. 支持力 F_N (垂直斜面向上) */}
                  <VectorArrow
                    origin={{ x: boxLocalX, y: -(-boxSize / 2 - 8) }}
                    vector={{ x: 0, y: F_normal_m2 }}
                    type="normalForce"
                    sceneScale={frictionSceneScale}
                    strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                    pixelLength={F_normal_m2 * FORCE_VECTOR_SCALE}
                  />
                  <text
                    x={boxLocalX - 16} y={-boxSize / 2 - 8 - F_normal_m2 * FORCE_VECTOR_SCALE + 4}
                    fontSize={FONT.axisSize} fill={PHYSICS_COLORS.normalForce} fontWeight="bold"
                  >
                    F_N
                  </text>

                  {/* 2. 摩擦力 f (平行斜面向上，作用于接触面中心) */}
                  {f_actual_m2 > 0.5 && (
                    <VectorArrow
                      origin={{ x: boxLocalX, y: 8 }}
                      vector={{ x: f_actual_m2, y: 0 }}
                      type="friction"
                      sceneScale={frictionSceneScale}
                      strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                      pixelLength={f_actual_m2 * FORCE_VECTOR_SCALE}
                    />
                  )}
                  {f_actual_m2 > 3 && (
                    <text
                      x={boxLocalX + f_actual_m2 * FORCE_VECTOR_SCALE + 6} y={-12}
                      fontSize={FONT.axisSize} fill={PHYSICS_COLORS.friction} fontWeight="bold"
                    >
                      f
                    </text>
                  )}
                </g>
              )}
            </g>

            {/* 3. 重力 G：在世界坐标系中绘制，起点为木箱几何重心，方向始终竖直向下 */}
            {showVectors && (
              <g>
                {(() => {
                  // 木箱几何重心在世界坐标系中的位置
                  // 局部坐标: (boxLocalX, -boxSize/2 - 8)，旋转 -angle 后投影到世界坐标
                  const localY = -boxSize / 2 - 8
                  const boxCenterWorldX = pivotX + boxLocalX * Math.cos(angleRad) + localY * Math.sin(angleRad)
                  const boxCenterWorldY = pivotY - boxLocalX * Math.sin(angleRad) + localY * Math.cos(angleRad)
                  const gLen = weight * FORCE_VECTOR_SCALE
                  return (
                    <g>
                      <VectorArrow
                        origin={{ x: boxCenterWorldX, y: -boxCenterWorldY }}
                        vector={{ x: 0, y: -weight }}
                        type="gravity"
                        sceneScale={frictionSceneScale}
                        strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                        pixelLength={gLen}
                      />
                      <text
                        x={boxCenterWorldX + 8} y={boxCenterWorldY + gLen + 4}
                        fontSize={FONT.axisSize} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
                      >
                        G
                      </text>
                    </g>
                  )
                })()}
              </g>
            )}

            {/* 倾斜角标注弧线 */}
            <g>
              <path
                d={`M ${pivotX + 40} ${pivotY} A 40 40 0 0 0 ${pivotX + 40 * Math.cos(angleRad)} ${pivotY - 40 * Math.sin(angleRad)}`}
                fill="none" stroke={PHYSICS_COLORS.forceNet} strokeWidth={1.2}
              />
              <text
                x={pivotX + 48} y={pivotY - 12}
                fontSize="11" fill={PHYSICS_COLORS.forceNet} fontWeight="bold"
              >
                θ = {angle}°
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
