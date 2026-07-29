import { useMemo } from 'react'
import {
  Ball,
  PhysicsGround,
  PhysicsVectorArrow,
  ParticleTrajectory,
} from '@/components/Physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  STROKE,
  DASH,
  withAlpha,
} from '@/theme/physics'
import { worldToDesign, type SceneScale } from '@/scene'
import type { ProjectilePhysicsResult } from '../hooks/useProjectilePhysics'

interface ProjectileSceneProps {
  physics: ProjectilePhysicsResult
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
  showVectors?: boolean
  showGrid?: boolean
  showTangentMidpoint?: boolean
  showProjections?: boolean
  modelMode?: number
  inclineAngle?: number
}

export function ProjectileScene({
  physics,
  canvasSize,
  sceneScale,
  showVectors = true,
  showGrid = true,
  showTangentMidpoint = true,
  showProjections = true,
  modelMode = 0,
  inclineAngle = 30,
}: ProjectileSceneProps) {
  const { font } = canvasSize

  // 1. 物理坐标转换为 SVG 设计坐标 (原点 (0,0) 为抛出点)
  const ballPos = useMemo(() => {
    const pt = worldToDesign(physics.x, physics.y, sceneScale)
    return { cx: pt.px, cy: pt.py }
  }, [physics.x, physics.y, sceneScale])

  const originPos = useMemo(() => {
    const pt = worldToDesign(0, 0, sceneScale)
    return { cx: pt.px, cy: pt.py }
  }, [sceneScale])

  const groundLevelPos = useMemo(() => {
    const pt = worldToDesign(0, -10, sceneScale)
    return { cy: pt.py }
  }, [sceneScale])

  // 水平切线中点设计坐标
  const midpointPos = useMemo(() => {
    const pt = worldToDesign(physics.tangentMidpointX, 0, sceneScale)
    return { cx: pt.px, cy: pt.py }
  }, [physics.tangentMidpointX, sceneScale])

  // 转换轨迹点
  const trajectoryDesign = useMemo(() => {
    const history = physics.historyPoints.map((p) => {
      const pt = worldToDesign(p.x, p.y, sceneScale)
      return { x: pt.px, y: pt.py }
    })
    const predicted = physics.predictedPoints.map((p) => {
      const pt = worldToDesign(p.x, p.y, sceneScale)
      return { x: pt.px, y: pt.py }
    })
    const tail = physics.tailPoints.map((p) => {
      const pt = worldToDesign(p.x, p.y, sceneScale)
      return { x: pt.px, y: pt.py }
    })
    return { history, predicted, tail }
  }, [physics.historyPoints, physics.predictedPoints, physics.tailPoints, sceneScale])

  // 平抛斜面模型绘制参数 (实心斜面山体垫在斜面下方：pTop -> pBot -> pCorner(左下直角))
  const inclineParams = useMemo(() => {
    if (modelMode !== 2) return null
    const phiRad = (inclineAngle * Math.PI) / 180
    // 斜面物理覆盖范围
    const W = Math.max(physics.inclineLandingX * 1.25, 14)
    const H = W * Math.tan(phiRad)

    const pTop = worldToDesign(0, 0, sceneScale)
    const pBot = worldToDesign(W, -H, sceneScale)
    // 抛出点正下方/底边直角顶点 (左下角)
    const pCorner = { px: pTop.px, py: pBot.py }

    // 斜面上的实际物理落点
    const pHit = worldToDesign(physics.inclineLandingX, physics.inclineLandingY, sceneScale)

    return {
      top: pTop,
      bot: pBot,
      corner: pCorner,
      hit: pHit,
      W,
      H,
      polygonPoints: `${pTop.px},${pTop.py} ${pBot.px},${pBot.py} ${pCorner.px},${pCorner.py}`,
    }
  }, [modelMode, inclineAngle, physics.inclineLandingX, physics.inclineLandingY, sceneScale])

  return (
    <g>
      {/* 1. 网格参考线 */}
      {showGrid && (
        <g stroke={CANVAS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.axis.join(' ')}>
          <line x1={0} y1={originPos.cy} x2={1000} y2={originPos.cy} />
          <line x1={originPos.cx} y1={0} x2={originPos.cx} y2={800} />
          <line x1={0} y1={groundLevelPos.cy} x2={1000} y2={groundLevelPos.cy} opacity={0.5} />
        </g>
      )}

      {/* 2. 平抛斜面体 / 基础地面 */}
      {modelMode === 2 && inclineParams ? (
        <g>
          {/* 斜面实心山体结构 (垫在斜面下方) */}
          <polygon
            points={inclineParams.polygonPoints}
            fill={SCENE_COLORS.materials.structFillPale}
            stroke={SCENE_COLORS.materials.structStrokeMid}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* 斜面上表面线 */}
          <line
            x1={inclineParams.top.px}
            y1={inclineParams.top.py}
            x2={inclineParams.bot.px}
            y2={inclineParams.bot.py}
            stroke={SCENE_COLORS.materials.structStrokeDark}
            strokeWidth={3}
          />
          {/* 斜面倾角标注 */}
          <g transform={`translate(${inclineParams.bot.px - 60}, ${inclineParams.bot.py - 12})`}>
            <text fontSize={font(11)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              {`φ = ${inclineAngle}°`}
            </text>
          </g>
          {/* 落点标记 P */}
          <circle
            cx={inclineParams.hit.px}
            cy={inclineParams.hit.py}
            r={5}
            fill={PHYSICS_COLORS.displacement}
          />
          <text
            x={inclineParams.hit.px - 35}
            y={inclineParams.hit.py - 10}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.displacement}
            fontWeight="bold"
          >
            斜面落点 P
          </text>
        </g>
      ) : (
        <PhysicsGround
          x={0}
          y={groundLevelPos.cy}
          width={1000}
          type="ground"
        />
      )}

      {/* 3. 轨迹线 */}
      <ParticleTrajectory
        historyPoints={trajectoryDesign.history}
        predictedPoints={trajectoryDesign.predicted}
        tailPoints={trajectoryDesign.tail}
        isFocus
        chargeSign="none"
      />

      {/* 4. 分运动投影球与辅助线 */}
      {showProjections && !physics.isLanded && (
        <g>
          {/* 水平投影球 (在 x 轴上) */}
          <Ball cx={ballPos.cx} cy={originPos.cy} r={6} type="steelGhost" stroke={PHYSICS_COLORS.velocityX} />
          {/* 竖直投影球 (在 y 轴上) */}
          <Ball cx={originPos.cx} cy={ballPos.cy} r={6} type="steelGhost" stroke={PHYSICS_COLORS.velocityY} />
          {/* 投影虚线 */}
          <line
            x1={ballPos.cx}
            y1={ballPos.cy}
            x2={ballPos.cx}
            y2={originPos.cy}
            stroke={withAlpha(PHYSICS_COLORS.velocityX, 0.4)}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <line
            x1={ballPos.cx}
            y1={ballPos.cy}
            x2={originPos.cx}
            y2={ballPos.cy}
            stroke={withAlpha(PHYSICS_COLORS.velocityY, 0.4)}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        </g>
      )}

      {/* 5. 速度反向延长线交水平中点 (高考经典二级结论：tanθ = 2tanα) */}
      {showTangentMidpoint && modelMode === 1 && physics.x > 0.5 && !physics.isLanded && (
        <g>
          {/* 位移矢量线 (原点 -> 小球) */}
          <line
            x1={originPos.cx}
            y1={originPos.cy}
            x2={ballPos.cx}
            y2={ballPos.cy}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          {/* 速度反向延长线 (小球 -> 中点) */}
          <line
            x1={ballPos.cx}
            y1={ballPos.cy}
            x2={midpointPos.cx}
            y2={originPos.cy}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1.5}
            strokeDasharray="2,2"
          />
          {/* 中点标记圈 */}
          <circle cx={midpointPos.cx} cy={originPos.cy} r={4} fill={PHYSICS_COLORS.displacement} />
          <text
            x={midpointPos.cx}
            y={originPos.cy - 10}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.displacement}
            fontWeight="bold"
            textAnchor="middle"
          >
            中点 x/2
          </text>
        </g>
      )}

      {/* 6. 物理矢量箭头 */}
      {showVectors && !physics.isLanded && (
        <g>
          {/* 水平分速度 v_x */}
          <PhysicsVectorArrow
            originDesign={{ x: ballPos.cx, y: ballPos.cy }}
            vector={{ x: physics.vx, y: 0 }}
            type="velocityX"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorSub}
          />
          {/* 竖直分速度 v_y */}
          <PhysicsVectorArrow
            originDesign={{ x: ballPos.cx, y: ballPos.cy }}
            vector={{ x: 0, y: physics.vy }}
            type="velocityY"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorSub}
          />
          {/* 合速度 v */}
          <PhysicsVectorArrow
            originDesign={{ x: ballPos.cx, y: ballPos.cy }}
            vector={{ x: physics.vx, y: physics.vy }}
            type="velocity"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
          />
        </g>
      )}

      {/* 7. 主抛体小球 (落在斜面上表面) */}
      <Ball cx={ballPos.cx} cy={ballPos.cy} r={9} type="steel" />

      {/* 8. 结合矢量和运动状态数值标注 */}
      <g>
        <text
          x={ballPos.cx + 12}
          y={ballPos.cy - 12}
          fontSize={font(11)}
          fill={PHYSICS_COLORS.velocity}
          fontWeight="bold"
        >
          {`v = ${physics.v.toFixed(1)} m/s`}
        </text>
        {modelMode === 1 && (
          <text
            x={ballPos.cx + 12}
            y={ballPos.cy + 16}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.labelText}
          >
            {`θ = ${physics.thetaDeg.toFixed(1)}° | α = ${physics.alphaDeg.toFixed(1)}°`}
          </text>
        )}
      </g>
    </g>
  )
}
