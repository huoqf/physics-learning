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
const LOOP_LEFT = 180
const LOOP_RIGHT = 660
const TOP_Y = 64
const BOTTOM_Y = 256

// 水平平行板电容器：置于回路右侧 (LOOP_RIGHT, 160)，两块水平金属板（上极板 A、下极板 B）
const CAP_CENTER_X = LOOP_RIGHT
const CAP_CENTER_Y = (TOP_Y + BOTTOM_Y) / 2 // 160
const CAP_WIDTH = 130
const CAP_BASE_GAP = 46
const CAP_PLATE_THICKNESS = 10

// 螺线管电感：居中位于底部中央 (420, BOTTOM_Y)，水平轴向
const COIL = { cx: 420, cy: BOTTOM_Y, turns: 6, rx: 13, ry: 22 } as const
const COIL_TOTAL_WIDTH = 180
const COIL_LEFT = COIL.cx - COIL_TOTAL_WIDTH / 2 // 330
const COIL_RIGHT = COIL.cx + COIL_TOTAL_WIDTH / 2 // 510

/** 电荷量低于该占比时视为"极板不带电"，不再绘制电荷符号与电场线 */
const NEUTRAL_THRESHOLD = 0.02

/**
 * LC 振荡回路场景（严格遵循人教版选择性必修第二册第四章第一节 图4.1-2及高考标准题图）。
 *
 * 权威规范：
 *   1. 矩形回路左右绝对对称、上下平齐：
 *      - 右侧中央为水平平行金属极板电容器（上极板 A、下极板 B），板间为竖直匀强电场（与高考真题题干严格一致）；
 *      - 底部中央为水平横置通电螺线管电感 L，线圈内为水平磁感线；
 *      - 导线全周横平竖直闭合，绝无任何反向折弯、高低肩或断口；
 *   2. 极板间距动态响应：板间距离 d 沿竖直轴对称展开，电场线动态缩放；
 *   3. 环流矢量完整自洽：回路五段导线（顶边、左竖直边、底边、右侧上下两段引线）的
 *      电流矢量 i 随充放电时相同步换向流转，左右两段引线共用同一箭头长度以保持对称，
 *      右手螺旋定则与磁极 N/S 严丝合缝。
 */
