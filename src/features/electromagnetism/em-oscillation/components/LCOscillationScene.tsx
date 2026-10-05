import {
  CIRCUIT_COLORS,
  CANVAS_COLORS,
  EM_OSCILLATION_COLORS,
  PHYSICS_COLORS,
  STROKE,
  FONT,
  withAlpha,
} from '@/theme/physics'
import { CapacitorPlates, Solenoid, SolenoidFieldLines, VectorArrow } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import type { ChargeSign } from '@/components/Physics'
import type { LCPhysicsResult } from '../hooks/useLCPhysics'

interface LCOscillationSceneProps {
  physics: LCPhysicsResult
  font: (size: number) => number
}

// ─── 人教版教材与高考标准几何（画布 840×325）─────────────────────────────────
const LOOP_LEFT = 200
const LOOP_RIGHT = 640
const TOP_Y = 88
const BOTTOM_Y = 248

// 电容器：居中位于顶部中央 (420, TOP_Y)，两块垂直极板（极板 A、极板 B）
const CAP_CENTER_X = 420
const CAP_BASE_GAP = 52
const CAP_PLATE_HEIGHT = 72
const CAP_PLATE_THICKNESS = 10

// 螺线管电感：居中位于底部中央 (420, BOTTOM_Y)，水平轴向
const COIL = { cx: 420, cy: BOTTOM_Y, turns: 6, rx: 13, ry: 22 } as const
const COIL_TOTAL_WIDTH = 180
const COIL_LEFT = COIL.cx - COIL_TOTAL_WIDTH / 2
const COIL_RIGHT = COIL.cx + COIL_TOTAL_WIDTH / 2

/** 电荷量低于该占比时视为"极板不带电"，不再绘制电荷符号与电场线 */
const NEUTRAL_THRESHOLD = 0.02

/**
 * LC 振荡回路场景（严格遵循人教版选择性必修第二册第四章第一节 图4.1-2及高考标准题图）。
 *
 * 权威规范：
 *   1. 矩形回路左右绝对对称、上下平齐：
 *      - 顶部中央为垂直平行金属极板电容器（左极板 A、右极板 B），板间为水平匀强电场；
 *      - 底部中央为水平横置通电螺线管电感 L，线圈内为水平磁感线；
 *      - 导线全周横平竖直闭合，绝无任何反向折弯、高低肩或虚线电源；
 *   2. 极板间距动态响应：板间距离 d 沿水平轴左右对称展开，电场线动态缩放；
 *   3. 环流矢量完整自洽：四边电流矢量 i 随充放电时相同步换向流转，右手螺旋定则与磁极 N/S 严丝合缝。
 */
