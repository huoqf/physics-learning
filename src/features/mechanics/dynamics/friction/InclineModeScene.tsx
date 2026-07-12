import { VectorArrow, Block, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS, FONT, SCENE_COLORS } from '@/theme/physics'

import type { SceneScale } from '@/scene'
import type { FrictionSimState } from './useFrictionSimulation'

interface DoubleFrictionResult {
  isBlockSliding: boolean
  isInclineSliding: boolean
  a_M: number
  a_rel: number
  a_1x: number
  a_1y: number
  f1: number
  FN1: number
  f2: number
  FN2: number
  F_drive: number
  f2_max: number
  criticalAngle: number
}

interface InclineModeSceneProps {
  simState: FrictionSimState
  res_m2: DoubleFrictionResult
  m: number
  M: number
  angle: number
  weight: number
  weight_M: number
  inclineScale: number
  groundY: number
  pivotX: number
  boardLength: number
  vpVisibleX: number
  vpVisibleY: number
  vpVisibleW: number
  font: (size: number) => number
  frictionSceneScale: SceneScale
  boxSize: number
  showVectors: boolean
}

export default function InclineModeScene({
  simState,
  res_m2,
  m,
  M,
  angle,
  weight,
  weight_M,
  inclineScale,
  groundY,
  pivotX,
  boardLength,
  vpVisibleX,
  vpVisibleY,
  vpVisibleW,
  font,
  frictionSceneScale,
  boxSize,
  showVectors,
}: InclineModeSceneProps) {
  const angleRad = (angle * Math.PI) / 180
  const displacement_M = simState.xM * inclineScale
  const displacement_rel = simState.x_rel * inclineScale

  const H = boardLength * Math.sin(angleRad)
  const W = boardLength * Math.cos(angleRad)

  const boxLocalStartX = boardLength * 0.15
  const boxLocalX = boxLocalStartX + displacement_rel

  const localY = -boxSize / 2
  const deltaX = boxLocalX * Math.cos(angleRad) - localY * Math.sin(angleRad)
  const deltaY = boxLocalX * Math.sin(angleRad) + localY * Math.cos(angleRad)
  const blockWorldX = pivotX - displacement_M + deltaX
  const blockWorldY = groundY - H + deltaY

  return (
    <g>
      {/* 状态看板与教学点拨 */}
      <g transform={`translate(${vpVisibleX + 30}, ${vpVisibleY + 10})`}>
        <rect
          width="360"
          height="75"
          rx="6"
          fill={SCENE_COLORS.labels.glassPanelBg}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={0.8}
        />
        <text x="15" y="25" fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.labelText}>
          物理状态诊断看板：
        </text>
        <text x="15" y="46" fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight}>
          {!res_m2.isBlockSliding
            ? "💡 滑块静止在斜面上，整体水平方向无运动趋势 ➔ 地面无摩擦力 (f₂ = 0)"
            : Math.abs(res_m2.F_drive) < 0.01
              ? "💡 滑块匀速下滑，整体水平加速度为0 ➔ 地面无摩擦力 (f₂ = 0)"
              : !res_m2.isInclineSliding
                ? `💡 滑块加速下滑，斜面静止。地面提供向左的静摩擦力抗衡推力 (f₂ = ${res_m2.f2.toFixed(1)}N)`
                : `⚠️ 驱动力突破最大静摩擦力！斜面体滑动，地面提供滑动摩擦力 (f₂ = ${res_m2.f2.toFixed(1)}N)`
          }
        </text>
        <text x="15" y="64" fontSize={font(9.5)} fill={PHYSICS_COLORS.textMuted} fontStyle="italic">
          {!res_m2.isBlockSliding
            ? "隔离法分析：滑块压斜面向右的分力 = 滑块磨斜面向左的分力 (两者完全抵消)"
            : `水平推力: ${(res_m2.FN1 * Math.sin(angleRad)).toFixed(1)}N (向右) | 水平阻力: ${(res_m2.f1 * Math.cos(angleRad)).toFixed(1)}N (向左)`
          }
        </text>
      </g>

      {/* 地面线 */}
      <PhysicsGround
        x={30}
        y={groundY}
        width={vpVisibleW - 60}
        type="ground"
        appearance={{
          showHatch: true,
          color: SCENE_COLORS.materials.structStrokeMid,
        }}
      />

      {/* 三角形斜面体 */}
      <g>
        <polygon
          points={`
            ${pivotX - displacement_M},${groundY}
            ${pivotX - displacement_M + W},${groundY}
            ${pivotX - displacement_M},${groundY - H}
          `}
          fill={SCENE_COLORS.materials.structFillPale}
          stroke={SCENE_COLORS.materials.structStrokeMid}
          strokeWidth={1.5}
        />
        <text
          x={pivotX - displacement_M + W * 0.25}
          y={groundY - 12}
          fontSize={font(11)}
          fill={PHYSICS_COLORS.labelText}
          fontWeight="bold"
        >
          M = {M}kg
        </text>
      </g>

      {/* 滑块 */}
      <g transform={`translate(${pivotX - displacement_M}, ${groundY - H}) rotate(${angle})`}>
        <Block
          x={boxLocalX - boxSize / 2}
          y={-boxSize}
          width={boxSize}
          height={boxSize}
          type="wood"
          label={`m = ${m}kg`}
          stroke={CANVAS_COLORS.objectStroke}
          strokeWidth={1.8}
        />
      </g>

      {/* 力的矢量绘制 */}
      {showVectors && (
        <g>
          {/* 滑块受力 */}
          {/* 重力 G_m */}
          <VectorArrow
            originPixel={{ x: blockWorldX, y: blockWorldY }}
            vector={{ x: 0, y: -weight }}
            type="gravity"
            sceneScale={frictionSceneScale}
          />
          <text
            x={blockWorldX + 8}
            y={blockWorldY + 36}
            fontSize={font(FONT.axisSize)}
            fill={PHYSICS_COLORS.gravity}
            fontWeight="bold"
          >
            G_m
          </text>

          {/* 支持力 FN1 */}
          <VectorArrow
            originPixel={{ x: blockWorldX, y: blockWorldY }}
            vector={{ x: res_m2.FN1 * Math.sin(angleRad), y: res_m2.FN1 * Math.cos(angleRad) }}
            type="normalForce"
            sceneScale={frictionSceneScale}
          />
          <text
            x={blockWorldX + res_m2.FN1 * 0.5 * Math.sin(angleRad) + 12}
            y={blockWorldY - res_m2.FN1 * 0.5 * Math.cos(angleRad) - 10}
            fontSize={font(FONT.axisSize)}
            fill={PHYSICS_COLORS.normalForce}
            fontWeight="bold"
          >
            F_N1
          </text>

          {/* 摩擦力 f1 */}
          {res_m2.f1 > 0.1 && (
            <>
              <VectorArrow
                originPixel={{ x: blockWorldX, y: blockWorldY }}
                vector={{ x: -res_m2.f1 * Math.cos(angleRad), y: res_m2.f1 * Math.sin(angleRad) }}
                type="friction"
                sceneScale={frictionSceneScale}
              />
              <text
                x={blockWorldX - res_m2.f1 * 0.5 * Math.cos(angleRad) - 20}
                y={blockWorldY - res_m2.f1 * 0.5 * Math.sin(angleRad) - 10}
                fontSize={font(FONT.axisSize)}
                fill={PHYSICS_COLORS.friction}
                fontWeight="bold"
              >
                f₁
              </text>
            </>
          )}

          {/* 斜面体受力 */}
          {(() => {
            const inclineCenterWorldX = pivotX - displacement_M + W / 3
            const inclineCenterWorldY = groundY - H / 3

            return (
              <g>
                {/* 斜面重力 G_M */}
                <VectorArrow
                  originPixel={{ x: inclineCenterWorldX, y: inclineCenterWorldY }}
                  vector={{ x: 0, y: -weight_M }}
                  type="gravity"
                  sceneScale={frictionSceneScale}
                />
                <text
                  x={inclineCenterWorldX + 8}
                  y={inclineCenterWorldY + 36}
                  fontSize={font(FONT.axisSize)}
                  fill={PHYSICS_COLORS.gravity}
                  fontWeight="bold"
                >
                  G_M
                </text>

                {/* 地面支持力 FN2 */}
                <VectorArrow
                  originPixel={{ x: inclineCenterWorldX, y: groundY }}
                  vector={{ x: 0, y: res_m2.FN2 }}
                  type="normalForce"
                  sceneScale={frictionSceneScale}
                />
                <text
                  x={inclineCenterWorldX - 22}
                  y={groundY - 32}
                  fontSize={font(FONT.axisSize)}
                  fill={PHYSICS_COLORS.normalForce}
                  fontWeight="bold"
                >
                  F_N2
                </text>

                {/* 地面摩擦力 f2 */}
                {res_m2.f2 > 0.05 ? (
                  <>
                    <VectorArrow
                      originPixel={{ x: inclineCenterWorldX, y: groundY }}
                      vector={{ x: res_m2.f2, y: 0 }}
                      type="friction"
                      sceneScale={frictionSceneScale}
                    />
                    <text
                      x={inclineCenterWorldX + res_m2.f2 * 5 + 8}
                      y={groundY + 14}
                      fontSize={font(FONT.axisSize)}
                      fill={PHYSICS_COLORS.friction}
                      fontWeight="bold"
                    >
                      f₂ = {res_m2.f2.toFixed(1)}N ({res_m2.isInclineSliding ? "滑动" : "静"}摩擦)
                    </text>
                  </>
                ) : (
                  <g transform={`translate(${inclineCenterWorldX}, ${groundY})`}>
                    <circle cx="0" cy="0" r="3" fill={PHYSICS_COLORS.textMuted} />
                    <text x="8" y="14" fontSize={font(9.5)} fill={PHYSICS_COLORS.textMuted} fontWeight="bold">
                      f₂ = 0 (无摩擦力)
                    </text>
                  </g>
                )}
              </g>
            )
          })()}

          {/* 滑块绝对加速度的正交分解辅助线 */}
          {res_m2.isBlockSliding && (
            <g opacity={0.65}>
              {/* 水平加速度 a_1x */}
              <line
                x1={blockWorldX}
                y1={blockWorldY}
                x2={blockWorldX - res_m2.a_1x * 12}
                y2={blockWorldY}
                stroke={PHYSICS_COLORS.acceleration}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <polygon
                points={`
                  ${blockWorldX - res_m2.a_1x * 12},${blockWorldY}
                  ${blockWorldX - res_m2.a_1x * 12 + 4},${blockWorldY - 2}
                  ${blockWorldX - res_m2.a_1x * 12 + 4},${blockWorldY + 2}
                `}
                fill={PHYSICS_COLORS.acceleration}
              />
              <text
                x={blockWorldX - res_m2.a_1x * 12 - 18}
                y={blockWorldY + 4}
                fontSize={font(9)}
                fill={PHYSICS_COLORS.acceleration}
                fontWeight="semibold"
              >
                a_1x
              </text>

              {/* 竖直加速度 a_1y */}
              <line
                x1={blockWorldX}
                y1={blockWorldY}
                x2={blockWorldX}
                y2={blockWorldY + res_m2.a_1y * 12}
                stroke={PHYSICS_COLORS.acceleration}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <polygon
                points={`
                  ${blockWorldX},${blockWorldY + res_m2.a_1y * 12}
                  ${blockWorldX - 2},${blockWorldY + res_m2.a_1y * 12 - 4}
                  ${blockWorldX + 2},${blockWorldY + res_m2.a_1y * 12 - 4}
                `}
                fill={PHYSICS_COLORS.acceleration}
              />
              <text
                x={blockWorldX + 4}
                y={blockWorldY + res_m2.a_1y * 12 + 8}
                fontSize={font(9)}
                fill={PHYSICS_COLORS.acceleration}
                fontWeight="semibold"
              >
                a_1y
              </text>
            </g>
          )}

          {/* 隔离法水平分力天平指示器 */}
          {res_m2.isBlockSliding && (
            <g transform={`translate(${pivotX + displacement_M + W / 2 - 50}, ${groundY - H - 30})`}>
              <rect x="-10" y="-12" width="120" height="24" rx="4" fill={SCENE_COLORS.materials.structBgLight} opacity="0.85" stroke={CANVAS_COLORS.gridSubtle} strokeWidth="0.5" />
              <path d={`M 50 0 L ${50 + res_m2.FN1 * Math.sin(angleRad) * 2} 0`} stroke={PHYSICS_COLORS.normalForce} strokeWidth="2.5" markerEnd="url(#arrow-normalForce)" />
              <path d={`M 50 0 L ${50 - res_m2.f1 * Math.cos(angleRad) * 2} 0`} stroke={PHYSICS_COLORS.friction} strokeWidth="2.5" markerEnd="url(#arrow-friction)" />
              <circle cx="50" cy="0" r="2.5" fill={PHYSICS_COLORS.labelText} />
              <text x="50" y="-4" fontSize={font(8)} textAnchor="middle" fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                水平分量平衡分析
              </text>
            </g>
          )}
        </g>
      )}

      {/* 倾角标注弧线 */}
      <g opacity={simState.x_rel > 0.05 ? 0.15 : 0.85}>
        <path
          d={`M ${pivotX - displacement_M + W - 28} ${groundY} A 28 28 0 0 0 ${pivotX - displacement_M + W - 28 * Math.cos(angleRad)} ${groundY - 28 * Math.sin(angleRad)}`}
          fill="none"
          stroke={CANVAS_COLORS.annotation}
          strokeWidth={1.2}
        />
        <text
          x={pivotX - displacement_M + W - 38}
          y={groundY - 6}
          fontSize={font(10)}
          fill={CANVAS_COLORS.annotation}
          fontWeight="bold"
        >
          θ = {angle}°
        </text>
      </g>
    </g>
  )
}
