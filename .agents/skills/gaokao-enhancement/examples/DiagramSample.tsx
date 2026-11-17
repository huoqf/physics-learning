import React from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Block, PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, STROKE } from '@/theme/physics'
import { worldToDesign } from '@/scene'

interface DiagramSampleProps {
  /** false = 题干纯净原貌（严禁透题）；true = 解析模式（可展示受力分析矢量） */
  showAnalysis?: boolean
}

/**
 * 试题 SVG 示意图标准 React 组件范例
 * 示范：
 *   1. 使用 useAnimationViewport + useSceneScale（合法 anchor='viewport'）+ AnimationSvgCanvas；
 *   2. 严格区分 showAnalysis：初始态零解题提示，受力分析箭头仅在 showAnalysis=true 时渲染；
 *   3. 坐标转换统一走 worldToDesign，字号走 canvasSize.font(N)。
 */
export const DiagramSample: React.FC<DiagramSampleProps> = ({ showAnalysis = false }) => {
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    refMagnitudes: { velocity: 6, force: 10 },
  })

  const font = canvasSize.font
  const blockW = 1.2 * sceneScale.scaleX
  const blockH = 0.6 * sceneScale.scaleY
  const groundDesign = worldToDesign(0, 0, sceneScale)
  const blockCenter = worldToDesign(2.5, 0.3, sceneScale)

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="w-full h-[220px] bg-white rounded-lg border border-neutral-200"
    >
      {/* 地面组件：使用 vp.designLeft / vp.designVisibleW 撑满可视区 */}
      <PhysicsGround x={vp.designLeft} y={groundDesign.py} width={vp.designVisibleW} type="ground" />

      {/* 滑块组件：尺寸由物理尺寸 × scale 派生 */}
      <Block
        x={blockCenter.px - blockW / 2}
        y={blockCenter.py - blockH / 2}
        width={blockW}
        height={blockH}
        label="m₁"
        type="wood"
      />

      {/* 题干已知初速度：纯已知条件允许在题干态显示 */}
      <PhysicsVectorArrow
        origin={{ x: 2.5, y: 0.3 }}
        vector={{ x: 5, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        strokeWidth={STROKE.vectorMain}
        font={font}
        label="v₀ = 5 m/s"
      />

      {/* 受力分析箭头属于解题推导内容，仅在 showAnalysis=true 时展示 */}
      {showAnalysis && (
        <PhysicsVectorArrow
          origin={{ x: 2.5, y: 0.1 }}
          vector={{ x: -3, y: 0 }}
          type="force"
          color={PHYSICS_COLORS.force}
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorMain}
          font={font}
          label="f_滑"
        />
      )}
    </AnimationSvgCanvas>
  )
}
