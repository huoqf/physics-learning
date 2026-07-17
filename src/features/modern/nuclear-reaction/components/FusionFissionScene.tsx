import { Ball, VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { NuclearParticle } from '../model/constants'
import type { ReactionParticleResult } from '../hooks/useReactionPhysics'

interface FusionFissionSceneProps {
  rp: ReactionParticleResult
  reactionType: number
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
}

export function FusionFissionScene({
  rp,
  reactionType,
  canvasSize,
  sceneScale,
}: FusionFissionSceneProps) {
  const { font } = canvasSize

  return (
    <g>
      {/* 辅助网格 */}
      <line x1={100} y1={325} x2={740} y2={325} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={1} strokeDasharray="4, 4" />

      {/* 粒子小球 */}
      {rp.particles.map((p: NuclearParticle) => {
        const { px, py } = worldToDesign(p.x, p.y, sceneScale)
        const dPos = { x: px, y: py }
        return (
          <g key={p.id}>
            <Ball cx={dPos.x} cy={dPos.y} r={8} type={p.type === 'proton' ? 'planetWarm' : 'steel'} chargeSign={p.type === 'proton' ? '+' : 'none'} />
            {p.type === 'neutron' && p.vx !== undefined && p.vy !== undefined && (
              <g opacity={0.6}>
                <VectorArrow originDesign={dPos} vector={{ x: p.vx * 0.15, y: p.vy * 0.15 }} type="velocity" sceneScale={sceneScale} font={font} />
              </g>
            )}
          </g>
        )
      })}

      {/* 闪光 */}
      {rp.showFlash && (
        <g>
          <circle cx={worldToDesign(rp.impactPoint.x, rp.impactPoint.y, sceneScale).px} cy={worldToDesign(rp.impactPoint.x, rp.impactPoint.y, sceneScale).py} r={90} fill="url(#impact-glow)" opacity={0.8} pointerEvents="none" />
          <defs>
            <radialGradient id="impact-glow">
              <stop offset="0%" stopColor={colors.accent[500]} stopOpacity={1} />
              <stop offset="40%" stopColor={colors.danger[500]} stopOpacity={0.6} />
              <stop offset="100%" stopColor={colors.danger[700]} stopOpacity={0} />
            </radialGradient>
          </defs>
        </g>
      )}

      {/* 能量标注 */}
      {rp.showLabel && (
        <g>
          <text x={worldToDesign(rp.labelPos.x, rp.labelPos.y, sceneScale).px} y={worldToDesign(rp.labelPos.x, rp.labelPos.y, sceneScale).py} fontSize={font(16)} fontWeight="extrabold" fill={PHYSICS_COLORS.alertRed} textAnchor="middle" className="animate-bounce">
            {reactionType === 0 ? '＋17.6 MeV' : '＋200 MeV'}
          </text>
          <text x={worldToDesign(rp.labelPos.x, rp.labelPos.y, sceneScale).px} y={worldToDesign(rp.labelPos.x, rp.labelPos.y, sceneScale).py + 20} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">
            （释放能量）
          </text>
        </g>
      )}
    </g>
  )
}
