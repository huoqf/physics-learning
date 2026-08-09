import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useLaserPhysics } from './hooks/useLaserPhysics'
import { LaserScene } from './components/LaserScene'

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
  const mode = Number(params.mode ?? 0) // 0: 平行性, 1: 相干性, 2: 高能量

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
  const material = Number(params.material ?? 0) // 0: 纸张, 1: 木板, 2: 铁板

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
    physicsScaleDesign: 84,
    physicsWidth: 10,
    physicsHeight: 4,
  })

  // ── 6. 统一标准的动画画布渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-lg border border-neutral-200 overflow-hidden relative">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <LaserScene
          physics={physics}
          canvasSize={canvasSize}
          sceneScale={sceneScale}
          mode={mode}
          propagationDistance={propagationDistance}
          divergenceAngleNormal={divergenceAngleNormal}
          wavelength={wavelength}
          slitDistance={slitDistance}
          screenDist={screenDist}
          laserPower={laserPower}
          focusDiameter={focusDiameter}
          material={material}
          time={time}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
