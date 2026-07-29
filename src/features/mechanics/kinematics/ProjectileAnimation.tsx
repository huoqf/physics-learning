import { useEffect, useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useProjectilePhysics } from './hooks/useProjectilePhysics'
import { ProjectileScene } from './components/ProjectileScene'

export default function ProjectileAnimation() {
  // 1. 精确订阅 Zustand Store
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const {
    v0x = 10,
    g = 9.8,
    modelMode = 0,
    inclineAngle = 30,
    airResistance = 0,
    showProjections = 1,
    showTangentMidpoint = 1,
  } = params

  // 2. 挂载标准的 splitV Viewport (横向分屏：上 50% 图表，下 50% 动画)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 3. 物理逻辑 Hook
  const physics = useProjectilePhysics({
    v0x,
    g,
    time,
    height: 10.0,
    modelMode,
    inclineAngle,
    airResistance,
  })

  // 4. SceneScale 建立物理到设计的比例尺转换 (消灭上下无用空白，地面落在 285px)
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'custom',
    customOriginX: 70,
    customOriginY: 35,
    customScaleX: 35,
    customScaleY: 25,
    refMagnitudes: { velocity: Math.max(v0x, 10) },
  })

  // 落地自动暂停动画
  useEffect(() => {
    if (physics.isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [physics.isLanded, time, setIsPlaying])

  // v-t 图表数据构建
  const vtChartData = useMemo(() => {
    const domainVx: { t: number; v: number }[] = []
    const domainVy: { t: number; v: number }[] = []
    const pointsVx: { t: number; v: number }[] = []
    const pointsVy: { t: number; v: number }[] = []

    const steps = 40
    const maxT = physics.groundTime || 1.5
    for (let i = 0; i <= steps; i++) {
      const tSample = (i / steps) * maxT
      const vxVal = v0x
      const vyVal = -g * tSample
      domainVx.push({ t: tSample, v: vxVal })
      domainVy.push({ t: tSample, v: vyVal })

      if (tSample <= physics.activeT + 1e-5) {
        pointsVx.push({ t: tSample, v: vxVal })
        pointsVy.push({ t: tSample, v: vyVal })
      }
    }
    return { domainVx, domainVy, pointsVx, pointsVy }
  }, [v0x, g, physics.groundTime, physics.activeT])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 上分屏 (50%)：v-t 图表 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm">
        <VelocityTimeChart
          mode="animated"
          points={vtChartData.pointsVx}
          domainPoints={vtChartData.domainVx}
          additionalSeries={[
            {
              points: vtChartData.pointsVy,
              domainPoints: vtChartData.domainVy,
              label: 'vᵧ',
              series: 'secondary',
            },
          ]}
          currentTime={physics.activeT}
          tMax={Math.max(physics.groundTime * 1.1, 0.5)}
          vRange={[-g * physics.groundTime * 1.1, Math.max(v0x * 1.2, 10)]}
          title="平抛运动 速度分量 vₓ、vᵧ 与时间 (v-t) 图像"
          showCursor={!physics.isLanded}
          showGrid
        />
      </div>

      {/* 2. 下分屏 (50%)：AnimationSvgCanvas 画布 */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          className="bg-white rounded-lg shadow-inner"
        >
          <ProjectileScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            showVectors={showVectors}
            showGrid={showGrid}
            showTangentMidpoint={Boolean(showTangentMidpoint)}
            showProjections={Boolean(showProjections)}
            modelMode={modelMode}
            inclineAngle={inclineAngle}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
