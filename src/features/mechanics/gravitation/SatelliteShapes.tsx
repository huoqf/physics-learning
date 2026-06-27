import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

export function SatelliteSvg({ angleRad, scale: drawScale = 1.0 }: { angleRad: number; scale?: number }) {
  const angleDeg = (-angleRad * 180) / Math.PI
  return (
    <g transform={`rotate(${angleDeg}) scale(${drawScale})`}>
      <rect x={-18} y={-3} width={10} height={6} fill={SCENE_COLORS.circuit.capacitorPlate} stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
      <rect x={8} y={-3} width={10} height={6} fill={SCENE_COLORS.circuit.capacitorPlate} stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
      <line x1={-8} y1={0} x2={8} y2={0} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
      <circle cx={0} cy={0} r={4.5} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
      <path d="M -2 2 Q 0 4 2 2" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
      <line x1={0} y1={3} x2={0} y2={5} stroke={PHYSICS_COLORS.axis} strokeWidth={0.6} />
    </g>
  )
}

export function RocketSvg({ angleRad, scale: drawScale = 1.0, time }: { angleRad: number; scale?: number; time: number }) {
  const angleDeg = (angleRad * 180) / Math.PI
  const flameHeight = 6 + Math.sin(time * 40) * 3

  return (
    <g transform={`rotate(${angleDeg}) scale(${drawScale})`}>
      <path d={`M -8 -2 L -${8 + flameHeight} 0 L -8 2 Z`} fill="url(#rocket-fire-grad)" opacity={0.95} />
      <rect x={-8} y={-2.5} width={16} height={5} rx={1} fill={colors.neutral[200]} stroke={colors.neutral[600]} strokeWidth={0.6} />
      <path d="M 8 -2.5 L 13 0 L 8 2.5 Z" fill={SCENE_COLORS.circuit.meterNeedle} stroke={SCENE_COLORS.circuit.meterFrame} strokeWidth={0.6} />
      <path d="M -8 -2.5 L -11 -5 L -6 -2.5 Z" fill={colors.neutral[600]} stroke={colors.neutral[600]} strokeWidth={0.5} />
      <path d="M -8 2.5 L -11 5 L -6 2.5 Z" fill={colors.neutral[600]} stroke={colors.neutral[600]} strokeWidth={0.5} />
    </g>
  )
}

export function EarthSvg({ centerX, centerY, earthRadiusPx }: { centerX: number; centerY: number; earthRadiusPx: number }) {
  return (
    <g>
      <circle cx={centerX} cy={centerY} r={earthRadiusPx + 6} fill="none" stroke={SCENE_COLORS.sphere.earthTech.atmosphereOuter} strokeWidth={2} opacity={0.3} />
      <circle cx={centerX} cy={centerY} r={earthRadiusPx + 3} fill="none" stroke={SCENE_COLORS.sphere.earthTech.atmosphereInner} strokeWidth={2} opacity={0.5} />
      <circle cx={centerX} cy={centerY} r={earthRadiusPx} fill="url(#earth-ocean-grad)" stroke={SCENE_COLORS.sphere.earthTech.stroke} strokeWidth={1} />
      <path
        d={`M ${centerX - 12} ${centerY - 18} Q ${centerX - 5} ${centerY - 22} ${centerX + 8} ${centerY - 14} Q ${centerX + 18} ${centerY - 5} ${centerX + 10} ${centerY + 8} Q ${centerX - 2} ${centerY + 18} ${centerX - 10} ${centerY + 10} Q ${centerX - 18} ${centerY - 2} ${centerX - 12} ${centerY - 18} Z`}
        fill={SCENE_COLORS.sphere.earthTech.landGradient[1]}
        opacity={0.3}
      />
      <path
        d={`M ${centerX - 24} ${centerY + 5} Q ${centerX - 15} ${centerY + 2} ${centerX - 10} ${centerY + 12} Q ${centerX - 14} ${centerY + 22} ${centerX - 22} ${centerY + 18} Z`}
        fill={SCENE_COLORS.sphere.earthTech.landGradient[2]}
        opacity={0.3}
      />
    </g>
  )
}
