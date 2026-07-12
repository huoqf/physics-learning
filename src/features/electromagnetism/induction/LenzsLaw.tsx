import { useRef } from 'react'
import { useAnimationViewport } from '@/hooks'
import { useViewportPointer } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useLenzsLaw } from './lenzs-law/hooks/useLenzsLaw'
import { LenzsLawCanvas } from './lenzs-law/components/LenzsLawCanvas'

export default function LenzsLaw() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const state = useLenzsLaw()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const getSvgPoint = useViewportPointer(svgRef)

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      svgRef={svgRef}
      className="bg-white rounded-lg shadow-inner"
    >
      <LenzsLawCanvas
        {...state}
        font={canvasSize.font}
        getSvgPoint={getSvgPoint}
      />
    </AnimationSvgCanvas>
  )
}
