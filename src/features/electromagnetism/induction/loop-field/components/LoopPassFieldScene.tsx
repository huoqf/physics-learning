import React, { useMemo } from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import type { CanvasSize } from '@/utils/useCanvasSize'
import type { LoopPassFieldPhysicsResult } from '../hooks/useLoopPassFieldPhysics'
import type { SceneScale } from '@/scene'

interface LoopPassFieldSceneProps {
  physics: LoopPassFieldPhysicsResult
  canvasSize: CanvasSize
}

export const LoopPassFieldScene = React.memo(function LoopPassFieldScene({
  physics,
  canvasSize,
}: LoopPassFieldSceneProps) {
  const { width, height, font } = canvasSize // 700 × 325 设计基准

  const {
    d,
    D,
    frontX,
    backX,
    xMin,
    xMax,
    state,
    forceAmpere,
    B,
  } = physics

  // 物理坐标 (m) 到画布水平坐标 (px) 的线性映射 [xMin, xMax] -> [80, 620]
  // 使用 physicsToCanvasWithOrigin 实现自定义原点的坐标映射
  const toScreenX = useMemo(() => {
    const screenLeft = 80
    const screenRight = width - 80
    const span = xMax - xMin || 1
    const scale = (screenRight - screenLeft) / span
    const originX = screenLeft - xMin * scale
    return (physX: number) => physicsToCanvasWithOrigin(physX, 0, originX, 0, scale).cx
  }, [width, xMin, xMax])

  const magLeftPx = toScreenX(0)
  const magRightPx = toScreenX(D)
  const magWidthPx = Math.max(10, magRightPx - magLeftPx)

  const loopFrontPx = toScreenX(frontX)
  const loopBackPx = toScreenX(backX)
  const loopWidthPx = Math.max(10, loopFrontPx - loopBackPx)
  const loopCenterPx = (loopFrontPx + loopBackPx) / 2

  const loopTopY = 95
  const loopBottomY = 235
  const loopHeightPx = loopBottomY - loopTopY
  const loopCenterY = (loopTopY + loopBottomY) / 2

  // 构造传递给 VectorArrow 的 scale
  const sceneScale: SceneScale = useMemo(() => ({
    scale: 25,
    scaleX: 25,
    scaleY: 25,
    originX: 0,
    originY: 0,
    maxVectorLength: 90,
    refMagnitudes: {
      velocity: 2.0,
      lorentzForce: 0.15,
      appliedForce: 0.15,
    },
  }), [])

  // 均匀分布在磁场区域内的 ⊗ 磁场符号
  const fieldSymbols = useMemo(() => {
    const symbols = []
    const stepX = 40
    const stepY = 35
    let idx = 0
    for (let sx = magLeftPx + 20; sx <= magRightPx - 10; sx += stepX) {
      for (let sy = 55; sy <= 270; sy += stepY) {
        symbols.push(
          <text
            key={`mag-dot-${idx++}`}
            x={sx}
            y={sy}
            fontSize={font(15)}
            fill={PHYSICS_COLORS.magneticField}
            opacity={0.35}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            ⊗
          </text>
        )
      }
    }
    return symbols
  }, [magLeftPx, magRightPx, font])

  return (
    <div className="w-full h-full bg-white rounded-xl border border-neutral-200 overflow-hidden relative shadow-sm">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* 1. 条形磁场区域背景及两道高亮边界准线 (x=0 与 x=D) */}
        <rect
          x={magLeftPx}
          y={35}
          width={magWidthPx}
          height={255}
          fill={PHYSICS_COLORS.magneticFieldLine}
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        {/* 左边缘线 x=0 */}
        <line x1={magLeftPx} y1={25} x2={magLeftPx} y2={300} stroke={PHYSICS_COLORS.magneticField} strokeWidth={2.5} />
        <text x={magLeftPx} y={312} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.magneticField} textAnchor="middle">
          x = 0
        </text>
        {/* 右边缘线 x=D */}
        <line x1={magRightPx} y1={25} x2={magRightPx} y2={300} stroke={PHYSICS_COLORS.magneticField} strokeWidth={2.5} />
        <text x={magRightPx} y={312} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.magneticField} textAnchor="middle">
          x = D ({(D * 100).toFixed(0)}cm)
        </text>

        {/* 磁场提示 */}
        <text x={(magLeftPx + magRightPx) / 2} y={20} fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.magneticField} textAnchor="middle">
          匀强有界磁场 B = {B.toFixed(1)} T (⊗ 垂直纸面向里)
        </text>

        {/* 2. 磁场内部符号 */}
        {fieldSymbols}

        {/* 3. 闭合矩形导电线框主体 */}
        <rect
          x={loopBackPx}
          y={loopTopY}
          width={loopWidthPx}
          height={loopHeightPx}
          fill="rgba(255, 255, 255, 0.4)"
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={3.5}
          rx={3}
        />

        {/* 4. 过线探针特效：当导线切割磁感线时闪烁发出高亮电流指示 */}
        {state === 'ENTERING' && (
          <g>
            {/* 前导线正在进场切割 */}
            <line
              x1={loopFrontPx} y1={loopTopY - 2}
              x2={loopFrontPx} y2={loopBottomY + 2}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* 逆时针感应电流箭头与极性标注 */}
            <text x={loopFrontPx + 10} y={loopCenterY} fontSize={font(13)} fontWeight="extrabold" fill={PHYSICS_COLORS.electricCurrent}>
              ▲ I (+)
            </text>
          </g>
        )}

        {state === 'LEAVING' && (
          <g>
            {/* 哪条导线留在场内切割取决于窄或宽线框 */}
            {d <= D ? (
              <g>
                {/* 窄线框：后边导线留场切割 */}
                <line
                  x1={loopBackPx} y1={loopTopY - 2}
                  x2={loopBackPx} y2={loopBottomY + 2}
                  stroke={PHYSICS_COLORS.electricCurrent}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <text x={loopBackPx - 35} y={loopCenterY} fontSize={font(13)} fontWeight="extrabold" fill={PHYSICS_COLORS.electricCurrent}>
                  ▼ I (-)
                </text>
              </g>
            ) : (
              <g>
                {/* 宽线框：前边已出场，后边正在进场切割 */}
                <line
                  x1={loopBackPx} y1={loopTopY - 2}
                  x2={loopBackPx} y2={loopBottomY + 2}
                  stroke={PHYSICS_COLORS.electricCurrent}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <text x={loopBackPx - 35} y={loopCenterY} fontSize={font(13)} fontWeight="extrabold" fill={PHYSICS_COLORS.electricCurrent}>
                  ▼ I (-)
                </text>
              </g>
            )}
          </g>
        )}

        {/* 5. 线框尺寸标注 */}
        <text x={loopCenterPx} y={loopTopY - 8} fontSize={font(12)} fontWeight="bold" fill={CANVAS_COLORS.textMuted} textAnchor="middle">
          宽 d = {(d * 100).toFixed(0)}cm
        </text>

        {/* 6. 安培力阻碍矢量与外拉力维持平衡矢量 (当产生感应电流时) */}
        {forceAmpere > 1e-4 && (
          <g>
            {/* 安培力阻碍相对运动 (恒水平向左，严格使用 lorentzForce 紫色) */}
            <VectorArrow
              origin={{ x: loopCenterPx, y: loopCenterY - 15 }}
              vector={{ x: -forceAmpere, y: 0 }}
              type="lorentzForce"
              sceneScale={sceneScale}
            />
            <text x={loopCenterPx - 45} y={loopCenterY - 28} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.lorentzForce}>
              F_安 = {forceAmpere.toFixed(3)} N
            </text>

            {/* 外力维持匀速直线运动 (恒向右与安培力平衡，严格使用 appliedForce) */}
            <VectorArrow
              origin={{ x: loopCenterPx, y: loopCenterY + 15 }}
              vector={{ x: forceAmpere, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
            />
            <text x={loopCenterPx + 45} y={loopCenterY + 28} fontSize={font(12)} fontWeight="bold" fill={PHYSICS_COLORS.appliedForce} textAnchor="end">
              F_外 = {forceAmpere.toFixed(3)} N
            </text>
          </g>
        )}

        {/* 7. 中央全浸入零感应平台提示 (TOTALLY_IN) */}
        {state === 'TOTALLY_IN' && (
          <g>
            <rect x={width / 2 - 120} y={loopCenterY - 18} width={240} height={36} rx={18} fill={CANVAS_COLORS.gridSubtle} stroke={CANVAS_COLORS.grid} />
            <text x={width / 2} y={loopCenterY + 4} fontSize={font(12)} fontWeight="bold" fill={CANVAS_COLORS.textMuted} textAnchor="middle">
              全入场内：前后导线电动势抵消 I = 0
            </text>
          </g>
        )}

        {/* 底部当前状态条 */}
        <g>
          <rect x={width / 2 - 140} y={height - 24} width={280} height={20} rx={10} fill={CANVAS_COLORS.gridSubtle} stroke={CANVAS_COLORS.grid} />
          <text x={width / 2} y={height - 10} fontSize={font(11)} fontWeight="bold" fill={CANVAS_COLORS.labelText} textAnchor="middle">
            当前位置 x = {(frontX * 100).toFixed(1)} cm | 状态: {state === 'BEFORE' ? '进场前' : state === 'ENTERING' ? '进场切割中' : state === 'TOTALLY_IN' ? '完全处于磁场内' : state === 'LEAVING' ? '出场切割中' : '已离场'}
          </text>
        </g>
      </svg>
    </div>
  )
})
