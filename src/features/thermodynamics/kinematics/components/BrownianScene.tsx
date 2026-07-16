import { Ball, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, THERMAL_COLORS, SCENE_COLORS, THERMO_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { CollisionWorldPoint } from '../hooks/useBrownianPhysics'
import { WORLD_WIDTH, WORLD_HEIGHT } from '../hooks/useBrownianPhysics'

interface BrownianSceneProps {
  particleWorld: { x: number; y: number }
  force: { fx: number; fy: number }
  trajectory: { x: number; y: number }[]
  molecules: { x: number; y: number }[]
  collisions: CollisionWorldPoint[]
  pollenRadius: number
  molRadius: number
  vTarget: number
  temperature: number
  mode: number
  showTrajectory: number
  showMolecules: number
  sceneScale: SceneScale
  font: (size: number) => number
}

export function BrownianScene({
  particleWorld, force, trajectory, molecules, collisions,
  pollenRadius, molRadius, vTarget, temperature,
  mode, showTrajectory, showMolecules, sceneScale, font,
}: BrownianSceneProps) {
  const { px, py } = worldToDesign(particleWorld.x, particleWorld.y, sceneScale)

  // 轨迹折线
  const trajectoryPoints = showTrajectory === 1
    ? trajectory.map((p) => {
        const { px: tx, py: ty } = worldToDesign(p.x, p.y, sceneScale)
        return `${tx},${ty}`
      }).join(' ')
    : ''

  // 分子设计坐标
  const moleculeDesign = mode === 1 && showMolecules === 1
    ? molecules.map((m) => worldToDesign(m.x, m.y, sceneScale))
    : []

  // 碰撞亮点设计坐标
  const collisionDesign = collisions.map((c) => {
    const { px: cpx, py: cpy } = worldToDesign(c.worldX, c.worldY, sceneScale)
    return { id: c.id, px: cpx, py: cpy, age: c.age }
  })

  // 烧杯物理边界设计坐标
  const beakerLeft = worldToDesign(0, 0, sceneScale).px
  const beakerRight = worldToDesign(WORLD_WIDTH, 0, sceneScale).px
  const beakerBottom = worldToDesign(0, 0, sceneScale).py
  const beakerTop = worldToDesign(0, WORLD_HEIGHT, sceneScale).py

  return (
    <g>
      <defs>
        <linearGradient id="beaker-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={THERMAL_COLORS.beakerFill} stopOpacity={0.35} />
          <stop offset="100%" stopColor={THERMAL_COLORS.beakerFill} stopOpacity={0.75} />
        </linearGradient>
      </defs>

      {/* 烧杯液体背景 */}
      <rect
        x={beakerLeft}
        y={beakerTop}
        width={beakerRight - beakerLeft}
        height={beakerBottom - beakerTop}
        fill="url(#beaker-liquid)"
      />

      {/* 烧杯玻璃壁 */}
      <line x1={beakerLeft - 6} y1={beakerBottom} x2={beakerRight + 6} y2={beakerBottom}
        stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={4} strokeLinecap="round" />
      <line x1={beakerLeft} y1={beakerTop - 12} x2={beakerLeft} y2={beakerBottom}
        stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={2.5} />
      <line x1={beakerRight} y1={beakerTop - 12} x2={beakerRight} y2={beakerBottom}
        stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={2.5} />
      <ellipse cx={beakerLeft} cy={beakerTop - 12} rx={3} ry={1}
        fill="none" stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={1} />
      <ellipse cx={beakerRight} cy={beakerTop - 12} rx={3} ry={1}
        fill="none" stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={1} />

      {/* 轨迹 */}
      {showTrajectory === 1 && trajectoryPoints && (
        <polyline points={trajectoryPoints} fill="none"
          stroke={PHYSICS_COLORS.trackHistory} strokeWidth={1.8}
          strokeOpacity={0.4} strokeLinejoin="round" />
      )}

      {/* 液体分子 */}
      {moleculeDesign.map((mol, i) => (
        <Ball key={i} cx={mol.px} cy={mol.py} r={molRadius}
          type="liquidMolecule" strokeWidth={0.5} />
      ))}

      {/* 花粉微粒 */}
      <Ball cx={px} cy={py} r={pollenRadius} type="pollen" strokeWidth={1.5} />

      {/* 碰撞波纹 */}
      {mode === 1 && collisionDesign.map((pt) => (
        <circle key={pt.id} cx={pt.px} cy={pt.py} r={3 + pt.age * 1.8}
          fill="none" stroke={THERMO_COLORS.heatAbsorb} strokeWidth={1.2}
          opacity={1 - pt.age / 10} />
      ))}

      {/* 合力矢量 */}
      {force.fx !== 0 && (
        <PhysicsVectorArrow
          originDesign={{ x: px, y: py }}
          vector={{ x: force.fx, y: force.fy }}
          type="force"
          sceneScale={sceneScale}
          label="F_合"
        />
      )}

      {/* 温度与速率标注 */}
      <g transform={`translate(${beakerLeft + 16}, ${beakerTop + 24})`}>
        <text x={0} y={0} fill={colors.neutral[600]}
          fontSize={font(11)} fontWeight="semibold" fontFamily={CANVAS_STYLE.FONT.family}>
          温度 T = {temperature} K
        </text>
        <text x={0} y={16} fill={colors.neutral[500]}
          fontSize={font(9.5)} fontFamily={CANVAS_STYLE.FONT.family}>
          分子理想速率 ≈ {vTarget.toFixed(0)} m/s
        </text>
      </g>
    </g>
  )
}
