import { VectorArrow, VectorDefs, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, FONT, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Spring } from '@/components/UI'
import { useAnimationStore } from '@/stores'

import { useConnectedBodiesPhysics } from './hooks/useConnectedBodiesPhysics'

/** 车轮半径常量（与 hook 中 LAYOUT.wheelRadius 保持一致） */
const WHEEL_RADIUS = 6

/** 绘制带十字辐条的滚动轮子 */
function RollingWheels({ boxX, boxW, groundY, wheelRotation }: {
  boxX: number
  boxW: number
  groundY: number
  wheelRotation: number
}) {
  const wY = groundY - WHEEL_RADIUS
  const cx1 = boxX + boxW * 0.22
  const cx2 = boxX + boxW * 0.78
  return (
    <g>
      <circle cx={cx1} cy={wY} r={WHEEL_RADIUS} fill={colors.neutral[800]} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
      <circle cx={cx1} cy={wY} r={1.5} fill={colors.neutral.white} />
      <line x1={cx1 - WHEEL_RADIUS} y1={wY} x2={cx1 + WHEEL_RADIUS} y2={wY} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx1}, ${wY})`} />
      <line x1={cx1} y1={wY - WHEEL_RADIUS} x2={cx1} y2={wY + WHEEL_RADIUS} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx1}, ${wY})`} />

      <circle cx={cx2} cy={wY} r={WHEEL_RADIUS} fill={colors.neutral[800]} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
      <circle cx={cx2} cy={wY} r={1.5} fill={colors.neutral.white} />
      <line x1={cx2 - WHEEL_RADIUS} y1={wY} x2={cx2 + WHEEL_RADIUS} y2={wY} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx2}, ${wY})`} />
      <line x1={cx2} y1={wY - WHEEL_RADIUS} x2={cx2} y2={wY + WHEEL_RADIUS} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx2}, ${wY})`} />
    </g>
  )
}

/** 传动连接部件（绳/弹簧） */
function ConnectionElement({ connectionType, ropeLeftX, ropeRightX, ropeY, isMoving, font }: {
  connectionType: number
  ropeLeftX: number
  ropeRightX: number
  ropeY: number
  isMoving: boolean
  font: (size: number) => number
}) {
  if (connectionType === 0) {
    return (
      <g>
        <line
          x1={ropeLeftX} y1={ropeY} x2={ropeRightX} y2={ropeY}
          stroke={SCENE_COLORS.surface.ropeColor}
          strokeWidth={3}
        />
        {isMoving && (
          <line
            x1={ropeLeftX} y1={ropeY} x2={ropeRightX} y2={ropeY}
            stroke={SCENE_COLORS.surface.ropeActive}
            strokeWidth={3}
            strokeDasharray="6,4"
            className="animate-pulse"
          />
        )}
      </g>
    )
  }

  return (
    <g>
      <Spring
        x1={ropeLeftX} y1={ropeY} x2={ropeRightX} y2={ropeY}
        coils={12} radius={11} isLightWeight={true}
      />
      <g transform={`translate(${(ropeLeftX + ropeRightX) / 2}, ${ropeY - 16})`}>
        <rect
          x={-38} y={-10} width={76} height={15} rx={3}
          fill="white" fillOpacity={0.85}
          stroke={SCENE_COLORS.spring.lightCoilStroke}
          strokeWidth={0.5}
        />
        <text
          fontSize={font(9)}
          fill={SCENE_COLORS.spring.lightCoilStroke}
          textAnchor="middle"
          fontWeight="bold"
          y={1}
        >
          轻质弹簧 (m≈0)
        </text>
      </g>
    </g>
  )
}

