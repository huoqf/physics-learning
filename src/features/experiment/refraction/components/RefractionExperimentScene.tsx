import React from 'react'
import {
  PHYSICS_COLORS,
  OPTICS_COLORS,
  CANVAS_COLORS,
  withAlpha,
} from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { CanvasSize } from '@/utils'
import type { RefractionExperimentPhysicsResult } from '../hooks/useRefractionExperimentPhysics'
import {
  DRAWING_PAPER_BOUNDS,
  GLASS_SLAB_DESIGN,
  NORMAL_LINE_RANGE,
  PX_PER_MM,
  ExperimentStep,
} from '../refractionExperimentLayout'

export interface RefractionExperimentSceneProps {
  physics: RefractionExperimentPhysicsResult
  canvasSize: CanvasSize
}

/**
 * 高考插针法测定玻璃折射率——中屏交互场景组件 (SVG)
 *
 * 核心渲染要素：
 * 1. 绘图木板与白纸（带图钉固定）；
 * 2. 界面线 aa' (入射面)、bb' (出射面，含误差线) 与法线 NN'；
 * 3. 真实光学玻璃砖（支持移走玻璃砖后的幽灵轮廓模式）；
 * 4. 4 枚大头针 P1, P2, P3, P4（俯视金属针帽与定位针孔）；
 * 5. 人眼对齐视线光锥与虚像光路指示；
 * 6. 连线作图光路（入射、折射、出射与侧移）；
 * 7. 高考测定工具：全圆透光量角器特写 / 单位圆无量角器作图法 / 多角度图像法采样。
 */
