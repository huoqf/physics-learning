import { Ball, PhysicsVectorArrow, VectorArrow } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { worldToDesign } from '@/scene'
import { calculateCoulombPendulum, COULOMB_CONSTANT, GRAVITY } from '@/physics'
import { CANVAS_COLORS, PHYSICS_COLORS, SCENE_COLORS, STROKE, withAlpha } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { formatScientific } from '@/utils/formatNumber'
import { useShallow } from 'zustand/react/shallow'

/**
 * 库仑定律模式 2：库仑摆对称受力平衡与矢量三角形模型。
 * 等长绝缘细线悬于同一点 O，同号电荷排斥形成对称平衡角 θ。
 */
export default function CoulombPendulumMode() {
  const { params, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
    })),
  )

  const q1MicroC = params.q1 ?? 2
  const q2MicroC = params.q2 ?? 2
  const mGram = params.mGram ?? 20
  const stringLenCm = params.stringLenCm ?? 30

  const q1C = q1MicroC * 1e-6
  const q2C = q2MicroC * 1e-6
  const mKg = mGram * 1e-3
  const lenM = stringLenCm * 0.01
  const mg = mKg * GRAVITY

  const res = calculateCoulombPendulum(COULOMB_CONSTANT, q1C, q2C, mKg, lenM, GRAVITY)
  const hasZeroCharge = q1MicroC === 0 || q2MicroC === 0
  const separated = res.hasSeparatedEquilibrium && !hasZeroCharge
  const thetaDisplay = separated ? res.theta : 0
  const thetaDeg = (thetaDisplay * 180) / Math.PI

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })
  const { font } = canvasSize

  const forceScaleRef = Math.max(res.T, mg, res.F, 1e-6)
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'custom',
    customOriginX: 420,
    customOriginY: 96,
    physicsScaleDesign: 740,
    maxVectorLength: 88,
    refMagnitudes: {
      electricForce: forceScaleRef,
      gravity: forceScaleRef,
      tension: forceScaleRef,
    },
  })

  const toDesign = (wx: number, wy: number) => {
    const pt = worldToDesign(wx, wy, sceneScale)
    return { x: pt.px, y: pt.py }
  }

  const pivot = toDesign(0, 0)
  const leftWorldX = separated ? -lenM * Math.sin(thetaDisplay) : -0.022
  const rightWorldX = separated ? lenM * Math.sin(thetaDisplay) : 0.022
  const ballWorldY = -lenM * Math.cos(thetaDisplay)

  const leftBall = toDesign(leftWorldX, ballWorldY)
  const rightBall = toDesign(rightWorldX, ballWorldY)
  const plumbBottom = toDesign(0, -lenM - 0.04)

  const leftSign = q1MicroC > 0 ? '+' : q1MicroC < 0 ? '-' : 'none'
  const rightSign = q2MicroC > 0 ? '+' : q2MicroC < 0 ? '-' : 'none'

  // 偏角弧线（竖直向下为 90° = π/2，向左摆为 π/2 + θ，向右摆为 π/2 - θ）
  const arcR = 54
  const showAngleArc = separated && thetaDisplay > 0.04
  const arcRightStartX = pivot.x
  const arcRightStartY = pivot.y + arcR
  const arcRightEndX = pivot.x + arcR * Math.sin(thetaDisplay)
  const arcRightEndY = pivot.y + arcR * Math.cos(thetaDisplay)
  const arcLeftEndX = pivot.x - arcR * Math.sin(thetaDisplay)
  const arcLeftEndY = pivot.y + arcR * Math.cos(thetaDisplay)

  // 底部矢量三角形示意区（固定位于 y = 472..624，与上方最大摆长 40cm 完全分离不重叠）
  const triOriginX = 112
  const triOriginY = 505
  const triMaxH = 88
  const triScale = res.T > 1e-9 ? triMaxH / res.T : 1
  const triFgLen = separated ? Math.max(28, mg * triScale) : 64
  const triFeLen = separated ? Math.max(18, res.F * triScale) : 0

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      title="库仑摆对称受力与力三角形模型"
      desc="两等长绝缘细线悬于同一点 O，展示同号电荷相互排斥张开平衡时的对称偏角、受力矢量与闭合力三角形关系。"
    >
      {/* 天花板与悬挂支点 */}
      <line
        x1={240}
        y1={pivot.y}
        x2={600}
        y2={pivot.y}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.axisBold}
        strokeLinecap="round"
      />
      {Array.from({ length: 13 }, (_, i) => {
        const hx = 256 + i * 28
        return (
          <line
            key={`hatch-${i}`}
            x1={hx}
            y1={pivot.y}
            x2={hx + 10}
            y2={pivot.y - 12}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={STROKE.grid}
          />
        )
      })}
      <circle cx={pivot.x} cy={pivot.y} r={5} fill={SCENE_COLORS.materials.structStroke} />
      <text
        x={pivot.x}
        y={pivot.y - 18}
        fontSize={font(13)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
        textAnchor="middle"
      >
        悬点 O
      </text>

      {/* 竖直铅垂参考线 */}
      <line
        x1={pivot.x}
        y1={pivot.y}
        x2={plumbBottom.x}
        y2={plumbBottom.y}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray="5,4"
      />

      {/* 左右绝缘细线 */}
      <line
        x1={pivot.x}
        y1={pivot.y}
        x2={leftBall.x}
        y2={leftBall.y}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.objectLine}
      />
      <line
        x1={pivot.x}
        y1={pivot.y}
        x2={rightBall.x}
        y2={rightBall.y}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.objectLine}
      />

      {/* 对称偏角 θ 弧线 */}
      {showAngleArc && (
        <g>
          <path
            d={`M ${arcRightStartX} ${arcRightStartY} A ${arcR} ${arcR} 0 0 0 ${arcRightEndX} ${arcRightEndY}`}
            fill="none"
            stroke={PHYSICS_COLORS.electricForce}
            strokeWidth={STROKE.axis}
          />
          <path
            d={`M ${arcRightStartX} ${arcRightStartY} A ${arcR} ${arcR} 0 0 1 ${arcLeftEndX} ${arcLeftEndY}`}
            fill="none"
            stroke={CANVAS_COLORS.textMuted}
            strokeWidth={STROKE.reference}
            strokeDasharray="3,2"
          />
          <text
            x={pivot.x + (arcR + 18) * Math.sin(thetaDisplay * 0.52)}
            y={pivot.y + (arcR + 18) * Math.cos(thetaDisplay * 0.52)}
            fontSize={font(12)}
            fontWeight="bold"
            fill={PHYSICS_COLORS.electricForce}
            textAnchor="middle"
          >
            θ={thetaDeg.toFixed(1)}°
          </text>
        </g>
      )}

      {/* 两球中心水平连线与间距 r = 2L sinθ 标注 */}
      {separated && (
        <g>
          <line
            x1={leftBall.x}
            y1={leftBall.y + 34}
            x2={rightBall.x}
            y2={rightBall.y + 34}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth={STROKE.reference}
            strokeDasharray="4,3"
          />
          <line
            x1={leftBall.x}
            y1={leftBall.y + 22}
            x2={leftBall.x}
            y2={leftBall.y + 40}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth={STROKE.grid}
          />
          <line
            x1={rightBall.x}
            y1={rightBall.y + 22}
            x2={rightBall.x}
            y2={rightBall.y + 40}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth={STROKE.grid}
          />
          <rect
            x={pivot.x - 95}
            y={leftBall.y + 23}
            width={190}
            height={22}
            rx={4}
            fill={withAlpha(CANVAS_COLORS.objectFill, 0.92)}
          />
          <text
            x={pivot.x}
            y={leftBall.y + 38}
            fontSize={font(11)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            r = 2L sinθ = {(res.r * 100).toFixed(1)} cm
          </text>
        </g>
      )}

      {/* 左球 q1 & 右球 q2 */}
      <Ball
        cx={leftBall.x}
        cy={leftBall.y}
        r={18}
        type="pendulumBob"
        chargeSign={leftSign}
      />
      <text
        x={leftBall.x}
        y={leftBall.y - 26}
        fontSize={font(12)}
        fontWeight="bold"
        fill={q1MicroC >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        textAnchor="middle"
      >
        q₁={q1MicroC > 0 ? `+${q1MicroC}` : q1MicroC} μC
      </text>

      <Ball
        cx={rightBall.x}
        cy={rightBall.y}
        r={18}
        type="pendulumBob"
        chargeSign={rightSign}
      />
      <text
        x={rightBall.x}
        y={rightBall.y - 26}
        fontSize={font(12)}
        fontWeight="bold"
        fill={q2MicroC >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        textAnchor="middle"
      >
        q₂={q2MicroC > 0 ? `+${q2MicroC}` : q2MicroC} μC
      </text>

      {/* 受力矢量（右球三力平衡 + 左球相互库仑斥力） */}
      {showVectors && separated && (
        <g>
          {/* 左球向右反作用力 F₂₁（向左排斥） */}
          <PhysicsVectorArrow
            originDesign={leftBall}
            vector={{ x: -res.F, y: 0 }}
            type="electricForce"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
            label="F₂₁"
          />

          {/* 右球三力：F_库（向右）、mg（向下）、T（沿绳斜向上） */}
          <PhysicsVectorArrow
            originDesign={rightBall}
            vector={{ x: res.F, y: 0 }}
            type="electricForce"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
            label="F₁₂"
          />
          <PhysicsVectorArrow
            originDesign={rightBall}
            vector={{ x: 0, y: -mg }}
            type="gravity"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
            label="mg"
          />
          <PhysicsVectorArrow
            originDesign={rightBall}
            vector={{ x: -res.T * Math.sin(thetaDisplay), y: res.T * Math.cos(thetaDisplay) }}
            type="tension"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
            label="T"
          />
        </g>
      )}

      {/* 底部知识/状态面板（y = 468..626，与摆球区完全隔离） */}
      <g>
        <rect
          x={44}
          y={468}
          width={752}
          height={156}
          rx={10}
          fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.94)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1.5}
        />

        {separated ? (
          <g>
            {/* 左侧：闭合矢量三角形 */}
            <text
              x={64}
              y={490}
              fontSize={font(12)}
              fontWeight="bold"
              fill={CANVAS_COLORS.labelText}
            >
              右球三力闭合矢量三角形
            </text>
            {/* mg 竖直向下 */}
            <VectorArrow
              originDesign={{ x: triOriginX, y: triOriginY }}
              vector={{ x: 0, y: -1 }}
              type="gravity"
              arrowType="visual-only"
              sceneScale={sceneScale}
              pixelLength={triFgLen}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={triOriginX - 10}
              y={triOriginY + triFgLen * 0.55}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.gravity}
              textAnchor="end"
            >
              mg
            </text>
            {/* F_库 水平向右 */}
            <VectorArrow
              originDesign={{ x: triOriginX, y: triOriginY + triFgLen }}
              vector={{ x: 1, y: 0 }}
              type="electricForce"
              arrowType="visual-only"
              sceneScale={sceneScale}
              pixelLength={triFeLen}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={triOriginX + triFeLen * 0.5}
              y={triOriginY + triFgLen + 16}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.electricForce}
              textAnchor="middle"
            >
              F_库
            </text>
            {/* T 斜向左上闭合（物理系 y↑ 与 SVG y↓ 相反） */}
            <VectorArrow
              originDesign={{ x: triOriginX + triFeLen, y: triOriginY + triFgLen }}
              vector={{ x: -triFeLen, y: triFgLen }}
              type="tension"
              arrowType="visual-only"
              sceneScale={sceneScale}
              pixelLength={Math.hypot(triFeLen, triFgLen)}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={triOriginX + triFeLen * 0.6 + 10}
              y={triOriginY + triFgLen * 0.45}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.tension}
            >
              T
            </text>

            {/* 右侧：物理关系与规律总结 */}
            <text
              x={315}
              y={496}
              fontSize={font(13)}
              fontWeight="bold"
              fill={CANVAS_COLORS.labelText}
            >
              平衡方程：tan θ = F_库 / (mg) = k|q₁q₂| / (4L² sin²θ · mg)
            </text>
            <text x={315} y={525} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
              • 实时数值：θ = {thetaDeg.toFixed(1)}° ，F_库 = {formatScientific(res.F, 2)} N ，T = {res.T.toFixed(3)} N
            </text>
            <text x={315} y={553} fontSize={font(12)} fill={PHYSICS_COLORS.electricForce}>
              • 关键对称结论：即便 q₁ ≠ q₂，因 F₁₂ = F₂₁ 且 m₁ = m₂，两摆线偏角仍严格相等 (θ₁ = θ₂)
            </text>
            <text x={315} y={581} fontSize={font(12)} fill={CANVAS_COLORS.textMuted}>
              • 变量对比：增大电荷量乘积 |q₁q₂| 时 θ 增大；增大质量 m 或细线长度 L 时 θ 减小
            </text>
            <text x={315} y={608} fontSize={font(11)} fill={CANVAS_COLORS.textMuted}>
              • 三角关系：F_库 = mg tan θ ，绳拉力 T = mg / cos θ = √[(mg)² + F_库²]
            </text>
          </g>
        ) : (
          <g>
            <text
              x={420}
              y={518}
              fontSize={font(14)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.negativeCharge}
              textAnchor="middle"
            >
              {hasZeroCharge
                ? '存在电量为 0 的小球：无库仑排斥力，两球竖直并拢（θ = 0°）'
                : '异号电荷相互吸引：两摆球向中线靠拢接触，不存在“向外张开”的平衡角'}
            </text>
            <text
              x={420}
              y={554}
              fontSize={font(12)}
              fill={CANVAS_COLORS.labelText}
              textAnchor="middle"
            >
              请将 q₁、q₂ 调为同号非零电荷（同正或同负），或点击左屏「同正对称库仑摆」预设观察张开平衡与力三角形。
            </text>
            <text
              x={420}
              y={588}
              fontSize={font(12)}
              fill={CANVAS_COLORS.textMuted}
              textAnchor="middle"
            >
              若两相同金属球异号接触：先中和再均分电荷，若总电量不为零，分开后将变为等量同号电荷并对称张开！
            </text>
          </g>
        )}
      </g>
    </AnimationSvgCanvas>
  )
}
