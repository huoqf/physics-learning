import { PhysicsGround } from '@/components/Physics'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

import { PHYSICS_COLORS } from '@/theme/physics'

import { useMomentumTheoremLayout } from './hooks/useMomentumTheoremLayout'
import { useParticleSimulation } from './hooks/useParticleSimulation'
import { MomentumBasicScene } from './components/MomentumBasicScene'
import { MomentumAdvancedScene } from './components/MomentumAdvancedScene'
import { MomentumTheoremDefs } from './components/MomentumTheoremDefs'
import { MT_LAYOUT } from './components/constants'

export default function MomentumTheoremAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  const showGravity = params.showGravity === 1
  const showVelocity = params.showVelocity === 1
  const showNormalForce = params.showNormalForce === 1

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })

  // 设计坐标：地面 Y（preset 高度 - 安全余量）
  const groundDesignY = preset.height - MT_LAYOUT.groundOffset

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: vp.visibleW / vp.scale,
    physicsHeight: vp.visibleH / vp.scale,
    originSource: 'topLeft',
    refMagnitudes: { velocity: 15, force: 200, gravity: 25, normalForce: 200, appliedForce: 200 },
  })

  const layout = useMomentumTheoremLayout({ params, time, vp })

  const particles = useParticleSimulation({
    time,
    v_fluid: layout.v_fluid,
    alpha: layout.alpha,
    plateX: layout.plateX,
    nozzleX: layout.nozzleX,
    springCompression: layout.springCompression
  })

  // 设计坐标：可视区域边界
  const designVisibleX = (vp.visibleX - vp.tx) / vp.scale
  const designVisibleW = vp.visibleW / vp.scale

  return (
    <div className="w-full h-full relative overflow-hidden bg-neutral-50 rounded-xl">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <MomentumTheoremDefs />

        {/* ========== 物理地面 ========== */}
        <PhysicsGround
          x={designVisibleX + 16}
          y={groundDesignY}
          width={designVisibleW - 32}
          type="ground"
          appearance={{
            color: PHYSICS_COLORS.labelText,
            fillColor: PHYSICS_COLORS.labelTextLight,
            showHatch: true,
          }}
        />

        {/* ========== 基础模式：缓冲垫碰撞 ========== */}
        {!layout.isAdvanced && (
          <MomentumBasicScene
            layout={layout}
            sceneScale={sceneScale}
            canvasSize={canvasSize}
            showVectors={showVectors}
            showGravity={showGravity}
            showVelocity={showVelocity}
            showNormalForce={showNormalForce}
            vp={vp}
            groundY={groundDesignY}
          />
        )}

        {/* ========== 进阶模式：流体冲击 ========== */}
        {layout.isAdvanced && (
          <MomentumAdvancedScene
            layout={layout}
            sceneScale={sceneScale}
            canvasSize={canvasSize}
            showVectors={showVectors}
            particles={particles}
            groundY={groundDesignY}
          />
        )}
      </AnimationSvgCanvas>
    </div>
  )
}
