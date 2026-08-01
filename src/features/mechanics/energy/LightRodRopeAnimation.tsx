import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useLightRodRopePhysics } from './hooks/useLightRodRopePhysics'
import { LightRodRopeScene } from './lightRodRope/LightRodRopeScene'
import { LightRodRopeEnergyBars } from './lightRodRope/LightRodRopeEnergyBars'
import { LightRodRopeCharts } from './lightRodRope/LightRodRopeCharts'

export default function LightRodRopeAnimation() {
  const physics = useLightRodRopePhysics()
  const { containerRef, chartsData, tEnd, E_max, P_max, time, layout, chartMarkers } = physics

  const { containerRef: leftSceneRef, vp: leftSceneVp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitH })
  const font = (v: number) => Math.max(7, Math.min(16, v))

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden select-none flex flex-row p-2 gap-2">
      {/* 左半部分：动画区 (标准 VIEWPORT 架构：splitH 420x650) */}
      <div className="w-[52%] max-w-[420px] min-w-[320px] h-full relative shrink-0">
        {/* HTML 浮层绝对定位：能量实时柱状图 */}
        <LightRodRopeEnergyBars physics={physics} />

        {/* 标准 AnimationSvgCanvas 替代手写 viewBox SVG */}
        <AnimationSvgCanvas containerRef={leftSceneRef} transform={leftSceneVp.transform}>
          <LightRodRopeScene physics={physics} font={font} />
        </AnimationSvgCanvas>
      </div>

      {/* 右半部分：图表矩阵 (原生 HTML flex 平级并列，无 foreignObject) */}
      <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col p-1">
        <LightRodRopeCharts
          constraint={physics.params.constraint}
          chartsData={chartsData}
          tMax={tEnd}
          eMax={E_max}
          pMax={P_max}
          time={time}
          curHB={layout.curHB}
          curThetaB={layout.curThetaB}
          chartMarkers={chartMarkers}
        />
      </div>
    </div>
  )
}
