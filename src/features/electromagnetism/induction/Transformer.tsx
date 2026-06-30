import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { calculateTransformerWithLoad } from '@/physics'
import { useAnimationStore } from '@/stores'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  buildTransformerChainSteps,
  buildTransformerDerived,
  buildTransformerLayout,
  generateCoilPaths3D,
  normalizeTransformerParams,
} from './transformer/model/transformerModel'
import { useTransformerDomino } from './transformer/hooks/useTransformerDomino'
import { TransformerScene } from './transformer/components/TransformerScene'
import { TransformerInfoPanel } from './transformer/components/TransformerInfoPanel'

/**
 * 变压器原理与动态分析。
 *
 * 主文件仅负责 store 读取、物理计算、view model 组合与组件编排；
 * SVG 场景、右侧信息面板、几何模型和动画触发逻辑分别下沉到 transformer/*。
 */
export default function Transformer() {
  const { params: rawParams } = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font, px } = canvasSize
  const params = useMemo(() => normalizeTransformerParams(rawParams), [rawParams])
  const { mode, n1, n2, U1, R } = params

  const rightPanelW = mode === 1 ? Math.round(canvasSize.width * 0.30) : 0
  const vp = useViewport(canvasSize, {
    designWidth: 380,
    designHeight: mode === 0 ? 355 : 320,
    overlayRight: rightPanelW,
  })

  const result = useMemo(
    () => calculateTransformerWithLoad(n1, n2, U1, R),
    [n1, n2, U1, R],
  )
  const layout = useMemo(
    () => buildTransformerLayout({ width: canvasSize.width, height: canvasSize.height, mode, vp }),
    [canvasSize.width, canvasSize.height, mode, vp],
  )
  const derived = useMemo(
    () => buildTransformerDerived({ params, result, layout, scale: vp.scale }),
    [params, result, layout, vp.scale],
  )

  const coilTopInset = px(10)
  const coilBulge = layout.coilW / 2
  const primaryCoils = useMemo(
    () => generateCoilPaths3D(layout.primaryLeft, layout.primaryRight, layout.coreTop, layout.coreBottom, n1, true, coilTopInset, coilBulge),
    [layout.primaryLeft, layout.primaryRight, layout.coreTop, layout.coreBottom, n1, coilTopInset, coilBulge],
  )
  const secondaryCoils = useMemo(
    () => generateCoilPaths3D(layout.secondaryLeft, layout.secondaryRight, layout.coreTop, layout.coreBottom, n2, false, coilTopInset, coilBulge),
    [layout.secondaryLeft, layout.secondaryRight, layout.coreTop, layout.coreBottom, n2, coilTopInset, coilBulge],
  )

  const chainSteps = useMemo(
    () => buildTransformerChainSteps(params, result, derived.displayI1, derived.displayI2),
    [params, result, derived.displayI1, derived.displayI2],
  )
  const dominoStep = useTransformerDomino({ mode, triggerValue: R, chainSteps })

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <TransformerScene
        params={params}
        result={result}
        derived={derived}
        layout={layout}
        vp={vp}
        primaryCoils={primaryCoils}
        secondaryCoils={secondaryCoils}
        px={px}
        font={font}
      />

      {mode === 1 && (
        <TransformerInfoPanel
          width={rightPanelW}
          result={result}
          pBarW={derived.pBarW}
          powerBalanced={derived.powerBalanced}
          chainSteps={chainSteps}
          dominoStep={dominoStep}
          font={font}
        />
      )}
    </div>
  )
}
