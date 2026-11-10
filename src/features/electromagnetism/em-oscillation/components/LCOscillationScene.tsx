import {
  CIRCUIT_COLORS,
  CANVAS_COLORS,
  EM_OSCILLATION_COLORS,
  PHYSICS_COLORS,
  STROKE,
  FONT,
  withAlpha,
} from '@/theme/physics'
import {
  CapacitorPlates,
  DCSource,
  Solenoid,
  SolenoidFieldLines,
  VectorArrow,
  getDCSourceTerminals,
} from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import type { ChargeSign } from '@/components/Physics'
import type { LCPhysicsResult } from '../hooks/useLCPhysics'

interface LCOscillationSceneProps {
  physics: LCPhysicsResult
  font: (size: number) => number
}

// 电路"日"字三支路对称几何参数（设计坐标系 840×325，严格对齐人教版选修二图 4.1-2 与真题逆时针放电约定）
// 左回路：电感线圈 L（与可选阻尼电阻 R）；中支路：单刀双掷开关 S 与水平电容器 C；右支路：直流电源 E
const LOOP_LEFT = 130
const CAP_CENTER_X = 510
const CHARGE_X = 730
const TOP_Y = 52
const BOTTOM_Y = 246

const SOURCE_Y = (TOP_Y + BOTTOM_Y) / 2 // 149
const SWITCH_PIVOT = { x: CAP_CENTER_X, y: 72 } as const
const SWITCH_CONTACT_2 = { x: 456, y: TOP_Y } as const // 左静触点 2：接电感 L 振荡回路
const SWITCH_CONTACT_1 = { x: 564, y: TOP_Y } as const // 右静触点 1：接直流电源 E 充电支路

const CAP_CENTER_Y = 159
const CAP_WIDTH = 120
const CAP_BASE_GAP = 40
const CAP_PLATE_THICKNESS = 10

const RESISTOR_X = 295
const RESISTOR_W = 54
const RESISTOR_H = 16

const COIL = { cx: 295, cy: BOTTOM_Y, turns: 6, rx: 13, ry: 22 } as const
const COIL_TOTAL_WIDTH = 160
const COIL_LEFT = COIL.cx - COIL_TOTAL_WIDTH / 2 // 215
const COIL_RIGHT = COIL.cx + COIL_TOTAL_WIDTH / 2 // 375

/** 电荷量低于该占比时视为"极板不带电"，不再绘制电荷符号与电场线 */
const NEUTRAL_THRESHOLD = 0.02

/**
 * LC 振荡回路场景（严格遵循人教版选择性必修第二册第四章第一节图 4.1-2 与新高考真题标准图）。
 *
 * 权威规范：
 *   1. 三支路共底闭环拓扑（左电感 L — 中开关 S/电容 C — 右电源 E）：
 *      - 开关 S 接 1（右侧）：直流电源 E 单独给电容器 C 充电至满额 +Q₀（电感 L 支路完全开路）；
 *      - 开关 S 接 2（左侧）：电容器 C 与电感 L（及弱阻尼等效电阻 R）构成闭合振荡回路（电源 E 脱离）；
 *   2. 极板间距动态响应：板间距离 d 沿竖直轴对称展开，电场线与电压 u_C = q/C 实时联动；
 *   3. 逆时针正方向与安培定则严格自洽：
 *      - i > 0 表示正电荷自上极板 A 经开关 2 向左流出、沿左回路逆时针经过电感 L（左端进、右端出）回下极板 B；
 *      - 与 Solenoid 组件"左进右出 = 左 N 右 S（current > 0）"语义直接匹配，与真题逆时针放电图景完全同构。
 */
