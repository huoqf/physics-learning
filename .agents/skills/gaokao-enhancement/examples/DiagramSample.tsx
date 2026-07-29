import React from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS, font } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Block, PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { worldToDesign } from '@/scene'

/**
 * 高考真题 SVG 示意图标准 React 组件范例
 * 示范：直接调用项目现有组件与 Viewport 体系，无需任何手写坐标换算
 */
export const DiagramSample: React.FC = () => {
  // 1. 调用现成 Viewport Hook（使用标准 Preset）
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 2. 调用现成 SceneScale 比例尺计算
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'bottom',
  })

  // 3. 物理世界坐标转换为设计坐标
  const blockPos = worldToDesign({ x: 0, y: 1 }, sceneScale)
  const arrowStart = worldToDesign({ x: 0.5, y: 1.2 }, sceneScale)
  const arrowEnd = worldToDesign({ x: 2.5, y: 1.2 }, sceneScale)

  return (
    <div ref={containerRef} className="w-full h-[240px] bg-white rounded-lg border border-neutral-200">
      {/* 4. 直接使用 AnimationSvgCanvas 容器，由框架统一做响应式 Transform */}
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 地面组件：直接调用现有组件 */}
        <PhysicsGround y={canvasSize.height - 30} width={canvasSize.width} />

        {/* 木块组件：直接调用现有组件 */}
        <Block
          x={blockPos.x}
          y={blockPos.y}
          width={80}
          height={40}
          label="m1"
          fill={SCENE_COLORS.wood}
        />

        {/* 矢量箭头：直接调用现有组件 */}
        <PhysicsVectorArrow
          startX={arrowStart.x}
          startY={arrowStart.y}
          endX={arrowEnd.x}
          endY={arrowEnd.y}
          color={PHYSICS_COLORS.velocity}
          label="v0 = 6 m/s"
        />

        {/* 文本标注：字号包裹 font(N) */}
        <text
          x={blockPos.x + 40}
          y={blockPos.y - 15}
          fill={PHYSICS_COLORS.force}
          fontSize={font(14)}
          textAnchor="middle"
          fontWeight="bold"
        >
          f_max
        </text>
      </AnimationSvgCanvas>
    </div>
  )
}
