import React from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Block, PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { worldToDesign } from '@/scene'

interface DiagramProps {
  /** 是否为解答步骤配图（解答步骤中包含受力分析与辅助分解） */
  showAnalysis?: boolean
}

const font = (size: number) => size

/**
 * 2024高考全国新课标卷第21题（板块模型）标准矢量示意图
 * 题干模式 (showAnalysis = false)：100%还原高考卷面，绝对纯净无解题辅助线
 * 解析模式 (showAnalysis = true)：显示物块与木板的受力分解矢量
 */
export const Prob2024Quanguo21Diagram: React.FC<DiagramProps> = ({ showAnalysis = false }) => {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'center',
    physicsScaleDesign: 50,
  })

  // 地面坐标
  const groundY = canvasSize.height - 30

  // 木板 M 坐标与尺寸
  const boardWidth = 220
  const boardHeight = 36
  const boardPos = worldToDesign(0, 0.8, sceneScale)

  // 滑块 m 坐标与尺寸
  const blockWidth = 60
  const blockHeight = 36
  const blockPos = {
    px: boardPos.px + 20,
    py: boardPos.py - blockHeight,
  }

  return (
    <div ref={containerRef} className="w-full h-[220px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 地面 */}
        <PhysicsGround x={0} y={groundY} width={canvasSize.width} />

        {/* 长木板 M (复用预设 Block type="wood") */}
        <Block
          x={boardPos.px}
          y={boardPos.py}
          width={boardWidth}
          height={boardHeight}
          type="wood"
          label="木板 M = 3 kg"
        />

        {/* 滑块 m (复用预设 Block type="metal") */}
        <Block
          x={blockPos.px}
          y={blockPos.py}
          width={blockWidth}
          height={blockHeight}
          type="metal"
          label="m = 1 kg"
        />

        {/* 初始初速度矢量 v0 (纯净题干自带的基础已知物理量) */}
        <PhysicsVectorArrow
          origin={{ x: 0.2, y: 1.2 }}
          vector={{ x: 5, y: 0 }}
          type="velocity"
          sceneScale={sceneScale}
          color={PHYSICS_COLORS.velocity}
          label="v₀ = 5 m/s"
        />

        {/* 标注：光滑水平面 */}
        <text
          x={canvasSize.width / 2}
          y={groundY - 10}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(13)}
          textAnchor="middle"
        >
          光滑水平面 (μ₂ = 0.05)
        </text>

        {/* 解析模式：展示受力分析辅助线与矢量箭头 (仅在步骤展开时渲染) */}
        {showAnalysis && (
          <g className="analysis-forces animate-fade-in">
            {/* 滑块 m 受摩擦力 f1 向左 */}
            <PhysicsVectorArrow
              origin={{ x: 0.2, y: 1.0 }}
              vector={{ x: -3, y: 0 }}
              type="force"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.forceNet}
              label="f₁ = μ₁mg"
            />
            {/* 木板 M 受摩擦力 f1' 向右 */}
            <PhysicsVectorArrow
              origin={{ x: 0.5, y: 0.8 }}
              vector={{ x: 3, y: 0 }}
              type="force"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.forceNet}
              label="f₁'"
            />
            {/* 木板反向加速度 a2 示意 */}
            <text
              x={boardPos.px + boardWidth / 2}
              y={boardPos.py + boardHeight + 20}
              fill={PHYSICS_COLORS.acceleration}
              fontSize={font(12)}
              fontWeight="bold"
            >
              a_M = (f₁ - f₂)/M
            </text>
          </g>
        )}
      </AnimationSvgCanvas>
    </div>
  )
}
