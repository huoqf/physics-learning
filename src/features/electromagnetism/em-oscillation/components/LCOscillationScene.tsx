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

// ─── 回路几何（设计坐标，画布 840×325）─────────────────────────────────────
const LOOP = { left: 170, right: 670, top: 60, bottom: 256 } as const
const CAP = { cx: LOOP.right, cy: 158, width: 140, gap: 38, thickness: 10 } as const
const CAP_TOP_Y = CAP.cy - CAP.gap / 2 - CAP.thickness
const CAP_BOTTOM_Y = CAP.cy + CAP.gap / 2

// 立体螺线管电感：6 匝，水平跨度对齐回路导线
const COIL = { cx: 420, cy: LOOP.bottom, turns: 6, rx: 13, ry: 22 } as const
const COIL_TOTAL_WIDTH = 180
const COIL_LEFT = COIL.cx - COIL_TOTAL_WIDTH / 2
const COIL_RIGHT = COIL.cx + COIL_TOTAL_WIDTH / 2

/** 电荷量低于该占比时视为"极板不带电"，不再绘制电荷符号与电场线 */
const NEUTRAL_THRESHOLD = 0.02

/**
 * LC 振荡回路场景（画布仅呈现物理装置，严格遵循高中物理教科书规范）。
 *
 * 定量可视化约定：
 *   1. 上下极板的电荷符号数量 ∝ |q|，正负由物理引擎严格决定；
 *   2. 回路导线与线圈绕组使用清晰的物理电流矢量箭头（i）指示瞬时方向与大小；
 *   3. 线圈内部为匀强密集平行磁感线，外部为发散闭合磁感线，带矢量方向箭头；
 *   4. 不采用混乱模糊的动态杂点粒子，完全回归教材严谨的宏观物理图像。
 */
