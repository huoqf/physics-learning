import { HandRule } from '@/components/Physics'
import { useRef } from 'react'

import type { HandPoseParams } from '../model/velocitySelectorModel'

export function VelocitySelectorHandRuleCard({
  mode,
  charge,
  handPoseParams,
  font,
}: {
  mode: number
  charge: number
  handPoseParams: HandPoseParams
  font: (v: number) => number
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  return (
    <div
      className="absolute top-4 left-4 p-2.5 bg-white/85 backdrop-blur-[6px] rounded-2xl border border-neutral-200/60 shadow-lg select-none pointer-events-auto transition-all"
      style={{ width: 142, zIndex: 10 }}
    >
      <div className="text-center font-extrabold text-neutral-700 tracking-wide mb-1.5" style={{ fontSize: font(11) }}>
        左手定则 (洛伦兹力)
      </div>
      <div className="relative flex justify-center items-center bg-neutral-50/50 rounded-xl py-1">
        <svg ref={svgRef} width={120} height={130} className="overflow-visible">
          <HandRule
            mode="left"
            thumbDir={handPoseParams.thumbDir}
            indexDir={{ x: 0, y: 0 }}
            middleDir={handPoseParams.middleDir}
            cx={60}
            cy={68}
            scale={0.62}
            active={handPoseParams.handActive}
            svgRef={svgRef}
            draggable={true}
          />
        </svg>
      </div>
      <div className="text-center font-semibold text-neutral-500 mt-1.5 tracking-tight" style={{ fontSize: font(9) }}>
        {mode === 0 ? (
          <span>F_洛 = qv × B (q {charge > 0 ? '> 0' : '< 0'})</span>
        ) : (
          <span>F_洛 = qv × B (匀速直线)</span>
        )}
      </div>
    </div>
  )
}
