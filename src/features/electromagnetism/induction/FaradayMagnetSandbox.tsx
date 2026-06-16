/**
 * FaradayMagnetSandbox.tsx — 法拉第电磁感应基础模式场景（磁铁+电路+电子）
 *
 * 从 FaradayLaw.tsx 拆分：基础模式 (mode=0) 的中间屏渲染。
 */
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { BarMagnet } from '@/components/Physics/BarMagnet'
import { LightBulb } from '@/components/Physics/LightBulb'
import { Galvanometer } from '@/components/Physics/Galvanometer'
import { Solenoid } from '@/components/Physics/Solenoid'
import { ParametricMagneticField } from '@/components/Physics/ParametricMagneticField'
import {
  MAGNET_MIN_X, COIL_X, COIL_RX, COIL_RY, MAGNET_LEN, MAGNET_H,
} from './hooks/useFaradayPhysics'

interface Props {
  N: number
  magnetV: number
  time: number
  isPlaying: boolean
  currentState: { x: number; phi: number; emf: number; B: number }
  H: number
  coilY: number
  solenoidW: number
  solenoidH: number
  circuitRightX: number
  circuitLeftX: number
  bulbY: number
  bulbScale: number
  meterTopY: number
  meterY: number
  wirePointsA: string
  wirePointsB: string
  wirePointsC: string
  electronParticles: { x: number; y: number }[]
  font: (base: number) => number
}

export function FaradayMagnetSandbox({
  N, magnetV, time, isPlaying, currentState,
  H, coilY,
  solenoidW, solenoidH,
  circuitRightX, circuitLeftX,
  bulbY, bulbScale,
  meterTopY, meterY,
  wirePointsA, wirePointsB, wirePointsC,
  electronParticles,
  font,
}: Props) {
  const curMagnetX = currentState.x ?? MAGNET_MIN_X
  const mCenterX = curMagnetX + MAGNET_LEN / 2
  const mCenterY = coilY
  const overlapRatio = Math.max(0, 1 - Math.abs(COIL_X - mCenterX) / (COIL_RX + MAGNET_LEN / 2))
  const extOpacity = 0.12 + Math.min(1, overlapRatio * 2) * 0.48

  return (
    <g>
      {/* 1. 磁铁的磁场分布 */}
      <g transform={`translate(${mCenterX}, ${mCenterY})`} opacity={extOpacity}>
        <ParametricMagneticField
          w={MAGNET_LEN}
          h={MAGNET_H}
          pole={-1}
          canvasHeight={H}
          lineColor={PHYSICS_COLORS.magneticField}
        />
      </g>

      {/* 2. 参数化闭合电路连线 */}
      <polyline points={wirePointsA} fill="none" stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={wirePointsB} fill="none" stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={wirePointsC} fill="none" stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} strokeLinecap="round" strokeLinejoin="round" />

      {/* 3. 多匝铜线圈 */}
      <Solenoid
        x={COIL_X} y={coilY} width={solenoidW} height={solenoidH}
        rx={COIL_RX} turns={N} current={currentState.emf * 1.5}
        time={time} showIronCore={false}
      />
      <text x={COIL_X} y={coilY + COIL_RY + 18} fontSize={CANVAS_STYLE.font.axisSize}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        N = {N} 匝
      </text>

      {/* 4. 灯泡 */}
      <LightBulb
        x={circuitRightX} y={bulbY}
        power={currentState.emf * currentState.emf * 2.5}
        time={time} scale={bulbScale} showLabel={true} label="灯泡"
      />

      {/* 5. 电流计 */}
      <Galvanometer x={circuitLeftX} y={meterTopY} value={currentState.emf * 10 / 45} width={50} height={46} />
      <text x={circuitLeftX} y={meterY + 32} fontSize={font(9)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        G 电流计
      </text>

      {/* 6. 自由电子漂移颗粒 */}
      {electronParticles.map((p, i) => (
        <circle key={`electron-${i}`} cx={p.x} cy={p.y} r="2.8"
          fill={PHYSICS_COLORS.negativeCharge} opacity={0.8} />
      ))}

      {/* 7. 条形磁铁 */}
      <g>
        <BarMagnet x={curMagnetX + MAGNET_LEN / 2} y={coilY} width={MAGNET_LEN} height={MAGNET_H} pole={-1} />
        {isPlaying && Math.abs(magnetV) > 0 && (
          <path
            d={`M ${curMagnetX + MAGNET_LEN / 2} ${coilY - 22} L ${curMagnetX + MAGNET_LEN / 2 + (magnetV > 0 ? 30 : -30)} ${coilY - 22}`}
            stroke={PHYSICS_COLORS.velocity} strokeWidth="2.5" markerEnd="url(#arrFluxGold)"
          />
        )}
      </g>
    </g>
  )
}