export function LCOscillationScene({ physics, font }: LCOscillationSceneProps) {
  const { q, i, iMax, chargeRatio, dRatio = 1.0 } = physics

  // 极板间距动态响应（拉开极板间距使电容减小，C ∝ 1/d）
  const capGap = Math.round(CAP_BASE_GAP * dRatio)
  const leftPlateOuterX = CAP_CENTER_X - capGap / 2 - CAP_PLATE_THICKNESS
  const rightPlateOuterX = CAP_CENTER_X + capGap / 2 + CAP_PLATE_THICKNESS

  // 极板电荷：极性与正负来自物理引擎（q > 0 表示极板 A 带正电、极板 B 带负电）
  const chargeMagnitude = Math.abs(chargeRatio)
  const isNeutral = chargeMagnitude < NEUTRAL_THRESHOLD
  const chargeSign: ChargeSign = isNeutral ? 'none' : q > 0 ? '+' : '-'
  const chargeDensity = 2 + Math.round(6 * Math.min(1, chargeMagnitude))

  // 电流相对强度（驱动磁场能与流转矢量）
  const currentLevel = iMax > 0 ? Math.min(1, Math.abs(i) / iMax) : 0
  // -i > 0 时正电荷由极板 A 流出（逆时针放电）
  const isCounterClockwise = -i > 0

  return (
    <>
      {/* ── 0. 螺线管磁场能辉光与闭合磁感线（随电流强度动态呈现）── */}
      {currentLevel > 0.03 && (
        <g pointerEvents="none">
          {/* 磁场能柔和辉光云 */}
          <ellipse
            cx={COIL.cx}
            cy={COIL.cy}
            rx={COIL_TOTAL_WIDTH / 2 + 28 * currentLevel}
            ry={COIL.ry + 22 * currentLevel}
            fill={withAlpha(EM_OSCILLATION_COLORS.magneticEnergy, 0.14 * currentLevel)}
          />

          {/* 规范通电螺线管磁感线：水平穿过线圈内部并在外部闭合 */}
          <SolenoidFieldLines
            x={COIL.cx}
            y={COIL.cy}
            width={COIL_TOTAL_WIDTH}
            height={COIL.ry * 2}
            current={-i}
            intensity={currentLevel}
            lineColor={PHYSICS_COLORS.magneticField}
          />
        </g>
      )}

      {/* ── 1. 电容器极板间电场能辉光（随电荷量强弱变化）── */}
      {!isNeutral && (
        <rect
          x={CAP_CENTER_X - capGap / 2}
          y={TOP_Y - CAP_PLATE_HEIGHT / 2 + 6}
          width={capGap}
          height={CAP_PLATE_HEIGHT - 12}
          rx={3}
          fill={withAlpha(EM_OSCILLATION_COLORS.electricEnergy, 0.28 * Math.min(1, chargeMagnitude))}
          pointerEvents="none"
        />
      )}

      {/* ── 2. 闭合主回路导线（横平竖直、绝对对称、标准闭合回路）── */}
      <g
        fill="none"
        stroke={CIRCUIT_COLORS.wire}
        strokeWidth={STROKE.objectLine}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 左半周回路：左极板 A 背面 -> 左上角 -> 左竖直导线 -> 左下角 -> 螺线管左端 */}
        <path
          d={`M ${leftPlateOuterX} ${TOP_Y} L ${LOOP_LEFT} ${TOP_Y} L ${LOOP_LEFT} ${BOTTOM_Y} L ${COIL_LEFT} ${BOTTOM_Y}`}
        />

        {/* 右半周回路：右极板 B 背面 -> 右上角 -> 右竖直导线 -> 右下角 -> 螺线管右端 */}
        <path
          d={`M ${rightPlateOuterX} ${TOP_Y} L ${LOOP_RIGHT} ${TOP_Y} L ${LOOP_RIGHT} ${BOTTOM_Y} L ${COIL_RIGHT} ${BOTTOM_Y}`}
        />
      </g>

      {/* ── 3. 铜线螺线管电感（底部中央，水平轴向串联，显示 N/S 磁极与电流绕向）── */}
      <Solenoid
        x={COIL.cx}
        y={COIL.cy}
        width={COIL_TOTAL_WIDTH}
        height={COIL.ry * 2}
        turns={COIL.turns}
        current={-i}
        leadType="horizontal"
        leadEndpointRadius={0}
        showPolarity
        showWindingArrows
        showIronCore={false}
        animated={false}
      />

      {/* ── 4. 平行金属板电容器（人教版规范：顶部中央垂直极板）── */}
      <CapacitorPlates
        x={CAP_CENTER_X}
        y={TOP_Y}
        height={CAP_PLATE_HEIGHT}
        gap={capGap}
        thickness={CAP_PLATE_THICKNESS}
        orientation="vertical"
        chargeSign={chargeSign}
        chargeDensity={chargeDensity}
        showElectricFieldLines={!isNeutral}
      />

      {/* ── 5. 元件符号与极板 A/B 标注（教材与高考规范标注）── */}
      <g
        fontFamily={FONT.family}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        {/* 极板 A 标注（左极板正上方，随间距动态居中） */}
        <text
          x={CAP_CENTER_X - capGap / 2 - CAP_PLATE_THICKNESS / 2}
          y={TOP_Y - CAP_PLATE_HEIGHT / 2 - 12}
          fontSize={font(FONT.small)}
          textAnchor="middle"
        >
          极板 A
        </text>

        {/* 极板 B 标注（右极板正上方，随间距动态居中） */}
        <text
          x={CAP_CENTER_X + capGap / 2 + CAP_PLATE_THICKNESS / 2}
          y={TOP_Y - CAP_PLATE_HEIGHT / 2 - 12}
          fontSize={font(FONT.small)}
          textAnchor="middle"
        >
          极板 B
        </text>

        {/* 电容 C 符号（置于顶边右半段上方开阔位置） */}
        <text
          x={(rightPlateOuterX + LOOP_RIGHT) / 2}
          y={TOP_Y - 14}
          fontSize={font(FONT.label)}
          textAnchor="middle"
          fontStyle="italic"
        >
          C
        </text>

        {/* 电感 L 符号（严格居中于螺线管正下方） */}
        <text
          x={COIL.cx}
          y={BOTTOM_Y + 36}
          fontSize={font(FONT.label)}
          textAnchor="middle"
          fontStyle="italic"
        >
          L
        </text>
      </g>

      {/* ── 6. 闭合回路瞬时电流矢量系统（四边对称分布、环流物理对齐）── */}
      {currentLevel > 0.03 && (
        <g opacity={0.4 + 0.6 * currentLevel}>
          {/* 顶边左段导线电流：逆时针放电时由极板 A 向左流向左上角 */}
          <VectorArrow
            originDesign={{
              x: (LOOP_LEFT + leftPlateOuterX) / 2,
              y: TOP_Y,
            }}
            vector={{ x: isCounterClockwise ? -1 : 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30 + 18 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 左侧竖直导线电流：逆时针放电时向下流动（物理 -y 为屏幕向下） */}
          <VectorArrow
            originDesign={{
              x: LOOP_LEFT,
              y: (TOP_Y + BOTTOM_Y) / 2,
            }}
            vector={{ x: 0, y: isCounterClockwise ? -1 : 1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30 + 18 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 底边螺线管右侧导线电流：逆时针放电时向右流动 */}
          <VectorArrow
            originDesign={{
              x: (COIL_RIGHT + LOOP_RIGHT) / 2,
              y: BOTTOM_Y,
            }}
            vector={{ x: isCounterClockwise ? 1 : -1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30 + 18 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 右侧竖直导线电流：逆时针放电时向上流动（物理 +y 为屏幕向上） */}
          <VectorArrow
            originDesign={{
              x: LOOP_RIGHT,
              y: (TOP_Y + BOTTOM_Y) / 2,
            }}
            vector={{ x: 0, y: isCounterClockwise ? 1 : -1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30 + 18 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 顶边右段导线电流：逆时针放电时由右上角向左流入极板 B */}
          <VectorArrow
            originDesign={{
              x: (rightPlateOuterX + LOOP_RIGHT) / 2,
              y: TOP_Y,
            }}
            vector={{ x: isCounterClockwise ? -1 : 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30 + 18 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
        </g>
      )}
    </>
  )
}
