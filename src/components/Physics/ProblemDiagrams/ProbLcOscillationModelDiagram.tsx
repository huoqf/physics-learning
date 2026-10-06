import React from 'react'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CapacitorPlates, Solenoid, VectorArrow } from '@/components/Physics'
import { CIRCUIT_COLORS, CANVAS_COLORS, FONT, STROKE } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'

interface DiagramProps {
  /**
   * 是否为解答步骤配图。
   * 本图是**纯题干示意图**（只复述题干已给条件，无任何受力/解答辅助线），
   * 不存在解析模式变体，故不消费该参数。
   */
  showAnalysis?: boolean
}

// ─── 与 LCOscillationScene 同源的标准几何（画布 840×325，等比缩放后呈现）──────
const LOOP_LEFT = 140
const LOOP_RIGHT = 620
const TOP_Y = 50
const BOTTOM_Y = 242

// 水平平行板电容器（右侧支路，上极板带正电、下极板带负电，板间竖直匀强电场）
const CAP_CENTER_X = LOOP_RIGHT
const CAP_CENTER_Y = (TOP_Y + BOTTOM_Y) / 2 // 146
const CAP_WIDTH = 130
const CAP_GAP = 46
const CAP_PLATE_THICKNESS = 10

// 螺线管电感（底部中央水平横置）
const COIL = { cx: 390, cy: BOTTOM_Y, turns: 6, rx: 13, ry: 22 } as const
const COIL_TOTAL_WIDTH = 180
const COIL_LEFT = COIL.cx - COIL_TOTAL_WIDTH / 2 // 300
const COIL_RIGHT = COIL.cx + COIL_TOTAL_WIDTH / 2 // 480

/** 极板电荷符号密度（单侧，水平板宽 130 → 安全上限 8） */
const CHARGE_DENSITY = 6

/** 顶边 / 左竖直边 / 底边左右两段的电流矢量长度（设计单位） */
const LOOP_ARROW_LENGTH = 36
/** 右侧上下两段引线电流矢量长度（引线长 63，半段仅 31.5，必须收敛在内） */
const LEAD_ARROW_LENGTH = 22

const topPlateOuterY = CAP_CENTER_Y - CAP_GAP / 2 - CAP_PLATE_THICKNESS // 113
const bottomPlateOuterY = CAP_CENTER_Y + CAP_GAP / 2 + CAP_PLATE_THICKNESS // 179

/**
 * LC 振荡电路模型题（`prob-lc-oscillation-model`）题干标准矢量示意图。
 *
 * 严格只复述题干已给条件，不含任何解答提示：
 *   1. 上极板带正电、下极板带负电 → 板间电场强度方向竖直向下；
 *   2. 回路电流方向为逆时针（顶边向左、左竖直边向下、底边向右、右侧支路向上）；
 *   3. 底边中央为电感 L，右侧支路为电容 C。
 * 几何与配色与 `anim-lc-oscillation` 场次 0 的画面同源，
 * 保证「题干图 ↔ 联动动画」看到的是同一张图。
 */
