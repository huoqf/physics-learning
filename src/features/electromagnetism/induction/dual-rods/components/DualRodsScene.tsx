import React, { useMemo } from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { Rails, ConductingRod, VectorArrow, MagneticFieldSymbols } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import type { DualRodsPhysicsResult } from '../hooks/useDualRodsPhysics'
import type { SceneScale } from '@/scene'

interface DualRodsSceneProps {
  physics: DualRodsPhysicsResult
  scenario: number
  appliedForce: number
}

export const DualRodsScene = React.memo(function DualRodsScene({
  physics,
  scenario,
  appliedForce,
}: DualRodsSceneProps) {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { width, height, font } = canvasSize
  const cy = height / 2
  const railSpacing = 140

  const {
    currentVA,
    currentVB,
    currentEmf,
    currentI,
    forceAmpere,
    posA,
    posB,
    scale,
  } = physics

  // 构造 sceneScale 传递给 VectorArrow 绘制标准物理尺度箭头
  const sceneScale: SceneScale = useMemo(() => ({
    scale,
    scaleX: scale,
    scaleY: scale,
    originX: width / 2,
    originY: height / 2,
    maxVectorLength: 85,
    refMagnitudes: {
      velocity: 6.0,
      lorentzForce: 5.0,
      appliedForce: 5.0,
    },
  }), [scale, width, height])

  // 磁场符号网格 (均布向里 ⊗)
  const fieldSymbols = useMemo(() => {
    const points: Array<{ x: number; y: number }> = []
    const stepX = 50
    const stepY = 35
    const xStart = 30
    const xEnd = width - 30
    const yStart = cy - railSpacing / 2 + 15
    const yEnd = cy + railSpacing / 2 - 15

    for (let sx = xStart; sx <= xEnd; sx += stepX) {
      for (let sy = yStart; sy <= yEnd; sy += stepY) {
        points.push({ x: sx, y: sy })
      }
    }

    return (
      <MagneticFieldSymbols
        points={points}
        direction="in"
        radius={font(6.5)}
        strokeWidth={1.5}
        opacity={0.55}
      />
    )
  }, [width, cy, railSpacing, font])

  return (
    <div className="w-full h-full bg-white rounded-xl border border-neutral-200 overflow-hidden relative shadow-sm">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 1. 导轨背景 */}
        <Rails
          type="horizontal"
          width={width}
          height={height}
          cx={width / 2}
          cy={cy}
          length={width - 20}
          spacing={railSpacing}
        />

        {/* 2. 磁场符号 ⊗ */}
        {fieldSymbols}

        {/* 3. 回路感应电流流动特效（闭合虚线框） */}
        {Math.abs(currentI) > 1e-3 && (
          <path
            d={`M ${posB} ${cy - railSpacing / 2} L ${posA} ${cy - railSpacing / 2} L ${posA} ${cy + railSpacing / 2} L ${posB} ${cy + railSpacing / 2} Z`}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={2.5}
            strokeDasharray="6, 8"
            opacity={0.65}
          />
        )}

        {/* 4. 渲染 b 棒（后方棒，位于左侧 posB） */}
        <ConductingRod
          type="horizontal"
          x={posB}
          height={height}
          spacing={railSpacing}
          currentDir={currentI > 0 ? 'out' : currentI < 0 ? 'in' : 'none'}
        />

        {/* 5. 渲染 a 棒（前方棒，位于右侧 posA） */}
        <ConductingRod
          type="horizontal"
          x={posA}
          height={height}
          spacing={railSpacing}
          currentDir={currentI > 0 ? 'in' : currentI < 0 ? 'out' : 'none'}
        />

        {/* 6. 棒名称及发热标示 */}
        <text x={posB} y={cy + railSpacing / 2 + 28} fontSize={font(13)} fontWeight="bold" fill={CANVAS_COLORS.textMuted} textAnchor="middle">
          导体棒 b (m_b)
        </text>
        <text x={posA} y={cy + railSpacing / 2 + 28} fontSize={font(13)} fontWeight="bold" fill={CANVAS_COLORS.textMuted} textAnchor="middle">
          导体棒 a (m_a)
        </text>

        {/* 7. 矢量受力与速度箭头分析层 */}
        {/* b 棒速度箭头 */}
        {Math.abs(currentVB) > 0.05 && (
          <g>
            <VectorArrow
              originPixel={{ x: posB, y: cy - railSpacing / 2 - 25 }}
              vector={{ x: currentVB * 0.85, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
            />
            <text x={posB} y={cy - railSpacing / 2 - 38} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.velocity} textAnchor="middle">
              v_b = {currentVB.toFixed(2)} m/s
            </text>
          </g>
        )}

        {/* b 棒受到的向右安培力 F_Ab */}
        {Math.abs(forceAmpere) > 0.01 && (
          <g>
            <VectorArrow
              originPixel={{ x: posB, y: cy }}
              vector={{ x: forceAmpere * 1.2, y: 0 }}
              type="lorentzForce"
              sceneScale={sceneScale}
            />
            <text x={posB - 35} y={cy - 12} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.lorentzForce}>
              F_Ab = {forceAmpere.toFixed(2)} N
            </text>
          </g>
        )}

        {/* a 棒速度箭头 */}
        {Math.abs(currentVA) > 0.05 && (
          <g>
            <VectorArrow
              originPixel={{ x: posA, y: cy - railSpacing / 2 - 25 }}
              vector={{ x: currentVA * 0.85, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
            />
            <text x={posA} y={cy - railSpacing / 2 - 38} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.velocity} textAnchor="middle">
              v_a = {currentVA.toFixed(2)} m/s
            </text>
          </g>
        )}

        {/* a 棒受到的向左安培力 F_Aa (大小与 F_Ab 绝对相等、反向) */}
        {Math.abs(forceAmpere) > 0.01 && (
          <g>
            <VectorArrow
              originPixel={{ x: posA, y: cy }}
              vector={{ x: -forceAmpere * 1.2, y: 0 }}
              type="lorentzForce"
              sceneScale={sceneScale}
            />
            <text x={posA + 15} y={cy - 12} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.lorentzForce}>
              F_Aa = -{forceAmpere.toFixed(2)} N
            </text>
          </g>
        )}

        {/* 恒力驱动模式下施加在 a 棒上的恒定外拉力 F_外 */}
        {scenario === 1 && appliedForce > 0 && (
          <g>
            <VectorArrow
              originPixel={{ x: posA, y: cy + 30 }}
              vector={{ x: appliedForce * 1.2, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
            />
            <text x={posA + 25} y={cy + 48} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.appliedForce}>
              F_外 = {appliedForce.toFixed(2)} N
            </text>
          </g>
        )}

        {/* 顶部中央状态提示栏 */}
        <g>
          <rect x={width / 2 - 130} y={12} width={260} height={26} rx={13} fill={CANVAS_COLORS.gridSubtle} stroke={CANVAS_COLORS.grid} />
          <text x={width / 2} y={29} fontSize={font(12)} fontWeight="bold" fill={CANVAS_COLORS.labelText} textAnchor="middle">
            速度剪刀差 Δv = {Math.abs(currentVA - currentVB).toFixed(2)} m/s | E = {Math.abs(currentEmf).toFixed(2)} V
          </text>
        </g>
      </AnimationSvgCanvas>
    </div>
  )
})
