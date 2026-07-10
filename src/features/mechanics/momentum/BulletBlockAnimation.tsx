/**
 * BulletBlockAnimation.tsx
 * 子弹打木块模型主组件
 *
 * 中屏布局：上方图表区（v-t + 能量柱）+ 下方 SVG 动画区
 * 使用 useAnimationViewport({ preset: CANVAS_PRESETS.splitV }) 标准路径
 */
import { useMemo, useEffect, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import type { SceneScale } from '@/scene/SceneScale'
import { useBulletBlockPhysics, BB_LAYOUT } from './hooks/useBulletBlockPhysics'
import BulletBlockScene from './BulletBlockScene'
import BulletBlockCharts from './BulletBlockCharts'

// SVG 设计坐标系常量（CANVAS_PRESETS.splitV）
const DESIGN_WIDTH = 840

export default function BulletBlockAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const physics = useBulletBlockPhysics(params, time)
  const { state, param, timeline } = physics

  // 联动高亮状态：s1 (子弹位移), s2 (木块位移), deltaX (相对位移/内能)
  const [highlightType, setHighlightType] = useState<'s1' | 's2' | 'deltaX' | null>(null)

  // 手动构建 SceneScale（一维地面运动，y 固定为设计坐标）
  const sceneScale = useMemo<SceneScale>(() => {
    const scaleX = Math.max(
      10,
      (DESIGN_WIDTH - BB_LAYOUT.blockInitX * 2) / physics.worldWidth,
    )
    return {
      originX: BB_LAYOUT.blockInitX,
      originY: BB_LAYOUT.groundY,
      scaleX,
      scaleY: scaleX,
      scale: scaleX,
      refMagnitudes: {
        velocity: physics.refVelocity,
        acceleration: Math.abs(state.bulletA) || Math.abs(param.f / param.m),
      },
      maxVectorLength: BB_LAYOUT.vectorMaxLength,
    }
  }, [physics.worldWidth, physics.refVelocity, state.bulletA, param.f, param.m])

  const showDeltaX = (params.showDeltaX ?? 1) === 1

  // 动画到达终点自动暂停（用 useEffect 替代 requestAnimationFrame）
  const tMaxAnim = 1.0 + timeline.tMax * physics.timeScale
  useEffect(() => {
    if (time >= tMaxAnim && time > 0) {
      useAnimationStore.getState().setIsPlaying(false)
    }
  }, [time, tMaxAnim])

  return (
    <div className="w-full h-full flex flex-col">
      {/* 上方图表区（固定比例高度） */}
      <div className="h-[45%] shrink-0 min-h-0 p-2 pb-0">
        <BulletBlockCharts
          physics={physics}
          currentTime={physics.physicsTime * 1000}
          font={font}
          highlightType={highlightType}
          setHighlightType={setHighlightType}
        />
      </div>

      {/* 下方 SVG 动画区 */}
      <div className="flex-1 min-h-0 relative">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <BulletBlockScene
            state={state}
            param={param}
            timeline={timeline}
            mode={physics.mode}
            sceneScale={sceneScale}
            font={font}
            showDeltaX={showDeltaX}
            time={time}
            timeScale={physics.timeScale}
            groundWidth={vp.designVisibleW}
            groundX={vp.designLeft}
            highlightType={highlightType}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
