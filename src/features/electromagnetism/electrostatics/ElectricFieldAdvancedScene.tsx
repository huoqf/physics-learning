/**
 * ElectricFieldAdvancedScene.tsx — 进阶模式场景（双电荷 + 试探电荷 + 矢量叠加）
 */
import { VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

import type { SceneScale } from '@/scene'

interface Props {
  cx1: number
  cy1: number
  cx2: number
  cy2: number
  q1: number
  q2: number
  qTest: number
  testX: number
  testY: number
  isDragging: boolean
  advancedArrows: {
    vectorE1: { x: number; y: number }
    lenE1: number
    vectorE2: { x: number; y: number }
    lenE2: number
    vectorEnet: { x: number; y: number }
    lenEnet: number
    vectorF: { x: number; y: number }
    lenF: number
    e1Tip: { x: number; y: number }
    e2Tip: { x: number; y: number }
    enetTip: { x: number; y: number }
  } | null
  sceneScale: SceneScale
  font: (size: number) => number
}

function vectorLabelPos(
  originX: number,
  originY: number,
  v: { x: number; y: number },
  pixelLen: number,
  extra = 14,
  perpOffset = 0,
) {
  const mag = Math.hypot(v.x, v.y) || 1
  const ux = v.x / mag
  const uyScreen = -v.y / mag
  const px = -uyScreen * perpOffset
  const py = ux * perpOffset
  return {
    x: originX + ux * (pixelLen + extra) + px,
    y: originY + uyScreen * (pixelLen + extra) + py + 4,
  }
}

export function ElectricFieldAdvancedScene({
  cx1, cy1, cx2, cy2, q1, q2, qTest, testX, testY, isDragging,
  advancedArrows, sceneScale, font,
}: Props) {
  const enetLabelPos = advancedArrows
    ? vectorLabelPos(testX, testY, advancedArrows.vectorEnet, advancedArrows.lenEnet, 14)
    : null
  const fLabelPos = (() => {
    if (!advancedArrows || qTest === 0 || advancedArrows.lenF <= 0) return null
    const sameDir = qTest > 0
    const nearTip = Math.abs(advancedArrows.lenEnet - advancedArrows.lenF) < 24
    return vectorLabelPos(
      testX,
      testY,
      advancedArrows.vectorF,
      advancedArrows.lenF,
      14,
      sameDir && nearTip ? 14 : 0,
    )
  })()

  return (
    <g>
      {/* 固定电荷 1 */}
      <circle cx={cx1} cy={cy1} r={20}
        fill={q1 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={cx1} y={cy1 + 6} fontSize={font(16)} fill={CANVAS_COLORS.white}
        textAnchor="middle" fontWeight="bold">
        {q1 >= 0 ? '+' : '−'}
      </text>
      <text x={cx1} y={cy1 - 26} fontSize={font(11)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        Q₁ = {q1 > 0 ? '+' : ''}{q1.toFixed(0)} μC
      </text>

      {/* 固定电荷 2 */}
      <circle cx={cx2} cy={cy2} r={20}
        fill={q2 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={cx2} y={cy2 + 6} fontSize={font(16)} fill={CANVAS_COLORS.white}
        textAnchor="middle" fontWeight="bold">
        {q2 >= 0 ? '+' : '−'}
      </text>
      <text x={cx2} y={cy2 - 26} fontSize={font(11)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        Q₂ = {q2 > 0 ? '+' : ''}{q2.toFixed(0)} μC
      </text>

      {/* 试探电荷 P */}
      <circle cx={testX} cy={testY} r={12}
        fill={qTest > 0 ? PHYSICS_COLORS.positiveCharge : (qTest < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[300])}
        stroke={isDragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
        strokeWidth={isDragging ? 2.5 : CANVAS_STYLE.stroke.objectLine}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
      <text x={testX} y={testY + 4} fontSize={font(12)}
        fill={qTest === 0 ? colors.neutral[800] : CANVAS_COLORS.white}
        textAnchor="middle" fontWeight="bold">
        {qTest > 0 ? '+' : (qTest < 0 ? '−' : '0')}
      </text>
      <text x={testX} y={testY - 18} fontSize={font(11)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q = {qTest > 0 ? '+' : ''}{qTest.toFixed(1)} μC
      </text>

      {/* 进阶矢量叠加绘制 */}
      {advancedArrows && (
        <g>
          {/* 1. 分矢量 E1 */}
          <g opacity={0.7}>
            <VectorArrow
              originDesign={{ x: testX, y: testY }}
              vector={advancedArrows.vectorE1}
              type="electricField"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              pixelLength={advancedArrows.lenE1}
              strokeWidth={2.0}
            />
          </g>
          <text x={advancedArrows.e1Tip.x} y={advancedArrows.e1Tip.y - 6}
            fontSize={font(11)} fill={PHYSICS_COLORS.electricField}
            fontWeight="bold" textAnchor="middle">
            E₁
          </text>

          {/* 2. 分矢量 E2 */}
          <g opacity={0.7}>
            <VectorArrow
              originDesign={{ x: testX, y: testY }}
              vector={advancedArrows.vectorE2}
              type="electricField"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              pixelLength={advancedArrows.lenE2}
              strokeWidth={2.0}
            />
          </g>
          <text x={advancedArrows.e2Tip.x} y={advancedArrows.e2Tip.y - 6}
            fontSize={font(11)} fill={PHYSICS_COLORS.electricField}
            fontWeight="bold" textAnchor="middle">
            E₂
          </text>

          {/* 3. 平行四边形辅助虚线 */}
          {advancedArrows.lenE1 > 1e-2 && advancedArrows.lenE2 > 1e-2 && (
            <g>
              <line x1={advancedArrows.e1Tip.x} y1={advancedArrows.e1Tip.y}
                x2={advancedArrows.enetTip.x} y2={advancedArrows.enetTip.y}
                stroke={PHYSICS_COLORS.electricPotential} strokeWidth={1.2}
                strokeDasharray="3,3" opacity={0.7} />
              <line x1={advancedArrows.e2Tip.x} y1={advancedArrows.e2Tip.y}
                x2={advancedArrows.enetTip.x} y2={advancedArrows.enetTip.y}
                stroke={PHYSICS_COLORS.electricPotential} strokeWidth={1.2}
                strokeDasharray="3,3" opacity={0.7} />
            </g>
          )}

          {/* 4. 合场强 E */}
          {advancedArrows.lenEnet > 1e-2 && enetLabelPos && (
            <>
              <VectorArrow
                originDesign={{ x: testX, y: testY }}
                vector={advancedArrows.vectorEnet}
                type="electricField"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                pixelLength={advancedArrows.lenEnet}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.8}
              />
              <text
                x={enetLabelPos.x}
                y={enetLabelPos.y}
                fontSize={font(12)}
                fill={PHYSICS_COLORS.electricField}
                fontWeight="bold"
                textAnchor="middle"
              >
                E合
              </text>
            </>
          )}

          {/* 5. 电场力 F */}
          {qTest !== 0 && advancedArrows.lenF > 1e-2 && fLabelPos && (
            <>
              <VectorArrow
                originDesign={{ x: testX, y: testY }}
                vector={advancedArrows.vectorF}
                type="electricForce"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                pixelLength={advancedArrows.lenF}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain + 1.2}
              />
              <text
                x={fLabelPos.x}
                y={fLabelPos.y}
                fontSize={font(12)}
                fill={PHYSICS_COLORS.electricForce}
                fontWeight="bold"
                textAnchor="middle"
              >
                F合
              </text>
            </>
          )}
        </g>
      )}
    </g>
  )
}
