import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useLaserPhysics } from './hooks/useLaserPhysics'
import { LaserScene } from './components/LaserScene'
import { RelationChart } from '@/components/Chart'
import { OPTICS_COLORS } from '@/theme/physics'

export default function LaserAnimation() {
  // ── 1. Store 精确订阅 ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // ── 2. Viewport ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // ── 3. 参数解构与 Fallback ──
  const mode = params.mode ?? 0 // 0: 平行性, 1: 相干性, 2: 高能量

  // 模式 0：平行性参数
  const propagationDistance = params.propagationDistance ?? 50 // m
  const divergenceAngleLaser = params.divergenceAngleLaser ?? 1.5 // mrad
  const divergenceAngleNormal = params.divergenceAngleNormal ?? 15 // degree

  // 模式 1：相干性参数
  const wavelength = params.wavelength ?? 650 // nm
  const slitDistance = params.slitDistance ?? 0.2 // mm
  const screenDist = params.screenDist ?? 1.2 // m

  // 模式 2：高能量参数
  const laserPower = params.laserPower ?? 50 // W
  const focusDiameter = params.focusDiameter ?? 30 // um
  const material = params.material ?? 0 // 0: 纸张, 1: 木板, 2: 铁板

  // ── 4. 物理状态计算 ──
  const physics = useLaserPhysics({
    mode,
    propagationDistance,
    divergenceAngleLaser,
    divergenceAngleNormal,
    wavelength,
    slitDistance,
    screenDist,
    laserPower,
    focusDiameter,
    material,
    time,
  })

  // ── 5. SceneScale 比例尺 ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'center',
    physicsWidth: 10,
    physicsHeight: 4,
  })

  // ── 6. 渲染图表区 ──
  const renderChart = () => {
    if (mode === 0) {
      // 平行性对比图表：绘制光斑半径随距离的变化
      // 激光半径数据在 physics.divergenceChartPoints (mm)
      // 计算出普通光的光斑半径数据以供对比
      const r0 = 1.0 // 初始半径 1mm
      const thetaNormalRad = (divergenceAngleNormal * Math.PI / 180) / 2
      const steps = 50
      const normalPoints = Array.from({ length: steps + 1 }).map((_, i) => {
        const d = (i / steps) * 100
        const rNormal = r0 + d * Math.tan(thetaNormalRad) * 1000 // mm
        return { x: d, y: rNormal }
      })

      return (
        <RelationChart
          title="光斑半径与传播距离关系对比"
          points={physics.divergenceChartPoints} // 主曲线: 激光
          xLabel="传播距离 d (m)"
          yLabel="光斑半径 R (mm)"
          xDomain={[0, 100]}
          yDomain={[0, 45]} // 为激光和低发散度做裁剪，高发散度对比线可溢出
          cursorX={propagationDistance}
          additionalSeries={[
            {
              points: normalPoints,
              label: '普通发散光 (手电筒)',
              color: OPTICS_COLORS.lightRayRefracted,
              strokeWidth: 2,
              strokeDasharray: [4, 4],
            },
          ]}
        />
      )
    }

    if (mode === 1) {
      // 相干性对比图表：干涉屏上的光强分布 I(y)
      return (
        <RelationChart
          title="双缝干涉光强分布对比"
          points={physics.laserInterferencePoints} // 主曲线: 激光 (I-y)
          xLabel="干涉屏纵向位置 y (mm)"
          yLabel="相对光强 I"
          xDomain={[-5, 5]}
          yDomain={[0, 2.2]}
          additionalSeries={[
            {
              points: physics.normalInterferencePoints,
              label: '普通红光 (干涉条纹极微弱)',
              color: OPTICS_COLORS.lightRayRefracted,
              strokeWidth: 1.5,
              strokeDasharray: [3, 3],
            },
          ]}
        />
      )
    }

    if (mode === 2) {
      // 高能量应用图表：焦点温度随时间的变化 T(t)
      const markers = []
      if (physics.meltingPoint > 0) {
        markers.push({
          y: physics.meltingPoint,
          label: `熔点 (${physics.meltingPoint}°C)`,
          color: OPTICS_COLORS.wavelengthBlue,
        })
      }
      if (physics.boilingPoint > 0) {
        markers.push({
          y: physics.boilingPoint,
          label: `沸点/汽化点 (${physics.boilingPoint}°C)`,
          color: OPTICS_COLORS.wavelengthRed,
        })
      }

      return (
        <RelationChart
          title="焦点区域材料温度随时间变化曲线"
          points={physics.tempChartPoints} // T-t
          xLabel="照射时间 t (s)"
          yLabel="焦点温度 T (°C)"
          xDomain={[0, 10]}
          yDomain={[0, Math.max(400, physics.boilingPoint + 300)]}
          cursorX={time}
          markers={markers}
        />
      )
    }

    return null
  }

  // ── 7. 页面编排渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* 上图表区 */}
      <div className="h-[310px] shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
        {renderChart()}
      </div>

      {/* 下动画区 */}
      <div className="flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 relative">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <LaserScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            mode={mode}
            propagationDistance={propagationDistance}
            wavelength={wavelength}
            slitDistance={slitDistance}
            screenDist={screenDist}
            laserPower={laserPower}
            focusDiameter={focusDiameter}
            material={material}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