export function LCOscillationScene({ physics, font }: LCOscillationSceneProps) {
  const { q, i, iMax, chargeRatio } = physics

  // 极板电荷：数量与正负都来自物理引擎
  const chargeMagnitude = Math.abs(chargeRatio)
  const isNeutral = chargeMagnitude < NEUTRAL_THRESHOLD
  const chargeSign: ChargeSign = isNeutral ? 'none' : q > 0 ? '+' : '-'
  // 上限取 9：极板宽 140 px，符号间距 140/10 = 14 px，可容纳 12 px 字号的『+ / −』而不叠字
  const chargeDensity = 2 + Math.round(7 * Math.min(1, chargeMagnitude))

  // 电流相对强度（驱动磁场光泽与方向箭头）
  const currentLevel = iMax > 0 ? Math.min(1, Math.abs(i) / iMax) : 0
  const currentRightward = -i > 0

  return (
    <>
      {/* ── 0. 空间闭合磁场能云与物理磁感线（随电流大小动态呈现）── */}
      {currentLevel > 0.03 && (
        <g pointerEvents="none">
          {/* 外层柔和磁场能辉光（呈现电磁能量空间分布） */}
          <ellipse
            cx={COIL.cx}
            cy={COIL.cy}
            rx={COIL_TOTAL_WIDTH / 2 + 28 * currentLevel}
            ry={COIL.ry + 22 * currentLevel}
            fill={withAlpha(EM_OSCILLATION_COLORS.magneticEnergy, 0.14 * currentLevel)}
          />

          {/* 规范通电螺线管磁感线：内部匀强密集线 + 外部闭合线 + 场向矢量箭头 */}
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
          x={CAP.cx - CAP.width / 2 + 6}
          y={CAP_TOP_Y + CAP.thickness}
          width={CAP.width - 12}
          height={CAP.gap}
          rx={4}
          fill={withAlpha(EM_OSCILLATION_COLORS.electricEnergy, 0.28 * Math.min(1, chargeMagnitude))}
          pointerEvents="none"
        />
      )}

      {/* ── 2. 回路导线与金属接线端子 ── */}
      <g
        fill="none"
        stroke={CIRCUIT_COLORS.wire}
        strokeWidth={STROKE.objectLine}
        strokeLinecap="round"
      >
        {/* 上边 */}
        <line x1={LOOP.left} y1={LOOP.top} x2={LOOP.right} y2={LOOP.top} />
        {/* 左边 */}
        <line x1={LOOP.left} y1={LOOP.top} x2={LOOP.left} y2={LOOP.bottom} />
        {/* 下边（绕开线圈） */}
        <line x1={LOOP.left} y1={LOOP.bottom} x2={COIL_LEFT} y2={LOOP.bottom} />
        <line x1={COIL_RIGHT} y1={LOOP.bottom} x2={LOOP.right} y2={LOOP.bottom} />
        {/* 右边：上极板引线 + 下极板引线 */}
        <line x1={CAP.cx} y1={LOOP.top} x2={CAP.cx} y2={CAP_TOP_Y} />
        <line x1={CAP.cx} y1={CAP_BOTTOM_Y} x2={CAP.cx} y2={LOOP.bottom} />
      </g>

      {/* 导线转角端子接头 */}
      <g>
        {[
          [LOOP.left, LOOP.top],
          [LOOP.right, LOOP.top],
          [LOOP.left, LOOP.bottom],
          [LOOP.right, LOOP.bottom],
        ].map(([px, py], idx) => (
          <g key={`terminal-${idx}`}>
            <circle cx={px} cy={py} r={4.5} fill={CIRCUIT_COLORS.node} stroke={CANVAS_COLORS.white} strokeWidth={1.5} />
            <circle cx={px} cy={py} r={1.5} fill={CANVAS_COLORS.white} />
          </g>
        ))}
      </g>

      {/* ── 3. 铜线螺线管电感（水平串联电感模式，左右水平引线对接回路，显示 N/S 磁极）── */}
      <Solenoid
        x={COIL.cx}
        y={COIL.cy}
        width={COIL_TOTAL_WIDTH}
        height={COIL.ry * 2}
        turns={COIL.turns}
        current={-i}
        leadType="horizontal"
        showPolarity
        showWindingArrows
        showIronCore={false}
        animated={false}
      />

      {/* ── 4. 电容器极板 ── */}
      <CapacitorPlates
        x={CAP.cx - CAP.width / 2}
        y={CAP.cy}
        width={CAP.width}
        gap={CAP.gap}
        thickness={CAP.thickness}
        chargeSign={chargeSign}
        chargeDensity={chargeDensity}
        showElectricFieldLines={!isNeutral}
      />

      {/* ── 5. 元件符号标注 ── */}
      <g
        fontFamily={FONT.family}
        fontStyle="italic"
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
        textAnchor="middle"
      >
        <text x={CAP.cx + CAP.width / 2 + 20} y={CAP.cy + 5} fontSize={font(FONT.label)}>
          C
        </text>
        <text x={COIL.cx} y={LOOP.bottom + 42} fontSize={font(FONT.label)}>
          L
        </text>
      </g>

      {/* ── 6. 回路瞬时电流矢量体系（复用官方 VectorArrow 规范组件，带物理量符号 i）── */}
      {currentLevel > 0.03 && (
        <g opacity={0.35 + 0.65 * currentLevel}>
          {/* 下边导线瞬时电流矢量 */}
          <VectorArrow
            originDesign={{
              x: currentRightward ? 210 : 270,
              y: LOOP.bottom,
            }}
            vector={{ x: currentRightward ? 1 : -1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={36 + 24 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 左边导线瞬时电流矢量（顺时针向下、逆时针向上，形成完整闭合环流） */}
          <VectorArrow
            originDesign={{
              x: LOOP.left,
              y: (LOOP.top + LOOP.bottom) / 2 + (currentRightward ? -20 : 20),
            }}
            vector={{ x: 0, y: currentRightward ? -1 : 1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={36 + 24 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />

          {/* 顶边导线瞬时电流矢量 */}
          <VectorArrow
            originDesign={{
              x: currentRightward ? 450 : 390,
              y: LOOP.top,
            }}
            vector={{ x: currentRightward ? -1 : 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={36 + 24 * currentLevel}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
        </g>
      )}

    </>
  )
}
