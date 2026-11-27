import React from 'react'
import {
  CANVAS_COLORS,
  DASH,
  OPACITY,
  PHYSICS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import { VectorArrow } from '@/components/Physics'
import { worldToDesign, type SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import { formatRelativityBeta } from '@/physics/relativity'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'
import { FULL_LAYOUT } from '../relativityLayout'

interface TimeDilationSceneProps {
  physics: RelativityPhysicsState
  vp: Pick<ViewportInfo, 'designLeft' | 'designVisibleW'>
  sceneScale: SceneScale
  font: (size: number) => number
  reducedMotion?: boolean
}

const STAGE_LABEL_MAP: Record<RelativityPhysicsState['clockState']['stage'], string> = {
  emit: '发射瞬间 (t=0)',
  rising: '光子去程 (底镜→顶镜)',
  top: '到达顶镜 (τ=1.00s)',
  falling: '光子回程 (顶镜→底镜)',
  returned: '周期完成 (τ=2.00s)',
}

function ClockDial({
  cx,
  cy,
  r,
  angle,
  readout,
  title,
  accentColor,
  font,
}: {
  cx: number
  cy: number
  r: number
  angle: number
  readout: string
  title: string
  accentColor: string
  font: (size: number) => number
}) {
  const rad = (angle * Math.PI) / 180
  const px = (r - 6) * Math.sin(rad)
  const py = -(r - 6) * Math.cos(rad)
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle
        r={r}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.objectThin}
      />
      {[0, 90, 180, 270].map((deg) => {
        const tickRad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={(r - 5) * Math.sin(tickRad)}
            y1={-(r - 5) * Math.cos(tickRad)}
            x2={r * Math.sin(tickRad)}
            y2={-r * Math.cos(tickRad)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={STROKE.tick}
          />
        )
      })}
      <line
        x1={0}
        y1={0}
        x2={px}
        y2={py}
        stroke={accentColor}
        strokeWidth={STROKE.vectorSub}
        strokeLinecap="round"
      />
      <circle r={3} fill={accentColor} />
      <text
        y={r + 20}
        textAnchor="middle"
        fill={accentColor}
        fontSize={font(13)}
        fontWeight="bold"
      >
        {readout}
      </text>
      <text
        y={r + 40}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(11)}
      >
        {title}
      </text>
    </g>
  )
}