export function LCOscillationScene({ physics, font }: LCOscillationSceneProps) {
  const { q, i, uC, iMax, chargeRatio, dRatio, resistance, switchPos } = physics

  const isChargingMode = switchPos === 1
  const isDamped = resistance > 0

  // 极板几何坐标（随 dRatio 对称缩放）
  const capGap = CAP_BASE_GAP * dRatio
  const topPlateOuterY = CAP_CENTER_Y - capGap / 2 - CAP_PLATE_THICKNESS
  const bottomPlateOuterY = CAP_CENTER_Y + capGap / 2 + CAP_PLATE_THICKNESS

  // 极板电荷：极性与正负来自物理引擎（q > 0 表示上极板 A 带正电、下极板 B 带负电）
  const chargeMagnitude = Math.abs(chargeRatio)
  const isNeutral = chargeMagnitude < NEUTRAL_THRESHOLD
  const chargeSign: ChargeSign = isNeutral ? 'none' : q > 0 ? '+' : '-'
  const chargeDensity = 2 + Math.round(5 * Math.min(1, chargeMagnitude))

  // 电流相对强度（驱动磁场能与流转矢量；直流充电完成态无稳态电流）
  const currentLevel = !isChargingMode && iMax > 0 ? Math.min(1, Math.abs(i) / iMax) : 0
  // i > 0 时正电荷自上极板 A 经开关 2 逆时针流出，沿左端进、右端出穿过螺线管 L
  const isCounterClockwise = i > 0
  const coilCurrent = isChargingMode ? 0 : i

  const dcTerms = getDCSourceTerminals(CHARGE_X, SOURCE_Y, 'right-positive')
  const safeUC = Math.abs(uC) < 1e-3 ? 0 : uC
  const activeContact = isChargingMode ? SWITCH_CONTACT_1 : SWITCH_CONTACT_2

  return (
    <>
      {/* ── 0. 螺线管磁场能辉光与闭合磁感线（仅开关接 2 且存在电流时呈现）── */}
      {currentLevel > 0.03 && (
        <g pointerEvents="none">
          <ellipse
            cx={COIL.cx}
            cy={COIL.cy}
            rx={COIL_TOTAL_WIDTH / 2 + 26 * currentLevel}
            ry={COIL.ry + 20 * currentLevel}
            fill={withAlpha(EM_OSCILLATION_COLORS.magneticEnergy, 0.14 * currentLevel)}
          />
          <SolenoidFieldLines
            x={COIL.cx}
            y={COIL.cy}
            width={COIL_TOTAL_WIDTH}
            height={COIL.ry * 2}
            current={coilCurrent}
            intensity={currentLevel}
            lineColor={PHYSICS_COLORS.magneticField}
          />
        </g>
      )}

      {/* ── 1. 电容器极板间电场能柔和辉光 ── */}
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

      {/* ── 2A. 右侧直流充电支路（S 接 2 时降不透明度表示电源已从振荡回路脱离）── */}
      <g opacity={isChargingMode ? 1 : 0.42}>
        <g
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 电源正极上行至顶边再水平连至静触点 1 */}
          <polyline
            points={`${dcTerms.top.x},${dcTerms.top.y} ${CHARGE_X},${TOP_Y} ${SWITCH_CONTACT_1.x},${TOP_Y}`}
          />
          {/* 电源负极下行至底边再水平汇入中间底节点 */}
          <polyline
            points={`${dcTerms.bottom.x},${dcTerms.bottom.y} ${CHARGE_X},${BOTTOM_Y} ${CAP_CENTER_X},${BOTTOM_Y}`}
          />
        </g>
        <DCSource
          type="symbol"
          x={CHARGE_X}
          y={SOURCE_Y}
          polarity="right-positive"
          label="E"
        />
      </g>

      {/* ── 2B. 中间电容器支路导线（始终在线参与）── */}
      <g
        fill="none"
        stroke={CIRCUIT_COLORS.wire}
        strokeWidth={STROKE.objectLine}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 上引线：开关公共枢轴 -> 上极板外表面 */}
        <line x1={CAP_CENTER_X} y1={SWITCH_PIVOT.y} x2={CAP_CENTER_X} y2={topPlateOuterY} />
        {/* 下引线：下极板外表面 -> 底边中间节点 */}
        <line x1={CAP_CENTER_X} y1={bottomPlateOuterY} x2={CAP_CENTER_X} y2={BOTTOM_Y} />
      </g>

      {/* ── 2C. 左侧电感振荡回路（S 接 1 时开路降不透明度；启用阻尼时串联电阻 R）── */}
      <g opacity={isChargingMode ? 0.42 : 1}>
        <g
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 顶边导线：触点 2 -> 左上角（阻尼模式下中间断开接标准电阻 R） */}
          {isDamped ? (
            <>
              <line
                x1={SWITCH_CONTACT_2.x}
                y1={TOP_Y}
                x2={RESISTOR_X + RESISTOR_W / 2}
                y2={TOP_Y}
              />
              <line
                x1={RESISTOR_X - RESISTOR_W / 2}
                y1={TOP_Y}
                x2={LOOP_LEFT}
                y2={TOP_Y}
              />
            </>
          ) : (
            <line x1={SWITCH_CONTACT_2.x} y1={TOP_Y} x2={LOOP_LEFT} y2={TOP_Y} />
          )}
          {/* 左竖直边 */}
          <line x1={LOOP_LEFT} y1={TOP_Y} x2={LOOP_LEFT} y2={BOTTOM_Y} />
          {/* 底边左右段（紧扣螺线管左右端子，绝无虚空悬线） */}
          <line x1={LOOP_LEFT} y1={BOTTOM_Y} x2={COIL_LEFT} y2={BOTTOM_Y} />
          <line x1={COIL_RIGHT} y1={BOTTOM_Y} x2={CAP_CENTER_X} y2={BOTTOM_Y} />
        </g>

        {/* 弱阻尼等效串联电阻 R */}
        {isDamped && (
          <g>
            <rect
              x={RESISTOR_X - RESISTOR_W / 2}
              y={TOP_Y - RESISTOR_H / 2}
              width={RESISTOR_W}
              height={RESISTOR_H}
              rx={2}
              fill={CIRCUIT_COLORS.resistorFill}
              stroke={CIRCUIT_COLORS.resistorStroke}
              strokeWidth={STROKE.objectLine}
            />
            <text
              x={RESISTOR_X}
              y={TOP_Y - RESISTOR_H / 2 - 6}
              fontFamily={FONT.family}
              fontSize={font(FONT.label)}
              fontWeight="bold"
              fontStyle="italic"
              fill={CANVAS_COLORS.labelText}
              textAnchor="middle"
            >
              R
            </text>
          </g>
        )}

        {/* 底部横置通电螺线管电感 */}
        <Solenoid
          x={COIL.cx}
          y={COIL.cy}
          width={COIL_TOTAL_WIDTH}
          height={COIL.ry * 2}
          turns={COIL.turns}
          current={coilCurrent}
          leadType="horizontal"
          leadEndpointRadius={0}
          showPolarity={!isChargingMode}
          showWindingArrows={!isChargingMode}
          showIronCore={false}
          animated={false}
        />
      </g>

      {/* 底边 T 型汇流节点实心圆点 */}
      <circle cx={CAP_CENTER_X} cy={BOTTOM_Y} r={3.5} fill={CIRCUIT_COLORS.node} />

      {/* ── 3. 单刀双掷开关 S（枢轴接 C，1 接直流电源 E，2 接电感 L）── */}
      <g>
        <line
          x1={SWITCH_PIVOT.x}
          y1={SWITCH_PIVOT.y}
          x2={activeContact.x}
          y2={activeContact.y}
          stroke={CIRCUIT_COLORS.switchClosed}
          strokeWidth={STROKE.vectorMain}
          strokeLinecap="round"
        />
        {/* 静触点 2（左）与静触点 1（右） */}
        <circle
          cx={SWITCH_CONTACT_2.x}
          cy={SWITCH_CONTACT_2.y}
          r={3.5}
          fill={!isChargingMode ? CIRCUIT_COLORS.switchClosed : CANVAS_COLORS.white}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={1.6}
        />
        <circle
          cx={SWITCH_CONTACT_1.x}
          cy={SWITCH_CONTACT_1.y}
          r={3.5}
          fill={isChargingMode ? CIRCUIT_COLORS.switchClosed : CANVAS_COLORS.white}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={1.6}
        />
        <circle
          cx={SWITCH_PIVOT.x}
          cy={SWITCH_PIVOT.y}
          r={3.5}
          fill={CIRCUIT_COLORS.node}
        />
      </g>

      {/* ── 4. 水平平行金属板电容器（板间为竖直匀强电场）── */}
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

      {/* ── 5. 元件符号与物理量标注（精简物理量，零遮挡叠字）── */}
      <g
        fontFamily={FONT.family}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        <text
          x={SWITCH_CONTACT_2.x}
          y={SWITCH_CONTACT_2.y - 12}
          fontSize={font(FONT.small)}
          textAnchor="middle"
        >
          2
        </text>
        <text
          x={SWITCH_CONTACT_1.x}
          y={SWITCH_CONTACT_1.y - 12}
          fontSize={font(FONT.small)}
          textAnchor="middle"
        >
          1
        </text>
        <text
          x={SWITCH_PIVOT.x + 14}
          y={SWITCH_PIVOT.y + 8}
          fontSize={font(FONT.label)}
          fontStyle="italic"
          textAnchor="start"
        >
          S
        </text>

        {/* 上/下极板标注置于极板右半侧外部，彻底避开中间竖直引线与开关 */}
        <text
          x={CAP_CENTER_X + 10}
          y={topPlateOuterY - 7}
          fontSize={font(FONT.small)}
          textAnchor="start"
        >
          上极板 (A)
        </text>
        <text
          x={CAP_CENTER_X + 10}
          y={bottomPlateOuterY + 17}
          fontSize={font(FONT.small)}
          textAnchor="start"
        >
          下极板 (B)
        </text>

        {/* 电容器符号 C 与极板实时电压数值 u_C */}
        <text
          x={CAP_CENTER_X + CAP_WIDTH / 2 + 12}
          y={CAP_CENTER_Y - 4}
          fontSize={font(FONT.label)}
          textAnchor="start"
          fontStyle="italic"
        >
          C
        </text>
        <text
          x={CAP_CENTER_X + CAP_WIDTH / 2 + 12}
          y={CAP_CENTER_Y + 15}
          fontSize={font(FONT.small)}
          textAnchor="start"
          fill={PHYSICS_COLORS.electricPotential}
        >
          {`u_C = ${safeUC.toFixed(2)} V`}
        </text>

        {/* 电感符号 L（紧贴线圈下缘并带白描边，清晰避开外部闭合磁感线） */}
        <text
          x={COIL.cx}
          y={BOTTOM_Y + 33}
          fontSize={font(FONT.label)}
          textAnchor="middle"
          fontStyle="italic"
          stroke={CANVAS_COLORS.white}
          strokeWidth={3}
          paintOrder="stroke fill"
          opacity={isChargingMode ? 0.5 : 1}
        >
          L
        </text>
      </g>

      {/* ── 6. 回路电流流向矢量箭头（仅开关接 2 且存在有效振荡电流时渲染，置于宽裕主干段防叠字）── */}
      {!isChargingMode && currentLevel > 0.03 && (
        <g opacity={0.4 + 0.6 * currentLevel}>
          {/* 顶边左段：正电荷自 A 经开关 2 向左流往左上角 */}
          <VectorArrow
            originDesign={{
              x: ((isDamped ? RESISTOR_X + RESISTOR_W / 2 : LOOP_LEFT) + SWITCH_CONTACT_2.x) / 2,
              y: TOP_Y,
            }}
            vector={{ x: isCounterClockwise ? -1 : 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={28 + 16 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 左竖直边：逆时针向下流往底边 */}
          <VectorArrow
            originDesign={{ x: LOOP_LEFT, y: (TOP_Y + BOTTOM_Y) / 2 }}
            vector={{ x: 0, y: isCounterClockwise ? -1 : 1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30 + 18 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 底边 L 右引线：自 L 右端向右流回中间底节点 */}
          <VectorArrow
            originDesign={{ x: (COIL_RIGHT + CAP_CENTER_X) / 2, y: BOTTOM_Y }}
            vector={{ x: isCounterClockwise ? 1 : -1, y: 0 }}
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
