import { VectorDefs } from '@/components/Physics'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'

import type { SceneLayoutProfile } from '@/scene'
import { useAnimationLayout } from '@/context/AnimationLayoutContext'
import { useFrictionSimulation } from './friction/useFrictionSimulation'
import BasicModeScene from './friction/BasicModeScene'
import InclineModeScene from './friction/InclineModeScene'

const BOX_SIZE = 44

const FRICTION_DESIGN = { width: 700, height: 400 } as const

const FRICTION_LAYOUT = {
  groundYRatio_m1: 0.75,
  boxStartXRatio: 0.175,
  pullScaleRightMargin: 0.075,
  groundYRatio_m2: 0.84,
  pivotRatio: 0.18,
  boardLengthRatio: 0.52,
} as const

const FRICTION_SCENE_PROFILE: SceneLayoutProfile = {
  mode: 'visibleArea',
  designWidth: FRICTION_DESIGN.width,
  designHeight: FRICTION_DESIGN.height,
  refMagnitudes: {
    appliedForce: 40,
    friction: 40,
    normalForce: 40,
    gravity: 40,
    force: 40,
  },
}

export default function FrictionAnimation() {
  const { showVectors } = useAnimationStore(
    useShallow((s) => ({
      showVectors: s.showVectors,
    }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { font } = canvasSize

  const contextProfile = useAnimationLayout()
  const sceneProfile = contextProfile ?? FRICTION_SCENE_PROFILE

  const pullScale = (vp.visibleW * (1 - FRICTION_LAYOUT.boxStartXRatio - FRICTION_LAYOUT.pullScaleRightMargin)) / 5
  const inclineScale = (vp.visibleH * 0.5) / 3.5

  const frictionSceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: preset.width, physicsHeight: preset.height, refMagnitudes: sceneProfile.refMagnitudes })

  const groundY_m1 = vp.visibleY + vp.visibleH * FRICTION_LAYOUT.groundYRatio_m1
  const boxStartX_m1 = vp.visibleX + vp.visibleW * FRICTION_LAYOUT.boxStartXRatio
  const groundY_m2 = vp.visibleY + vp.visibleH * FRICTION_LAYOUT.groundYRatio_m2
  const pivotX = vp.visibleX + vp.visibleW * FRICTION_LAYOUT.pivotRatio
  const boardLength = vp.visibleW * FRICTION_LAYOUT.boardLengthRatio

  const x1Limit_m = (vp.visibleW - boxStartX_m1 - BOX_SIZE / 2) / pullScale
  const xRelLimit_m = (boardLength * 0.85 - BOX_SIZE / 2) / inclineScale
  const xMLimit_m = (pivotX - vp.visibleX - 30) / inclineScale

  const {
    params,
    mode,
    m,
    angle,
    simState,
    res_m2,
    weight,
    weight_M,
    F_normal_m1,
    f_actual_m1,
    isSliding_m1,
  } = useFrictionSimulation({
    pullScale,
    inclineScale,
    x1Limit: x1Limit_m,
    xRelLimit: xRelLimit_m,
    xMLimit: xMLimit_m,
    angleRad: 0,
    vpVisibleX: vp.visibleX,
    vpVisibleW: vp.visibleW,
  })

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <linearGradient id="steel-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          <linearGradient id="incline-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          <VectorDefs colors={[PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.friction, PHYSICS_COLORS.normalForce, PHYSICS_COLORS.gravity, PHYSICS_COLORS.acceleration]} />
        </defs>

        {mode === 0 && (
          <BasicModeScene
            simState={simState}
            F_normal_m1={F_normal_m1}
            f_actual_m1={f_actual_m1}
            isSliding_m1={isSliding_m1}
            m={m}
            mu={params.mu ?? 0.3}
            g={params.g ?? 9.8}
            F_applied={params.F_applied ?? 15}
            weight={weight}
            pullScale={pullScale}
            groundY={groundY_m1}
            boxStartX={boxStartX_m1}
            vpVisibleW={vp.visibleW}
            font={font}
            frictionSceneScale={frictionSceneScale}
            boxSize={BOX_SIZE}
            showVectors={showVectors}
          />
        )}

        {mode === 1 && (
          <InclineModeScene
            simState={simState}
            res_m2={res_m2}
            m={m}
            M={params.M ?? 10}
            angle={angle}
            weight={weight}
            weight_M={weight_M}
            inclineScale={inclineScale}
            groundY={groundY_m2}
            pivotX={pivotX}
            boardLength={boardLength}
            vpVisibleX={vp.visibleX}
            vpVisibleY={vp.visibleY}
            vpVisibleW={vp.visibleW}
            font={font}
            frictionSceneScale={frictionSceneScale}
            boxSize={BOX_SIZE}
            showVectors={showVectors}
          />
        )}
      </svg>

      {/* 水平拉力直接拖拽控制小标提示 */}
      {mode === 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-ui-md text-neutral-400 bg-white/80 px-3 py-1 rounded-full shadow-sm pointer-events-none">
          💡 可用鼠标按住并左右拖拽拉力 F 箭头端点调节大小
        </div>
      )}
    </div>
  )
}