export const ProbLcOscillationModelDiagram: React.FC<DiagramProps> = () => {
  const { containerRef, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // SVG 内容位于 <g transform={vp.transform}> 内会被整体等比缩放（splitV 下 scale < 1），
  // 因此字号按 1/vp.scale 反向补偿，使屏幕上的实际字号始终等于 FONT 令牌值（与动画场景一致），
  // 不随容器宽度变化而忽大忽小。
  const fontScale = vp.scale > 0 ? 1 / vp.scale : 1
  const font = (base: number) => Math.round(base * fontScale * 10) / 10

  return (
    <div
      className="w-full max-w-[700px] mx-auto h-[280px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm"
    >
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* ── 1. 闭合回路导线（横平竖直，无反向折弯与断口）── */}
        <g
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1={LOOP_RIGHT} y1={TOP_Y} x2={LOOP_LEFT} y2={TOP_Y} />
          <line x1={LOOP_LEFT} y1={TOP_Y} x2={LOOP_LEFT} y2={BOTTOM_Y} />
          <line x1={LOOP_LEFT} y1={BOTTOM_Y} x2={COIL_LEFT} y2={BOTTOM_Y} />
          <line x1={COIL_RIGHT} y1={BOTTOM_Y} x2={LOOP_RIGHT} y2={BOTTOM_Y} />
          {/* 右侧上引线：右上角 → 上极板外表面；右侧下引线：下极板外表面 → 右下角 */}
          <line x1={LOOP_RIGHT} y1={TOP_Y} x2={LOOP_RIGHT} y2={topPlateOuterY} />
          <line x1={LOOP_RIGHT} y1={bottomPlateOuterY} x2={LOOP_RIGHT} y2={BOTTOM_Y} />
        </g>

        {/* ── 2. 电感 L（底部中央水平螺线管，与回路串联）── */}
        <Solenoid
          x={COIL.cx}
          y={COIL.cy}
          width={COIL_TOTAL_WIDTH}
          height={COIL.ry * 2}
          turns={COIL.turns}
          current={1}
          leadType="horizontal"
          leadEndpointRadius={0}
          showIronCore={false}
          animated={false}
        />

        {/* ── 3. 电容 C（上极板正电、下极板负电，板间竖直匀强电场指向下极板）──
            不绘制板间电场线：题干已用文字给出「电场强度方向竖直向下」，
            而教材/考卷原图对该图只画极板电性与电流方向；
            同时可避免电场线箭头与极板电荷符号在 46px 板间距内相互压盖。 */}
        <CapacitorPlates
          x={CAP_CENTER_X - CAP_WIDTH / 2}
          y={CAP_CENTER_Y}
          width={CAP_WIDTH}
          gap={CAP_GAP}
          thickness={CAP_PLATE_THICKNESS}
          orientation="horizontal"
          chargeSign="+"
          chargeDensity={CHARGE_DENSITY}
        />

        {/* ── 4. 元件符号标注 ── */}
        <g fontFamily={FONT.family} fontWeight="bold" fill={CANVAS_COLORS.labelText}>
          <text
            x={CAP_CENTER_X + CAP_WIDTH / 2 + 14}
            y={CAP_CENTER_Y + 6}
            fontSize={font(FONT.label)}
            textAnchor="start"
            fontStyle="italic"
          >
            C
          </text>
          <text
            x={COIL.cx}
            y={BOTTOM_Y + 34}
            fontSize={font(FONT.label)}
            textAnchor="middle"
            fontStyle="italic"
          >
            L
          </text>
        </g>

        {/* ── 5. 逆时针电流方向矢量（题干已给条件，非解答提示）── */}
        <g>
          {/* 顶边：向左 */}
          <VectorArrow
            originDesign={{ x: (LOOP_LEFT + LOOP_RIGHT) / 2, y: TOP_Y }}
            vector={{ x: -1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={LOOP_ARROW_LENGTH}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
          {/* 左竖直边：向下（物理 −y 为屏幕向下） */}
          <VectorArrow
            originDesign={{ x: LOOP_LEFT, y: (TOP_Y + BOTTOM_Y) / 2 }}
            vector={{ x: 0, y: -1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={LOOP_ARROW_LENGTH}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
          {/* 底边左段：向右 */}
          <VectorArrow
            originDesign={{ x: (LOOP_LEFT + COIL_LEFT) / 2, y: BOTTOM_Y }}
            vector={{ x: 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={LOOP_ARROW_LENGTH}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
          {/* 底边右段：向右 */}
          <VectorArrow
            originDesign={{ x: (COIL_RIGHT + LOOP_RIGHT) / 2, y: BOTTOM_Y }}
            vector={{ x: 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={LOOP_ARROW_LENGTH}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
          {/* 右侧下引线：向上流入下极板 */}
          <VectorArrow
            originDesign={{ x: LOOP_RIGHT, y: (bottomPlateOuterY + BOTTOM_Y) / 2 }}
            vector={{ x: 0, y: 1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={LEAD_ARROW_LENGTH}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
          {/* 右侧上引线：由上极板向上流出 */}
          <VectorArrow
            originDesign={{ x: LOOP_RIGHT, y: (TOP_Y + topPlateOuterY) / 2 }}
            vector={{ x: 0, y: 1 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={LEAD_ARROW_LENGTH}
            strokeWidth={STROKE.vectorSub}
            label="i"
            font={font}
          />
        </g>
      </AnimationSvgCanvas>
    </div>
  )
}
