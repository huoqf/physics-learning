import React from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS, font } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Block, PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, STROKE } from '@/theme/physics'
import { worldToDesign } from '@/scene'

/**
 * 高考真题 SVG 示意图标准 React 组件范例
 * 示范：直接调用项目现有组件与 Viewport 体系，严格复用底层标准 Props 与设计坐标
 */
export const DiagramSample: React.FC = () => {
  // 1. 调用现成 Viewport Hook（使用标准 Preset）
  const { containerRef, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 2. 调用现成 SceneScale 比例尺计算
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'bottom',
    physicsWidth: 10,
    physicsHeight: 5,
    refMagnitudes: { velocity: 6, force: 10 },
  })

  // 3. 物理世界坐标转换为设计坐标：worldToDesign(wx, wy, sceneScale) -> { px, py }
  const blockPos = worldToDesign(2, 1, sceneScale)

  return (
    // 4. AnimationSvgCanvas 自带 containerRef 容器，通过 className 设定外层样式，严禁双层套 div
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="w-full h-[240px] bg-white rounded-lg border border-neutral-200"
    >
      {/* 地面组件：必须使用 vp.designLeft / vp.designVisibleW 撑满可视区 */}
      <PhysicsGround x={vp.designLeft} y={sceneScale.originY} width={vp.designVisibleW} type="ground" />

      {/* 木块组件：复用 Block 标准组件，type 声明材质 */}
      <Block
        x={blockPos.px}
        y={blockPos.py - 40}
        width={80}
        height={40}
        label="m1"
        type="wood"
      />

      {/* 物理矢量箭头：严格传入 originDesign、vector、type、sceneScale */}
      <PhysicsVectorArrow
        originDesign={{ x: blockPos.px + 40, y: blockPos.py - 20 }}
        vector={{ x: 6, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        strokeWidth={STROKE.vectorMain}
        label="v0 = 6 m/s"
      />

      {/* 文本标注：字号包裹 font(N) */}
      <text
        x={blockPos.px + 40}
        y={blockPos.py - 55}
        fill={PHYSICS_COLORS.force}
        fontSize={font(14)}
        textAnchor="middle"
        fontWeight="bold"
      >
        f_max
      </text>
    </AnimationSvgCanvas>
  )
}

