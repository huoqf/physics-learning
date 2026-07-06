import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useLenzsLaw } from './lenzs-law/hooks/useLenzsLaw'
import { LenzsLawCanvas } from './lenzs-law/components/LenzsLawCanvas'

export default function LenzsLaw() {
  // 迁移使用标准的 full 预设尺寸 (700 x 650)，移除旧版缩水补偿
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full)
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
