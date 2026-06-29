import { ENERGY_COLORS } from '@/theme/physics'
import { EnergyBars } from '@/components/Physics'
import type { UseLightRodRopePhysicsResult } from '../hooks/useLightRodRopePhysics'

interface LightRodRopeEnergyBarsProps {
  physics: UseLightRodRopePhysicsResult
}

export function LightRodRopeEnergyBars({ physics }: LightRodRopeEnergyBarsProps) {
  const { params, state, trajectory, hasCollisionRecent, canvasSize } = physics
  const { constraint } = params
  const font = canvasSize.font

  if (constraint !== 1 && constraint !== 2) return null

  const energyItems = [
    { key: 'EpA', label: 'Ep_A', value: state.EpA, color: ENERGY_COLORS.potentialGravity },
    { key: 'EkA', label: 'Ek_A', value: state.EkA, color: ENERGY_COLORS.kineticEnergy },
    { key: 'EpB', label: 'Ep_B', value: state.EpB, color: ENERGY_COLORS.potentialElastic },
    { key: 'EkB', label: 'Ek_B', value: state.EkB, color: ENERGY_COLORS.kineticEnergy },
    { key: 'Etot', label: 'E总', value: state.Etot, color: ENERGY_COLORS.mechanicalEnergy },
  ]

  const minItemWidth = 58
  const foWidth = Math.min(320, canvasSize.width * 0.45)
  const needsCompact = foWidth < energyItems.length * minItemWidth || energyItems.length > 3
  const foHeight = needsCompact ? 75 : 85

  return (
    <foreignObject x={20} y={15} width={foWidth} height={foHeight}>
      <EnergyBars
        items={energyItems}
        initialEtot={trajectory[0]?.Etot ?? 1.0}
        font={font}
        hasCollision={hasCollisionRecent}
        collisionKey="Etot"
        compact={needsCompact}
      />
    </foreignObject>
  )
}
