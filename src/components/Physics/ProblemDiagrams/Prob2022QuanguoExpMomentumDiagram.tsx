import React from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Block, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { worldToDesign } from '@/scene'

interface DiagramProps {
  /** 是否为解答步骤配图（解答步骤中包含受力分析与辅助分解） */
  showAnalysis?: boolean
}

const font = (size: number) => size

/**
 * 2022高考全国甲卷物理第23题（气垫导轨碰撞与动量守恒）标准矢量示意图
 * 题干模式 (showAnalysis = false)：100%还原高考卷面，绝对纯净无解题辅助线
 * 解析模式 (showAnalysis = true)：显示碰撞后两滑块运动方向与速度标注
 */
export const Prob2022QuanguoExpMomentumDiagram: React.FC<DiagramProps> = ({ showAnalysis = false }) => {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'center',
    physicsScaleDesign: 60,
  })

  // 导轨几何参数
  const trackY = canvasSize.height * 0.62
  const trackLeft = 50
  const trackRight = canvasSize.width - 50
  const trackWidth = trackRight - trackLeft
  const trackHeight = 16

  // 左右挡板
  const bumperWidth = 8
  const bumperHeight = 52
  const leftBumperX = trackLeft + 15
  const rightBumperX = trackRight - 15 - bumperWidth
  const bumperY = trackY - 32

  // 滑块几何参数（接触点位于导轨正中偏左）
  // 题目要求：A与B接触时，A的左端到左挡板距离 s1 与 B的右端到右挡板距离 s2 相等
  const blockHeight = 28
  const blockAWidth = 56 // 质量较小的滑块 A (0.304kg)
  const blockBWidth = 80 // 质量较大的滑块 B (0.510kg)

  // 计算使得 s1 = s2 的接触位置
  // 可利用空间 = rightBumperX - (leftBumperX + bumperWidth)
  const availableSpace = rightBumperX - (leftBumperX + bumperWidth)
  const totalBlocksWidth = blockAWidth + blockBWidth
  const s = (availableSpace - totalBlocksWidth) / 2

  const blockAX = leftBumperX + bumperWidth + s
  const blockBX = blockAX + blockAWidth
  const blockY = trackY - blockHeight

  // 转换为物理坐标用于放置物理矢量箭头 (解析模式)
  const arrowOriginA = worldToDesign(-1.2, 0.4, sceneScale)
  const arrowOriginB = worldToDesign(1.2, 0.4, sceneScale)

  return (
    <div
      ref={containerRef}
      className="w-full h-[220px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm"
    >
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 气垫导轨主体基座 */}
        <rect
          x={trackLeft}
          y={trackY}
          width={trackWidth}
          height={trackHeight}
          rx={3}
          fill={SCENE_COLORS.mechanicsApparatus.airTrackBeam}
          stroke={SCENE_COLORS.mechanicsApparatus.airTrackPillar}
          strokeWidth={1.5}
        />

        {/* 导轨支撑脚 */}
        <rect
          x={trackLeft + 60}
          y={trackY + trackHeight}
          width={24}
          height={22}
          fill={SCENE_COLORS.mechanicsApparatus.airTrackPillar}
          rx={2}
        />
        <rect
          x={trackRight - 84}
          y={trackY + trackHeight}
          width={24}
          height={22}
          fill={SCENE_COLORS.mechanicsApparatus.airTrackPillar}
          rx={2}
        />

        {/* 导轨下方文字标注 */}
        <text
          x={canvasSize.width / 2}
          y={trackY + trackHeight + 20}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(13)}
          fontWeight={500}
          textAnchor="middle"
        >
          水平气垫导轨
        </text>

        {/* 左挡板 */}
        <rect
          x={leftBumperX}
          y={bumperY}
          width={bumperWidth}
          height={bumperHeight}
          rx={2}
          fill={SCENE_COLORS.mechanicsApparatus.airTrackBumper}
          stroke={SCENE_COLORS.mechanicsApparatus.airTrackPillar}
          strokeWidth={1.5}
        />
        <text
          x={leftBumperX - 8}
          y={bumperY + 28}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(12)}
          textAnchor="end"
        >
          挡板
        </text>

        {/* 右挡板 */}
        <rect
          x={rightBumperX}
          y={bumperY}
          width={bumperWidth}
          height={bumperHeight}
          rx={2}
          fill={SCENE_COLORS.mechanicsApparatus.airTrackBumper}
          stroke={SCENE_COLORS.mechanicsApparatus.airTrackPillar}
          strokeWidth={1.5}
        />
        <text
          x={rightBumperX + bumperWidth + 8}
          y={bumperY + 28}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(12)}
          textAnchor="start"
        >
          挡板
        </text>

        {/* 滑块 A (m1 = 0.304 kg) */}
        <Block
          x={blockAX}
          y={blockY}
          width={blockAWidth}
          height={blockHeight}
          type="metal"
          label="A"
        />

        {/* 滑块 B (m2 = 0.510 kg) */}
        <Block
          x={blockBX}
          y={blockY}
          width={blockBWidth}
          height={blockHeight}
          type="wood"
          label="B"
        />

        {/* 距离标注 s1 (左挡板内侧至滑块 A 左端) */}
        <g className="dimension-s1">
          <line
            x1={leftBumperX + bumperWidth}
            y1={bumperY - 8}
            x2={blockAX}
            y2={bumperY - 8}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
          />
          {/* 左端短竖线 */}
          <line
            x1={leftBumperX + bumperWidth}
            y1={bumperY - 14}
            x2={leftBumperX + bumperWidth}
            y2={bumperY - 2}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
          />
          {/* 右端短竖线 */}
          <line
            x1={blockAX}
            y1={bumperY - 14}
            x2={blockAX}
            y2={bumperY - 2}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
          />
          {/* 标注文案 s1 */}
          <text
            x={(leftBumperX + bumperWidth + blockAX) / 2}
            y={bumperY - 12}
            fill={CANVAS_COLORS.labelText}
            fontSize={font(13)}
            fontStyle="italic"
            fontWeight={600}
            textAnchor="middle"
          >
            s₁
          </text>
        </g>

        {/* 距离标注 s2 (滑块 B 右端至右挡板内侧) */}
        <g className="dimension-s2">
          <line
            x1={blockBX + blockBWidth}
            y1={bumperY - 8}
            x2={rightBumperX}
            y2={bumperY - 8}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
          />
          {/* 左端短竖线 */}
          <line
            x1={blockBX + blockBWidth}
            y1={bumperY - 14}
            x2={blockBX + blockBWidth}
            y2={bumperY - 2}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
          />
          {/* 右端短竖线 */}
          <line
            x1={rightBumperX}
            y1={bumperY - 14}
            x2={rightBumperX}
            y2={bumperY - 2}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
          />
          {/* 标注文案 s2 */}
          <text
            x={(blockBX + blockBWidth + rightBumperX) / 2}
            y={bumperY - 12}
            fill={CANVAS_COLORS.labelText}
            fontSize={font(13)}
            fontStyle="italic"
            fontWeight={600}
            textAnchor="middle"
          >
            s₂
          </text>
        </g>

        {/* 解析模式：展示碰后反弹速度矢量与时间关联 (仅在步骤展开时渲染) */}
        {showAnalysis && (
          <g className="analysis-velocities animate-fade-in">
            {/* 滑块 A 碰后向左反弹速度 v1 */}
            <PhysicsVectorArrow
              origin={{ x: (blockAX + blockAWidth / 2 - arrowOriginA.px) / 60, y: 0.8 }}
              vector={{ x: -2.5, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.velocity}
              label="v₁ = s₁ / t₁"
            />

            {/* 滑块 B 碰后向右滑行速度 v2 */}
            <PhysicsVectorArrow
              origin={{ x: (blockBX + blockBWidth / 2 - arrowOriginB.px) / 60, y: 0.8 }}
              vector={{ x: 3.5, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.velocity}
              label="v₂ = s₂ / t₂"
            />
          </g>
        )}
      </AnimationSvgCanvas>
    </div>
  )
}
