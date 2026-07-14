import { PHYSICS_COLORS, STROKE, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { ParticleTrajectory, MagneticFieldSymbols } from '@/components/Physics'
import type { GridPoint } from '@/components/Physics/MagneticFieldGrid'
import { centripetalForceDir, electricForceDir } from '@/physics/magnetism/forces'
import { svgPointToPhysicsPoint } from '@/utils/coordinate'
import { DEFLECT } from '../model/combinedFieldsModel'
import type { DeflectSimulation, TrajectoryPoint, ParticleConstants } from '../model/combinedFieldsModel'
import { renderVectorArrow, REF_MAGNITUDES } from './renderVectorArrow'
import type { CanvasSize } from '@/utils/useCanvasSize'
import type { SpectrometerSimulation, CyclotronSimulation } from '../model/combinedFieldsModel'

interface DeflectSceneProps {
  pos: TrajectoryPoint
  deflect: DeflectSimulation
  p: ParticleConstants
  E: number
  B2: number
  showVectors: boolean
  showAngles: boolean
  time: number
  timeSec: number
  visibleTrajectory: TrajectoryPoint[]
  predictedPoints: { x: number; y: number }[]
  tailPoints: { x: number; y: number }[]
  historyPoints: { x: number; y: number }[]
  b2CrossPoints: GridPoint[]
  sim: SpectrometerSimulation | CyclotronSimulation | DeflectSimulation
  font: CanvasSize['font']
  smallFs: number
}

export function DeflectScene({
  pos,
  deflect,
  p,
  E,
  B2,
  showVectors,
  showAngles,
  time,
  timeSec,
  visibleTrajectory,
  predictedPoints,
  tailPoints,
  historyPoints,
  b2CrossPoints,
  sim,
  font,
  smallFs,
}: DeflectSceneProps) {
  return (
    <g>
      {/* 偏转电场平行极板 */}
      <rect x={DEFLECT.xStart} y={DEFLECT.yMid - DEFLECT.plateHalf - 6} width={DEFLECT.xEnd - DEFLECT.xStart} height={6} fill={PHYSICS_COLORS.positiveCharge} />
      <rect x={DEFLECT.xStart} y={DEFLECT.yMid + DEFLECT.plateHalf} width={DEFLECT.xEnd - DEFLECT.xStart} height={6} fill={PHYSICS_COLORS.negativeCharge} />
      <text x={DEFLECT.xStart + 20} y={DEFLECT.yMid - DEFLECT.plateHalf - 12} fill={PHYSICS_COLORS.positiveCharge} fontSize={smallFs} fontWeight="bold">+</text>
      <text x={DEFLECT.xStart + 20} y={DEFLECT.yMid + DEFLECT.plateHalf + 20} fill={PHYSICS_COLORS.negativeCharge} fontSize={smallFs} fontWeight="bold">−</text>

      {/* 电场线 (竖直向下，黄) */}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = DEFLECT.xStart + 30 + i * 50
        return (
          <g key={`d-e-line-${i}`}>
            <line
              x1={x}
              y1={DEFLECT.yMid - DEFLECT.plateHalf}
              x2={x}
              y2={DEFLECT.yMid + DEFLECT.plateHalf}
              stroke={PHYSICS_COLORS.electricFieldLine}
              strokeWidth={STROKE.fieldLine}
            />
            <path d={`M ${x - 3} ${DEFLECT.yMid} L ${x} ${DEFLECT.yMid + 5} L ${x + 3} ${DEFLECT.yMid} Z`} fill={PHYSICS_COLORS.electricFieldLine} />
          </g>
        )
      })}

      {/* 磁偏转区域背景 ×（入纸面） */}
      <MagneticFieldSymbols points={b2CrossPoints} direction="in" opacity={0.3} />

      {/* 分界线与右侧荧光屏 */}
      <line x1={DEFLECT.magneticB2StartX} y1={20} x2={DEFLECT.magneticB2StartX} y2={310} stroke={colors.neutral[300]} strokeDasharray="4 4" />
      <rect x={DEFLECT.screenX} y={20} width={8} height={290} fill="#222" rx={2} />

      {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
      {visibleTrajectory.length > 0 && (
        <ParticleTrajectory
          historyPoints={historyPoints}
          predictedPoints={predictedPoints}
          tailPoints={tailPoints}
          isFocus
          chargeSign={p.chargeSign}
        />
      )}

      {/* 电偏转模式受力矢量 */}
      {showVectors && time > 0 && pos.x < DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 电场力：上极板+下极板-，E 向下(物理坐标 {0,-1})，正电荷同向、负电荷反向 */}
          {(() => {
            const dir = electricForceDir({ x: 0, y: -1 }, p.q)
            return renderVectorArrow(
              pos.x,
              pos.y,
              dir.x,
              dir.y,
              Math.abs(p.q) * E,
              REF_MAGNITUDES.electricForce,
              PHYSICS_COLORS.electricField,
              'electricField',
              'F_E',
              font,
            )
          })()}
        </g>
      )}

      {/* 磁偏转模式受力矢量 */}
      {showVectors && time > 0 && pos.x >= DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 洛伦兹力 = 向心力，指向圆心 */}
          {(() => {
            // SVG→物理坐标转换后调用纯函数
            const dir = centripetalForceDir(
              svgPointToPhysicsPoint({ x: pos.x, y: pos.y }),
              svgPointToPhysicsPoint({ x: deflect.cx, y: deflect.cy }),
            )
            return renderVectorArrow(
              pos.x,
              pos.y,
              dir.x,
              dir.y || 1,
              Math.abs(p.q) * pos.v * B2,
              REF_MAGNITUDES.magneticForce,
              PHYSICS_COLORS.magneticField,
              'magneticField',
              'f_L',
              font,
            )
          })()}
        </g>
      )}

      {/* 几何辅助线解析：粒子进入磁场区域 (高考二级结论) */}
      {pos.x >= DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 类平抛运动末速度反向延长线必过电场中点 */}
          <line
            x1={DEFLECT.magneticB2StartX}
            y1={DEFLECT.yMid + deflect.yOffsetPx}
            x2={175}
            y2={DEFLECT.yMid}
            stroke={colors.accent[500]}
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
          {/* 电板中线焦点标记 */}
          <circle cx={175} cy={DEFLECT.yMid} r={4} fill={colors.accent[500]} stroke="#fff" strokeWidth={1} />
          <text x={175} y={DEFLECT.yMid + 16} fontSize={font(9)} fill={colors.accent[600]} textAnchor="middle" fontWeight="bold">
            极板中点 (L/2)
          </text>

          {/* 二级结论文字框 */}
          <g transform="translate(60, 240)">
            <rect width={175} height={22} rx={3} fill="rgba(255, 255, 255, 0.9)" stroke={colors.accent[200]} strokeWidth={0.5} />
            <text x={87} y={14} fontSize={font(9)} fill={colors.accent[600]} textAnchor="middle" fontWeight="bold">
              末速度反向延长线必过电场中点
            </text>
          </g>

          {/* 圆心标记 O */}
          <circle cx={deflect.cx} cy={deflect.cy} r={3} fill={PHYSICS_COLORS.acceleration} />
          <text x={deflect.cx + 8} y={deflect.cy + 4} fill={PHYSICS_COLORS.acceleration} fontSize={smallFs} fontWeight="bold">O</text>

          {/* 圆心连线半径 */}
          <line
            x1={deflect.cx}
            y1={deflect.cy}
            x2={DEFLECT.magneticB2StartX}
            y2={DEFLECT.yMid + deflect.yOffsetPx}
            stroke={colors.neutral[400]}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <line
            x1={deflect.cx}
            y1={deflect.cy}
            x2={pos.x}
            y2={pos.y}
            stroke={colors.neutral[400]}
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* 磁场偏向角几何扇形填充（受 showAngles 控制） */}
          {showAngles && (() => {
            const cx = deflect.cx
            const cy = deflect.cy
            const r = deflect.rPx
            const isNegativeCharge = p.q < 0
            const omega = Math.abs(p.q) * B2 / p.m

            // 入射点角度（与模型计算一致）
            const entryX = DEFLECT.magneticB2StartX
            const entryY = DEFLECT.yMid + deflect.yOffsetPx
            const phiStart = Math.atan2(entryY - cy, entryX - cx)

            // 电场区结束时间：从轨迹获取最后一个 x <= magneticB2StartX 的点
            const electricPts = deflect.trajectory.filter(pt => pt.x <= DEFLECT.magneticB2StartX)
            const tElectricEnd = electricPts.length > 0 ? electricPts[electricPts.length - 1].t : 0
            const tElapsed = Math.max(0, timeSec - tElectricEnd)

            // B₂ 入纸面：正电荷顺时针（phi 减小），负电荷逆时针（phi 增加）
            const phiCurr = isNegativeCharge ? phiStart + omega * tElapsed : phiStart - omega * tElapsed

            const xs = cx + r * Math.cos(phiStart)
            const ys = cy + r * Math.sin(phiStart)
            const xc = cx + r * Math.cos(phiCurr)
            const yc = cy + r * Math.sin(phiCurr)

            return (
              <path
                d={`M ${cx} ${cy} L ${xs} ${ys} A ${r} ${r} 0 0 ${isNegativeCharge ? 1 : 0} ${xc} ${yc} Z`}
                fill={withAlpha(PHYSICS_COLORS.acceleration, 0.12)}
                stroke="none"
              />
            )
          })()}

          {/* 偏向角与圆心角文字看板（受 showAngles 控制） */}
          {showAngles && (
            <g transform={`translate(${deflect.cx - 90}, ${Math.min(deflect.cy + 35, 280)})`}>
              <rect width={180} height={22} rx={3} fill="rgba(255, 255, 255, 0.9)" stroke={PHYSICS_COLORS.acceleration} strokeWidth={0.5} />
              <text x={90} y={14} fontSize={font(9)} fill={PHYSICS_COLORS.acceleration} textAnchor="middle" fontWeight="bold">
                圆心角 α = 偏向角 θ = {(deflect.theta * 180 / Math.PI).toFixed(1)}°
              </text>
            </g>
          )}

          {/* 入射点速度分解 */}
          <g transform={`translate(${DEFLECT.magneticB2StartX}, ${DEFLECT.yMid + deflect.yOffsetPx})`}>
            <path
              d={`M 30 0 A 30 30 0 0 1 ${30 * Math.cos(deflect.theta)} ${30 * Math.sin(deflect.theta)}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
            />
            <text x={38} y={10} fill={colors.neutral[600]} fontSize={9}>θ</text>

            <line x1={0} y1={0} x2={40} y2={0} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2 2" />
            <path d="M 38 -2 L 41 0 L 38 2 Z" fill={PHYSICS_COLORS.velocity} />
            <text x={44} y={3} fill={PHYSICS_COLORS.velocity} fontSize={9}>vx</text>

            <line x1={0} y1={0} x2={0} y2={40 * Math.sin(deflect.theta)} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2 2" />
            <path d={`M -2 ${40 * Math.sin(deflect.theta) - 3} L 0 ${40 * Math.sin(deflect.theta)} L 2 ${40 * Math.sin(deflect.theta) - 3} Z`} fill={PHYSICS_COLORS.velocity} />
            <text x={3} y={40 * Math.sin(deflect.theta) + 12} fill={PHYSICS_COLORS.velocity} fontSize={9}>vy</text>
          </g>
        </g>
      )}

      {/* 荧光屏撞击点亮斑 */}
      {timeSec >= sim.endTime * 0.95 && deflect.hitReason === 'film' && (
        <g>
          <circle cx={deflect.hitPoint?.x} cy={deflect.hitPoint?.y} r={7} fill={colors.success[500]} opacity={0.6} />
          <circle cx={deflect.hitPoint?.x} cy={deflect.hitPoint?.y} r={2} fill="#fff" />
        </g>
      )}

      {/* 文字标注 */}
      <text x={100} y={50} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        偏转电场 E
      </text>
      <text x={320} y={45} fontSize={smallFs} fill={colors.neutral[400]} fontFamily={CANVAS_STYLE.FONT.family}>
        分界线
      </text>
      <text x={450} y={50} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        偏转磁场 B₂ (入纸面)
      </text>
      <text x={610} y={290} fontSize={smallFs} fill={colors.neutral[500]} fontWeight="bold">
        荧光屏
      </text>
    </g>
  )
}
