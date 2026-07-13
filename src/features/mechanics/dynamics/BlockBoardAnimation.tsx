/**
 * 板块模型动画 — 物理场景渲染
 *
 * splitV 布局（840×325），仅渲染物理场景（地面 + 木板 + 滑块 + 受力箭头）。
 * v-t 图表由 CenterExtra 组件独立渲染。
 */
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Block, PhysicsGround, VectorArrow, VectorDefs } from '@/components/Physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  FONT,
} from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { getBoardSystemState } from '@/physics/blockBoard'
import { GRAVITY } from '@/physics/constants'
import { physicsToCanvasWithOrigin } from '@/utils'
import type { SceneScale } from '@/scene/SceneScale'

const DESIGN = CANVAS_PRESETS.splitV // 840 × 325

/** 布局常量（设计坐标） */
const L = {
  groundYRatio: 0.70,
  blockW: 56,
  blockH: 40,
  boardH: 24,
  boardStartXRatio: 0.05,
  boardMaxWidthRatio: 0.50,
  vectorScale: 2.0,
  rulerOffsetY: 8,
  rulerTickH: 10,
} as const

/** 像素尺度 SceneScale（VectorArrow 需要） */
const PX_SCALE: SceneScale = {
  originX: 0, originY: 0,
  scaleX: 1, scaleY: 1, scale: 1,
  maxVectorLength: 100,
  refMagnitudes: { gravity: 50, normalForce: 50, friction: 50, appliedForce: 50, force: 50 },
}