export const TimeDilationScene: React.FC<TimeDilationSceneProps> = ({
  physics,
  vp,
  sceneScale,
  font,
  reducedMotion = false,
}) => {
  const {
    beta,
    gamma,
    lengthRatio,
    clockState,
    groundClockAngle,
    shipClockAngle,
    showGeometry,
    observerFrame,
  } = physics

  const {
    dividerY,
    restCenterX,
    restBottomMirrorY,
    dialCenterX,
    dialTopY,
    dialBottomY,
    dialRadius,
    hullPadY,
  } = FULL_LAYOUT.clock

  const isShipViewingGround = observerFrame === 1
  const scale = sceneScale.scale

  const shipFill = withAlpha(SCENE_COLORS.materials.structFillPale, 0.72)
  const shipFillRest = withAlpha(SCENE_COLORS.materials.structFillPale, 0.55)
  const shipStroke = SCENE_COLORS.materials.structStrokeMid
  const laserGlow = SCENE_COLORS.materials.coherentLaser.greenLaser.glow
  const laserBeam = SCENE_COLORS.materials.coherentLaser.greenLaser.beam
  const dividerLeft = vp.designLeft
  const dividerRight = vp.designLeft + vp.designVisibleW

  // ── 上半区：观察者自身静止的固有光钟（同地发射与接收，固有周期最短 τ）──
  const restTopMirrorY = restBottomMirrorY - scale
  const restShipW = 1.6 * scale
  const restPulseY = restBottomMirrorY - clockState.pulseHeightRatio * scale
  const restNoseW = 20 * (scale / 82)
  const restPhotonDirY = clockState.phase <= 0.5 ? 1 : -1

  // ── 下半区：相对运动光钟（地面看飞船向右 v，或飞船看地面向左 -v）──
  const emitXWorld = isShipViewingGround ? clockState.totalHorizWorld : 0
  const topXWorld = clockState.halfHorizWorld
  const endXWorld = isShipViewingGround ? 0 : clockState.totalHorizWorld
  const movingXWorld = isShipViewingGround
    ? clockState.totalHorizWorld - clockState.shipXWorld
    : clockState.shipXWorld

  const pEmit = worldToDesign(emitXWorld, 0, sceneScale)
  const pTop = worldToDesign(topXWorld, clockState.clockHeightWorld, sceneScale)
  const pTopFloor = worldToDesign(topXWorld, 0, sceneScale)
  const pEnd = worldToDesign(endXWorld, 0, sceneScale)
  const pMovingBottom = worldToDesign(movingXWorld, 0, sceneScale)
  const pMovingTop = worldToDesign(movingXWorld, clockState.clockHeightWorld, sceneScale)
  const pPulse = worldToDesign(movingXWorld, clockState.pulseYWorld, sceneScale)

  const movingBoxW = restShipW * lengthRatio
  const movingNoseW = Math.max(6, 20 * lengthRatio * (scale / 82))
  const mirrorW = Math.max(22, 44 * Math.max(lengthRatio, 0.5))

  const isRising = clockState.phase <= 0.5
  const activeTrailPoints = isRising
    ? `${pEmit.px},${pEmit.py} ${pPulse.px},${pPulse.py}`
    : `${pEmit.px},${pEmit.py} ${pTop.px},${pTop.py} ${pPulse.px},${pPulse.py}`

  // 运动系光子合速度矢量（合速率恒为 c：水平分量 ±βc，竖直分量 ±c/γ）
  const movingVx = isShipViewingGround ? -beta : beta
  const movingVy = (isRising ? 1 : -1) * (1 / gamma)

  // 去程等光程圆弧（r = c·t = groundTime * scale）：直观展示斜路比竖路更长
  const showEqualPathArc = beta >= 0.05 && clockState.phase > 0.03 && isRising
  const arcRadius = clockState.groundTime * scale
  const arcStartY = pEmit.py - arcRadius
  const arcSweepFlag = isShipViewingGround ? 0 : 1

  return (
    <g className="mode-time-dilation">
      {/* 上下参考系分隔线 */}
      <line
        x1={dividerLeft}
        y1={dividerY}
        x2={dividerRight}
        y2={dividerY}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
        strokeDasharray={DASH.guide.join(' ')}
      />

      {/* ── 上半区：固有静止参考系（同地最短 τ） ── */}
      <g className="frame-s-prime">
        <rect
          x={36}
          y={22}
          width={248}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.displacement, 0.14)}
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={STROKE.tick}
        />
        <text
          x={160}
          y={39}
          textAnchor="middle"
          fill={PHYSICS_COLORS.displacement}
          fontSize={font(12)}
          fontWeight="bold"
        >
          {isShipViewingGround
            ? 'S 静止系（地面自身 · 同地最短 τ）'
            : "S' 静止系（飞船自身 · 同地最短 τ）"}
        </text>

        <text x={302} y={39} fill={CANVAS_COLORS.textMuted} fontSize={font(11)}>
          光速不变：两系中光子速率恒为 c
        </text>

        {/* 静止容器（飞船舱体 / 地面实验室框） */}
        <rect
          x={restCenterX - restShipW / 2}
          y={restTopMirrorY - hullPadY}
          width={restShipW}
          height={scale + hullPadY * 2}
          rx={8}
          fill={shipFillRest}
          stroke={shipStroke}
          strokeWidth={STROKE.objectLine}
        />
        {!isShipViewingGround && (
          <polygon
            points={`${restCenterX + restShipW / 2},${restTopMirrorY - hullPadY} ${restCenterX + restShipW / 2 + restNoseW},${(restTopMirrorY + restBottomMirrorY) / 2} ${restCenterX + restShipW / 2},${restBottomMirrorY + hullPadY}`}
            fill={shipFill}
            stroke={shipStroke}
            strokeWidth={STROKE.objectLine}
          />
        )}

        {/* 上下反光镜 */}
        <rect
          x={restCenterX - 24}
          y={restTopMirrorY - 4}
          width={48}
          height={5}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.tickBold}
        />
        <rect
          x={restCenterX - 24}
          y={restBottomMirrorY - 1}
          width={48}
          height={5}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.tickBold}
        />

        {/* 竖直光路 */}
        <line
          x1={restCenterX}
          y1={restTopMirrorY}
          x2={restCenterX}
          y2={restBottomMirrorY}
          stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.45)}
          strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.projection.join(' ')}
        />
        {!reducedMotion && (
          <circle
            cx={restCenterX}
            cy={restPulseY}
            r={9}
            fill={laserBeam}
            stroke={laserGlow}
            strokeWidth={STROKE.tick}
            opacity={OPACITY.glow}
          />
        )}
        <circle cx={restCenterX} cy={restPulseY} r={5} fill={PHYSICS_COLORS.wavelengthGreen} />

        {/* 等长光速矢量 c（证明两系光速大小一致） */}
        <VectorArrow
          originDesign={{ x: restCenterX, y: restPulseY }}
          vector={{ x: 0, y: restPhotonDirY }}
          type="velocity"
          arrowType="physical-schematic"
          color={PHYSICS_COLORS.wavelengthGreen}
          pixelLength={34}
          label="c"
          labelPlacement="side"
          sceneScale={sceneScale}
          font={font}
        />

        <ClockDial
          cx={dialCenterX}
          cy={dialTopY}
          r={dialRadius}
          angle={shipClockAngle}
          readout={`τ = ${clockState.properTime.toFixed(2)} s`}
          title={isShipViewingGround ? '地面固有钟 τ' : '飞船固有钟 τ'}
          accentColor={PHYSICS_COLORS.displacement}
          font={font}
        />
      </g>

      {/* ── 下半区：相对运动观测参考系（异地延缓 t = γτ） ── */}
      <g className="frame-s">
        {/* rect[0]：参考系徽章 */}
        <rect
          x={36}
          y={322}
          width={216}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.14)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.tick}
        />
        <text
          x={144}
          y={339}
          textAnchor="middle"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(12)}
          fontWeight="bold"
        >
          {isShipViewingGround
            ? "S' 观测地面钟（地面向左 -v）"
            : 'S 参考系（地面观飞船向右）'}
        </text>

        <text x={264} y={339} fill={CANVAS_COLORS.labelText} fontSize={font(12)}>
          v = {formatRelativityBeta(beta)} c · γ = {gamma.toFixed(3)}
        </text>

        {/* rect[1]：阶段标签 */}
        <rect
          x={438}
          y={322}
          width={154}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.12)}
          stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.5)}
          strokeWidth={STROKE.tick}
        />
        <text
          x={515}
          y={339}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
        >
          {STAGE_LABEL_MAP[clockState.stage]}
        </text>

        {/* 轨道基线 */}
        <line
          x1={60}
          y1={pEmit.py + hullPadY + 6}
          x2={570}
          y2={pEmit.py + hullPadY + 6}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />

        {/* rect[2]：运动光钟本体（保持为 .frame-s 第 3 个 rect 供测试校验边界） */}
        <rect
          x={pMovingTop.px - movingBoxW / 2}
          y={pMovingTop.py - hullPadY}
          width={movingBoxW}
          height={scale + hullPadY * 2}
          rx={8}
          fill={shipFill}
          stroke={shipStroke}
          strokeWidth={STROKE.objectLine}
        />
        {!isShipViewingGround && (
          <polygon
            points={`${pMovingTop.px + movingBoxW / 2},${pMovingTop.py - hullPadY} ${pMovingTop.px + movingBoxW / 2 + movingNoseW},${(pMovingTop.py + pMovingBottom.py) / 2} ${pMovingTop.px + movingBoxW / 2},${pMovingBottom.py + hullPadY}`}
            fill={withAlpha(SCENE_COLORS.materials.structStrokePale, 0.85)}
            stroke={shipStroke}
            strokeWidth={STROKE.objectLine}
          />
        )}

        {/* 运动光钟上下反光镜 */}
        <rect
          x={pMovingTop.px - mirrorW / 2}
          y={pMovingTop.py - 4}
          width={mirrorW}
          height={5}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.tickBold}
        />
        <rect
          x={pMovingBottom.px - mirrorW / 2}
          y={pMovingBottom.py - 1}
          width={mirrorW}
          height={5}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.tickBold}
        />

        {/* 等光程参考竖线与圆弧（半径 c·t）：斜光程 = 竖光程，但需走更远故耗时更长 */}
        {showEqualPathArc && (
          <g className="equal-path-arc">
            <line
              x1={pEmit.px}
              y1={pEmit.py}
              x2={pEmit.px}
              y2={arcStartY}
              stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.4)}
              strokeWidth={STROKE.reference}
              strokeDasharray={DASH.projection.join(' ')}
            />
            <path
              d={`M ${pEmit.px} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 ${arcSweepFlag} ${pPulse.px} ${pPulse.py}`}
              fill="none"
              stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.55)}
              strokeWidth={STROKE.reference}
              strokeDasharray={DASH.guide.join(' ')}
            />
            <circle
              cx={pEmit.px}
              cy={arcStartY}
              r={2.5}
              fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.7)}
            />
          </g>
        )}

        {/* 完整斜光路底图（虚线） + 实时已走光路（实线） */}
        <polyline
          points={`${pEmit.px},${pEmit.py} ${pTop.px},${pTop.py} ${pEnd.px},${pEnd.py}`}
          fill="none"
          stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.35)}
          strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.trajectory.join(' ')}
        />
        <polyline
          points={activeTrailPoints}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.vectorSub}
        />

        {/* 三关键事件节点 */}
        <circle cx={pEmit.px} cy={pEmit.py} r={3.5} fill={PHYSICS_COLORS.displacement} />
        <circle cx={pTop.px} cy={pTop.py} r={3.5} fill={PHYSICS_COLORS.acceleration} />
        <circle cx={pEnd.px} cy={pEnd.py} r={3.5} fill={PHYSICS_COLORS.velocity} />

        {/* 光子脉冲与等长合光速矢量 c */}
        {!reducedMotion && (
          <circle
            cx={pPulse.px}
            cy={pPulse.py}
            r={9}
            fill={laserBeam}
            stroke={laserGlow}
            strokeWidth={STROKE.tick}
            opacity={OPACITY.glow}
          />
        )}
        <circle cx={pPulse.px} cy={pPulse.py} r={5} fill={PHYSICS_COLORS.wavelengthGreen} />
        <VectorArrow
          originDesign={{ x: pPulse.px, y: pPulse.py }}
          vector={{ x: movingVx, y: movingVy }}
          type="velocity"
          arrowType="physical-schematic"
          color={PHYSICS_COLORS.wavelengthGreen}
          pixelLength={34}
          label="c"
          labelPlacement={isShipViewingGround ? 'side-opposite' : 'side'}
          sceneScale={sceneScale}
          font={font}
        />

        {/* 勾股几何辅助图解 */}
        {showGeometry && (
          <g className="geometry-diagram">
            <text
              x={36}
              y={374}
              fill={CANVAS_COLORS.labelText}
              fontSize={font(12)}
              fontWeight="bold"
            >
              勾股关系：(cΔt/2)² = (cΔτ/2)² + (vΔt/2)² ⇒ Δt = γΔτ
            </text>

            {beta < 0.02 ? (
              <text
                x={315}
                y={420}
                textAnchor="middle"
                fill={PHYSICS_COLORS.displacement}
                fontSize={font(12)}
                fontWeight="bold"
              >
                低速重合：v ≪ c，斜光路与竖直光路重合，Δt ≈ Δτ
              </text>
            ) : (
              <g>
                <line
                  x1={pEmit.px}
                  y1={pEmit.py}
                  x2={pTopFloor.px}
                  y2={pTopFloor.py}
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={STROKE.vectorMain}
                />
                <line
                  x1={pTopFloor.px}
                  y1={pTopFloor.py}
                  x2={pTop.px}
                  y2={pTop.py}
                  stroke={PHYSICS_COLORS.displacement}
                  strokeWidth={STROKE.vectorMain}
                />
                <path
                  d={`M ${pTopFloor.px + (isShipViewingGround ? 10 : -10)} ${pTopFloor.py} L ${pTopFloor.px + (isShipViewingGround ? 10 : -10)} ${pTopFloor.py - 10} L ${pTopFloor.px} ${pTopFloor.py - 10}`}
                  fill="none"
                  stroke={CANVAS_COLORS.axis}
                  strokeWidth={STROKE.tick}
                />
                <text
                  x={(pEmit.px + pTopFloor.px) / 2}
                  y={pEmit.py + hullPadY + 24}
                  textAnchor="middle"
                  fill={PHYSICS_COLORS.velocity}
                  fontSize={font(11)}
                  fontWeight="bold"
                >
                  vΔt/2
                </text>
                <text
                  x={pTop.px}
                  y={pTop.py - hullPadY - 10}
                  textAnchor="middle"
                  fill={PHYSICS_COLORS.displacement}
                  fontSize={font(11)}
                  fontWeight="bold"
                >
                  h = cΔτ/2
                </text>
                <text
                  x={(pEmit.px + pTop.px) / 2 + (isShipViewingGround ? 14 : -14)}
                  y={(pEmit.py + pTop.py) / 2 - 10}
                  textAnchor={isShipViewingGround ? 'start' : 'end'}
                  fill={PHYSICS_COLORS.wavelengthGreen}
                  fontSize={font(11)}
                  fontWeight="bold"
                >
                  cΔt/2
                </text>
              </g>
            )}
          </g>
        )}

        <ClockDial
          cx={dialCenterX}
          cy={dialBottomY}
          r={dialRadius}
          angle={groundClockAngle}
          readout={`t = ${clockState.groundTime.toFixed(2)} s`}
          title={isShipViewingGround ? '飞船参考钟 t' : '地面参考钟 t'}
          accentColor={PHYSICS_COLORS.velocity}
          font={font}
        />
      </g>
    </g>
  )
}
