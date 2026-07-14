import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { SkeletonHand } from '@/components/Physics'

interface HandRulePanelProps {
  showHandRule: number
  fluxChange: string
  inducedFieldDirection: string
  getOpacity: (steps: number[]) => number
  font: (size: number) => number
}

export const HandRulePanel: React.FC<HandRulePanelProps> = ({
  showHandRule,
  fluxChange,
  inducedFieldDirection,
  getOpacity,
  font,
}) => {
  if (showHandRule !== 1 || fluxChange === 'stable') return null

  return (
    <g transform="translate(510, 260)" opacity={getOpacity([4])} className="transition-opacity duration-300">
      <text
        x="75"
        y="18"
        fontSize={font(10)}
        fill={CANVAS_COLORS.strokeDark}
        fontWeight="bold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        右手螺旋定则 (安培定则)
      </text>

      <SkeletonHand
        cx={75}
        cy={105}
        rotation={inducedFieldDirection === 'up' ? -90 : 90}
        scale={0.7}
        chirality="right"
        pose="ampere"
        highlight={{ thumb: true, index: true, middle: true, ring: true, little: true }}
        showTipMarker={{ thumb: true }}
        tipLabels={{ thumb: 'B感' }}
        tipColors={{ thumb: PHYSICS_COLORS.lorentzForce }}
        font={font}
      />

      <text
        x="75"
        y="170"
        fontSize={font(9)}
        fill={CANVAS_COLORS.textMuted}
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        {inducedFieldDirection === 'up' ? '大拇指朝上 (B感)' : '大拇指朝下 (B感)'}
      </text>
    </g>
  )
}
