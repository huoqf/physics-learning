import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { DecayingNuclide } from '../hooks/useNuclearHalfLifePhysics'

interface NuclearHalfLifeSceneProps {
  time: number
  physics: {
    nuclides: DecayingNuclide[]
    remainingCount: number
  }
  canvasSize: {
    width: number
    height: number
    font: (size: number) => number
  }
  sceneScale: SceneScale
}

export const NuclearHalfLifeScene: React.FC<NuclearHalfLifeSceneProps> = ({
  time,
  physics,
  sceneScale,
}) => {
  const { nuclides } = physics

  return (
    <g>
      <defs>
        <radialGradient id="activeGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={withAlpha(PHYSICS_COLORS.heatAbsorb, 0.55)} />
          <stop offset="45%" stopColor={PHYSICS_COLORS.heatAbsorb} />
          <stop offset="85%" stopColor={CANVAS_COLORS.strokeDark} />
          <stop offset="100%" stopColor={CANVAS_COLORS.labelText} />
        </radialGradient>

        <radialGradient id="decayedGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={CANVAS_COLORS.axis} />
          <stop offset="50%" stopColor={CANVAS_COLORS.textMuted} />
          <stop offset="90%" stopColor={CANVAS_COLORS.strokeDark} />
          <stop offset="100%" stopColor={CANVAS_COLORS.labelText} />
        </radialGradient>

        <filter id="sphereShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* 背景轻网格线 */}
      {(() => {
        const topLeft = worldToDesign(-4.5, 1.5, sceneScale)
        const bottomRight = worldToDesign(4.5, -1.5, sceneScale)
        const bgW = bottomRight.px - topLeft.px
        const bgH = bottomRight.py - topLeft.py
        return (
          <rect
            x={topLeft.px}
            y={topLeft.py}
            width={bgW}
            height={bgH}
            fill={withAlpha(CANVAS_COLORS.labelText, 0.02)}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={1}
            rx={8}
          />
        )
      })()}

      {/* 绘制 100 个原子核格点 */}
      {nuclides.map((n) => {
        const pos = worldToDesign(n.x, n.y, sceneScale)
        
        const decayDuration = time - n.tDecay
        const isExploding = decayDuration > 0 && decayDuration < 0.6

        return (
          <g key={n.id}>
            {/* 衰变瞬间扩展的光晕圈 */}
            {isExploding && (
              <circle
                cx={pos.px}
                cy={pos.py}
                r={8 + 30 * (decayDuration / 0.6)}
                fill="none"
                stroke={n.id % 2 === 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
                strokeWidth={2 * (1 - decayDuration / 0.6)}
                opacity={1 - decayDuration / 0.6}
              />
            )}

            {/* 飞出的射线粒子 */}
            {isExploding && (() => {
              const speed = 70.0 // 飞散速度 px/s
              const angle = n.id * 145.789
              const px = pos.px + speed * decayDuration * Math.cos(angle)
              const py = pos.py + speed * decayDuration * Math.sin(angle)
              const opacity = 1.0 - decayDuration / 0.6
              
              return (
                <circle
                  cx={px}
                  cy={py}
                  r={3}
                  fill={n.id % 2 === 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
                  opacity={opacity}
                />
              )
            })()}

            {/* 原子核本体 */}
            <circle
              cx={pos.px}
              cy={pos.py}
              r={n.decayed ? 7 : 8}
              fill={n.decayed ? 'url(#decayedGrad)' : 'url(#activeGrad)'}
              stroke={n.decayed ? CANVAS_COLORS.labelTextLight : CANVAS_COLORS.strokeDark}
              strokeWidth={1}
              filter="url(#sphereShadow)"
              opacity={n.decayed ? 0.75 : 1}
            />
          </g>
        )
      })}
    </g>
  )
}
export default NuclearHalfLifeScene
