import { PhysicsGround } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { createSceneScaleFromViewport } from '@/scene'

import { PHYSICS_COLORS } from '@/theme/physics'

import { useMomentumTheoremLayout } from './hooks/useMomentumTheoremLayout'
import { useParticleSimulation } from './hooks/useParticleSimulation'
import { MomentumBasicScene } from './components/MomentumBasicScene'
import { MomentumAdvancedScene } from './components/MomentumAdvancedScene'
import { MomentumTheoremDefs } from './components/MomentumTheoremDefs'
import { MomentumTheoremCharts } from './components/MomentumTheoremCharts'
import { MT_LAYOUT } from './components/constants'

export default function MomentumTheoremAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  // cardWidth 基于 preset.width 估算（useAnimationViewport 要求在调用前确定 overlay）
  const cardWidth = Math.max(300, CANVAS_PRESETS.full.width * 0.42)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    presetCompensation: 1.2,
    overlayRight: Math.round(cardWidth + 24),
  })

  const groundY = canvasSize.height - MT_LAYOUT.groundOffset

  const sceneScale = useMemo(() => createSceneScaleFromViewport(vp, 'visibleArea', {
    refMagnitudes: { velocity: 15, force: 200 },
  }), [vp])

  const layout = useMomentumTheoremLayout({ params, time, vp })

  const particles = useParticleSimulation({
    time,
    v_fluid: layout.v_fluid,
    alpha: layout.alpha,
    plateX: layout.plateX,
    nozzleX: layout.nozzleX,
    springCompression: layout.springCompression
  })

  return (
    <div className="w-full h-full relative overflow-hidden bg-neutral-50 rounded-xl">
      {/* ========== 左侧物理动画容器 (大 SVG) ========== */}
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <MomentumTheoremDefs />

        {/* ========== 物理地面 ========== */}
        <PhysicsGround
          x={vp.visibleX + 16}
          y={groundY}
          width={vp.visibleW - 32}
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
            vp={vp}
            groundY={groundY}
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
            groundY={groundY}
          />
        )}
      </AnimationSvgCanvas>

      {/* ========== 右侧浮动 HTML 面板卡片 (F-t & v-t 图表) ========== */}
      <div
        className="absolute top-4 right-4 bottom-4 bg-white/95 border border-neutral-200/80 rounded-2xl shadow-xl p-4 flex flex-col gap-4 overflow-y-auto"
        style={{ width: cardWidth }}
      >
        <MomentumTheoremCharts layout={layout} />
      </div>
    </div>
  )
}
