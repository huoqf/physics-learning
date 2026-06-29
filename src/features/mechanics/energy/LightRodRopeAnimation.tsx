import { useLightRodRopePhysics } from './hooks/useLightRodRopePhysics'
import { LightRodRopeScene } from './lightRodRope/LightRodRopeScene'
import { LightRodRopeEnergyBars } from './lightRodRope/LightRodRopeEnergyBars'
import { LightRodRopeCharts } from './lightRodRope/LightRodRopeCharts'

export default function LightRodRopeAnimation() {
  const physics = useLightRodRopePhysics()
  const { vp, canvasSize, containerRef, chartsData, tEnd, E_max, P_max, time, layout, chartMarkers } = physics

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden select-none">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-full"
      >
        <g transform={vp.transform}>
          {/* 左半部分：动画区 */}
          <g>
            {/* 能量条 */}
            <LightRodRopeEnergyBars physics={physics} />

            {/* 场景渲染 */}
            <LightRodRopeScene physics={physics} />
          </g>
        </g>

        {/* 右半部分：图表矩阵 */}
        <LightRodRopeCharts
          constraint={physics.params.constraint}
          vp={vp}
          chartsData={chartsData}
          tMax={tEnd}
          eMax={E_max}
          pMax={P_max}
          time={time}
          curHB={layout.curHB}
          curThetaB={layout.curThetaB}
          chartMarkers={chartMarkers}
        />
      </svg>
    </div>
  )
}
