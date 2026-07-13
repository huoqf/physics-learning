import { VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, FONT } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'

interface ElevatorShaftProps {
  layout: {
    centerX: number
    elevatorWidth: number
    elevatorHeight: number
    elevatorY: number
    shaftTop: number
    shaftBottom: number
    floorY: number
    scaleWidth: number
    scaleHeight: number
    scaleX: number
    scaleY: number
    dialCx: number
    dialCy: number
    dialR: number
    objWidth: number
    objHeight: number
    objX: number
    objY: number
    objCx: number
    objCy: number
    pointerAngle: number
    currentN: number
    weight: number
    actualA: number
    currentV: number
  }
  m: number
  showVectors: boolean
}

export function ElevatorShaft({ layout, m, showVectors }: ElevatorShaftProps) {
  const {
    centerX, elevatorWidth, elevatorHeight, elevatorY, shaftTop, shaftBottom, floorY,
    scaleWidth, scaleHeight, scaleX, scaleY, dialCx, dialCy, dialR,
    objWidth, objHeight, objX, objY, objCx, objCy,
    pointerAngle, currentN, weight, actualA, currentV
  } = layout

  return (
    <g>
      {/* 观光电梯轨道 */}
      <line
        x1={centerX - elevatorWidth / 2 - 15}
        y1={shaftTop}
        x2={centerX - elevatorWidth / 2 - 15}
        y2={shaftBottom}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={STROKE.groundLine}
      />
      <line
        x1={centerX + elevatorWidth / 2 + 15}
        y1={shaftTop}
        x2={centerX + elevatorWidth / 2 + 15}
        y2={shaftBottom}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={STROKE.groundLine}
      />

      {/* 观光电梯主体外框 */}
      <rect
        x={centerX - elevatorWidth / 2}
        y={elevatorY}
        width={elevatorWidth}
        height={elevatorHeight}
        fill="url(#elevator-glass-grad)"
        stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        rx={6}
      />

      {/* 电梯底板 */}
      <rect
        x={centerX - elevatorWidth / 2 + 5}
        y={floorY}
        width={elevatorWidth - 10}
        height={10}
        fill="url(#elevator-metal-grad)"
        stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={1.5}
        rx={2}
      />

      {/* 体重计底座 */}
      <rect
        x={scaleX}
        y={scaleY}
        width={scaleWidth}
        height={scaleHeight}
        fill="url(#scale-metal-grad)"
        stroke={PHYSICS_COLORS.labelTextLight}
        strokeWidth={1}
        rx={3}
      />

      {/* 体重计表盘 */}
      <circle
        cx={dialCx}
        cy={dialCy}
        r={dialR}
        fill={PHYSICS_COLORS.objectFillNeutral}
        stroke={PHYSICS_COLORS.labelTextLight}
        strokeWidth={1}
      />
      <circle cx={dialCx} cy={dialCy} r={1.2} fill={PHYSICS_COLORS.labelText} />
      <line
        x1={dialCx}
        y1={dialCy}
        x2={dialCx}
        y2={dialCy - dialR + 1.2}
        stroke={PHYSICS_COLORS.acceleration}
        strokeWidth={1.5}
        strokeLinecap="round"
        transform={`rotate(${pointerAngle}, ${dialCx}, ${dialCy})`}
      />

      {/* 砝码重物 */}
      <rect
        x={objX}
        y={objY}
        width={objWidth}
        height={objHeight}
        fill="url(#weight-metal-grad)"
        stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        rx={4}
        className="transition-all duration-75"
      />
      <path
        d={`M ${centerX - 6} ${objY} C ${centerX - 6} ${objY - 6}, ${centerX + 6} ${objY - 6}, ${centerX + 6} ${objY}`}
        fill="none"
        stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={1.8}
      />
      <text
        x={centerX}
        y={objY + objHeight / 2 + 4}
        fontSize={FONT.bodySize}
        fill={PHYSICS_COLORS.labelText}
        textAnchor="middle"
        fontWeight="bold"
        className="select-none pointer-events-none"
      >
        {m} kg
      </text>

      {/* 矢量箭头绘制 */}
      {showVectors && (
        <g>
          {/* 重力 G (深绿) */}
          <VectorArrow
            originPixel={{ x: objCx, y: objCy }}
            vector={{ x: 0, y: -1 }}
            type="gravity"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={45}
          />
          <text
            x={objCx + 10}
            y={objCy + 32}
            fontSize={FONT.axisSize}
            fill={PHYSICS_COLORS.gravity}
            fontWeight="bold"
          >
            G
          </text>

          {/* 支持力 N (青绿，完全失重时不绘制) */}
          {currentN > 0.01 && (
            <>
              <VectorArrow
                originPixel={{ x: objCx, y: objCy }}
                vector={{ x: 0, y: 1 }}
                type="normalForce"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={45 * (currentN / weight)}
              />
              <text
                x={objCx + 10}
                y={objCy - 45 * (currentN / weight) + 10}
                fontSize={FONT.axisSize}
                fill={PHYSICS_COLORS.normalForce}
                fontWeight="bold"
              >
                N
              </text>
            </>
          )}

          {/* 电梯加速度 a (警示红，画在左侧导轨旁，省出右侧空间) */}
          {Math.abs(actualA) > 0.01 && (
            <g transform={`translate(${centerX - elevatorWidth / 2 - 28}, ${elevatorY + elevatorHeight / 2})`}>
              <VectorArrow
                originPixel={{ x: 0, y: 0 }}
                vector={{ x: 0, y: actualA > 0 ? 1 : -1 }}
                type="acceleration"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={Math.abs(actualA) * 10}
              />
              <text
                x={-15}
                y={-actualA * 5 + 4}
                fontSize={FONT.axisSize}
                fill={PHYSICS_COLORS.acceleration}
                fontWeight="bold"
                textAnchor="end"
              >
                a
              </text>
            </g>
          )}

          {/* 电梯速度 v (经典蓝，画在左侧导轨旁) */}
          {Math.abs(currentV) > 0.01 && (
            <g transform={`translate(${centerX - elevatorWidth / 2 - 42}, ${elevatorY + elevatorHeight / 2})`}>
              <VectorArrow
                originPixel={{ x: 0, y: 0 }}
                vector={{ x: 0, y: currentV > 0 ? 1 : -1 }}
                type="velocity"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={Math.abs(currentV) * 6}
              />
              <text
                x={-15}
                y={-currentV * 3 + 4}
                fontSize={FONT.axisSize}
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
                textAnchor="end"
              >
                v
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  )
}
