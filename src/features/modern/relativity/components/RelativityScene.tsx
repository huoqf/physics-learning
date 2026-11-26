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
import { calcLorentzFactor, formatRelativityBeta } from '@/physics/relativity'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'

interface RelativitySceneProps {
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

const SIM_STAGE_LABEL_MAP: Record<RelativityPhysicsState['simultaneity']['stage'], string> = {
  emit: '闪光发射瞬间 (t=0)',
  propagating: '左右光束等速扩散中',
  'hit-a': '先到达迎光后壁 A！',
  'after-a': 'A 已到达 · 右光继续追及 B',
  'hit-b': '后到达退让前壁 B',
  'hit-both': '低速重合 · 同时到达 A、B',
}

const REGIME_TEXT_MAP = {
  classical: '宏观低速 · 牛顿力学精确适用',
  transitional: '过渡区间 · 相对论修正显现',
  relativistic: '近光速区 · 牛顿公式失效',
} as const

export const RelativityScene: React.FC<RelativitySceneProps> = ({
  physics,
  vp,
  sceneScale,
  font,
  reducedMotion = false,
}) => {
  const {
    beta,
    m0,
    gamma,
    lengthRatio,
    clockState,
    simultaneity,
    accelState,
    groundClockAngle,
    shipClockAngle,
    mode,
    showGeometry,
  } = physics

  const shipFill = withAlpha(SCENE_COLORS.materials.structFillPale, 0.72)
  const shipFillRest = withAlpha(SCENE_COLORS.materials.structFillPale, 0.55)
  const shipStroke = SCENE_COLORS.materials.structStrokeMid
  const laserGlow = SCENE_COLORS.materials.coherentLaser.greenLaser.glow
  const laserBeam = SCENE_COLORS.materials.coherentLaser.greenLaser.beam
  const dividerLeft = vp.designLeft
  const dividerRight = vp.designLeft + vp.designVisibleW

  const renderClock = (
    cx: number,
    cy: number,
    r: number,
    angle: number,
    readout: string,
    title: string,
    accentColor: string,
  ) => {
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

  const renderMode0TimeDilation = () => {
    const scale = sceneScale.scale
    const sPrimeCenterX = 315
    const sPrimeBottomMirrorY = 230
    const sPrimeTopMirrorY = sPrimeBottomMirrorY - scale
    const sPrimeShipW = 1.6 * scale
    const sPrimePulseY = sPrimeBottomMirrorY - clockState.pulseHeightRatio * scale

    const pEmit = worldToDesign(0, 0, sceneScale)
    const pTop = worldToDesign(clockState.halfHorizWorld, clockState.clockHeightWorld, sceneScale)
    const pTopFloor = worldToDesign(clockState.halfHorizWorld, 0, sceneScale)
    const pEnd = worldToDesign(clockState.totalHorizWorld, 0, sceneScale)
    const pShipBottom = worldToDesign(clockState.shipXWorld, 0, sceneScale)
    const pShipTop = worldToDesign(clockState.shipXWorld, clockState.clockHeightWorld, sceneScale)
    const pPulse = worldToDesign(clockState.shipXWorld, clockState.pulseYWorld, sceneScale)

    const sShipW = sPrimeShipW * lengthRatio
    const sNoseW = Math.max(6, 20 * lengthRatio * (scale / 82))
    const sPrimeNoseW = 20 * (scale / 82)
    const hullPadY = 12
    const mirrorW = Math.max(22, 44 * Math.max(lengthRatio, 0.5))

    const isRising = clockState.phase <= 0.5
    const activeTrailPoints = isRising
      ? `${pEmit.px},${pEmit.py} ${pPulse.px},${pPulse.py}`
      : `${pEmit.px},${pEmit.py} ${pTop.px},${pTop.py} ${pPulse.px},${pPulse.py}`

    return (
      <g className="mode-time-dilation">
        {/* 上下参考系分隔线 */}
        <line
          x1={dividerLeft}
          y1={305}
          x2={dividerRight}
          y2={305}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
          strokeDasharray={DASH.guide.join(' ')}
        />

        {/* ── S' 参考系（飞船静止系） ── */}
        <g className="frame-s-prime">
          <rect
            x={36}
            y={22}
            width={176}
            height={26}
            rx={4}
            fill={withAlpha(PHYSICS_COLORS.displacement, 0.14)}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={STROKE.tick}
          />
          <text
            x={124}
            y={39}
            textAnchor="middle"
            fill={PHYSICS_COLORS.displacement}
            fontSize={font(12)}
            fontWeight="bold"
          >
            S&apos; 参考系（飞船静止）
          </text>

          {/* 飞船本体 */}
          <rect
            x={sPrimeCenterX - sPrimeShipW / 2}
            y={sPrimeTopMirrorY - hullPadY}
            width={sPrimeShipW}
            height={scale + hullPadY * 2}
            rx={8}
            fill={shipFillRest}
            stroke={shipStroke}
            strokeWidth={STROKE.objectLine}
          />
          <polygon
            points={`${sPrimeCenterX + sPrimeShipW / 2},${sPrimeTopMirrorY - hullPadY} ${sPrimeCenterX + sPrimeShipW / 2 + sPrimeNoseW},${(sPrimeTopMirrorY + sPrimeBottomMirrorY) / 2} ${sPrimeCenterX + sPrimeShipW / 2},${sPrimeBottomMirrorY + hullPadY}`}
            fill={shipFill}
            stroke={shipStroke}
            strokeWidth={STROKE.objectLine}
          />

          {/* 上下反光镜 */}
          <rect
            x={sPrimeCenterX - 24}
            y={sPrimeTopMirrorY - 4}
            width={48}
            height={5}
            fill={PHYSICS_COLORS.glassFill}
            stroke={PHYSICS_COLORS.wavelengthGreen}
            strokeWidth={STROKE.tickBold}
          />
          <rect
            x={sPrimeCenterX - 24}
            y={sPrimeBottomMirrorY - 1}
            width={48}
            height={5}
            fill={PHYSICS_COLORS.glassFill}
            stroke={PHYSICS_COLORS.wavelengthGreen}
            strokeWidth={STROKE.tickBold}
          />

          {/* 竖直光路 */}
          <line
            x1={sPrimeCenterX}
            y1={sPrimeTopMirrorY}
            x2={sPrimeCenterX}
            y2={sPrimeBottomMirrorY}
            stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.45)}
            strokeWidth={STROKE.vectorThin}
            strokeDasharray={DASH.projection.join(' ')}
          />
          {!reducedMotion && (
            <circle
              cx={sPrimeCenterX}
              cy={sPrimePulseY}
              r={9}
              fill={laserBeam}
              stroke={laserGlow}
              strokeWidth={STROKE.tick}
              opacity={OPACITY.glow}
            />
          )}
          <circle cx={sPrimeCenterX} cy={sPrimePulseY} r={5} fill={PHYSICS_COLORS.wavelengthGreen} />

          {renderClock(
            710,
            132,
            34,
            shipClockAngle,
            `τ = ${clockState.properTime.toFixed(2)} s`,
            '飞船固有钟 τ',
            PHYSICS_COLORS.displacement,
          )}
        </g>

        {/* ── S 参考系（地面观测系） ── */}
        <g className="frame-s">
          <rect
            x={36}
            y={322}
            width={176}
            height={26}
            rx={4}
            fill={withAlpha(PHYSICS_COLORS.velocity, 0.14)}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={STROKE.tick}
          />
          <text
            x={124}
            y={339}
            textAnchor="middle"
            fill={PHYSICS_COLORS.velocity}
            fontSize={font(12)}
            fontWeight="bold"
          >
            S 参考系（地面观测）
          </text>

          <text x={228} y={339} fill={CANVAS_COLORS.labelText} fontSize={font(12)}>
            航速 v = {formatRelativityBeta(beta)} c · γ = {gamma.toFixed(3)}
          </text>

          <rect
            x={426}
            y={322}
            width={158}
            height={26}
            rx={4}
            fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.12)}
            stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.5)}
            strokeWidth={STROKE.tick}
          />
          <text
            x={505}
            y={339}
            textAnchor="middle"
            fill={CANVAS_COLORS.labelText}
            fontSize={font(11)}
            fontWeight="bold"
          >
            {STAGE_LABEL_MAP[clockState.stage]}
          </text>

          {/* 地面轨道基线 */}
          <line
            x1={60}
            y1={pEmit.py + hullPadY + 6}
            x2={570}
            y2={pEmit.py + hullPadY + 6}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={STROKE.axis}
          />

          {/* 运动飞船（沿运动方向收缩，竖直高度不变） */}
          <rect
            x={pShipTop.px - sShipW / 2}
            y={pShipTop.py - hullPadY}
            width={sShipW}
            height={scale + hullPadY * 2}
            rx={8}
            fill={shipFill}
            stroke={shipStroke}
            strokeWidth={STROKE.objectLine}
          />
          <polygon
            points={`${pShipTop.px + sShipW / 2},${pShipTop.py - hullPadY} ${pShipTop.px + sShipW / 2 + sNoseW},${(pShipTop.py + pShipBottom.py) / 2} ${pShipTop.px + sShipW / 2},${pShipBottom.py + hullPadY}`}
            fill={withAlpha(SCENE_COLORS.materials.structStrokePale, 0.85)}
            stroke={shipStroke}
            strokeWidth={STROKE.objectLine}
          />

          {/* 运动飞船内的上下反光镜 */}
          <rect
            x={pShipTop.px - mirrorW / 2}
            y={pShipTop.py - 4}
            width={mirrorW}
            height={5}
            fill={PHYSICS_COLORS.glassFill}
            stroke={PHYSICS_COLORS.wavelengthGreen}
            strokeWidth={STROKE.tickBold}
          />
          <rect
            x={pShipBottom.px - mirrorW / 2}
            y={pShipBottom.py - 1}
            width={mirrorW}
            height={5}
            fill={PHYSICS_COLORS.glassFill}
            stroke={PHYSICS_COLORS.wavelengthGreen}
            strokeWidth={STROKE.tickBold}
          />

          {/* 地面系完整斜光路底图（虚线） + 实时已走光路（实线） */}
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

          {/* 三关键事件节点（发射 / 达顶 / 返回） */}
          <circle cx={pEmit.px} cy={pEmit.py} r={3.5} fill={PHYSICS_COLORS.displacement} />
          <circle cx={pTop.px} cy={pTop.py} r={3.5} fill={PHYSICS_COLORS.acceleration} />
          <circle cx={pEnd.px} cy={pEnd.py} r={3.5} fill={PHYSICS_COLORS.velocity} />

          {/* 地面系光子脉冲 */}
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

          {/* 勾股几何辅助图解（仅 mode === 0 且 showGeometry 为真时在真实光路上叠加，绝不截断比例） */}
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
                  {/* 底边 vΔt/2 */}
                  <line
                    x1={pEmit.px}
                    y1={pEmit.py}
                    x2={pTopFloor.px}
                    y2={pTopFloor.py}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={STROKE.vectorMain}
                  />
                  {/* 竖直边 h = cΔτ/2 */}
                  <line
                    x1={pTopFloor.px}
                    y1={pTopFloor.py}
                    x2={pTop.px}
                    y2={pTop.py}
                    stroke={PHYSICS_COLORS.displacement}
                    strokeWidth={STROKE.vectorMain}
                  />
                  {/* 直角标记 */}
                  <path
                    d={`M ${pTopFloor.px - 10} ${pTopFloor.py} L ${pTopFloor.px - 10} ${pTopFloor.py - 10} L ${pTopFloor.px} ${pTopFloor.py - 10}`}
                    fill="none"
                    stroke={CANVAS_COLORS.axis}
                    strokeWidth={STROKE.tick}
                  />
                  {/* 边长标注（外置防压车体） */}
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
                    x={(pEmit.px + pTop.px) / 2 - 12}
                    y={(pEmit.py + pTop.py) / 2 - 10}
                    textAnchor="end"
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

          {renderClock(
            710,
            476,
            34,
            groundClockAngle,
            `t = ${clockState.groundTime.toFixed(2)} s`,
            '地面参考钟 t',
            PHYSICS_COLORS.velocity,
          )}
        </g>
      </g>
    )
  }

  const renderMode1LengthContraction = () => {
    const startX = 120
    const l0Px = 360
    const lPx = l0Px * lengthRatio
    const shipHeight = 64
    const progress = simultaneity.duration > 0 ? simultaneity.groundTime / simultaneity.duration : 0
    const movePx = Math.min(90, 120 * beta) * progress
    const shipLeft = startX + movePx

    // 下半区 S' 系（车厢居中静止，半长 136px）
    const primeHalfPx = 136
    const primeRayPx = simultaneity.primeRayDist * primeHalfPx

    // 下半区 S 系（世界坐标映射至 [465, 775]，保证全速域不越界且光速绝对相等）
    const worldMinX = -simultaneity.lengthRatio
    const worldMaxX = Math.max(simultaneity.lengthRatio, simultaneity.tB)
    const boxScale = Math.min(130, 310 / Math.max(worldMaxX - worldMinX, 0.5))
    const contentW = (worldMaxX - worldMinX) * boxScale
    const offsetX = 465 + (310 - contentW) / 2
    const emitDesignX = offsetX - worldMinX * boxScale
    const wallADesignX = emitDesignX + simultaneity.wallAX * boxScale
    const wallBDesignX = emitDesignX + simultaneity.wallBX * boxScale
    const leftRayDesignX = emitDesignX + simultaneity.leftRayX * boxScale
    const rightRayDesignX = emitDesignX + simultaneity.rightRayX * boxScale

    const sSummaryText =
      beta < 0.02
        ? '低速重合：车厢近似静止，左右光束同时抵达两壁'
        : simultaneity.hitB
          ? '结果：先到 A、后到 B（同时具有相对性）'
          : simultaneity.hitA
            ? 'A 已抵达！右光仍在追及退让中的前壁 B'
            : '左右光束等速扩散，后壁 A 迎光靠近中'

    return (
      <g className="mode-length-contraction">
        {/* ── 上半区：同起点同比例尺动态动尺对比 ── */}
        <rect
          x={36}
          y={22}
          width={230}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.displacement, 0.14)}
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={STROKE.tick}
        />
        <text
          x={151}
          y={39}
          textAnchor="middle"
          fill={PHYSICS_COLORS.displacement}
          fontSize={font(12)}
          fontWeight="bold"
        >
          动尺收缩（同起点、同比例尺对照）
        </text>
        <text x={282} y={39} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
          S 系同时测首尾 (t₁ = t₂)，垂直方向尺寸不变
        </text>

        {/* 原长参考虚线 */}
        <line
          x1={startX}
          y1={64}
          x2={startX}
          y2={288}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <line
          x1={startX + l0Px}
          y1={64}
          x2={startX + l0Px}
          y2={156}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')}
        />

        {/* S' 静止飞船 (固有长度 L0) */}
        <rect
          x={startX}
          y={76}
          width={l0Px}
          height={shipHeight}
          rx={8}
          fill={shipFillRest}
          stroke={shipStroke}
          strokeWidth={STROKE.objectLine}
        />
        <polygon
          points={`${startX + l0Px},76 ${startX + l0Px + 22},${76 + shipHeight / 2} ${startX + l0Px},${76 + shipHeight}`}
          fill={shipFill}
          stroke={shipStroke}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={startX + l0Px / 2}
          y={113}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(12)}
          fontWeight="bold"
        >
          S&apos; 静止系：固有长度 L₀（同一物体静止时最长）
        </text>

        {/* S 地面观测飞船 (动态沿轨道掠过，收缩长度 L = L0 / gamma) */}
        <rect
          x={shipLeft}
          y={184}
          width={l0Px}
          height={shipHeight}
          rx={8}
          fill="none"
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.guide.join(' ')}
        />
        <rect
          x={shipLeft}
          y={184}
          width={lPx}
          height={shipHeight}
          rx={8}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.2)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.objectLine}
        />
        <polygon
          points={`${shipLeft + lPx},184 ${shipLeft + lPx + 22 * lengthRatio},${184 + shipHeight / 2} ${shipLeft + lPx},${184 + shipHeight}`}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.objectLine}
        />
        <line
          x1={shipLeft}
          y1={174}
          x2={shipLeft}
          y2={282}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.projection.join(' ')}
        />
        <line
          x1={shipLeft + lPx}
          y1={174}
          x2={shipLeft + lPx}
          y2={282}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.projection.join(' ')}
        />

        {/* 尺长标注 */}
        <line
          x1={shipLeft}
          y1={272}
          x2={shipLeft + lPx}
          y2={272}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.vectorSub}
        />
        <text
          x={shipLeft + Math.max(lPx / 2, 76)}
          y={296}
          textAnchor="middle"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(12)}
          fontWeight="bold"
        >
          观测长度 L = {lengthRatio.toFixed(3)} L₀
        </text>

        {/* 右侧对照面板 */}
        <rect
          x={612}
          y={76}
          width={192}
          height={194}
          rx={8}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />
        <text x={630} y={104} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
          尺缩测量读数
        </text>
        <text x={630} y={134} fill={PHYSICS_COLORS.velocity} fontSize={font(12)}>
          v = {formatRelativityBeta(beta)} c
        </text>
        <text x={630} y={160} fill={PHYSICS_COLORS.acceleration} fontSize={font(12)}>
          γ = {gamma.toFixed(3)}
        </text>
        <text x={630} y={186} fill={PHYSICS_COLORS.displacement} fontSize={font(12)} fontWeight="bold">
          L = {lengthRatio.toFixed(3)} L₀
        </text>
        <text x={630} y={214} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
          t = {simultaneity.groundTime.toFixed(2)}s · τ = {simultaneity.properTime.toFixed(2)}s
        </text>
        <text x={630} y={242} fill={CANVAS_COLORS.textMuted} fontSize={font(11)}>
          垂直方向高度：保持不变
        </text>

        {/* 分隔线 */}
        <line
          x1={dividerLeft}
          y1={328}
          x2={dividerRight}
          y2={328}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
          strokeDasharray={DASH.guide.join(' ')}
        />

        {/* ── 下半区：同时的相对性动态传播 ── */}
        <rect
          x={36}
          y={346}
          width={220}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.acceleration, 0.12)}
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.tick}
        />
        <text
          x={146}
          y={363}
          textAnchor="middle"
          fill={PHYSICS_COLORS.acceleration}
          fontSize={font(12)}
          fontWeight="bold"
        >
          同时的相对性（车厢闪光动态传播）
        </text>

        <rect
          x={272}
          y={346}
          width={220}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.12)}
          stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.5)}
          strokeWidth={STROKE.tick}
        />
        <text
          x={382}
          y={363}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
        >
          {SIM_STAGE_LABEL_MAP[simultaneity.stage]}
        </text>

        {/* 左子图：S' 车厢参考系 */}
        <rect
          x={36}
          y={388}
          width={368}
          height={224}
          rx={8}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />
        <text
          x={220}
          y={412}
          textAnchor="middle"
          fill={PHYSICS_COLORS.displacement}
          fontSize={font(12)}
          fontWeight="bold"
        >
          S&apos; 系（车厢内观察者）
        </text>
        <rect
          x={84}
          y={442}
          width={272}
          height={64}
          rx={6}
          fill={shipFillRest}
          stroke={shipStroke}
          strokeWidth={STROKE.objectLine}
        />
        <circle cx={220} cy={474} r={6} fill={PHYSICS_COLORS.wavelengthGreen} />
        <line
          x1={220}
          y1={474}
          x2={220 - primeRayPx}
          y2={474}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.vectorSub}
        />
        <line
          x1={220}
          y1={474}
          x2={220 + primeRayPx}
          y2={474}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.vectorSub}
        />
        <circle
          cx={220 - primeRayPx}
          cy={474}
          r={simultaneity.primeHitBoth ? 5 : 3.5}
          fill={PHYSICS_COLORS.wavelengthGreen}
        />
        <circle
          cx={220 + primeRayPx}
          cy={474}
          r={simultaneity.primeHitBoth ? 5 : 3.5}
          fill={PHYSICS_COLORS.wavelengthGreen}
        />
        <text x={84} y={434} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold">
          后壁 A
        </text>
        <text
          x={356}
          y={434}
          textAnchor="end"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
        >
          前壁 B
        </text>
        <text x={220} y={536} textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
          固有时 τ = {simultaneity.properTime.toFixed(2)} s（向前后光速均为 c）
        </text>
        <text
          x={220}
          y={566}
          textAnchor="middle"
          fill={PHYSICS_COLORS.displacement}
          fontSize={font(12)}
          fontWeight="bold"
        >
          {simultaneity.primeHitBoth
            ? '结论：光同时到达 A、B 两壁'
            : '观察：左右光束等速向两壁逼近'}
        </text>

        {/* 右子图：S 地面参考系 */}
        <rect
          x={436}
          y={388}
          width={368}
          height={224}
          rx={8}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />
        <text
          x={620}
          y={412}
          textAnchor="middle"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(12)}
          fontWeight="bold"
        >
          S 系（地面观察者：车厢以 v 右移）
        </text>
        <rect
          x={wallADesignX}
          y={442}
          width={Math.max(4, wallBDesignX - wallADesignX)}
          height={64}
          rx={6}
          fill={shipFill}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.objectLine}
        />
        {/* 地面系发光位置参考虚线 */}
        <line
          x1={emitDesignX}
          y1={436}
          x2={emitDesignX}
          y2={514}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.projection.join(' ')}
        />
        <circle cx={emitDesignX} cy={474} r={6} fill={PHYSICS_COLORS.wavelengthGreen} />
        <line
          className="simultaneity-s-left-beam"
          x1={emitDesignX}
          y1={474}
          x2={leftRayDesignX}
          y2={474}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.vectorSub}
        />
        <circle
          cx={leftRayDesignX}
          cy={474}
          r={simultaneity.hitA ? 5 : 3.5}
          fill={simultaneity.hitA ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.wavelengthGreen}
        />
        <line
          className="simultaneity-s-right-beam"
          x1={emitDesignX}
          y1={474}
          x2={rightRayDesignX}
          y2={474}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.vectorSub}
        />
        <circle
          cx={rightRayDesignX}
          cy={474}
          r={simultaneity.hitB ? 5 : 3.5}
          fill={simultaneity.hitB ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.wavelengthGreen}
        />
        {!simultaneity.hitB && wallBDesignX - rightRayDesignX > 4 && (
          <line
            x1={rightRayDesignX + 4}
            y1={474}
            x2={wallBDesignX}
            y2={474}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={STROKE.reference}
            strokeDasharray={DASH.projection.join(' ')}
          />
        )}
        <text
          x={wallADesignX - 6}
          y={434}
          textAnchor="end"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(11)}
          fontWeight="bold"
        >
          A
        </text>
        <text
          x={wallBDesignX + 6}
          y={434}
          textAnchor="start"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(11)}
          fontWeight="bold"
        >
          B
        </text>
        <text x={620} y={536} textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
          地面时 t = {simultaneity.groundTime.toFixed(2)} s（t_A = {simultaneity.tA.toFixed(2)}s, t_B = {simultaneity.tB.toFixed(2)}s）
        </text>
        <text
          x={620}
          y={566}
          textAnchor="middle"
          fill={PHYSICS_COLORS.acceleration}
          fontSize={font(12)}
          fontWeight="bold"
        >
          {sSummaryText}
        </text>
      </g>
    )
  }

  const renderMode2NewtonianLimits = () => {
    const {
      targetBeta,
      targetGamma,
      duration,
      groundTime,
      currentBeta,
      classicalBeta,
      currentGamma,
      currentNewtonMetrics,
    } = accelState

    const trackLeft = 54
    const trackW = 356
    const maxTrackBeta = Math.max(1.25, targetBeta * targetGamma * 1.05)
    const cLineX = trackLeft + (1.0 / maxTrackBeta) * trackW
    const clBarW = Math.max(3, Math.min(trackW, (classicalBeta / maxTrackBeta) * trackW))
    const relBarW = Math.max(3, Math.min(trackW, (currentBeta / maxTrackBeta) * trackW))
    const devPct = (currentNewtonMetrics.relativeDeviation * 100).toFixed(currentBeta < 0.1 ? 3 : 1)

    const chartLeft = 496
    const chartTop = 78
    const chartW = 292
    const chartH = 174
    const chartBottom = chartTop + chartH
    const maxBeta = 0.95
    const minGamma = 1.0
    const maxGamma = 3.5

    const toChartX = (b: number) => chartLeft + (b / maxBeta) * chartW
    const toChartY = (g: number) =>
      chartBottom - ((Math.min(Math.max(g, minGamma), maxGamma) - minGamma) / (maxGamma - minGamma)) * chartH

    const curvePoints: string[] = []
    for (let i = 0; i <= 48; i += 1) {
      const b = (i / 48) * maxBeta
      const g = calcLorentzFactor(b)
      curvePoints.push(`${toChartX(b).toFixed(1)},${toChartY(g).toFixed(1)}`)
    }

    const curX = toChartX(currentBeta)
    const curY = toChartY(currentGamma)
    const targetX = toChartX(targetBeta)
    const targetY = toChartY(targetGamma)
    const classicalZoneW = toChartX(0.1) - chartLeft

    const boundaryCards = [
      {
        y: 368,
        arrowY: 398,
        title: '高速世界（v 接近光速 c）',
        theory: '→ 狭义相对论',
        detail: 'v ≪ c 时 γ → 1，时间延缓与尺缩效应可忽略，回归牛顿力学',
        color: PHYSICS_COLORS.velocity,
        active: currentBeta > 0.1,
      },
      {
        y: 446,
        arrowY: 476,
        title: '微观世界（原子 / 基本粒子尺度）',
        theory: '→ 量子力学',
        detail: '宏观大尺度下量子跃迁与波动效应平均化，回归经典规律',
        color: PHYSICS_COLORS.displacement,
        active: false,
      },
      {
        y: 524,
        arrowY: 554,
        title: '强引力场（黑洞 / 大质量天体附近）',
        theory: '→ 广义相对论',
        detail: '弱引力、低速条件下弯曲时空近似退化为牛顿万有引力定律',
        color: PHYSICS_COLORS.acceleration,
        active: false,
      },
    ]

    return (
      <g className="mode-newton-limits">
        {/* ── 上半区左侧：恒力加速双模型实时对照 ── */}
        <rect
          x={36}
          y={22}
          width={356}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.14)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.tick}
        />
        <text
          x={214}
          y={39}
          textAnchor="middle"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(12)}
          fontWeight="bold"
        >
          低速回归与恒力加速对照（t = {groundTime.toFixed(2)} / {duration.toFixed(1)} s）
        </text>

        <rect
          x={36}
          y={64}
          width={404}
          height={226}
          rx={8}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />
        <text x={54} y={88} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
          恒力加速速度演化（对比光速极限 c）
        </text>

        {/* 光速极限警戒线 */}
        <line
          x1={cLineX}
          y1={104}
          x2={cLineX}
          y2={198}
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <text
          x={cLineX}
          y={100}
          textAnchor="middle"
          fill={PHYSICS_COLORS.acceleration}
          fontSize={font(10)}
          fontWeight="bold"
        >
          光速 c
        </text>

        {/* 经典预测条 */}
        <text x={54} y={118} fill={PHYSICS_COLORS.velocity} fontSize={font(11)} fontWeight="bold">
          牛顿预测 v_cl = (F/m₀)t
        </text>
        <text
          x={422}
          y={118}
          textAnchor="end"
          fill={classicalBeta >= 1 ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
          fontSize={font(11)}
          fontWeight="bold"
        >
          {classicalBeta.toFixed(2)} c{classicalBeta >= 1 ? ' (超c失效)' : ''}
        </text>
        <rect x={trackLeft} y={125} width={trackW} height={18} rx={4} fill={withAlpha(CANVAS_COLORS.grid, 0.45)} />
        <rect
          x={trackLeft}
          y={125}
          width={clBarW}
          height={18}
          rx={4}
          fill={classicalBeta >= 1 ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
        />

        {/* 相对论实际条 */}
        <text x={54} y={166} fill={PHYSICS_COLORS.wavelengthGreen} fontSize={font(11)} fontWeight="bold">
          相对论实际速度 v(t)
        </text>
        <text
          x={422}
          y={166}
          textAnchor="end"
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(11)}
          fontWeight="bold"
        >
          {formatRelativityBeta(currentBeta)} c
        </text>
        <rect x={trackLeft} y={173} width={trackW} height={18} rx={4} fill={withAlpha(CANVAS_COLORS.grid, 0.45)} />
        <rect
          x={trackLeft}
          y={173}
          width={relBarW}
          height={18}
          rx={4}
          fill={PHYSICS_COLORS.wavelengthGreen}
        />

        {/* 当前状态摘要与区间徽章 */}
        <text x={54} y={222} fill={CANVAS_COLORS.labelText} fontSize={font(12)}>
          当前 γ = {currentGamma.toFixed(4)} · 相对经典偏差 = {devPct}%
        </text>
        <rect
          x={54}
          y={240}
          width={368}
          height={32}
          rx={6}
          fill={withAlpha(
            currentNewtonMetrics.regime === 'classical'
              ? PHYSICS_COLORS.wavelengthGreen
              : currentNewtonMetrics.regime === 'transitional'
                ? PHYSICS_COLORS.velocity
                : PHYSICS_COLORS.acceleration,
            0.14,
          )}
        />
        <text
          x={238}
          y={260}
          textAnchor="middle"
          fill={
            currentNewtonMetrics.regime === 'classical'
              ? PHYSICS_COLORS.wavelengthGreen
              : currentNewtonMetrics.regime === 'transitional'
                ? PHYSICS_COLORS.velocity
                : PHYSICS_COLORS.acceleration
          }
          fontSize={font(11)}
          fontWeight="bold"
        >
          {REGIME_TEXT_MAP[currentNewtonMetrics.regime]}
        </text>

        {/* ── 上半区右侧：γ(β) 实时爬坡曲线 ── */}
        <rect
          x={chartLeft}
          y={chartTop}
          width={classicalZoneW}
          height={chartH}
          fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.14)}
        />
        <text
          x={chartLeft + classicalZoneW + 8}
          y={chartTop + 16}
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(10)}
          fontWeight="bold"
        >
          低速区 (β≤0.1)
        </text>
        <text x={chartLeft - 8} y={chartTop - 6} textAnchor="end" fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold">
          γ
        </text>
        <line
          x1={chartLeft}
          y1={chartBottom}
          x2={chartLeft + chartW}
          y2={chartBottom}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        <line
          x1={chartLeft}
          y1={chartTop}
          x2={chartLeft}
          y2={chartBottom}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        <line
          x1={chartLeft}
          y1={chartBottom}
          x2={chartLeft + chartW}
          y2={chartBottom}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <text
          x={chartLeft + chartW - 4}
          y={chartBottom - 10}
          textAnchor="end"
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(11)}
          fontWeight="bold"
        >
          牛顿基准 γ = 1
        </text>

        <text x={chartLeft - 8} y={chartBottom + 4} textAnchor="end" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
          1.0
        </text>
        <text x={chartLeft - 8} y={toChartY(2) + 4} textAnchor="end" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
          2.0
        </text>
        <text x={chartLeft - 8} y={toChartY(3) + 4} textAnchor="end" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
          3.0
        </text>
        <text x={chartLeft} y={chartBottom + 18} textAnchor="middle" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
          0
        </text>
        <text x={toChartX(0.5)} y={chartBottom + 18} textAnchor="middle" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
          0.5c
        </text>
        <text x={toChartX(0.95)} y={chartBottom + 18} textAnchor="middle" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
          0.95c
        </text>
        <text x={chartLeft + chartW / 2} y={chartBottom + 36} textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold">
          β = v/c
        </text>

        <polyline
          points={curvePoints.join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.chartMain}
        />
        {/* 终点目标空心环 */}
        <circle
          cx={targetX}
          cy={targetY}
          r={5}
          fill="none"
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.tickBold}
          strokeDasharray={DASH.projection.join(' ')}
        />
        {/* 当前运动点 */}
        <line
          x1={curX}
          y1={curY}
          x2={curX}
          y2={chartBottom}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.projection.join(' ')}
        />
        <circle
          cx={curX}
          cy={curY}
          r={5.5}
          fill={PHYSICS_COLORS.acceleration}
          stroke={CANVAS_COLORS.white}
          strokeWidth={STROKE.tickBold}
        />

        {/* 分隔线 */}
        <line
          x1={dividerLeft}
          y1={314}
          x2={dividerRight}
          y2={314}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
          strokeDasharray={DASH.guide.join(' ')}
        />

        {/* ── 下半区：牛顿力学适用范围与三大边界 ── */}
        <rect
          x={36}
          y={328}
          width={236}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.14)}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.tick}
        />
        <text
          x={154}
          y={345}
          textAnchor="middle"
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(12)}
          fontWeight="bold"
        >
          牛顿力学的适用范围与理论演进
        </text>

        <rect
          x={40}
          y={404}
          width={220}
          height={146}
          rx={10}
          fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.1)}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={150}
          y={442}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(14)}
          fontWeight="bold"
        >
          牛顿力学适用范围
        </text>
        <text
          x={150}
          y={476}
          textAnchor="middle"
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(13)}
          fontWeight="bold"
        >
          宏观 · 低速 · 弱引力
        </text>
        <text
          x={150}
          y={512}
          textAnchor="middle"
          fill={CANVAS_COLORS.textMuted}
          fontSize={font(11)}
        >
          新理论并非“推翻”牛顿力学，
        </text>
        <text
          x={150}
          y={530}
          textAnchor="middle"
          fill={CANVAS_COLORS.textMuted}
          fontSize={font(11)}
        >
          而是把牛顿力学包容为近似极限
        </text>

        {boundaryCards.map((card) => (
          <g key={card.title}>
            <VectorArrow
              originDesign={{ x: 268, y: card.arrowY }}
              vector={{ x: 1, y: 0 }}
              type="velocity"
              arrowType="visual-only"
              color={card.color}
              pixelLength={74}
              sceneScale={sceneScale}
              font={font}
            />
            <rect
              x={354}
              y={card.y}
              width={450}
              height={62}
              rx={8}
              fill={card.active ? withAlpha(card.color, 0.06) : CANVAS_COLORS.white}
              stroke={card.active ? card.color : withAlpha(card.color, 0.55)}
              strokeWidth={card.active ? STROKE.objectLine : STROKE.objectThin}
            />
            <text x={372} y={card.y + 24} fill={card.color} fontSize={font(12)} fontWeight="bold">
              {card.title} {card.theory}
            </text>
            <text x={372} y={card.y + 46} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
              {card.detail}
            </text>
          </g>
        ))}
      </g>
    )
  }

  const renderMode3EnergyExtension = () => {
    const {
      targetGamma,
      duration,
      groundTime,
      currentBeta,
      currentGamma,
      currentEnergy,
      currentClassicalEk,
      targetEnergy,
      targetClassicalEk,
    } = accelState

    const unitW = 680 / 3.25
    const restW = unitW
    const targetTotalW = targetGamma * unitW
    const curKineticW = (currentGamma - 1) * unitW
    const rest10_16 = (currentEnergy.restEnergy / 1e16).toFixed(2)
    const ek10_16 = (currentEnergy.kineticEnergy / 1e16).toFixed(2)
    const tot10_16 = (currentEnergy.totalEnergy / 1e16).toFixed(2)

    const maxCompareEk = Math.max(targetEnergy.kineticEnergy, targetClassicalEk, 1e-12)
    const barMaxW = 460
    const classicalBarW = Math.max(4, (currentClassicalEk / maxCompareEk) * barMaxW)
    const relBarW = Math.max(4, (currentEnergy.kineticEnergy / maxCompareEk) * barMaxW)

    return (
      <g className="mode-energy-extension">
        <rect
          x={36}
          y={22}
          width={296}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.potentialEnergy, 0.14)}
          stroke={PHYSICS_COLORS.potentialEnergy}
          strokeWidth={STROKE.tick}
        />
        <text
          x={184}
          y={39}
          textAnchor="middle"
          fill={PHYSICS_COLORS.potentialEnergy}
          fontSize={font(12)}
          fontWeight="bold"
        >
          质能关系拓展（不变质量 m₀ · 恒力做功演化）
        </text>

        {/* 上半区：静能 + 动态增长的相对论动能构成条 */}
        <rect
          x={36}
          y={66}
          width={768}
          height={232}
          rx={10}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />
        <text x={58} y={98} fill={CANVAS_COLORS.labelText} fontSize={font(13)} fontWeight="bold">
          实时能量构成：E(t) = γ(t)·m₀c² = E₀ + E_k(t)  (t = {groundTime.toFixed(2)} / {duration.toFixed(1)} s)
        </text>
        {/* 目标总能虚线边框 */}
        <rect
          x={58}
          y={124}
          width={targetTotalW}
          height={42}
          rx={4}
          fill={withAlpha(CANVAS_COLORS.grid, 0.25)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.guide.join(' ')}
        />
        <rect
          x={58}
          y={124}
          width={restW}
          height={42}
          rx={4}
          fill={PHYSICS_COLORS.potentialEnergy}
        />
        {curKineticW > 0.5 && (
          <rect
            x={58 + restW}
            y={124}
            width={curKineticW}
            height={42}
            rx={4}
            fill={PHYSICS_COLORS.kineticEnergy}
          />
        )}
        <text
          x={58 + restW / 2}
          y={192}
          textAnchor="middle"
          fill={PHYSICS_COLORS.potentialEnergy}
          fontSize={font(11)}
          fontWeight="bold"
        >
          静能 E₀ = m₀c²
        </text>
        <text
          x={58 + restW + Math.max(curKineticW / 2, 82)}
          y={192}
          textAnchor="middle"
          fill={PHYSICS_COLORS.kineticEnergy}
          fontSize={font(11)}
          fontWeight="bold"
        >
          相对论动能 E_k(t) = (γ − 1)m₀c²
        </text>

        <text x={58} y={244} fill={CANVAS_COLORS.labelText} fontSize={font(12)}>
          m₀ = {m0.toFixed(1)} kg · β = {formatRelativityBeta(currentBeta)}
        </text>
        <text x={256} y={244} fill={PHYSICS_COLORS.potentialEnergy} fontSize={font(12)}>
          E₀ = {rest10_16} ×10¹⁶ J
        </text>
        <text x={446} y={244} fill={PHYSICS_COLORS.kineticEnergy} fontSize={font(12)}>
          E_k = {ek10_16} ×10¹⁶ J
        </text>
        <text x={636} y={244} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
          E = {tot10_16} ×10¹⁶ J
        </text>

        {/* 下半区：经典动能 vs 相对论动能动态增长对比 */}
        <rect
          x={36}
          y={324}
          width={768}
          height={286}
          rx={10}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.axis}
        />
        <text x={58} y={358} fill={CANVAS_COLORS.labelText} fontSize={font(13)} fontWeight="bold">
          动能演化对比：低速时 E_k ≈ ½m₀v²，高速时相对论动能急剧增大
        </text>

        <text x={58} y={396} fill={PHYSICS_COLORS.velocity} fontSize={font(12)} fontWeight="bold">
          牛顿经典动能 ½m₀v²
        </text>
        <rect
          x={58}
          y={408}
          width={classicalBarW}
          height={32}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.78)}
        />
        <text x={58 + classicalBarW + 12} y={429} fill={PHYSICS_COLORS.velocity} fontSize={font(12)}>
          {(currentClassicalEk / 1e16).toFixed(2)} ×10¹⁶ J
        </text>

        <text x={58} y={478} fill={PHYSICS_COLORS.kineticEnergy} fontSize={font(12)} fontWeight="bold">
          相对论动能 (γ − 1)m₀c²
        </text>
        <rect
          x={58}
          y={490}
          width={relBarW}
          height={32}
          rx={4}
          fill={PHYSICS_COLORS.kineticEnergy}
        />
        <text x={58 + relBarW + 12} y={511} fill={PHYSICS_COLORS.kineticEnergy} fontSize={font(12)} fontWeight="bold">
          {ek10_16} ×10¹⁶ J
        </text>

        <text x={58} y={574} fill={CANVAS_COLORS.textMuted} fontSize={font(11)}>
          说明：采用不变质量 m₀ 口径，速度趋近 c 时能量与动量趋于无穷大，因此有质量物体无法被加速至光速。
        </text>
      </g>
    )
  }

  return (
    <g className="relativity-scene">
      {mode === 0 && renderMode0TimeDilation()}
      {mode === 1 && renderMode1LengthContraction()}
      {mode === 2 && renderMode2NewtonianLimits()}
      {mode === 3 && renderMode3EnergyExtension()}
    </g>
  )
}