export default function BlockBoardAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time, showVectors: s.showVectors }))
  )
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: DESIGN })
  const { font } = canvasSize

  const { m = 1, M = 3, mu1 = 0.3, mu2 = 0.05, v0 = 5, L: boardLen = 2.5 } = params
  const g = GRAVITY

  // ── 物理状态 ──
  const state = getBoardSystemState({ m, M, mu1, mu2, v0, L: boardLen, g }, time)

  // ── 设计坐标布局 ──
  const groundY = DESIGN.height * L.groundYRatio
  const boardY = groundY - L.boardH
  const pxPerMeter = (DESIGN.width * L.boardMaxWidthRatio) / Math.max(boardLen, 1)
  const boardWPx = boardLen * pxPerMeter
  const boardStartX = DESIGN.width * L.boardStartXRatio

  // 木板 x（设计坐标）
  const { cx: boardX } = physicsToCanvasWithOrigin(state.xBoard, 0, boardStartX, 0, pxPerMeter)

  // 滑块 y：在板上 vs 跌落到地面
  const blockOnBoard = !state.hasFallen
  const blockY = blockOnBoard ? boardY - L.blockH : groundY - L.blockH

  // 滑块 x（设计坐标）
  const { cx: blockX } = physicsToCanvasWithOrigin(state.xBlock - state.xBoard, 0, boardX, 0, pxPerMeter)

  // ── 受力 ──
  const FgBlock = m * g
  const FgBoard = M * g
  const FN1 = m * g
  const FN2 = state.hasFallen ? M * g : (M + m) * g
  const Ff1 = mu1 * m * g
  const Ff2 = state.hasFallen ? mu2 * M * g : mu2 * (M + m) * g
  const fs = L.vectorScale

  // 箭头中心
  const blkCx = blockX + L.blockW / 2
  const blkCy = blockY + L.blockH / 2
  const brdCx = boardX + boardWPx / 2
  const brdCy = boardY + L.boardH / 2

  // 阶段标签
  const phaseLabel =
    state.phase === 'sliding' ? '相对滑动' :
    state.phase === 'together' ? '共速整体' :
    state.phase === 'fallen' ? '滑块跌落' : '静止'

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        <VectorDefs colors={[
          PHYSICS_COLORS.gravity, PHYSICS_COLORS.normalForce,
          PHYSICS_COLORS.friction, PHYSICS_COLORS.appliedForce,
        ]} />
      </defs>

      {/* ═══ 地面 ═══ */}
      <PhysicsGround
        x={vp.designLeft} y={groundY} width={vp.designVisibleW}
        type="ground" appearance={{ showHatch: true }}
      />

      {/* ═══ 标尺（板长参考） ═══ */}
      <g>
        <line x1={boardX} y1={groundY + L.rulerOffsetY}
              x2={boardX + boardWPx} y2={groundY + L.rulerOffsetY}
              stroke={CANVAS_COLORS.annotation} strokeWidth={1} />
        <line x1={boardX} y1={groundY + L.rulerOffsetY - L.rulerTickH / 2}
              x2={boardX} y2={groundY + L.rulerOffsetY + L.rulerTickH / 2}
              stroke={CANVAS_COLORS.annotation} strokeWidth={1} />
        <line x1={boardX + boardWPx} y1={groundY + L.rulerOffsetY - L.rulerTickH / 2}
              x2={boardX + boardWPx} y2={groundY + L.rulerOffsetY + L.rulerTickH / 2}
              stroke={CANVAS_COLORS.annotation} strokeWidth={1} />
        <text
          x={boardX + boardWPx / 2} y={groundY + L.rulerOffsetY + 16}
          fontSize={font(FONT.annotation)} fill={CANVAS_COLORS.annotation}
          textAnchor="middle"
        >
          L = {boardLen}m
        </text>
      </g>

      {/* ═══ 木板 ═══ */}
      <Block
        x={boardX} y={boardY}
        width={boardWPx} height={L.boardH}
        type="wood" label={`M = ${M}kg`}
        stroke={SCENE_COLORS.materials.woodSphereGrad[1]}
        strokeWidth={1.5} font={font}
      />

      {/* ═══ 滑块 ═══ */}
      <Block
        x={blockX} y={blockY}
        width={L.blockW} height={L.blockH}
        type="metal" label={`m = ${m}kg`}
        strokeWidth={1.5} font={font}
      />

      {/* ═══ 受力箭头 ═══ */}
      {showVectors && (
        <g>
          {/* ── 滑块受力 ── */}
          {/* 重力 mg ↓ */}
          <VectorArrow
            originPixel={{ x: blkCx, y: blkCy }}
            vector={{ x: 0, y: -FgBlock }}
            pixelLength={FgBlock * fs}
            type="gravity" sceneScale={PX_SCALE}
            label="mg" font={font}
          />
          {/* 支持力 FN1 ↑（在板上时向上，跌落后在地面上） */}
          <VectorArrow
            originPixel={{ x: blkCx, y: blockOnBoard ? boardY : groundY }}
            vector={{ x: 0, y: FN1 }}
            pixelLength={FN1 * fs}
            type="normalForce" sceneScale={PX_SCALE}
            label="FN1" font={font}
          />
          {/* 摩擦力 Ff1 ←（仅在板上且运动时） */}
          {blockOnBoard && state.vBlock > 0.01 && (
            <VectorArrow
              originPixel={{ x: blkCx, y: boardY - 2 }}
              vector={{ x: -Ff1, y: 0 }}
              pixelLength={Ff1 * fs}
              type="friction" sceneScale={PX_SCALE}
              label="Ff1" font={font}
            />
          )}

          {/* ── 木板受力 ── */}
          {/* 重力 Mg ↓ */}
          <VectorArrow
            originPixel={{ x: brdCx, y: brdCy }}
            vector={{ x: 0, y: -FgBoard }}
            pixelLength={FgBoard * fs}
            type="gravity" sceneScale={PX_SCALE}
            label="Mg" font={font}
          />
          {/* 滑块压力 FN1' ↓（仅在板上时存在） */}
          {blockOnBoard && (
            <VectorArrow
              originPixel={{ x: blkCx, y: boardY }}
              vector={{ x: 0, y: -FN1 }}
              pixelLength={FN1 * fs}
              type="normalForce" sceneScale={PX_SCALE}
              label="FN1'" font={font}
            />
          )}
          {/* 地面支持力 FN2 ↑ */}
          <VectorArrow
            originPixel={{ x: brdCx, y: groundY }}
            vector={{ x: 0, y: FN2 }}
            pixelLength={FN2 * fs}
            type="normalForce" sceneScale={PX_SCALE}
            label="FN2" font={font}
          />
          {/* 摩擦力 Ff1' →（作用在板上，仅滑块在板上且运动时） */}
          {blockOnBoard && state.vBlock > 0.01 && (
            <VectorArrow
              originPixel={{ x: blkCx, y: boardY + 2 }}
              vector={{ x: Ff1, y: 0 }}
              pixelLength={Ff1 * fs}
              type="appliedForce" sceneScale={PX_SCALE}
              label="Ff1'" font={font}
            />
          )}
          {/* 地面摩擦 Ff2 ← */}
          {state.vBoard > 0.01 && (
            <VectorArrow
              originPixel={{ x: brdCx, y: groundY - 2 }}
              vector={{ x: -Ff2, y: 0 }}
              pixelLength={Ff2 * fs}
              type="friction" sceneScale={PX_SCALE}
              label="Ff2" font={font}
            />
          )}
        </g>
      )}

      {/* ═══ 状态文字 ═══ */}
      <text
        x={DESIGN.width / 2} y={24}
        fontSize={font(FONT.bodySize)}
        fill={PHYSICS_COLORS.labelText}
        textAnchor="middle" fontWeight="bold"
      >
        {phaseLabel}
      </text>
      <text
        x={DESIGN.width / 2} y={44}
        fontSize={font(FONT.annotation)}
        fill={CANVAS_COLORS.labelTextLight}
        textAnchor="middle"
      >
        v₁ = {state.vBlock.toFixed(2)} m/s v₂ = {state.vBoard.toFixed(2)} m/s
      </text>
    </AnimationSvgCanvas>
  )
}
