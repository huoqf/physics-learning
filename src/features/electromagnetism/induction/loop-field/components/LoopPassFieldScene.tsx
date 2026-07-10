import React, { useMemo } from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { VectorArrow, MagneticFieldGrid } from '@/components/Physics'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import type { LoopPassFieldPhysicsResult } from '../hooks/useLoopPassFieldPhysics'
import type { SceneScale } from '@/scene'

// ─── 布局常量（消除魔法数字）────────────────────────────────────────────────

/** 线框顶部 Y 坐标 (px) */
const LOOP_TOP_Y = 95
/** 线框底部 Y 坐标 (px) */
const LOOP_BOTTOM_Y = 235
/** 磁场区域顶部 Y 坐标 (px) */
const MAG_FIELD_TOP_Y = 35
/** 磁场区域高度 (px) */
const MAG_FIELD_HEIGHT = 255
/** 磁场边界线顶部 Y (px) */
const WALL_TOP_Y = 25
/** 磁场边界线底部 Y (px) */
const WALL_BOTTOM_Y = 300
/** 磁场边界标注 Y (px) */
const WALL_LABEL_Y = 312
/** 磁场标题 Y (px) */
const MAG_TITLE_Y = 20
/** 线框切割发光扩展 (px) */
const GLOW_EXTEND = 2
/** 正负极圆章半径 (px) */
const POLARITY_CIRCLE_R = 7.5
/** 感应磁场标签偏移 Y (px) */
const INDUCED_LABEL_OFFSET_Y = 22
/** 安培力箭头 Y 偏移 (px) */
const AMPERE_FORCE_OFFSET_Y = 18
/** 安培力标签 X 偏移 (px) */
const AMPERE_LABEL_OFFSET_X = 45
/** 安培力标签 Y 偏移 (px) */
const AMPERE_LABEL_OFFSET_Y = 30
/** 底部状态条高度 (px) */
const STATUS_BAR_HEIGHT = 20
/** 底部状态条圆角 (px) */
const STATUS_BAR_RX = 10

interface LoopPassFieldSceneProps {
  physics: LoopPassFieldPhysicsResult
}

