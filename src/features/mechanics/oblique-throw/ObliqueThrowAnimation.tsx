import { useEffect } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useObliqueThrowPhysics } from './hooks/useObliqueThrowPhysics'
import { ObliqueThrowScene } from './components/ObliqueThrowScene'

export default function ObliqueThrowAnimation() {
  // 1. Store 精确订阅
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  // 2. Viewport 绑定 (splitV: 840 x 325 宽幅视口)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 3. 参数提取
  const {
    v0 = 20,
    angle = 45,
    g = 9.8,
    airResistance = 0,
    advancedMode = 0,
    viewMode = 0,
    showPrevTrajectory = 1,
    showVacuumCompare = 0,
  } = params

  // 4. 纯物理计算 Hook
  const physics = useObliqueThrowPhysics({
    v0,
    angle,
    g,
    time,
    airResistance,
    advancedMode,
  })

  // 落地自动暂停
  useEffect(() => {
    if (physics.isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [physics.isLanded, time, setIsPlaying])

  // 视口缩放模式：viewMode === 1 为固定 100m 物理量程；viewMode === 0 为自适应数值刻度视口
  const targetWidth = viewMode === 1 ? 100 : Math.max(physics.range * 1.15, 20)
  const targetHeight = viewMode === 1 ? 35 : Math.max(physics.maxHeight * 1.35, 8)

  // 5. 物理坐标比例尺 SceneScale
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: targetWidth,
    physicsHeight: targetHeight,
    refMagnitudes: { velocity: Math.max(v0, 10) },
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* ── 1. 上平级分区：v-t 图表 ── */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
        <VelocityTimeChart
          mode="animated"
          points={physics.vtChartData.pointsVx}
          domainPoints={physics.vtChartData.domainVx}
          additionalSeries={[
            {
              points: physics.vtChartData.pointsVy,
              domainPoints: physics.vtChartData.domainVy,
              label: 'vᵧ (竖直速度)',
              series: 'secondary',
            },
          ]}
          currentTime={physics.activeTime}
          tMax={physics.groundTime * 1.1}
          vRange={[-v0 * 1.1, v0 * 1.1]}
          title={`斜抛运动 速度分量-时间 (v-t) 关系 (v₀=${v0}m/s, θ=${angle}°)`}
          showCursor={!physics.isLanded}
          showGrid
        />
      </div>

      {/* ── 2. 下平级分区：AnimationSvgCanvas 斜抛动画场景 ── */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          className="bg-white rounded-lg shadow-inner border border-slate-200"
        >
          <ObliqueThrowScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            vp={vp}
            angle={angle}
            showVectors={showVectors}
            showGrid={showGrid}
            showVacuumCompare={Boolean(showVacuumCompare && advancedMode === 1 && airResistance > 0)}
            showPrevTrajectory={Boolean(showPrevTrajectory)}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
