import {
  MagneticFieldGrid,
  PhysicsVectorArrow,
  SpringBalance,
  VectorArrow,
} from '@/components/Physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import {
  CANVAS_COLORS,
  CHART_COLORS,
  EM_COLORS,
  PHYSICS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { MagneticFluxPhysicsResult } from '../hooks/useMagneticFluxPhysics'

interface MagneticFluxSceneProps {
  physics: MagneticFluxPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
}

const SPRING_MAX_FORCE = 3.5
const SPRING_SCALE = 0.65
const SPRING_BODY_H = 140
const SPRING_HOOK_BASE = 36

/**
 * 磁感应强度与磁通量场景渲染组件（splitV 上屏 840×325）。
 *
 * - mode = 0: 控制变量法探究磁感应强度 B = F/(IL)
 * - mode = 1: 一般倾斜线圈的有效投影面积 S⊥ = S·cosθ 与磁通量 Φ
 */
export function MagneticFluxScene({
  physics,
  canvasSize,
  sceneScale,
}: MagneticFluxSceneProps) {
  const { font } = canvasSize

  if (physics.mode === 0) {
    const r = physics.ratioExp
    // 实验装置锚点（设计坐标约 x = 260, y = 162.5）
    const labAnchor = worldToDesign(-1.6, 0, sceneScale)
    const cx = labAnchor.px

    // 弹簧秤拉伸计算（严格匹配 SpringBalance 内部几何公式）
    const stretchRatio = Math.min(1, Math.max(0, r.springReadingT / SPRING_MAX_FORCE))
    const pointerOffsetPx = stretchRatio * (SPRING_BODY_H - 40)
    const springTopY = 40
    const springHookY =
      springTopY + (SPRING_BODY_H + SPRING_HOOK_BASE + pointerOffsetPx * 0.2) * SPRING_SCALE

    // 悬吊通电线框与抽头几何
    const frameTopY = springHookY + 12
    const frameH = 62
    const wireY = frameTopY + frameH
    const maxWireHalfW = 115 // L = 0.25m 对应半宽
    const minWireHalfW = 35 // L = 0.05m 对应半宽
    const activeHalfW =
      minWireHalfW + ((r.L - 0.05) / 0.2) * (maxWireHalfW - minWireHalfW)

    // 匀强磁场矩形区域（覆盖全抽头宽）
    const fieldX = cx - maxWireHalfW - 18
    const fieldY = 196
    const fieldW = (maxWireHalfW + 18) * 2
    const fieldH = 92
    const bOpacity = Math.max(0.18, 0.72 * Math.sin((r.thetaIB * Math.PI) / 180))

    // 右侧数据卡片面板
    const cardX = 508
    const cardY = 18
    const cardW = 314
    const cardH = 288

    // 非垂直倾角小示意图中心（放置在左侧独立净区）
    const angleDiagX = 56
    const angleDiagY = 122
    const radIB = (r.thetaIB * Math.PI) / 180

    return (
      <g>
        {/* 1. 铁架台横梁与悬挂固定点 */}
        <line
          x1={cx - 115}
          y1={22}
          x2={cx + 115}
          y2={22}
          stroke={SCENE_COLORS.materials.structStrokeMid}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <rect
          x={cx - 8}
          y={16}
          width={16}
          height={14}
          rx={3}
          fill={SCENE_COLORS.materials.structStrokeDark}
        />

        {/* 2. 待测匀强磁场区 */}
        <rect
          x={fieldX}
          y={fieldY}
          width={fieldW}
          height={fieldH}
          rx={8}
          fill={withAlpha(EM_COLORS.magneticField, 0.07)}
          stroke={withAlpha(EM_COLORS.magneticField, 0.35)}
          strokeWidth={STROKE.reference}
          strokeDasharray="6,4"
        />
        <MagneticFieldGrid
          x={fieldX + 8}
          y={fieldY + 6}
          w={fieldW - 16}
          h={fieldH - 12}
          direction="in"
          rows={3}
          cols={6}
          radius={6.5}
          opacity={bOpacity}
        />
        <text
          x={fieldX}
          y={fieldY + fieldH + 16}
          fontSize={font(10)}
          fill={EM_COLORS.magneticField}
          fontWeight="bold"
        >
          {`待测匀强磁场 B = ${r.B.toFixed(1)} T`}
        </text>

        {/* 3. 弹簧测力计 */}
        <SpringBalance
          x={cx}
          y={springTopY}
          force={r.springReadingT}
          maxForce={SPRING_MAX_FORCE}
          scale={SPRING_SCALE}
        />
        <text
          x={cx + 22}
          y={springTopY + 40}
          fontSize={font(11)}
          fill={PHYSICS_COLORS.elasticForce}
          fontWeight="bold"
        >
          {`T = ${r.springReadingT.toFixed(2)} N`}
        </text>
        <text
          x={cx + 22}
          y={springTopY + 55}
          fontSize={font(9.5)}
          fill={CANVAS_COLORS.labelTextLight}
        >
          {`(G₀=${r.wireGravityG.toFixed(2)}N + F=${r.ampereForceF.toFixed(2)}N)`}
        </text>

        {/* 4. 吊线与通电导线框（两端随有效接入长度 L 切换抽头） */}
        <line
          x1={cx}
          y1={springHookY}
          x2={cx}
          y2={frameTopY}
          stroke={SCENE_COLORS.materials.structStrokeDark}
          strokeWidth={STROKE.objectLine}
        />
        {/* 绝缘横梁（覆盖最大抽头宽度） */}
        <line
          x1={cx - maxWireHalfW}
          y1={frameTopY}
          x2={cx + maxWireHalfW}
          y2={frameTopY}
          stroke={SCENE_COLORS.materials.structStrokeMid}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={frameTopY} r={3.5} fill={SCENE_COLORS.materials.structStrokeDark} />

        {/* 未接入长度段（浅虚线底托，体现抽头可调） */}
        <line
          x1={cx - maxWireHalfW}
          y1={wireY}
          x2={cx + maxWireHalfW}
          y2={wireY}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={3}
          strokeDasharray="4,3"
        />

        {/* 左右接入导臂 */}
        <polyline
          points={`${cx - activeHalfW},${frameTopY} ${cx - activeHalfW},${wireY}`}
          fill="none"
          stroke={SCENE_COLORS.coil.copperBase}
          strokeWidth={2.5}
        />
        <polyline
          points={`${cx + activeHalfW},${frameTopY} ${cx + activeHalfW},${wireY}`}
          fill="none"
          stroke={SCENE_COLORS.coil.copperBase}
          strokeWidth={2.5}
        />

        {/* 通电有效直导线段 L（电流向左，配合向里磁场产生竖直向下的安培力） */}
        <line
          x1={cx - activeHalfW}
          y1={wireY}
          x2={cx + activeHalfW}
          y2={wireY}
          stroke={EM_COLORS.electricCurrent}
          strokeWidth={4.5}
          strokeLinecap="round"
        />

        {/* 5 档抽头刻度指示点（复用 physics.ratioExp.tapSamples） */}
        {r.tapSamples.map((pt) => {
          const half = minWireHalfW + ((pt.L - 0.05) / 0.2) * (maxWireHalfW - minWireHalfW)
          const isCurrent = Math.abs(pt.L - r.L) < 0.005
          return (
            <g key={pt.L}>
              <circle
                cx={cx - half}
                cy={wireY}
                r={isCurrent ? 4.2 : 2.5}
                fill={isCurrent ? EM_COLORS.electricCurrent : CANVAS_COLORS.white}
                stroke={isCurrent ? CANVAS_COLORS.strokeDark : CANVAS_COLORS.textMuted}
                strokeWidth={1.2}
              />
              <circle
                cx={cx + half}
                cy={wireY}
                r={isCurrent ? 4.2 : 2.5}
                fill={isCurrent ? EM_COLORS.electricCurrent : CANVAS_COLORS.white}
                stroke={isCurrent ? CANVAS_COLORS.strokeDark : CANVAS_COLORS.textMuted}
                strokeWidth={1.2}
              />
            </g>
          )
        })}

        {/* 有效长度双端尺寸标注（线框内上层，留出下部矢量区空间） */}
        <line
          x1={cx - activeHalfW + 4}
          y1={frameTopY + 16}
          x2={cx + activeHalfW - 4}
          y2={frameTopY + 16}
          stroke={CANVAS_COLORS.labelTextLight}
          strokeWidth={STROKE.annotation}
          strokeDasharray="3,2"
        />
        <text
          x={cx}
          y={frameTopY + 12}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
          textAnchor="middle"
        >
          {`L = ${r.L.toFixed(2)} m`}
        </text>

        {/* 电流方向指示箭头（向左） */}
        <VectorArrow
          originDesign={{ x: cx + 18, y: wireY - 12 }}
          vector={{ x: -1, y: 0 }}
          type="currentDirection"
          arrowType="visual-only"
          sceneScale={sceneScale}
          pixelLength={36}
          strokeWidth={STROKE.vectorSub}
          font={font}
        />
        <text
          x={cx + 24}
          y={wireY - 8}
          fontSize={font(10)}
          fill={EM_COLORS.electricCurrent}
          fontWeight="bold"
        >
          {`I = ${r.I.toFixed(1)} A`}
        </text>

        {/* 6. 物理受力矢量：自重 G₀ 与 安培力 F_安（均竖直向下） */}
        <PhysicsVectorArrow
          originDesign={{ x: cx - 12, y: wireY }}
          vector={{ x: 0, y: -r.wireGravityG }}
          type="gravity"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorSub}
          label="G₀"
          labelPlacement="side"
          font={font}
        />
        {r.ampereForceF > 1e-4 && (
          <PhysicsVectorArrow
            originDesign={{ x: cx + 12, y: wireY }}
            vector={{ x: 0, y: -r.ampereForceF }}
            type="lorentzForce"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
            label={`F=${r.ampereForceF.toFixed(2)}N`}
            labelPlacement="side"
            font={font}
          />
        )}

        {/* 7. 夹角 θ_IB 俯视分解小图 */}
        <g>
          <rect
            x={angleDiagX - 42}
            y={angleDiagY - 46}
            width={88}
            height={78}
            rx={6}
            fill={CANVAS_COLORS.white}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={1}
          />
          <text
            x={angleDiagX + 2}
            y={angleDiagY - 31}
            fontSize={font(9)}
            fill={CANVAS_COLORS.labelTextLight}
            textAnchor="middle"
            fontWeight="bold"
          >
            {`俯视夹角 ${r.thetaIB.toFixed(0)}°`}
          </text>
          <line
            x1={angleDiagX + 26}
            y1={angleDiagY + 8}
            x2={angleDiagX - 24}
            y2={angleDiagY + 8}
            stroke={EM_COLORS.electricCurrent}
            strokeWidth={2}
          />
          <text
            x={angleDiagX - 30}
            y={angleDiagY + 11}
            fontSize={font(9)}
            fill={EM_COLORS.electricCurrent}
            fontWeight="bold"
          >
            I
          </text>
          <line
            x1={angleDiagX}
            y1={angleDiagY + 8}
            x2={angleDiagX - 28 * Math.cos(radIB)}
            y2={angleDiagY + 8 - 28 * Math.sin(radIB)}
            stroke={EM_COLORS.magneticField}
            strokeWidth={2.2}
          />
          <text
            x={angleDiagX - 32 * Math.cos(radIB) + 4}
            y={angleDiagY + 8 - 32 * Math.sin(radIB)}
            fontSize={font(9)}
            fill={EM_COLORS.magneticField}
            fontWeight="bold"
          >
            B
          </text>
          <text
            x={angleDiagX + 2}
            y={angleDiagY + 25}
            fontSize={font(8.5)}
            fill={EM_COLORS.magneticField}
            textAnchor="middle"
          >
            {`B⊥ = ${r.B_perp.toFixed(2)} T`}
          </text>
        </g>

        {/* 8. 右侧控制变量定量测量读数面板 */}
        <g>
          <rect
            x={cardX}
            y={cardY}
            width={cardW}
            height={cardH}
            rx={10}
            fill={CANVAS_COLORS.white}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={1.2}
          />
          <rect
            x={cardX}
            y={cardY}
            width={cardW}
            height={32}
            rx={10}
            fill={withAlpha(EM_COLORS.magneticField, 0.1)}
          />
          <text
            x={cardX + 14}
            y={cardY + 21}
            fontSize={font(12)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
          >
            比值定义实验实时测量卡
          </text>

          <text x={cardX + 16} y={cardY + 56} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
            检验电流 I
          </text>
          <text
            x={cardX + cardW - 16}
            y={cardY + 56}
            fontSize={font(12)}
            fill={EM_COLORS.electricCurrent}
            fontWeight="bold"
            textAnchor="end"
          >
            {`${r.I.toFixed(2)} A`}
          </text>

          <text x={cardX + 16} y={cardY + 82} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
            有效长度 L
          </text>
          <text
            x={cardX + cardW - 16}
            y={cardY + 82}
            fontSize={font(12)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
            textAnchor="end"
          >
            {`${r.L.toFixed(2)} m`}
          </text>

          <text x={cardX + 16} y={cardY + 108} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
            电流元乘积 I·L
          </text>
          <text
            x={cardX + cardW - 16}
            y={cardY + 108}
            fontSize={font(12)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
            textAnchor="end"
          >
            {`${r.currentElementIL.toFixed(3)} A·m`}
          </text>

          <text x={cardX + 16} y={cardY + 134} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
            净安培力 F = T − G₀
          </text>
          <text
            x={cardX + cardW - 16}
            y={cardY + 134}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="bold"
            textAnchor="end"
          >
            {`${r.ampereForceF.toFixed(3)} N`}
          </text>

          <line
            x1={cardX + 14}
            y1={cardY + 150}
            x2={cardX + cardW - 14}
            y2={cardY + 150}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={1}
          />

          <rect
            x={cardX + 14}
            y={cardY + 162}
            width={cardW - 28}
            height={54}
            rx={6}
            fill={withAlpha(EM_COLORS.magneticField, 0.12)}
            stroke={withAlpha(EM_COLORS.magneticField, 0.45)}
            strokeWidth={1}
          />
          <text
            x={cardX + 24}
            y={cardY + 183}
            fontSize={font(11)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
          >
            实测比值 F / (I·L)
          </text>
          <text
            x={cardX + cardW - 24}
            y={cardY + 185}
            fontSize={font(13.5)}
            fill={EM_COLORS.magneticField}
            fontWeight="bold"
            textAnchor="end"
          >
            {`${r.measuredRatio.toFixed(2)} N/(A·m)`}
          </text>
          <text
            x={cardX + 24}
            y={cardY + 204}
            fontSize={font(10)}
            fill={CANVAS_COLORS.labelTextLight}
          >
            {r.thetaIB < 0.5
              ? '平行放置 (I∥B)：F = 0，无法由比值测定 B'
              : Math.abs(r.thetaIB - 90) < 0.5
                ? `垂直放置：B = F/(IL) = ${r.B.toFixed(2)} T（固有恒定）`
                : `斜交放置：B⊥ = B·sinθ_IB = ${r.B_perp.toFixed(2)} T (B = ${r.B.toFixed(2)} T)`}
          </text>

          <text
            x={cardX + 16}
            y={cardY + 238}
            fontSize={font(10)}
            fill={CANVAS_COLORS.textMuted}
            fontWeight="bold"
          >
            不同抽头下的 F/(I·L) 比值对照：
          </text>
          {r.tapSamples.map((pt, idx) => {
            const colX = cardX + 16 + idx * 57
            const active = Math.abs(pt.L - r.L) < 0.005
            return (
              <g key={pt.L}>
                <rect
                  x={colX}
                  y={cardY + 246}
                  width={53}
                  height={32}
                  rx={4}
                  fill={
                    active
                      ? withAlpha(PHYSICS_COLORS.lorentzForce, 0.14)
                      : CANVAS_COLORS.objectFillNeutral
                  }
                  stroke={active ? PHYSICS_COLORS.lorentzForce : CANVAS_COLORS.grid}
                  strokeWidth={active ? 1.4 : 0.8}
                />
                <text
                  x={colX + 26.5}
                  y={cardY + 259}
                  fontSize={font(8.5)}
                  fill={CANVAS_COLORS.labelTextLight}
                  textAnchor="middle"
                >
                  {`${pt.L.toFixed(2)}m`}
                </text>
                <text
                  x={colX + 26.5}
                  y={cardY + 272}
                  fontSize={font(9)}
                  fill={active ? PHYSICS_COLORS.lorentzForce : EM_COLORS.magneticField}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {`${(pt.F / Math.max(pt.x, 1e-6)).toFixed(2)}`}
                </text>
              </g>
            )
          })}
        </g>
      </g>
    )
  }

  // ─── mode = 1：一般倾斜情形的投影面积 S⊥ = S·cosθ 与磁通量 Φ ──────────────
  const f = physics.fluxState
  const coilOrigin = worldToDesign(-1.65, 0, sceneScale)
  const cx = coilOrigin.px
  const cy = coilOrigin.py

  const halfH = 44 + 44 * Math.sqrt(f.S)
  const rad = (f.thetaNormal * Math.PI) / 180
  const cosTheta = f.cosTheta
  const sinTheta = f.sinTheta
  const absCos = Math.abs(cosTheta)

  const depthX = 28
  const depthY = -12

  const topBase = { x: cx - halfH * sinTheta, y: cy - halfH * cosTheta }
  const botBase = { x: cx + halfH * sinTheta, y: cy + halfH * cosTheta }

  const p1 = { x: topBase.x - depthX, y: topBase.y - depthY }
  const p2 = { x: topBase.x + depthX, y: topBase.y + depthY }
  const p3 = { x: botBase.x + depthX, y: botBase.y + depthY }
  const p4 = { x: botBase.x - depthX, y: botBase.y - depthY }
  const coilPointsStr = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`

  const projX = 415
  const projHalfH = halfH * absCos
  const projTop = { x: projX, y: topBase.y }
  const projBot = { x: projX, y: botBase.y }
  const pp1 = { x: projTop.x - depthX, y: projTop.y - depthY }
  const pp2 = { x: projTop.x + depthX, y: projTop.y + depthY }
  const pp3 = { x: projBot.x + depthX, y: projBot.y + depthY }
  const pp4 = { x: projBot.x - depthX, y: projBot.y - depthY }
  const projPointsStr = `${pp1.x},${pp1.y} ${pp2.x},${pp2.y} ${pp3.x},${pp3.y} ${pp4.x},${pp4.y}`

  const fieldStartX = 42
  const fieldEndX = 486
  const fieldLineIndices = [-4, -3, -2, -1, 0, 1, 2, 3, 4]

  const isFront = f.fluxSide === 'front'
  const isParallel = f.fluxSide === 'parallel'
  const coilFill = isParallel
    ? withAlpha(CANVAS_COLORS.axis, 0.15)
    : isFront
      ? withAlpha(PHYSICS_COLORS.velocity, 0.18)
      : withAlpha(PHYSICS_COLORS.emf, 0.2)
  const coilStroke = isParallel
    ? CANVAS_COLORS.strokeDark
    : isFront
      ? SCENE_COLORS.coil.copperBase
      : PHYSICS_COLORS.emf

  const arcR = 30
  const arcEndX = cx + arcR * Math.cos(rad)
  const arcEndY = cy - arcR * Math.sin(rad)
  const arcPath =
    f.thetaNormal > 1 && f.thetaNormal < 179
      ? `M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 0 0 ${arcEndX} ${arcEndY}`
      : ''

  const infoX = 514
  const infoY = 18
  const infoW = 308
  const infoH = 288

  return (
    <g>
      {/* 1. 匀强磁场 B 水平磁感线阵列 */}
      {fieldLineIndices.map((k) => {
        const yPos = cy + (k / 4) * halfH
        const passesCoil = absCos >= 0.02 && Math.abs(k) / 4 <= absCos + 1e-4
        const lineColor = passesCoil ? EM_COLORS.magneticField : EM_COLORS.magneticFieldLine
        const lineOpacity = passesCoil ? 0.92 : 0.35
        const lineWidth = passesCoil ? 2.1 : 1.1
        return (
          <g key={k} opacity={lineOpacity}>
            <line
              x1={fieldStartX}
              y1={yPos}
              x2={fieldEndX - 8}
              y2={yPos}
              stroke={lineColor}
              strokeWidth={lineWidth}
            />
            <polygon
              points={`${fieldEndX},${yPos} ${fieldEndX - 9},${yPos - 3.5} ${fieldEndX - 9},${yPos + 3.5}`}
              fill={lineColor}
            />
          </g>
        )
      })}
      <text
        x={fieldStartX + 4}
        y={32}
        fontSize={font(11)}
        fill={EM_COLORS.magneticField}
        fontWeight="bold"
      >
        {`匀强磁场 B = ${f.B.toFixed(1)} T  （穿入磁感线 ${f.effectiveLineCount} / ${fieldLineIndices.length} 条）`}
      </text>

      {/* 2. 投影辅助连线与垂直投影面 S⊥ */}
      {physics.showProjGuide && (
        <g>
          <line
            x1={p2.x}
            y1={p2.y}
            x2={pp2.x}
            y2={pp2.y}
            stroke={EM_COLORS.magneticField}
            strokeWidth={STROKE.guide}
            strokeDasharray="4,3"
            opacity={0.7}
          />
          <line
            x1={p3.x}
            y1={p3.y}
            x2={pp3.x}
            y2={pp3.y}
            stroke={EM_COLORS.magneticField}
            strokeWidth={STROKE.guide}
            strokeDasharray="4,3"
            opacity={0.7}
          />
          <line
            x1={p1.x}
            y1={p1.y}
            x2={pp1.x}
            y2={pp1.y}
            stroke={EM_COLORS.magneticField}
            strokeWidth={STROKE.guide}
            strokeDasharray="4,3"
            opacity={0.45}
          />
          <line
            x1={p4.x}
            y1={p4.y}
            x2={pp4.x}
            y2={pp4.y}
            stroke={EM_COLORS.magneticField}
            strokeWidth={STROKE.guide}
            strokeDasharray="4,3"
            opacity={0.45}
          />

          {absCos > 0.02 ? (
            <polygon
              points={projPointsStr}
              fill={withAlpha(EM_COLORS.magneticField, 0.22)}
              stroke={EM_COLORS.magneticField}
              strokeWidth={1.8}
              strokeDasharray="5,3"
            />
          ) : (
            <line
              x1={projX - depthX}
              y1={cy - depthY}
              x2={projX + depthX}
              y2={cy + depthY}
              stroke={EM_COLORS.magneticField}
              strokeWidth={2}
              strokeDasharray="4,3"
            />
          )}

          <text
            x={projX}
            y={cy + projHalfH + 26}
            fontSize={font(10.5)}
            fill={EM_COLORS.magneticField}
            fontWeight="bold"
            textAnchor="middle"
          >
            {`S⊥ = ${f.projAreaSPerp.toFixed(2)} m²`}
          </text>
        </g>
      )}

      {/* 3. 可旋转立体矩形线圈（面积 S，带 A 端翻转标识） */}
      <polygon
        points={coilPointsStr}
        fill={coilFill}
        stroke={coilStroke}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <circle cx={topBase.x} cy={topBase.y} r={3.5} fill={coilStroke} />
      <text
        x={topBase.x - 14 * sinTheta + 10}
        y={topBase.y - 12 * cosTheta + 4}
        fontSize={font(10)}
        fill={coilStroke}
        fontWeight="bold"
        textAnchor="middle"
      >
        A
      </text>
      <circle cx={cx} cy={cy} r={3.5} fill={CANVAS_COLORS.originMark} />
      <text
        x={cx - 42}
        y={cy + halfH + 26}
        fontSize={font(10)}
        fill={coilStroke}
        fontWeight="bold"
        textAnchor="middle"
      >
        {`线圈面积 S = ${f.S.toFixed(1)} m²`}
      </text>

      {/* 4. 线圈法线矢量 n̂ 与夹角 θ 标识 */}
      {physics.showNormalVec && (
        <g>
          <line
            x1={cx}
            y1={cy}
            x2={cx + 58}
            y2={cy}
            stroke={CANVAS_COLORS.labelTextLight}
            strokeWidth={1.2}
            strokeDasharray="4,3"
          />
          {arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke={CHART_COLORS.compareD}
              strokeWidth={1.8}
            />
          )}
          <VectorArrow
            originDesign={{ x: cx, y: cy }}
            vector={{ x: cosTheta, y: sinTheta }}
            type="velocity"
            arrowType="visual-only"
            sceneScale={sceneScale}
            pixelLength={56}
            color={CHART_COLORS.compareD}
            strokeWidth={STROKE.vectorSub}
            dashed
            label="n̂"
            font={font}
          />
          {f.thetaNormal > 1 && f.thetaNormal < 179 && (
            <text
              x={cx + 38 * Math.cos(rad / 2)}
              y={cy - 38 * Math.sin(rad / 2) - 2}
              fontSize={font(10)}
              fill={CHART_COLORS.compareD}
              fontWeight="bold"
              textAnchor="middle"
            >
              {`θ=${f.thetaNormal.toFixed(0)}°`}
            </text>
          )}
        </g>
      )}

      {/* 5. 右侧磁通量状态数据面板 */}
      <g>
        <rect
          x={infoX}
          y={infoY}
          width={infoW}
          height={infoH}
          rx={10}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1.2}
        />
        <rect
          x={infoX}
          y={infoY}
          width={infoW}
          height={32}
          rx={10}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.09)}
        />
        <text
          x={infoX + 14}
          y={infoY + 21}
          fontSize={font(12)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          投影面积与磁通量测量卡
        </text>

        <text x={infoX + 16} y={infoY + 56} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
          法线与 B 夹角 θ
        </text>
        <text
          x={infoX + infoW - 16}
          y={infoY + 56}
          fontSize={font(12)}
          fill={CHART_COLORS.compareD}
          fontWeight="bold"
          textAnchor="end"
        >
          {`${f.thetaNormal.toFixed(0)}°  (cosθ = ${f.cosTheta.toFixed(2)})`}
        </text>

        <text x={infoX + 16} y={infoY + 82} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
          平面与 B 夹角 α
        </text>
        <text
          x={infoX + infoW - 16}
          y={infoY + 82}
          fontSize={font(12)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
          textAnchor="end"
        >
          {`${f.planeAngleAbs.toFixed(0)}°  (sinα = ${Math.abs(f.cosTheta).toFixed(2)})`}
        </text>

        <text x={infoX + 16} y={infoY + 108} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
          有效投影面积 S⊥ = S|cosθ|
        </text>
        <text
          x={infoX + infoW - 16}
          y={infoY + 108}
          fontSize={font(12)}
          fill={EM_COLORS.magneticField}
          fontWeight="bold"
          textAnchor="end"
        >
          {`${f.projAreaSPerp.toFixed(3)} m²`}
        </text>

        <line
          x1={infoX + 14}
          y1={infoY + 124}
          x2={infoX + infoW - 14}
          y2={infoY + 124}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />

        <rect
          x={infoX + 14}
          y={infoY + 136}
          width={infoW - 28}
          height={64}
          rx={6}
          fill={
            isParallel
              ? CANVAS_COLORS.objectFillNeutral
              : isFront
                ? withAlpha(PHYSICS_COLORS.velocity, 0.1)
                : withAlpha(PHYSICS_COLORS.emf, 0.12)
          }
          stroke={isParallel ? CANVAS_COLORS.grid : coilStroke}
          strokeWidth={1}
        />
        <text
          x={infoX + 24}
          y={infoY + 158}
          fontSize={font(11)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          当前磁通量 Φ = B·S·cosθ
        </text>
        <text
          x={infoX + infoW - 24}
          y={infoY + 160}
          fontSize={font(14)}
          fill={isParallel ? CANVAS_COLORS.textMuted : coilStroke}
          fontWeight="bold"
          textAnchor="end"
        >
          {`${f.phi >= 0 ? '+' : ''}${f.phi.toFixed(3)} Wb`}
        </text>
        <text
          x={infoX + 24}
          y={infoY + 184}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelTextLight}
        >
          {isFront
            ? '穿入方向：磁感线从线圈正面穿入（Φ > 0）'
            : isParallel
              ? '穿入方向：线圈平面与磁场平行（Φ = 0）'
              : '穿入方向：磁感线从线圈反面穿入（Φ < 0）'}
        </text>

        <rect
          x={infoX + 14}
          y={infoY + 212}
          width={infoW - 28}
          height={60}
          rx={6}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />
        <text
          x={infoX + 24}
          y={infoY + 233}
          fontSize={font(10.5)}
          fill={CANVAS_COLORS.labelTextLight}
        >
          {`相对初态 (θ=0°, Φ₁=+${f.phiInitial.toFixed(2)} Wb) 的变化量`}
        </text>
        <text
          x={infoX + 24}
          y={infoY + 256}
          fontSize={font(12)}
          fill={PHYSICS_COLORS.acceleration}
          fontWeight="bold"
        >
          {`ΔΦ = Φ − Φ₁ = ${f.deltaPhiFromZero.toFixed(3)} Wb`}
        </text>
      </g>
    </g>
  )
}
