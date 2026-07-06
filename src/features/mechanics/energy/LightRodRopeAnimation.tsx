import { useLightRodRopePhysics } from './hooks/useLightRodRopePhysics'
import { LightRodRopeScene } from './lightRodRope/LightRodRopeScene'
import { LightRodRopeEnergyBars } from './lightRodRope/LightRodRopeEnergyBars'
import { LightRodRopeCharts } from './lightRodRope/LightRodRopeCharts'

export default function LightRodRopeAnimation() {
  const physics = useLightRodRopePhysics()
  const { containerRef, chartsData, tEnd, E_max, P_max, time, layout, chartMarkers } = physics

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden select-none flex flex-row p-2 gap-2">
      {/* 左半部分：动画区 (纯设计坐标系方式A：360x650) */}
      <div className="w-[52%] max-w-[420px] min-w-[320px] h-full relative shrink-0">
        {/* HTML 浮层绝对定位：能量实时柱状图（合规彻底替换 foreignObject，采用 translateX(-50%) 居中对齐滑轮支点，且按 scale 同步等比缩放） */}
        <LightRodRopeEnergyBars physics={physics} />

        {/* 纯设计坐标系 SVG 场景 */}
        <svg viewBox="0 0 360 650" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
          <LightRodRopeScene physics={physics} />
        </svg>
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
