import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useLenzsLaw } from './lenzs-law/hooks/useLenzsLaw'
import { LenzsLawCanvas } from './lenzs-law/components/LenzsLawCanvas'

export default function LenzsLaw() {
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const state = useLenzsLaw()

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <LenzsLawCanvas
        {...state}
        canvasSize={canvasSize}
        vpScale={canvasSize.scale}
      />
    </div>
  )
}
