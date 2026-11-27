import React from 'react'
import {
  CANVAS_COLORS,
  DASH,
  PHYSICS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import { VectorArrow } from '@/components/Physics'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import { formatRelativityBeta } from '@/physics/relativity'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'
import { FULL_LAYOUT } from '../relativityLayout'

interface LengthSimultaneitySceneProps {
  physics: RelativityPhysicsState
  vp: Pick<ViewportInfo, 'designLeft' | 'designVisibleW'>
  sceneScale: SceneScale
  font: (size: number) => number
}

const SIM_STAGE_LABEL_MAP: Record<RelativityPhysicsState['simultaneity']['stage'], string> = {
  emit: '闪光发射瞬间 (t=0)',
  propagating: '左右光束等速扩散中',
  'hit-a': '先到达迎光后壁 A！',
  'after-a': 'A 已到达 · 右光继续追及 B',
  'hit-b': '后到达退让前壁 B',
  'hit-both': '低速重合 · 同时到达 A、B',
}

export const LengthSimultaneityScene: React.FC<LengthSimultaneitySceneProps> = ({
  physics,
  vp,
  sceneScale,
  font,
}) => {
  const { beta, gamma, lengthRatio, simultaneity } = physics
  const {
    dividerY,
    rulerStartX,
    rulerL0Px,
    shipHeight,
    restShipY,
    movingShipY,
    panelX,
    panelY,
    panelW,
    panelH,
    primeCardX,
    primeCardW,
    groundCardX,
    groundCardW,
    cardY,
    cardH,
  } = FULL_LAYOUT.lengthSim

  const shipFill = withAlpha(SCENE_COLORS.materials.structFillPale, 0.72)
  const shipFillRest = withAlpha(SCENE_COLORS.materials.structFillPale, 0.55)
  const shipStroke = SCENE_COLORS.materials.structStrokeMid
  const dividerLeft = vp.designLeft
  const dividerRight = vp.designLeft + vp.designVisibleW

  const lPx = rulerL0Px * lengthRatio
  const progress = simultaneity.duration > 0 ? simultaneity.groundTime / simultaneity.duration : 0
  const movePx = Math.min(90, 120 * beta) * progress
  const shipLeft = rulerStartX + movePx

  // 舷窗：S' 正圆 (rx = ry = 11)，S 沿运动方向压缩成竖椭圆 (rx = 11/γ, ry = 11)
  const portholeR = 11
  const portholeRx = Math.max(2.5, portholeR * lengthRatio)
  const portholeFractions = [0.22, 0.5, 0.78]

  // 下半区 S' 系（车厢居中静止）
  const primeHalfPx = 136
  const primeRayPx = simultaneity.primeRayDist * primeHalfPx

  // 下半区 S 系（世界坐标映射至 [groundCardX + 29, groundCardX + 339]）
  const worldMinX = -simultaneity.lengthRatio
  const worldMaxX = Math.max(simultaneity.lengthRatio, simultaneity.tB)
  const boxScale = Math.min(130, 310 / Math.max(worldMaxX - worldMinX, 0.5))
  const contentW = (worldMaxX - worldMinX) * boxScale
  const offsetX = groundCardX + 29 + (310 - contentW) / 2
  const emitDesignX = offsetX - worldMinX * boxScale
  const wallADesignX = emitDesignX + simultaneity.wallAX * boxScale
  const wallBDesignX = emitDesignX + simultaneity.wallBX * boxScale
  const leftRayDesignX = emitDesignX + simultaneity.leftRayX * boxScale
  const rightRayDesignX = emitDesignX + simultaneity.rightRayX * boxScale

  // S 系对称光波前半径（以发光点为圆心，左右同步等距扩散，印证光速不变）
  const sWaveRadius = Math.min(simultaneity.groundTime, simultaneity.tB) * boxScale
  const arcSpan = Math.min(28, sWaveRadius * 0.65)
  const arcHalfAngle = sWaveRadius > 4 ? Math.asin(Math.min(0.92, arcSpan / sWaveRadius)) : 0
  const arcDx = sWaveRadius * Math.cos(arcHalfAngle)
  const arcDy = sWaveRadius * Math.sin(arcHalfAngle)
  const sCarriageCy = 474

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
      {/* ── 上半区：同起点同比例尺动尺收缩（随物之尺最长） ── */}
      <rect
        x={36}
        y={22}
        width={236}
        height={26}
        rx={4}
        fill={withAlpha(PHYSICS_COLORS.displacement, 0.14)}
        stroke={PHYSICS_COLORS.displacement}
        strokeWidth={STROKE.tick}
      />
      <text
        x={154}
        y={39}
        textAnchor="middle"
        fill={PHYSICS_COLORS.displacement}
        fontSize={font(12)}
        fontWeight="bold"
      >
        动尺收缩（随物最长 L₀ · 同比例对照）
      </text>
      <text x={286} y={39} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
        S 系同时测首尾 (t₁ = t₂)，垂直方向尺寸不变
      </text>

      {/* 原长参考虚线 */}
      <line
        x1={rulerStartX}
        y1={64}
        x2={rulerStartX}
        y2={288}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.reference.join(' ')}
      />
      <line
        x1={rulerStartX + rulerL0Px}
        y1={64}
        x2={rulerStartX + rulerL0Px}
        y2={156}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.reference.join(' ')}
      />

      {/* 垂直高度不变参考线（上下两条淡绿基准线穿过运动飞船上下缘） */}
      <line
        x1={68}
        y1={movingShipY}
        x2={576}
        y2={movingShipY}
        stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.4)}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.guide.join(' ')}
      />
      <line
        x1={68}
        y1={movingShipY + shipHeight}
        x2={576}
        y2={movingShipY + shipHeight}
        stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.4)}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.guide.join(' ')}
      />
      <line
        x1={76}
        y1={movingShipY}
        x2={76}
        y2={movingShipY + shipHeight}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={STROKE.tickBold}
      />
      <text
        x={70}
        y={movingShipY + shipHeight / 2 - 4}
        textAnchor="end"
        fill={PHYSICS_COLORS.wavelengthGreen}
        fontSize={font(10)}
        fontWeight="bold"
      >
        h = h₀
      </text>
      <text
        x={70}
        y={movingShipY + shipHeight / 2 + 12}
        textAnchor="end"
        fill={PHYSICS_COLORS.wavelengthGreen}
        fontSize={font(10)}
      >
        不变
      </text>

      {/* S' 静止飞船 (固有长度 L0 + 正圆舷窗) */}
      <rect
        x={rulerStartX}
        y={restShipY}
        width={rulerL0Px}
        height={shipHeight}
        rx={8}
        fill={shipFillRest}
        stroke={shipStroke}
        strokeWidth={STROKE.objectLine}
      />
      <polygon
        points={`${rulerStartX + rulerL0Px},${restShipY} ${rulerStartX + rulerL0Px + 22},${restShipY + shipHeight / 2} ${rulerStartX + rulerL0Px},${restShipY + shipHeight}`}
        fill={shipFill}
        stroke={shipStroke}
        strokeWidth={STROKE.objectLine}
      />
      {portholeFractions.map((frac) => (
        <ellipse
          key={`rest-porthole-${frac}`}
          cx={rulerStartX + rulerL0Px * frac}
          cy={restShipY + shipHeight / 2}
          rx={portholeR}
          ry={portholeR}
          fill={withAlpha(PHYSICS_COLORS.glassFill, 0.85)}
          stroke={withAlpha(shipStroke, 0.65)}
          strokeWidth={STROKE.tick}
        />
      ))}
      <text
        x={rulerStartX + rulerL0Px / 2}
        y={restShipY - 8}
        textAnchor="middle"
        fill={PHYSICS_COLORS.displacement}
        fontSize={font(11)}
        fontWeight="bold"
      >
        S&apos; 静止系：固有长度 L₀（正圆舷窗 · 随物最长）
      </text>

      {/* S 地面观测飞船 (收缩长度 L = L0 / gamma + 竖椭圆舷窗) */}
      <rect
        x={shipLeft}
        y={movingShipY}
        width={rulerL0Px}
        height={shipHeight}
        rx={8}
        fill="none"
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.guide.join(' ')}
      />
      <rect
        x={shipLeft}
        y={movingShipY}
        width={lPx}
        height={shipHeight}
        rx={8}
        fill={withAlpha(PHYSICS_COLORS.velocity, 0.2)}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={STROKE.objectLine}
      />
      <polygon
        points={`${shipLeft + lPx},${movingShipY} ${shipLeft + lPx + 22 * lengthRatio},${movingShipY + shipHeight / 2} ${shipLeft + lPx},${movingShipY + shipHeight}`}
        fill={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={STROKE.objectLine}
      />
      {portholeFractions.map((frac) => (
        <ellipse
          key={`moving-porthole-${frac}`}
          cx={shipLeft + lPx * frac}
          cy={movingShipY + shipHeight / 2}
          rx={portholeRx}
          ry={portholeR}
          fill={withAlpha(PHYSICS_COLORS.glassFill, 0.9)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.tick}
        />
      ))}

      {/* 首尾同时测量光门 */}
      <line
        x1={shipLeft}
        y1={movingShipY - 12}
        x2={shipLeft}
        y2={282}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.projection.join(' ')}
      />
      <line
        x1={shipLeft + lPx}
        y1={movingShipY - 12}
        x2={shipLeft + lPx}
        y2={282}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.projection.join(' ')}
      />
      <circle cx={shipLeft} cy={movingShipY - 12} r={3.5} fill={PHYSICS_COLORS.acceleration} />
      <circle cx={shipLeft + lPx} cy={movingShipY - 12} r={3.5} fill={PHYSICS_COLORS.acceleration} />
      <text
        x={shipLeft + Math.max(lPx / 2, 56)}
        y={movingShipY - 14}
        textAnchor="middle"
        fill={PHYSICS_COLORS.acceleration}
        fontSize={font(10)}
        fontWeight="bold"
      >
        同时测首尾 (t₁ = t₂)
      </text>

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
        x={panelX}
        y={panelY}
        width={panelW}
        height={panelH}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <text x={panelX + 18} y={panelY + 28} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
        尺缩测量读数
      </text>
      <text x={panelX + 18} y={panelY + 56} fill={PHYSICS_COLORS.velocity} fontSize={font(12)}>
        v = {formatRelativityBeta(beta)} c
      </text>
      <text x={panelX + 18} y={panelY + 82} fill={PHYSICS_COLORS.acceleration} fontSize={font(12)}>
        γ = {gamma.toFixed(3)}
      </text>
      <text x={panelX + 18} y={panelY + 108} fill={PHYSICS_COLORS.displacement} fontSize={font(12)} fontWeight="bold">
        L = {lengthRatio.toFixed(3)} L₀
      </text>
      <text x={panelX + 18} y={panelY + 136} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
        t = {simultaneity.groundTime.toFixed(2)}s · τ = {simultaneity.properTime.toFixed(2)}s
      </text>
      <text x={panelX + 18} y={panelY + 164} fill={PHYSICS_COLORS.wavelengthGreen} fontSize={font(11)} fontWeight="bold">
        垂直高度：h = h₀（不缩）
      </text>
      <text x={panelX + 18} y={panelY + 190} fill={CANVAS_COLORS.textMuted} fontSize={font(11)}>
        正圆舷窗压成竖椭圆
      </text>

      {/* 分隔线 */}
      <line
        x1={dividerLeft}
        y1={dividerY}
        x2={dividerRight}
        y2={dividerY}
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
        x={primeCardX}
        y={cardY}
        width={primeCardW}
        height={cardH}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <text
        x={primeCardX + primeCardW / 2}
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
      <circle cx={220} cy={sCarriageCy} r={6} fill={PHYSICS_COLORS.wavelengthGreen} />
      <line
        x1={220}
        y1={sCarriageCy}
        x2={220 - primeRayPx}
        y2={sCarriageCy}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={STROKE.vectorSub}
      />
      <line
        x1={220}
        y1={sCarriageCy}
        x2={220 + primeRayPx}
        y2={sCarriageCy}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={STROKE.vectorSub}
      />
      <circle
        cx={220 - primeRayPx}
        cy={sCarriageCy}
        r={simultaneity.primeHitBoth ? 5 : 3.5}
        fill={PHYSICS_COLORS.wavelengthGreen}
      />
      <circle
        cx={220 + primeRayPx}
        cy={sCarriageCy}
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
        x={groundCardX}
        y={cardY}
        width={groundCardW}
        height={cardH}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <text
        x={groundCardX + groundCardW / 2}
        y={412}
        textAnchor="middle"
        fill={PHYSICS_COLORS.velocity}
        fontSize={font(12)}
        fontWeight="bold"
      >
        S 系（地面观察：后壁迎光、前壁退让）
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

      {/* 车厢速度矢量（A 迎光、B 退让） */}
      {beta >= 0.05 && (
        <g>
          <VectorArrow
            originDesign={{ x: wallADesignX, y: 452 }}
            vector={{ x: 1, y: 0 }}
            type="velocity"
            arrowType="visual-only"
            pixelLength={22}
            sceneScale={sceneScale}
            font={font}
          />
          <VectorArrow
            originDesign={{ x: wallBDesignX, y: 452 }}
            vector={{ x: 1, y: 0 }}
            type="velocity"
            arrowType="visual-only"
            pixelLength={22}
            sceneScale={sceneScale}
            font={font}
          />
        </g>
      )}

      {/* 地面系发光位置参考虚线 & 对称光波前圆弧 */}
      <line
        x1={emitDesignX}
        y1={436}
        x2={emitDesignX}
        y2={514}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.projection.join(' ')}
      />
      {sWaveRadius > 6 && (
        <g>
          {!simultaneity.hitA && (
            <path
              d={`M ${emitDesignX - arcDx} ${sCarriageCy - arcDy} A ${sWaveRadius} ${sWaveRadius} 0 0 0 ${emitDesignX - arcDx} ${sCarriageCy + arcDy}`}
              fill="none"
              stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.55)}
              strokeWidth={STROKE.reference}
              strokeDasharray={DASH.projection.join(' ')}
            />
          )}
          <path
            d={`M ${emitDesignX + arcDx} ${sCarriageCy - arcDy} A ${sWaveRadius} ${sWaveRadius} 0 0 1 ${emitDesignX + arcDx} ${sCarriageCy + arcDy}`}
            fill="none"
            stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.55)}
            strokeWidth={STROKE.reference}
            strokeDasharray={DASH.projection.join(' ')}
          />
        </g>
      )}

      <circle cx={emitDesignX} cy={sCarriageCy} r={6} fill={PHYSICS_COLORS.wavelengthGreen} />
      <line
        className="simultaneity-s-left-beam"
        x1={emitDesignX}
        y1={sCarriageCy}
        x2={leftRayDesignX}
        y2={sCarriageCy}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={STROKE.vectorSub}
      />
      {simultaneity.hitA && (
        <circle
          cx={leftRayDesignX}
          cy={sCarriageCy}
          r={8}
          fill="none"
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.tickBold}
        />
      )}
      <circle
        cx={leftRayDesignX}
        cy={sCarriageCy}
        r={simultaneity.hitA ? 5 : 3.5}
        fill={simultaneity.hitA ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.wavelengthGreen}
      />
      <line
        className="simultaneity-s-right-beam"
        x1={emitDesignX}
        y1={sCarriageCy}
        x2={rightRayDesignX}
        y2={sCarriageCy}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={STROKE.vectorSub}
      />
      {simultaneity.hitB && (
        <circle
          cx={rightRayDesignX}
          cy={sCarriageCy}
          r={8}
          fill="none"
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.tickBold}
        />
      )}
      <circle
        cx={rightRayDesignX}
        cy={sCarriageCy}
        r={simultaneity.hitB ? 5 : 3.5}
        fill={simultaneity.hitB ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.wavelengthGreen}
      />
      {!simultaneity.hitB && wallBDesignX - rightRayDesignX > 4 && (
        <line
          x1={rightRayDesignX + 4}
          y1={sCarriageCy}
          x2={wallBDesignX}
          y2={sCarriageCy}
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
