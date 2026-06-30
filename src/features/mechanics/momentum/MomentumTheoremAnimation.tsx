import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
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
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)

  const groundY = canvasSize.height - MT_LAYOUT.groundOffset
  const cardWidth = Math.max(300, canvasSize.width * 0.42)
  const vp = useViewport(canvasSize, {
    designWidth: 600,
    designHeight: 450,
    overlayRight: Math.round(cardWidth + 24),
  })

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: vp.visibleX,
      y: vp.visibleY,
      width: vp.visibleW,
      height: vp.visibleH,
    },
    originX: 0,
    originY: groundY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
    refMagnitudes: {
      velocity: 15,
      force: 200,
    },
  }), [vp.visibleX, vp.visibleY, vp.visibleW, vp.visibleH, groundY, canvasSize.width, canvasSize.height])

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-neutral-50 rounded-xl">
      {/* ========== 左侧物理动画容器 (大 SVG) ========== */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
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
      </svg>

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