export const RefractionExperimentScene: React.FC<RefractionExperimentSceneProps> = ({
  physics,
  canvasSize,
}) => {
  const { font } = canvasSize
  const { physics: p, step, method, design } = physics

  const isGlassRemoved = step >= ExperimentStep.DRAW_RAYS
  const showInputPins = step >= ExperimentStep.INSERT_INPUT_PINS
  const showOutputPins = step >= ExperimentStep.ALIGN_OUTPUT_PINS
  const showRays = step >= ExperimentStep.DRAW_RAYS
  const showMeasurements = step === ExperimentStep.MEASURE_AND_CALCULATE

  const ox = design.pointO.x
  const oy = design.pointO.y

  return (
    <g className="refraction-experiment-scene select-none">
      {/* ── 1. 实验木板底座与白纸 ── */}
      {/* 木板底座 */}
      <rect
        x={20}
        y={5}
        width={800}
        height={315}
        rx={8}
        fill={colors.accent[100]}
        stroke={colors.accent[300]}
        strokeWidth={2}
      />
      {/* 实验白纸 */}
      <rect
        x={DRAWING_PAPER_BOUNDS.x}
        y={DRAWING_PAPER_BOUNDS.y}
        width={DRAWING_PAPER_BOUNDS.width}
        height={DRAWING_PAPER_BOUNDS.height}
        rx={3}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1}
      />
      {/* 白纸四角固定图钉 */}
      {[
        { cx: DRAWING_PAPER_BOUNDS.x + 12, cy: DRAWING_PAPER_BOUNDS.y + 12 },
        { cx: DRAWING_PAPER_BOUNDS.x + DRAWING_PAPER_BOUNDS.width - 12, cy: DRAWING_PAPER_BOUNDS.y + 12 },
        { cx: DRAWING_PAPER_BOUNDS.x + 12, cy: DRAWING_PAPER_BOUNDS.y + DRAWING_PAPER_BOUNDS.height - 12 },
        { cx: DRAWING_PAPER_BOUNDS.x + DRAWING_PAPER_BOUNDS.width - 12, cy: DRAWING_PAPER_BOUNDS.y + DRAWING_PAPER_BOUNDS.height - 12 },
      ].map((pos, idx) => (
        <circle
          key={idx}
          cx={pos.cx}
          cy={pos.cy}
          r={3.5}
          fill={PHYSICS_COLORS.acceleration}
          stroke={CANVAS_COLORS.dangerText}
          strokeWidth={1}
        />
      ))}

      {/* ── 2. 界面线与法线（铅笔作图） ── */}
      {/* 界面 aa' (上表面) */}
      <line
        x1={GLASS_SLAB_DESIGN.leftX - 40}
        y1={oy}
        x2={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width + 40}
        y2={oy}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />
      <text
        x={GLASS_SLAB_DESIGN.leftX - 45}
        y={oy + 4}
        fontSize={font(10)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="end"
      >
        a
      </text>
      <text
        x={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width + 45}
        y={oy + 4}
        fontSize={font(10)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="start"
      >
        a'
      </text>

      {/* 实际画出的界面 bb' (下表面，考虑学生画偏误差) */}
      <line
        x1={GLASS_SLAB_DESIGN.leftX - 40}
        y1={oy + design.drawnThicknessPx}
        x2={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width + 40}
        y2={oy + design.drawnThicknessPx}
        stroke={p.errorOffsetMm !== 0 ? CANVAS_COLORS.alertRed : CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
        strokeDasharray={p.errorOffsetMm !== 0 ? '4,3' : undefined}
      />
      <text
        x={GLASS_SLAB_DESIGN.leftX - 45}
        y={oy + design.drawnThicknessPx + 4}
        fontSize={font(10)}
        fill={p.errorOffsetMm !== 0 ? CANVAS_COLORS.alertRed : CANVAS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="end"
      >
        {p.errorOffsetMm !== 0 ? 'b (画出线)' : 'b'}
      </text>
      <text
        x={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width + 45}
        y={oy + design.drawnThicknessPx + 4}
        fontSize={font(10)}
        fill={p.errorOffsetMm !== 0 ? CANVAS_COLORS.alertRed : CANVAS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="start"
      >
        {p.errorOffsetMm !== 0 ? "b' (画出线)" : "b'"}
      </text>

      {/* 真实下表面基准线 (如果画偏了，给出灰色对比线与标注) */}
      {p.errorOffsetMm !== 0 && (
        <>
          <line
            x1={GLASS_SLAB_DESIGN.leftX - 30}
            y1={oy + design.glassThicknessPx}
            x2={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width + 30}
            y2={oy + design.glassThicknessPx}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <text
            x={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width + 35}
            y={oy + design.glassThicknessPx + 3}
            fontSize={font(8.5)}
            fill={CANVAS_COLORS.axis}
            fontWeight="bold"
          >
            真实底面
          </text>
        </>
      )}

      {/* 法线 NN' (垂直于界面 aa') */}
      <line
        x1={ox}
        y1={NORMAL_LINE_RANGE.topY}
        x2={ox}
        y2={NORMAL_LINE_RANGE.bottomY}
        stroke={PHYSICS_COLORS.lightRayNormal}
        strokeWidth={1.2}
        strokeDasharray="4,3"
      />
      <text x={ox + 6} y={NORMAL_LINE_RANGE.topY + 8} fontSize={font(9.5)} fill={PHYSICS_COLORS.lightRayNormal} fontWeight="bold">
        N
      </text>
      <text x={ox + 6} y={NORMAL_LINE_RANGE.bottomY - 4} fontSize={font(9.5)} fill={PHYSICS_COLORS.lightRayNormal} fontWeight="bold">
        N'
      </text>

      {/* 入射点 O 标记 */}
      <circle cx={ox} cy={oy} r={2.5} fill={CANVAS_COLORS.labelText} />
      <text x={ox + 8} y={oy - 6} fontSize={font(10.5)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
        O
      </text>

      {/* ── 3. 矩形玻璃砖（移砖作图时显示虚线幽灵轮廓） ── */}
      <rect
        x={GLASS_SLAB_DESIGN.leftX}
        y={GLASS_SLAB_DESIGN.topY}
        width={GLASS_SLAB_DESIGN.width}
        height={design.glassThicknessPx}
        rx={2}
        fill={isGlassRemoved ? withAlpha(OPTICS_COLORS.glassFill, 0.08) : OPTICS_COLORS.glassFill}
        stroke={isGlassRemoved ? withAlpha(OPTICS_COLORS.glassStroke, 0.4) : OPTICS_COLORS.glassStroke}
        strokeWidth={1.8}
        strokeDasharray={isGlassRemoved ? '5,4' : undefined}
      />
      {!isGlassRemoved && (
        <text
          x={GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width - 15}
          y={GLASS_SLAB_DESIGN.topY + 18}
          textAnchor="end"
          fontSize={font(10)}
          fill={withAlpha(CANVAS_COLORS.labelText, 0.65)}
          fontWeight="bold"
        >
          {`矩形光学玻璃砖 (n = ${p.nReal.toFixed(2)})`}
        </text>
      )}

      {/* ── 4. 视线对齐指示（Step 2 观察虚像并插 P3, P4） ── */}
      {step === ExperimentStep.ALIGN_OUTPUT_PINS && (
        <g className="eye-alignment-guide">
          {/* 观察视线光束（从人眼指向玻璃砖内的 P1', P2' 虚像） */}
          <line
            x1={design.eyePos.x}
            y1={design.eyePos.y}
            x2={design.pointOReal.x}
            y2={design.pointOReal.y}
            stroke={colors.accent[500]}
            strokeWidth={1.2}
            strokeDasharray="3,3"
          />
          {/* 眼睛图标示意 */}
          <g transform={`translate(${design.eyePos.x}, ${design.eyePos.y})`}>
            <circle cx={0} cy={0} r={9} fill={colors.accent[100]} stroke={colors.accent[600]} strokeWidth={1.5} />
            <circle cx={-2} cy={0} r={4} fill={CANVAS_COLORS.strokeDark} />
            <circle cx={-3} cy={-1} r={1.5} fill={CANVAS_COLORS.white} />
            <text x={14} y={4} fontSize={font(9.5)} fill={colors.accent[700]} fontWeight="bold">
              视线：对齐P1、P2虚像
            </text>
          </g>
        </g>
      )}

      {/* ── 5. 光路连线与作图 ── */}
      {showRays && (
        <g className="refracted-rays">
          {/* 入射光线 P1 -> P2 -> O */}
          <line
            x1={design.rayInStart.x}
            y1={design.rayInStart.y}
            x2={ox}
            y2={oy}
            stroke={PHYSICS_COLORS.wavelengthBlue}
            strokeWidth={1.8}
          />
          {/* 入射光线延长线（用于对比折射偏折与计算侧移） */}
          <line
            x1={ox}
            y1={oy}
            x2={ox + design.glassThicknessPx * Math.tan(p.theta1Rad) * 1.5}
            y2={oy + design.glassThicknessPx * 1.5}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1}
            strokeDasharray="3,3"
          />

          {/* 玻璃内折射光线 O -> O' (学生根据画出的界面相连) */}
          <line
            x1={ox}
            y1={oy}
            x2={design.pointODrawn.x}
            y2={design.pointODrawn.y}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={2.2}
          />

          {/* 真实玻璃内折射光线 O -> O_real (仅在有误差时显现对比) */}
          {p.errorOffsetMm !== 0 && (
            <line
              x1={ox}
              y1={oy}
              x2={design.pointOReal.x}
              y2={design.pointOReal.y}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1.2}
              strokeDasharray="2,2"
            />
          )}

          {/* 出射光线 O' -> P3 -> P4 -> 延伸 */}
          <line
            x1={design.pointODrawn.x}
            y1={design.pointODrawn.y}
            x2={design.rayOutEnd.x}
            y2={design.rayOutEnd.y}
            stroke={PHYSICS_COLORS.wavelengthBlue}
            strokeWidth={1.8}
          />

          {/* 出射点 O' 标记 */}
          <circle cx={design.pointODrawn.x} cy={design.pointODrawn.y} r={2.5} fill={CANVAS_COLORS.labelText} />
          <text
            x={design.pointODrawn.x + 8}
            y={design.pointODrawn.y + 12}
            fontSize={font(10)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
          >
            O'
          </text>
        </g>
      )}

      {/* ── 6. 大头针渲染 (P1 ~ P4) ── */}
      {showInputPins && (
        <>
          <PinItem
            x={design.pinP1.x}
            y={design.pinP1.y}
            label="P₁"
            font={font}
            color={PHYSICS_COLORS.acceleration}
          />
          <PinItem
            x={design.pinP2.x}
            y={design.pinP2.y}
            label="P₂"
            font={font}
            color={PHYSICS_COLORS.acceleration}
          />
        </>
      )}
      {showOutputPins && (
        <>
          <PinItem
            x={design.pinP3.x}
            y={design.pinP3.y}
            label="P₃"
            font={font}
            color={PHYSICS_COLORS.potentialEnergy}
          />
          <PinItem
            x={design.pinP4.x}
            y={design.pinP4.y}
            label="P₄"
            font={font}
            color={PHYSICS_COLORS.potentialEnergy}
          />
        </>
      )}

      {/* ── 7. 测量工具与作图特写 (Step 4) ── */}
      {showMeasurements && (
        <g className="measurement-tools">
          {/* 方法 0：全圆透光量角器测量法（中心在 O 点，同时覆盖入射角与折射角） */}
          {method === 0 && (
            <g className="protractor-overlay" transform={`translate(${ox}, ${oy})`}>
              {/* 全圆半透明量角器底盘 */}
              <circle
                cx={0}
                cy={0}
                r={75}
                fill={withAlpha(colors.accent[300], 0.18)}
                stroke={colors.accent[600]}
                strokeWidth={1.2}
              />
              <line x1={-75} y1={0} x2={75} y2={0} stroke={colors.accent[600]} strokeWidth={0.8} />

              {/* 上半圆刻度半径线 (测 θ₁) */}
              {[15, 30, 45, 60, 75].map((deg) => {
                const rad = (deg * Math.PI) / 180
                return (
                  <line
                    key={`top-${deg}`}
                    x1={-70 * Math.sin(rad)}
                    y1={-70 * Math.cos(rad)}
                    x2={-75 * Math.sin(rad)}
                    y2={-75 * Math.cos(rad)}
                    stroke={colors.accent[600]}
                    strokeWidth={1}
                  />
                )
              })}
              {/* 下半圆刻度半径线 (测 θ₂) */}
              {[15, 30, 45, 60, 75].map((deg) => {
                const rad = (deg * Math.PI) / 180
                return (
                  <line
                    key={`bottom-${deg}`}
                    x1={70 * Math.sin(rad)}
                    y1={70 * Math.cos(rad)}
                    x2={75 * Math.sin(rad)}
                    y2={75 * Math.cos(rad)}
                    stroke={colors.accent[600]}
                    strokeWidth={1}
                  />
                )
              })}

              {/* 入射角 θ₁ 弧线标注 */}
              <path
                d={`M 0,-40 A 40,40 0 0,0 ${-40 * Math.sin(p.theta1Rad)},${-40 * Math.cos(p.theta1Rad)}`}
                fill="none"
                stroke={PHYSICS_COLORS.electricPotential}
                strokeWidth={1.8}
              />
              {(() => {
                const midRad1 = p.theta1Rad / 2
                const tx1 = -52 * Math.sin(midRad1)
                const ty1 = -52 * Math.cos(midRad1)
                return (
                  <text
                    x={tx1}
                    y={ty1}
                    fontSize={font(10)}
                    fill={PHYSICS_COLORS.electricPotential}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`θ₁ = ${p.theta1Deg.toFixed(1)}°`}
                  </text>
                )
              })()}

              {/* 测得折射角 θ₂ 弧线标注 */}
              <path
                d={`M 0,40 A 40,40 0 0,0 ${40 * Math.sin(p.theta2MeasRad)},${40 * Math.cos(p.theta2MeasRad)}`}
                fill="none"
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={1.8}
              />
              {(() => {
                const midRad2 = p.theta2MeasRad / 2
                const tx2 = 52 * Math.sin(midRad2)
                const ty2 = 52 * Math.cos(midRad2)
                return (
                  <text
                    x={tx2}
                    y={ty2 + 4}
                    fontSize={font(10)}
                    fill={PHYSICS_COLORS.velocity}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`θ₂ = ${p.theta2MeasDeg.toFixed(1)}°`}
                  </text>
                )
              })()}
            </g>
          )}

          {/* 方法 1：单位圆无量角器法 (以 O 为圆心作辅助圆) */}
          {method === 1 && (
            <g className="unit-circle-method">
              {/* 辅助圆 */}
              <circle
                cx={ox}
                cy={oy}
                r={p.unitCircleRadiusMm * PX_PER_MM}
                fill="none"
                stroke={PHYSICS_COLORS.magneticField}
                strokeWidth={1.2}
                strokeDasharray="4,3"
              />
              {/* 点 A: 辅助圆与入射光线交点 */}
              {(() => {
                const rPx = p.unitCircleRadiusMm * PX_PER_MM
                const ax = ox - rPx * Math.sin(p.theta1Rad)
                const ay = oy - rPx * Math.cos(p.theta1Rad)
                // 垂足 A' 在法线上
                const aPrimeX = ox
                const aPrimeY = ay

                // 点 B: 辅助圆与测得折射光线交点
                const bx = ox + rPx * Math.sin(p.theta2MeasRad)
                const by = oy + rPx * Math.cos(p.theta2MeasRad)
                // 垂足 B' 在法线上
                const bPrimeX = ox
                const bPrimeY = by

                return (
                  <>
                    {/* 垂线 AA' */}
                    <line x1={ax} y1={ay} x2={aPrimeX} y2={aPrimeY} stroke={CANVAS_COLORS.alertRed} strokeWidth={2} />
                    <circle cx={ax} cy={ay} r={3} fill={CANVAS_COLORS.alertRed} />
                    <text x={ax - 8} y={ay - 4} fontSize={font(10)} fill={CANVAS_COLORS.alertRed} fontWeight="bold">
                      A
                    </text>
                    <text x={aPrimeX + 5} y={aPrimeY + 3} fontSize={font(9)} fill={CANVAS_COLORS.alertRed} fontWeight="bold">
                      A'
                    </text>
                    <text x={(ax + aPrimeX) / 2} y={ay - 5} fontSize={font(9.5)} fill={CANVAS_COLORS.alertRed} textAnchor="middle" fontWeight="bold">
                      {`AA' = ${p.distAAPrimeMm.toFixed(1)}mm`}
                    </text>

                    {/* 垂线 BB' */}
                    <line x1={bx} y1={by} x2={bPrimeX} y2={bPrimeY} stroke={PHYSICS_COLORS.wavelengthGreen} strokeWidth={2} />
                    <circle cx={bx} cy={by} r={3} fill={PHYSICS_COLORS.wavelengthGreen} />
                    <text x={bx + 8} y={by + 4} fontSize={font(10)} fill={PHYSICS_COLORS.wavelengthGreen} fontWeight="bold">
                      B
                    </text>
                    <text x={bPrimeX - 6} y={bPrimeY + 3} fontSize={font(9)} fill={PHYSICS_COLORS.wavelengthGreen} textAnchor="end" fontWeight="bold">
                      B'
                    </text>
                    <text x={(bx + bPrimeX) / 2} y={by + 12} fontSize={font(9.5)} fill={PHYSICS_COLORS.wavelengthGreen} textAnchor="middle" fontWeight="bold">
                      {`BB' = ${p.distBBPrimeMm.toFixed(1)}mm`}
                    </text>

                    {/* 公式牌 */}
                    <rect
                      x={ox - 160}
                      y={oy + 95}
                      width={130}
                      height={22}
                      rx={4}
                      fill={CANVAS_COLORS.white}
                      stroke={PHYSICS_COLORS.wavelengthGreen}
                      strokeWidth={1}
                    />
                    <text
                      x={ox - 95}
                      y={oy + 110}
                      fontSize={font(9.5)}
                      fill={PHYSICS_COLORS.wavelengthGreen}
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {`n = AA'/BB' = ${p.nCircleMeas.toFixed(3)}`}
                    </text>
                  </>
                )
              })()}
            </g>
          )}

          {/* 方法 2：高考图像斜率法数据采样视觉 */}
          {method === 2 && (
            <g className="slope-method-visual">
              {/* 采样光线示踪：虚线示意多组入射角采样 */}
              {[30, 60].map((sampleTheta) => {
                const sRad1 = (sampleTheta * Math.PI) / 180
                const sRad2 = Math.asin(Math.sin(sRad1) / p.nReal)
                const inLen = 60
                const outLen = design.glassThicknessPx
                return (
                  <g key={sampleTheta} opacity={0.35}>
                    <line
                      x1={ox - inLen * Math.sin(sRad1)}
                      y1={oy - inLen * Math.cos(sRad1)}
                      x2={ox}
                      y2={oy}
                      stroke={PHYSICS_COLORS.electricPotential}
                      strokeWidth={1}
                      strokeDasharray="3,3"
                    />
                    <line
                      x1={ox}
                      y1={oy}
                      x2={ox + outLen * Math.tan(sRad2)}
                      y2={oy + outLen}
                      stroke={PHYSICS_COLORS.velocity}
                      strokeWidth={1}
                      strokeDasharray="3,3"
                    />
                  </g>
                )
              })}
              {/* 右上角数据采样说明标牌 */}
              <g transform={`translate(${GLASS_SLAB_DESIGN.leftX + GLASS_SLAB_DESIGN.width - 200}, 20)`}>
                <rect
                  x={0}
                  y={0}
                  width={190}
                  height={32}
                  rx={4}
                  fill={CANVAS_COLORS.white}
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={1}
                />
                <text
                  x={10}
                  y={14}
                  fontSize={font(9.5)}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                >
                  多角度连续采样中 (见上方图表)
                </text>
                <text
                  x={10}
                  y={26}
                  fontSize={font(8.5)}
                  fill={CANVAS_COLORS.labelText}
                >
                  {`当前点: (${Math.sin(p.theta2MeasRad).toFixed(3)}, ${Math.sin(p.theta1Rad).toFixed(3)})`}
                </text>
              </g>
            </g>
          )}
        </g>
      )}
    </g>
  )
}

/** 大头针单独渲染小部件 */
function PinItem({
  x,
  y,
  label,
  font,
  color,
}: {
  x: number
  y: number
  label: string
  font: (n: number) => number
  color: string
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 大头针在白纸上的投影小阴影 */}
      <ellipse cx={2} cy={2} rx={4.5} ry={3} fill={withAlpha(CANVAS_COLORS.black, 0.18)} />
      {/* 针帽外圈（金属质感） */}
      <circle cx={0} cy={0} r={5} fill={color} stroke={CANVAS_COLORS.white} strokeWidth={1} />
      {/* 针尖扎入中心深色点 */}
      <circle cx={0} cy={0} r={1.2} fill={CANVAS_COLORS.strokeDark} />
      {/* 标签文本 */}
      <text
        x={8}
        y={-6}
        fontSize={font(10)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}