export const LoopPassFieldScene = React.memo(function LoopPassFieldScene({
  physics,
}: LoopPassFieldSceneProps) {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const {
    d,
    D,
    frontX,
    backX,
    state,
    forceAmpere,
    B,
    currentI,
  } = physics

  // 物理坐标 (m) 到设计坐标 (px) 的居中对称映射
  // 注意：必须使用设计坐标宽度（splitV.width=840），不能用实际容器宽度
  // 因为 AnimationSvgCanvas 内部用 vp.transform 将设计坐标映射到可视区域
  const toScreenX = useMemo(() => {
    const designWidth = CANVAS_PRESETS.splitV.width
    const magTargetWidth = designWidth * 0.46 // 磁场占用约 46% 的设计坐标宽度
    const scale = magTargetWidth / (D || 0.08)
    const originX = designWidth / 2 - (D / 2) * scale
    return (physX: number) => physicsToCanvasWithOrigin(physX, 0, originX, 0, scale).cx
  }, [D])

  const magLeftPx = toScreenX(0)
  const magRightPx = toScreenX(D)
  const magWidthPx = Math.max(10, magRightPx - magLeftPx)

  const loopFrontPx = toScreenX(frontX)
  const loopBackPx = toScreenX(backX)
  const loopWidthPx = Math.max(10, loopFrontPx - loopBackPx)
  const loopCenterPx = (loopFrontPx + loopBackPx) / 2

  const loopHeightPx = LOOP_BOTTOM_Y - LOOP_TOP_Y
  const loopCenterY = (LOOP_TOP_Y + LOOP_BOTTOM_Y) / 2

  // 构造传递给 VectorArrow 的 scale (支持像素坐标绘制，scaleX=1, scaleY=-1)
  const pixelVectorScale: SceneScale = useMemo(() => ({
    scale: 1,
    scaleX: 1,
    scaleY: -1, // 抵消 VectorArrow 内部的 y 轴反转，支持像素直接传入
    originX: 0,
    originY: 0,
    maxVectorLength: 65,
    refMagnitudes: {
      velocity: 2.0,
      lorentzForce: 0.15,
      appliedForce: 0.15,
      currentDirection: 1.0,
    },
  }), [])

  // 切割状态判定与切割边 X 坐标
  const isCutting = state === 'ENTERING' || state === 'LEAVING'
  // 进场时前竖棒（loopFrontPx）切割，出场时后竖棒（loopBackPx）切割
  const cuttingRodPx = state === 'ENTERING' ? loopFrontPx : loopBackPx

  return (
    <div className="w-full h-full bg-white rounded-xl border border-neutral-200 overflow-hidden relative shadow-sm">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* SVG 渐变定义：营造科技感力场区 */}
        <defs>
          <linearGradient id="magneticGlowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.09" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.09" />
          </linearGradient>
        </defs>

        {/* 1. 条形磁场区域背景及发光边界墙 (x=0 与 x=D) */}
        <rect
          x={magLeftPx}
          y={MAG_FIELD_TOP_Y}
          width={magWidthPx}
          height={MAG_FIELD_HEIGHT}
          fill="url(#magneticGlowGrad)"
          stroke={PHYSICS_COLORS.magneticFieldLine}
          strokeWidth={1.5}
        />

        {/* 左力场壁 (x=0) */}
        <line x1={magLeftPx} y1={WALL_TOP_Y} x2={magLeftPx} y2={WALL_BOTTOM_Y} stroke={PHYSICS_COLORS.magneticField} strokeWidth={6} opacity={0.12} />
        <line x1={magLeftPx} y1={WALL_TOP_Y} x2={magLeftPx} y2={WALL_BOTTOM_Y} stroke={PHYSICS_COLORS.magneticField} strokeWidth={2} />
        <text x={magLeftPx} y={WALL_LABEL_Y} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.magneticField} textAnchor="middle">
          x = 0
        </text>

        {/* 右力场壁 (x=D) */}
        <line x1={magRightPx} y1={WALL_TOP_Y} x2={magRightPx} y2={WALL_BOTTOM_Y} stroke={PHYSICS_COLORS.magneticField} strokeWidth={6} opacity={0.12} />
        <line x1={magRightPx} y1={WALL_TOP_Y} x2={magRightPx} y2={WALL_BOTTOM_Y} stroke={PHYSICS_COLORS.magneticField} strokeWidth={2} />
        <text x={magRightPx} y={WALL_LABEL_Y} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.magneticField} textAnchor="middle">
          x = D ({(D * 100).toFixed(0)}cm)
        </text>

        {/* 磁场标题说明 */}
        <text x={(magLeftPx + magRightPx) / 2} y={MAG_TITLE_Y} fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.magneticField} textAnchor="middle">
          匀强有界磁场 B = {B.toFixed(1)} T (⊗ 垂直纸面向里)
        </text>

        {/* 2. 复用标准的 MagneticFieldGrid 渲染背景磁场点阵 */}
        <MagneticFieldGrid
          x={magLeftPx}
          y={MAG_FIELD_TOP_Y}
          w={magWidthPx}
          h={MAG_FIELD_HEIGHT}
          direction="in"
          rows={6}
          cols={10}
          opacity={0.3}
        />

        {/* 3. 正在切割导体棒底层的霓虹发光底衬 (底层渲染，绝不遮挡上层矢量箭头) */}
        {isCutting && (
          <line
            x1={cuttingRodPx}
            y1={LOOP_TOP_Y - GLOW_EXTEND}
            x2={cuttingRodPx}
            y2={LOOP_BOTTOM_Y + GLOW_EXTEND}
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={14}
            strokeLinecap="round"
            opacity={0.12}
          >
            <animate attributeName="opacity" values="0.12;0.28;0.12" dur="2s" repeatCount="indefinite" />
          </line>
        )}

        {/* 4. 闭合矩形导电线框主体（精致圆角框，双重轮廓线暗示多匝） */}
        <rect
          x={loopBackPx}
          y={LOOP_TOP_Y}
          width={loopWidthPx}
          height={loopHeightPx}
          fill="rgba(248, 250, 252, 0.35)"
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={3}
          rx={4}
        />
        <rect
          x={loopBackPx + 1.5}
          y={LOOP_TOP_Y + 1.5}
          width={loopWidthPx - 3}
          height={loopHeightPx - 3}
          fill="none"
          stroke="rgba(203, 213, 225, 0.8)"
          strokeWidth={1}
          rx={3}
        />

        {/* 5. 正在切割导体棒的实体高亮金色细线 */}
        {isCutting && (
          <line
            x1={cuttingRodPx}
            y1={LOOP_TOP_Y}
            x2={cuttingRodPx}
            y2={LOOP_BOTTOM_Y}
            stroke="#FBBF24" // 金黄色亮线表示切割生电
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        )}

        {/* 6. 右手定则电源等效极性标识 ( + / - 极圆章) */}
        {isCutting && (
          <g>
            {/* 上端正极 (+) */}
            <circle cx={cuttingRodPx} cy={LOOP_TOP_Y + 8} r={POLARITY_CIRCLE_R} fill="#EF4444" stroke="#FFF" strokeWidth={1} />
            <text x={cuttingRodPx} y={LOOP_TOP_Y + 8} fontSize={10} fontWeight="extrabold" fill="#FFF" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>
              +
            </text>

            {/* 下端负极 (-) */}
            <circle cx={cuttingRodPx} cy={LOOP_BOTTOM_Y - 8} r={POLARITY_CIRCLE_R} fill="#3B82F6" stroke="#FFF" strokeWidth={1} />
            <text x={cuttingRodPx} y={LOOP_BOTTOM_Y - 8} fontSize={10} fontWeight="extrabold" fill="#FFF" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>
              -
            </text>
          </g>
        )}

        {/* 7. 楞次定律感应磁场动态显化：复用 MagneticFieldGrid 并在回路内部均匀分布 */}
        {state === 'ENTERING' && (
          <g>
            <MagneticFieldGrid
              x={loopBackPx}
              y={LOOP_TOP_Y}
              w={loopWidthPx}
              h={loopHeightPx}
              direction="out"
              rows={2}
              cols={3}
              opacity={0.65}
            />
            <text x={loopCenterPx} y={loopCenterY + INDUCED_LABEL_OFFSET_Y} fontSize={font(10)} fontWeight="bold" fill="#0284C7" textAnchor="middle" style={{ userSelect: 'none' }}>
              B_感 ⊙ 阻碍增加
              <animate attributeName="opacity" values="0.6;0.9;0.6" dur="1.5s" repeatCount="indefinite" />
            </text>
          </g>
        )}
        {state === 'LEAVING' && (
          <g>
            <MagneticFieldGrid
              x={loopBackPx}
              y={LOOP_TOP_Y}
              w={loopWidthPx}
              h={loopHeightPx}
              direction="in"
              rows={2}
              cols={3}
              opacity={0.65}
            />
            <text x={loopCenterPx} y={loopCenterY + INDUCED_LABEL_OFFSET_Y} fontSize={font(10)} fontWeight="bold" fill="#B45309" textAnchor="middle" style={{ userSelect: 'none' }}>
              B_感 ⊗ 阻碍减少
              <animate attributeName="opacity" values="0.6;0.9;0.6" dur="1.5s" repeatCount="indefinite" />
            </text>
          </g>
        )}
        {state === 'TOTALLY_IN' && (
          <text x={loopCenterPx} y={loopCenterY + 4} fontSize={font(10)} fontWeight="bold" fill={CANVAS_COLORS.textMuted} textAnchor="middle" style={{ userSelect: 'none' }}>
            ΔΦ = 0 无感应磁场
          </text>
        )}

        {/* 8. 线框尺寸标注 */}
        <text x={loopCenterPx} y={LOOP_TOP_Y - 8} fontSize={font(12)} fontWeight="bold" fill={CANVAS_COLORS.textMuted} textAnchor="middle">
          宽 d = {(d * 100).toFixed(0)}cm
        </text>

        {/* 9. 安培力阻碍矢量与外拉力维持平衡矢量 (作用点精准，置于最顶层绘制) */}
        {forceAmpere > 1e-4 && (
          <g>
            {/* 安培力：精准作用在当前发生切割的那条有效竖棒的中心 */}
            <VectorArrow
              origin={{ x: cuttingRodPx, y: loopCenterY - AMPERE_FORCE_OFFSET_Y }}
              vector={{ x: -forceAmpere, y: 0 }}
              type="lorentzForce"
              sceneScale={pixelVectorScale}
            />
            <text x={cuttingRodPx - AMPERE_LABEL_OFFSET_X} y={loopCenterY - AMPERE_LABEL_OFFSET_Y} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.lorentzForce}>
              F_安 = {forceAmpere.toFixed(3)} N
            </text>

            {/* 外力：作用在前导线竖棒的中心，拉动线框匀速运动 */}
            <VectorArrow
              origin={{ x: loopFrontPx, y: loopCenterY + AMPERE_FORCE_OFFSET_Y }}
              vector={{ x: forceAmpere, y: 0 }}
              type="appliedForce"
              sceneScale={pixelVectorScale}
            />
            <text x={loopFrontPx + AMPERE_LABEL_OFFSET_X} y={loopCenterY + AMPERE_LABEL_OFFSET_Y} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.appliedForce} textAnchor="end">
              F_外 = {forceAmpere.toFixed(3)} N
            </text>
          </g>
        )}

        {/* 10. 切割导体竖边上的感应电流方向箭头 (使用标准 VectorArrow 绘制，置于最顶层) */}
        {Math.abs(currentI) > 1e-4 && (
          <g>
            {/* 前竖棒电流箭头 */}
            <VectorArrow
              origin={{ x: loopFrontPx, y: loopCenterY }}
              vector={{ x: 0, y: currentI > 0 ? 0.7 : -0.7 }} // 逆时针为正时，前棒向上(y>0)，顺时针反向
              type="currentDirection"
              sceneScale={pixelVectorScale}
            />
            {/* 后竖棒电流箭头 */}
            <VectorArrow
              origin={{ x: loopBackPx, y: loopCenterY }}
              vector={{ x: 0, y: currentI > 0 ? -0.7 : 0.7 }} // 逆时针为正时，后棒向下(y<0)，顺时针反向
              type="currentDirection"
              sceneScale={pixelVectorScale}
            />
          </g>
        )}

        {/* 11. 底部当前状态条 */}
        <g>
          <rect x={CANVAS_PRESETS.splitV.width / 2 - 140} y={CANVAS_PRESETS.splitV.height - STATUS_BAR_HEIGHT - 4} width={280} height={STATUS_BAR_HEIGHT} rx={STATUS_BAR_RX} fill={CANVAS_COLORS.gridSubtle} stroke={CANVAS_COLORS.grid} />
          <text x={CANVAS_PRESETS.splitV.width / 2} y={CANVAS_PRESETS.splitV.height - 10} fontSize={font(11)} fontWeight="bold" fill={CANVAS_COLORS.labelText} textAnchor="middle">
            当前位置 x = {(frontX * 100).toFixed(1)} cm | 状态: {state === 'BEFORE' ? '进场前' : state === 'ENTERING' ? '进场切割中' : state === 'TOTALLY_IN' ? '完全处于磁场内' : state === 'LEAVING' ? '出场切割中' : '已离场'}
          </text>
        </g>
      </AnimationSvgCanvas>
    </div>
  )
})