export default function ConnectedBodiesAnimation() {
  const showVectors = useAnimationStore((s) => s.showVectors)
  const p = useConnectedBodiesPhysics()

  const {
    containerRef, font, animWidth, animHeight,
    m1, m2, F, connectionType,
    totalMass, f1_val, f2_val, T_val,
    groundY, w1, h1, w2, h2,
    m1X, m1Y, m2X, m2Y, ropeLeftX, ropeRightX, ropeY,
    isMoving, wheelRotation, arrowLength, dragTargetX,
    cbSceneScale, handleDragStart,
    isNormalView, isSystemView, isM1View, isM2View,
  } = p

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <svg width={animWidth} height={animHeight} className="bg-white rounded-lg shadow-inner">
        {/* 粗糙地平面 */}
        <PhysicsGround
          x={20} y={groundY} width={animWidth - 40}
          appearance={{ color: PHYSICS_COLORS.labelText, showHatch: true }}
        />

        {/* ==================== 视图一：整体法分析包裹系统 ==================== */}
        {isSystemView && (
          <g>
            <rect
              x={m1X - 12}
              y={m1Y - 18}
              width={w1 + w2 + p.currentRopeL + 24}
              height={h1 + 32}
              fill={CANVAS_COLORS.objectFillNeutral}
              fillOpacity={0.15}
              stroke={CANVAS_COLORS.annotation}
              strokeWidth={1.8}
              strokeDasharray="4,3"
              rx={6}
            />
            <rect
              x={m1X + (w1 + w2 + p.currentRopeL) / 2 - 40}
              y={m1Y - 32}
              width={80}
              height={18}
              fill={CANVAS_COLORS.annotation}
              rx={3}
            />
            <text
              x={m1X + (w1 + w2 + p.currentRopeL) / 2}
              y={m1Y - 19}
              fontSize={FONT.annotation}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              整体 M = {totalMass}kg
            </text>
          </g>
        )}

        {/* ==================== 物体 m1 ==================== */}
        <g opacity={isM2View ? 0.2 : 1} className="transition-opacity duration-200">
          <rect
            x={m1X} y={m1Y} width={w1} height={h1 - 6}
            fill="url(#m1-metal-grad)"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={4}
          />
          <RollingWheels boxX={m1X} boxW={w1} groundY={groundY} wheelRotation={wheelRotation} />
          <text x={m1X + w1 / 2} y={m1Y + h1 / 2} fontSize={FONT.bodySize} fill="white" textAnchor="middle" fontWeight="bold">
            {m1} kg
          </text>
          <text x={m1X + w1 / 2} y={m1Y - 6} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            m₁
          </text>
        </g>

        {/* ==================== 传动连接部件 ==================== */}
        <g opacity={isSystemView ? 0.22 : (isM1View || isM2View ? 0.9 : 1)} className="transition-opacity duration-200">
          <ConnectionElement
            connectionType={connectionType}
            ropeLeftX={ropeLeftX} ropeRightX={ropeRightX} ropeY={ropeY}
            isMoving={isMoving} font={font}
          />
        </g>

        {/* ==================== 物体 m2 ==================== */}
        <g opacity={isM1View ? 0.2 : 1} className="transition-opacity duration-200">
          <rect
            x={m2X} y={m2Y} width={w2} height={h2 - 6}
            fill="url(#m2-metal-grad)"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={4}
          />
          <RollingWheels boxX={m2X} boxW={w2} groundY={groundY} wheelRotation={wheelRotation} />
          <text x={m2X + w2 / 2} y={m2Y + h2 / 2} fontSize={FONT.bodySize} fill="white" textAnchor="middle" fontWeight="bold">
            {m2} kg
          </text>
          <text x={m2X + w2 / 2} y={m2Y - 6} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            m₂
          </text>
        </g>

        {/* ==================== 力学分析矢量箭头组 ==================== */}
        {showVectors && (
          <g className="transition-all duration-200">
            {/* 外力 F */}
            <g opacity={isM1View ? 0.15 : 1} className="transition-opacity duration-200">
              <VectorArrow
                originPixel={{ x: m2X + w2, y: ropeY }}
                vector={{ x: F, y: 0 }}
                type="appliedForce"
                sceneScale={cbSceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                pixelLength={arrowLength}
              />
              <text x={dragTargetX + 8} y={ropeY + 4} fontSize={FONT.bodySize} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold">
                F = {F}N
              </text>
              <circle
                cx={dragTargetX} cy={ropeY} r={12}
                fill={PHYSICS_COLORS.appliedForce}
                opacity={0.0}
                className="cursor-ew-resize hover:opacity-15 active:opacity-30 transition-opacity duration-150"
                onMouseDown={handleDragStart}
              />
            </g>

            {/* m1 摩擦力 f1 */}
            <g opacity={isM2View ? 0.15 : 1} className="transition-opacity duration-200">
              <VectorArrow
                originPixel={{ x: m1X, y: groundY - 10 }}
                vector={{ x: -f1_val, y: 0 }}
                type="friction"
                sceneScale={cbSceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={28}
              />
              <text x={m1X - 32} y={groundY - 14} fontSize={FONT.annotation} fill={PHYSICS_COLORS.friction} fontWeight="bold" textAnchor="end">
                f₁= {f1_val.toFixed(1)}N
              </text>
            </g>

            {/* m2 摩擦力 f2 */}
            <g opacity={isM1View ? 0.15 : 1} className="transition-opacity duration-200">
              <VectorArrow
                originPixel={{ x: m2X, y: groundY - 10 }}
                vector={{ x: -f2_val, y: 0 }}
                type="friction"
                sceneScale={cbSceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={28}
              />
              <text x={m2X - 32} y={groundY - 14} fontSize={FONT.annotation} fill={PHYSICS_COLORS.friction} fontWeight="bold" textAnchor="end">
                f₂= {f2_val.toFixed(1)}N
              </text>
            </g>

            {/* 张力 T */}
            {!isSystemView && (
              <g>
                {(isNormalView || isM1View) && (
                  <g>
                    <VectorArrow
                      originPixel={{ x: ropeLeftX, y: ropeY }}
                      vector={{ x: T_val, y: 0 }}
                      type="tension"
                      sceneScale={cbSceneScale}
                      strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                      pixelLength={28}
                    />
                    <text x={ropeLeftX + 10} y={ropeY - 6} fontSize={FONT.annotation} fill={PHYSICS_COLORS.tension} fontWeight="bold">
                      T = {T_val.toFixed(1)}N
                    </text>
                  </g>
                )}
                {(isNormalView || isM2View) && (
                  <g>
                    <VectorArrow
                      originPixel={{ x: ropeRightX, y: ropeY }}
                      vector={{ x: -T_val, y: 0 }}
                      type="tension"
                      sceneScale={cbSceneScale}
                      strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                      pixelLength={28}
                    />
                    <text x={ropeRightX - 38} y={ropeY - 6} fontSize={FONT.annotation} fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="end">
                      T = {T_val.toFixed(1)}N
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        )}

        <defs>
          <linearGradient id="m1-metal-grad" x1="0" y1="0" x2="1" y2="0">
            {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx) => (
              <stop
                key={`m1m-${idx}`}
                offset={`${(idx / (SCENE_COLORS.materials.sliderMetalGrad.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
          <linearGradient id="m2-metal-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.coil.copperLight} />
            <stop offset="30%" stopColor={SCENE_COLORS.coil.copperBase} />
            <stop offset="70%" stopColor={SCENE_COLORS.coil.copperMid} />
            <stop offset="100%" stopColor={SCENE_COLORS.coil.copperDark} />
          </linearGradient>
          <VectorDefs colors={[PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.friction, PHYSICS_COLORS.tension]} />
        </defs>
      </svg>
      {showVectors && (
        <div style={{ fontSize: font(9) }} className="absolute right-4 bottom-14 bg-white/80 border border-neutral-100 px-2 py-0.5 rounded text-neutral-400 font-medium pointer-events-none select-none">
          💡 可用鼠标按住并左右拖拽拉力 F 箭头端点调节大小
        </div>
      )}
    </div>
  )
}
