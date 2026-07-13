import { VectorArrow, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'

import { Spring } from '@/components/UI'
import { MT_LAYOUT } from './constants'
import type { AnimationViewportResult } from '@/hooks'
import type { SceneScale } from '@/scene/SceneScale'
import type { Particle } from '../hooks/useParticleSimulation'

interface MomentumAdvancedSceneProps {
  layout: {
    rho: number
    S: number
    v_fluid: number
    impactForce: number
    plateX: number
    nozzleX: number
    springCompression: number
    barWidth: number
    dm: number
    nozzleHeight: number
    fluidHeight: number
  }
  sceneScale: SceneScale
  canvasSize: AnimationViewportResult['canvasSize']
  showVectors: boolean
  particles: Particle[]
  groundY: number
}

export function MomentumAdvancedScene({ layout, sceneScale, canvasSize, showVectors, particles, groundY }: MomentumAdvancedSceneProps) {
  const {
    rho, S, v_fluid, impactForce,
    plateX, nozzleX, springCompression, barWidth, dm,
    nozzleHeight, fluidHeight
  } = layout

  const nozzleY = groundY - 60
  const particleR = Math.max(2, Math.min(4, 3 * Math.sqrt(S / 0.01)))

  return (
    <g>
      {/* 1. 物理组件组 (全部基于 nozzleY 局部坐标系) */}
      <g transform={`translate(0, ${nozzleY})`}>
        {/* 玻璃管道背景与管壁高光线 */}
        <rect
          x={nozzleX + 15}
          y={-nozzleHeight / 2}
          width={Math.max(0, plateX + springCompression - nozzleX - 15)}
          height={nozzleHeight}
          fill={withAlpha(colors.primary[100], 0.12)}
          stroke={SCENE_COLORS.effects.glowWhiteLight}
          strokeWidth={1}
          rx={1.5}
        />
        <line
          x1={nozzleX + 15}
          y1={-nozzleHeight / 2}
          x2={plateX + springCompression}
          y2={-nozzleHeight / 2}
          stroke={SCENE_COLORS.effects.glowWhite}
          strokeWidth={1.5}
        />
        <line
          x1={nozzleX + 15}
          y1={nozzleHeight / 2}
          x2={plateX + springCompression}
          y2={nozzleHeight / 2}
          stroke={withAlpha(colors.neutral.white, 0.45)}
          strokeWidth={1.5}
        />

        {/* 蓝色流体柱 (比玻璃管稍细) */}
        <rect
          x={nozzleX + 15}
          y={-fluidHeight / 2}
          width={Math.max(0, plateX + springCompression - nozzleX - 15)}
          height={fluidHeight}
          fill="url(#fluid-grad)"
          rx={1}
        />

        {/* 粒子在其内部及碰撞后飞行 */}
        {particles.map((p, i) => (
          <circle
            key={`particle-${i}`}
            cx={p.x}
            cy={p.offsetY}
            r={particleR}
            fill={p.hit ? PHYSICS_COLORS.impulse : PHYSICS_COLORS.velocity}
            opacity={p.hit ? 0.5 : 0.8}
          />
        ))}

        {/* 管口 (精致喷嘴设计) */}
        {/* 法兰固定环 */}
        <rect
          x={nozzleX - 18}
          y={-nozzleHeight / 2 - 3}
          width={6}
          height={nozzleHeight + 6}
          rx={1.5}
          fill={SCENE_COLORS.materials.steelSphereGrad[2]}
          stroke={SCENE_COLORS.materials.steelSphereGrad[3]}
          strokeWidth={1}
        />
        {/* 喷嘴主体 */}
        <rect
          x={nozzleX - 12}
          y={-nozzleHeight / 2}
          width={27}
          height={nozzleHeight}
          rx={3}
          fill="url(#metal-grad-mt)"
          stroke={SCENE_COLORS.materials.steelSphereGrad[3]}
          strokeWidth={1.5}
        />
        <text
          x={nozzleX}
          y={-24}
          fontSize={canvasSize.font(11)}
          fill={PHYSICS_COLORS.labelTextLight}
          textAnchor="middle"
          fontWeight="bold"
        >
          管口
        </text>

        {/* 挡板 (金属材质，随受力右移) */}
        <rect
          x={plateX + springCompression}
          y={-40}
          width={MT_LAYOUT.plateWidth}
          height={MT_LAYOUT.plateHeight}
          rx={3}
          fill="url(#metal-grad-mt)"
          stroke={SCENE_COLORS.materials.steelSphereGrad[3]}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 弹簧 (随着挡板向右移动而被压缩) */}
        <Spring
          x1={plateX + springCompression + MT_LAYOUT.plateWidth}
          y1={0}
          x2={plateX + MT_LAYOUT.plateWidth + 65}
          y2={0}
          coils={8}
          radius={8}
        />

        {/* 物理标注组 */}
        {/* 冲击力数值标注 */}
        <text
          x={plateX + springCompression + MT_LAYOUT.plateWidth / 2}
          y={-55}
          fontSize={canvasSize.font(12)}
          fill={PHYSICS_COLORS.appliedForce}
          fontWeight="bold"
          textAnchor="middle"
        >
          F = {impactForce.toFixed(1)} N
        </text>

        {/* 流速标注 */}
        <text
          x={nozzleX}
          y={-55}
          fontSize={canvasSize.font(12)}
          fill={PHYSICS_COLORS.velocity}
          fontWeight="bold"
          textAnchor="middle"
        >
          v = {v_fluid.toFixed(1)} m/s
        </text>

        {/* Δm 标注框与文字 (随挡板移动自适应居中) */}
        <rect
          x={(nozzleX + 15 + plateX + springCompression) / 2 - fluidHeight / 2}
          y={-fluidHeight / 2}
          width={fluidHeight}
          height={fluidHeight}
          fill="none"
          stroke={PHYSICS_COLORS.momentum}
          strokeWidth={1.5}
          strokeDasharray="3,2"
        />
        <text
          x={(nozzleX + 15 + plateX + springCompression) / 2}
          y={30}
          fontSize={canvasSize.font(12)}
          fill={PHYSICS_COLORS.momentum}
          fontWeight="bold"
          textAnchor="middle"
        >
          Δm
        </text>

        {/* 实时微元质量条形图 (Δm/Δt，在管道上方悬浮) */}
        <g transform={`translate(${(nozzleX + 15 + plateX + springCompression) / 2 - 80}, -95)`}>
          {/* 背景槽 */}
          <rect
            x={0}
            y={0}
            width={160}
            height={12}
            rx={3}
            fill={PHYSICS_COLORS.grid}
            opacity={0.6}
          />
          {/* 实时填充条 */}
          <rect
            x={0}
            y={0}
            width={barWidth}
            height={12}
            rx={3}
            fill={PHYSICS_COLORS.impulse}
            opacity={0.85}
          />
          {/* 刷新外框 */}
          <rect
            x={0}
            y={0}
            width={160}
            height={12}
            rx={3}
            fill="none"
            stroke={PHYSICS_COLORS.impulse}
            strokeWidth={1}
            opacity={0.4}
          />
          {/* 高考核心公式定格标注 */}
          <text
            x={80}
            y={-8}
            fontSize={canvasSize.font(10)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="middle"
            fontWeight="bold"
          >
            微元质量 Δm/Δt = ρSv = {(rho * S * v_fluid).toFixed(3)} kg/s
          </text>
          <text
            x={barWidth + 4}
            y={9}
            fontSize={canvasSize.font(9)}
            fill={PHYSICS_COLORS.impulse}
            fontWeight="bold"
            textAnchor="start"
          >
            Δm = {dm.toFixed(3)} kg
          </text>
        </g>
      </g>

      {/* 2. 外部物理支架与矢量 (使用全局坐标系) */}
      <PhysicsGround
        x={plateX + MT_LAYOUT.plateWidth + 65}
        y={nozzleY - 50}
        width={12}
        type="wall"
        wall={{ height: 100, hatchCount: 6, hatchSide: 'right' }}
        appearance={{ color: PHYSICS_COLORS.labelText, fillColor: PHYSICS_COLORS.labelTextLight, showHatch: true }}
      />

      {/* 冲击力矢量箭头 */}
      {showVectors && (
        <VectorArrow
          originPixel={{ x: plateX + springCompression, y: nozzleY }}
          vector={{ x: impactForce, y: 0 }}
          type="appliedForce"
          sceneScale={sceneScale}
        />
      )}
    </g>
  )
}
