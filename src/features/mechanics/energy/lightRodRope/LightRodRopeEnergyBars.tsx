import { ENERGY_COLORS } from '@/theme/physics'
import { EnergyBars } from '@/components/Physics'
import type { UseLightRodRopePhysicsResult } from '../hooks/useLightRodRopePhysics'

interface LightRodRopeEnergyBarsProps {
  physics: UseLightRodRopePhysicsResult
}

export function LightRodRopeEnergyBars({ physics }: LightRodRopeEnergyBarsProps) {
  const { params, state, trajectory, hasCollisionRecent } = physics
  const { constraint } = params

  if (constraint !== 1 && constraint !== 2) return null

  const energyItems = [
    { key: 'EpA', label: 'Ep_A', value: state.EpA, color: ENERGY_COLORS.potentialGravity },
    { key: 'EkA', label: 'Ek_A', value: state.EkA, color: ENERGY_COLORS.kineticEnergy },
    { key: 'EpB', label: 'Ep_B', value: state.EpB, color: ENERGY_COLORS.potentialElastic },
    { key: 'EkB', label: 'Ek_B', value: state.EkB, color: ENERGY_COLORS.kineticEnergy },
    { key: 'Etot', label: 'E总', value: state.Etot, color: ENERGY_COLORS.mechanicalEnergy },
  ]

  return (
    <div
      className="absolute top-3 left-1/2 z-10 -translate-x-1/2 select-none pointer-events-auto"
    >
      <div className="w-[290px] h-[130px] shadow-sm rounded-lg bg-white/95 backdrop-blur-xs border border-neutral-200/60">
        <EnergyBars
          items={energyItems}
          initialEtot={trajectory[0]?.Etot ?? 1.0}
          font={(s) => s}
          hasCollision={hasCollisionRecent}
          collisionKey="Etot"
          compact={false}
        />
      </div>
    </div>
  )
}