export function LCOscillationScene({ physics, font }: LCOscillationSceneProps) {
  const { q, i, iMax, chargeRatio, dRatio = 1.0 } = physics

  // 极板间距动态响应（拉开极板间距使电容减小，C ∝ 1/d）
  const capGap = Math.round(CAP_BASE_GAP * dRatio)
  const topPlateOuterY = CAP_CENTER_Y - capGap / 2 - CAP_PLATE_THICKNESS
  const bottomPlateOuterY = CAP_CENTER_Y + capGap / 2 + CAP_PLATE_THICKNESS

  // 极板电荷：极性与正负来自物理引擎（q > 0 表示上极板 A 带正电、下极板 B 带负电）
  const chargeMagnitude = Math.abs(chargeRatio)
  const isNeutral = chargeMagnitude < NEUTRAL_THRESHOLD
  const chargeSign: ChargeSign = isNeutral ? 'none' : q > 0 ? '+' : '-'
  const chargeDensity = 2 + Math.round(5 * Math.min(1, chargeMagnitude))

  // 电流相对强度（驱动磁场能与流转矢量）
  const currentLevel = iMax > 0 ? Math.min(1, Math.abs(i) / iMax) : 0
  // -i > 0 时正电荷由上极板 A 流出（逆时针放电）
  const isCounterClockwise = -i > 0

  // 右侧上下两段引线（右上角↔上极板、下极板↔右下角）上电流箭头的统一长度。
  // 箭头自引线中点朝极板/拐角方向绘制，必须收敛在引线半段之内，
  // 否则峰值电流时会越过拐角戳出导线（上段）或越过极板内表面（下段）；
  // 两段共用同一长度以保证右侧环流矢量左右对称。
  const rightLeadHalfLength = Math.min(topPlateOuterY - TOP_Y, BOTTOM_Y - bottomPlateOuterY) / 2
  const rightLeadArrowLength = Math.max(
    12,
    Math.min(26 + 14 * currentLevel, rightLeadHalfLength - 8),
  )

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
          x={CAP_CENTER_X - CAP_WIDTH / 2 + 6}
          y={CAP_CENTER_Y - capGap / 2}
          width={CAP_WIDTH - 12}
          height={capGap}
          rx={3}
          fill={withAlpha(EM_OSCILLATION_COLORS.electricEnergy, 0.28 * Math.min(1, chargeMagnitude))}
          pointerEvents="none"
        />
      )}

      {/* ── 2. 闭合主回路导线（横平竖直、规范闭合）── */}
      <g
        fill="none"
        stroke={CIRCUIT_COLORS.wire}
        strokeWidth={STROKE.objectLine}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 顶边完整导线：由右上角直通左上角 */}
        <line x1={LOOP_RIGHT} y1={TOP_Y} x2={LOOP_LEFT} y2={TOP_Y} />
        {/* 左侧竖直导线：由左上角直通左下角 */}
        <line x1={LOOP_LEFT} y1={TOP_Y} x2={LOOP_LEFT} y2={BOTTOM_Y} />
        {/* 底边左段导线：左下角到螺线管左端 */}
        <line x1={LOOP_LEFT} y1={BOTTOM_Y} x2={COIL_LEFT} y2={BOTTOM_Y} />
        {/* 底边右段导线：螺线管右端到右下角 */}
        <line x1={COIL_RIGHT} y1={BOTTOM_Y} x2={LOOP_RIGHT} y2={BOTTOM_Y} />
        {/* 右侧上引线：右上角连接到上极板外表面顶部中央 */}
        <line x1={LOOP_RIGHT} y1={TOP_Y} x2={LOOP_RIGHT} y2={topPlateOuterY} />
        {/* 右侧下引线：下极板外表面底部中央连接到右下角 */}
        <line x1={LOOP_RIGHT} y1={bottomPlateOuterY} x2={LOOP_RIGHT} y2={BOTTOM_Y} />
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

      {/* ── 4. 平行金属板电容器（人教版规范：水平放置、板间为竖直匀强电场）── */}
      <CapacitorPlates
        x={CAP_CENTER_X - CAP_WIDTH / 2}
        y={CAP_CENTER_Y}
        width={CAP_WIDTH}
        gap={capGap}
        thickness={CAP_PLATE_THICKNESS}
        orientation="horizontal"
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
        {/* 上极板 A 标注（上极板正上方开阔处，与下极板垂直间距 > 100px，绝无挤压） */}
        <text
          x={CAP_CENTER_X}
          y={topPlateOuterY - 12}
          fontSize={font(FONT.small)}
          textAnchor="middle"
        >
          上极板 (A)
        </text>

        {/* 下极板 B 标注（下极板正下方开阔处） */}
        <text
          x={CAP_CENTER_X}
          y={bottomPlateOuterY + 22}
          fontSize={font(FONT.small)}
          textAnchor="middle"
        >
          下极板 (B)
        </text>

        {/* 电容 C 符号（置于水平极板右侧） */}
        <text
          x={CAP_CENTER_X + CAP_WIDTH / 2 + 20}
          y={CAP_CENTER_Y + 5}
          fontSize={font(FONT.label)}
          textAnchor="start"
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

      {/* ── 6. 闭合回路瞬时电流矢量系统（五段导线逐一标注、环流物理对齐）── */}
      {currentLevel > 0.03 && (
        <g opacity={0.4 + 0.6 * currentLevel}>
          {/* 顶边导线电流：逆时针放电时由上极板向左流动 */}
          <VectorArrow
            originDesign={{
              x: (LOOP_LEFT + LOOP_RIGHT) / 2,
              y: TOP_Y,
            }}
            vector={{ x: isCounterClockwise ? -1 : 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={32 + 20 * currentLevel}
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
            pixelLength={32 + 20 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 底边导线电流：逆时针放电时沿底边向右流动 */}
          <VectorArrow
            originDesign={{
              x: (COIL_RIGHT + LOOP_RIGHT) / 2,
              y: BOTTOM_Y,
            }}
            vector={{ x: isCounterClockwise ? 1 : -1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={32 + 20 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 右侧下段导线电流：逆时针放电时向上流入下极板（物理 +y 为屏幕向上） */}
          {bottomPlateOuterY < BOTTOM_Y - 30 && (
            <VectorArrow
              originDesign={{
                x: LOOP_RIGHT,
                y: (bottomPlateOuterY + BOTTOM_Y) / 2,
              }}
              vector={{ x: 0, y: isCounterClockwise ? 1 : -1 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={rightLeadArrowLength}
              strokeWidth={STROKE.vectorSub}
              label="i"
              font={font}
            />
          )}

          {/* 右侧上段导线电流：逆时针放电时由上极板向上流出（与下段同向，缺此段则右侧环流矢量不闭合） */}
          {topPlateOuterY > TOP_Y + 30 && (
            <VectorArrow
              originDesign={{
                x: LOOP_RIGHT,
                y: (TOP_Y + topPlateOuterY) / 2,
              }}
              vector={{ x: 0, y: isCounterClockwise ? 1 : -1 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={rightLeadArrowLength}
              strokeWidth={STROKE.vectorSub}
              label="i"
              font={font}
            />
          )}
        </g>
      )}
    </>
  )
}
