import { PHYSICS_COLORS, CANVAS_COLORS, STROKE, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { ParticleTrajectory, MagneticFieldSymbols } from '@/components/Physics'
import type { GridPoint } from '@/components/Physics/MagneticFieldGrid'
import { centripetalForceDir } from '@/physics/magnetism/forces'
// svgPointToPhysicsPoint 已内联：SVG 坐标 (y↓正) → 物理坐标 (y↑正)
import { SPECTROMETER, SCALE } from '../model/combinedFieldsModel'
import type { SpectrometerSimulation, TrajectoryPoint, ParticleConstants } from '../model/combinedFieldsModel'
import { renderVectorArrow, REF_MAGNITUDES } from './renderVectorArrow'
import type { CanvasSize } from '@/utils/useCanvasSize'

interface SpectrometerSceneProps {
  pos: TrajectoryPoint
  spectrometer: SpectrometerSimulation
  p: ParticleConstants
  E: number
  B1: number
  B2: number
  showVectors: boolean
  time: number
  visibleTrajectory: TrajectoryPoint[]
  predictedPoints: { x: number; y: number }[]
  tailPoints: { x: number; y: number }[]
  historyPoints: { x: number; y: number }[]
  b1Points: GridPoint[]
  b2DotPoints: GridPoint[]
  font: CanvasSize['font']
  smallFs: number
}

export function SpectrometerScene({
  pos,
  spectrometer,
  p,
  E,
  B1,
  B2,
  showVectors,
  time,
  visibleTrajectory,
  predictedPoints,
  tailPoints,
  historyPoints,
  b1Points,
  b2DotPoints,
  font,
  smallFs,
}: SpectrometerSceneProps) {
  const renderArrow = renderVectorArrow

  return (
    <g>
      {/* 速度选择器中轴轨道虚线 */}
      <line
        x1={SPECTROMETER.xMid}
        y1={SPECTROMETER.y0}
        x2={SPECTROMETER.xMid}
        y2={SPECTROMETER.y1}
        stroke={colors.neutral[300]}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* 速度选择器极板（垂直，下边界拉升至 130，防重叠） */}
      <rect x={SPECTROMETER.xMid - SPECTROMETER.plateHalf - 6} y={SPECTROMETER.y0} width={6} height={SPECTROMETER.y1 - SPECTROMETER.y0} fill={PHYSICS_COLORS.positiveCharge} rx={1} />
      <rect x={SPECTROMETER.xMid + SPECTROMETER.plateHalf} y={SPECTROMETER.y0} width={6} height={SPECTROMETER.y1 - SPECTROMETER.y0} fill={PHYSICS_COLORS.negativeCharge} rx={1} />

      {/* 极板正负号 */}
      <text x={SPECTROMETER.xMid - SPECTROMETER.plateHalf - 12} y={SPECTROMETER.y0 + 20} fill={PHYSICS_COLORS.positiveCharge} fontSize={smallFs} fontWeight="bold" textAnchor="middle">+</text>
      <text x={SPECTROMETER.xMid + SPECTROMETER.plateHalf + 12} y={SPECTROMETER.y0 + 20} fill={PHYSICS_COLORS.negativeCharge} fontSize={smallFs} fontWeight="bold" textAnchor="middle">−</text>

      {/* 电场线 (黄，向右) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = SPECTROMETER.y0 + 15 + i * 26
        return (
          <g key={`e-line-${i}`}>
            <line
              x1={SPECTROMETER.xMid - SPECTROMETER.plateHalf}
              y1={y}
              x2={SPECTROMETER.xMid + SPECTROMETER.plateHalf}
              y2={y}
              stroke={PHYSICS_COLORS.electricFieldLine}
              strokeWidth={STROKE.fieldLine}
              strokeDasharray="4 2"
            />
            <path d={`M ${SPECTROMETER.xMid + 10} ${y - 3} L ${SPECTROMETER.xMid + 15} ${y} L ${SPECTROMETER.xMid + 10} ${y + 3}`} fill={PHYSICS_COLORS.electricFieldLine} />
          </g>
        )
      })}

      {/* 选择器磁场 B1 ⊙ (出纸面，绿色) */}
      <MagneticFieldSymbols points={b1Points} direction="out" radius={6} strokeWidth={1.2} opacity={0.65} />

      {/* 速度选择器底端孔与挡板 (y = 130，完全在水平方向与底片错开) */}
      <line x1={40} y1={SPECTROMETER.y1} x2={SPECTROMETER.xMid - SPECTROMETER.slitR} y2={SPECTROMETER.y1} stroke={CANVAS_COLORS.annotation} strokeWidth={3} />
      <line x1={SPECTROMETER.xMid + SPECTROMETER.slitR} y1={SPECTROMETER.y1} x2={650} y2={SPECTROMETER.y1} stroke={CANVAS_COLORS.annotation} strokeWidth={3} />

      {/* 偏转磁场 B2 背景 ⊙ (出纸面) */}
      <MagneticFieldSymbols points={b2DotPoints} direction="out" radius={7} strokeWidth={1.2} opacity={0.5} />

      {/* 照相底片 & 刻度尺 (水平范围 40 ~ 300，彻底避免与极板重叠) */}
      <rect x={40} y={SPECTROMETER.y1 - 3} width={260} height={5} fill="#111" />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 40 + i * 30
        return (
          <line key={`scale-${i}`} x1={x} y1={SPECTROMETER.y1 - 3} x2={x} y2={SPECTROMETER.y1 - 8} stroke={colors.neutral[50]} strokeWidth={1} />
        )
      })}

      {/* 历史同位素落点亮斑参考 */}
      <circle cx={200} cy={SPECTROMETER.y1} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.4} />
      <text x={200} y={SPECTROMETER.y1 - 10} fontSize={font(9)} fill={colors.neutral[400]} textAnchor="middle">¹H⁺</text>
      <circle cx={50} cy={SPECTROMETER.y1} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.4} />
      <text x={50} y={SPECTROMETER.y1 - 10} fontSize={font(9)} fill={colors.neutral[400]} textAnchor="middle">²H⁺</text>

      {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
      {visibleTrajectory.length > 0 && (
        <ParticleTrajectory
          historyPoints={historyPoints}
          predictedPoints={predictedPoints}
          tailPoints={tailPoints}
          isFocus
          chargeSign={p.chargeSign}
          customBaseColor={spectrometer.balanced ? colors.success[500] : PHYSICS_COLORS.acceleration}
        />
      )}

      {/* 当前落点荧光标记和标尺 (y = 130) */}
      {pos.y >= SPECTROMETER.y1 && spectrometer.hitReason === 'film' && (
        <g>
          {/* 落点高亮 */}
          <circle cx={spectrometer.hitPoint?.x} cy={spectrometer.hitPoint?.y} r={7} fill={PHYSICS_COLORS.velocity} opacity={0.7} />
          <circle cx={spectrometer.hitPoint?.x} cy={spectrometer.hitPoint?.y} r={2} fill="#fff" />

          {/* 半径测量辅助标尺线 */}
          <line x1={spectrometer.hitPoint?.x} y1={SPECTROMETER.y1 + 10} x2={SPECTROMETER.xMid} y2={SPECTROMETER.y1 + 10} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2} />
          <line x1={spectrometer.hitPoint?.x} y1={SPECTROMETER.y1 + 6} x2={spectrometer.hitPoint?.x} y2={SPECTROMETER.y1 + 14} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2} />
          <line x1={SPECTROMETER.xMid} y1={SPECTROMETER.y1 + 6} x2={SPECTROMETER.xMid} y2={SPECTROMETER.y1 + 14} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2} />

          {/* 测量文字 */}
          <text
            x={((spectrometer.hitPoint?.x ?? 0) + SPECTROMETER.xMid) / 2}
            y={SPECTROMETER.y1 + 24}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.displacement}
            textAnchor="middle"
            fontWeight="bold"
          >
            测量直径 2R = {((SPECTROMETER.xMid - (spectrometer.hitPoint?.x ?? 0)) / SCALE).toFixed(4)} m
          </text>

          {/* 高考知识连线提示 - 移至右侧屏 */}
          <rect x={520} y={SPECTROMETER.y1 + 10} width={120} height={28} rx={3} fill="rgba(255, 255, 255, 0.95)" stroke={colors.neutral[200]} strokeWidth={0.5} />
          <text
            x={580}
            y={SPECTROMETER.y1 + 27}
            fontSize={font(9)}
            fill={colors.neutral[600]}
            textAnchor="middle"
            fontWeight="medium"
          >
            R = mv/(qB₂) ∝ m/q
          </text>
        </g>
      )}

      {/* 文字标注 */}
      <text x={260} y={45} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        速度选择器
      </text>
      <text x={120} y={118} fontSize={smallFs} fill={colors.neutral[500]} fontWeight="bold">
        照相底片 (Film)
      </text>

      {/* 受力矢量分析 (高考重点：在磁场偏转区只画指向圆心的洛伦兹力向心力，排除电场力) */}
      {showVectors && time > 0 && (
        <g>
          {pos.y < SPECTROMETER.y1 ? (
            // 速度选择器受力 (电场力 F_e + 洛伦兹力 f_L)
            spectrometer.hitReason !== 'plate' && (
              <g>
                {/* 电场力：正电荷向右，负电荷向左 */}
                {renderArrow(pos.x, pos.y, p.q > 0 ? 1 : -1, 0, Math.abs(p.q) * E, REF_MAGNITUDES.electricForce, PHYSICS_COLORS.electricField, 'electricField', 'Fe', font)}
                {/* 洛伦兹力：正电荷向左，负电荷向右（与电场力反向） */}
                {renderArrow(pos.x, pos.y, p.q > 0 ? -1 : 1, 0, Math.abs(p.q) * pos.v * B1, REF_MAGNITUDES.magneticForce, PHYSICS_COLORS.magneticField, 'magneticField', 'f_L', font)}

                {/* 合外力 */}
                {!spectrometer.balanced && (
                  renderArrow(
                    pos.x,
                    pos.y,
                    Math.sign(p.q * E - p.q * pos.v * B1),
                    0,
                    Math.abs(Math.abs(p.q) * E - Math.abs(p.q) * pos.v * B1),
                    REF_MAGNITUDES.electricForce,
                    colors.accent[500],
                    'acceleration',
                    'F_合',
                    font,
                  )
                )}
              </g>
            )
          ) : (
            // 偏转磁场受力 (仅洛伦兹力 f_L2 作为向心力指向圆心，无电场力)
            spectrometer.hitReason === 'film' && (
              (() => {
                // B₂出纸面⊙：正电荷向下运动 → 圆心在左侧；负电荷在右侧
                const isNegativeCharge = p.q < 0
                const cx = isNegativeCharge ? SPECTROMETER.xMid + spectrometer.rPx : SPECTROMETER.xMid - spectrometer.rPx
                const cy = SPECTROMETER.y1
                // SVG→物理坐标转换后调用纯函数（VectorArrow 使用物理坐标系 y↑正）
                const dir = centripetalForceDir(
                  { x: pos.x, y: -pos.y },
                  { x: cx, y: -cy },
                )
                return renderArrow(
                  pos.x,
                  pos.y,
                  dir.x || 1,
                  dir.y,
                  Math.abs(p.q) * pos.v * B2,
                  REF_MAGNITUDES.magneticForce,
                  PHYSICS_COLORS.magneticField,
                  'magneticField',
                  'f_L',
                  font,
                )
              })()
            )
          )}
        </g>
      )}
    </g>
  )
}
