import React, { useMemo } from 'react'
import { CANVAS_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { GRAVITY } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { computeScale } from '@/utils/coordinate'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import type { SceneScale } from '@/scene'

interface InclineForceDiagramProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
  showForceComponents: boolean
  bFieldDir?: number
  font?: (size: number) => number
}

export const InclineForceDiagram: React.FC<InclineForceDiagramProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  theta,
  showForceComponents,
  bFieldDir = 0,
  font = (s) => s,
}) => {
  const thetaRad = (theta * Math.PI) / 180

  // 1. 斜面几何结构计算 (在 w, h 的局部视口内)
  const padX = 25
  const padY = 25
  const x0 = padX
  const y0 = h - padY

  const slopeW = w - 2 * padX
  // 斜面高度
  const slopeH = slopeW * Math.tan(thetaRad)

  // 斜坡终点 (右上角)
  const rightX = x0 + slopeW
  const topY = y0 - slopeH

  // 2. 导体棒在斜面上的像素位置
  // 物理坐标范围为 [-1.1, 1.1]
  const xMin = -1.1
  const xMax = 1.1
  const rodRatio = Math.max(0.08, Math.min(0.92, (physicsResult.x - xMin) / (xMax - xMin)))

  const px = x0 + rodRatio * slopeW
  const py = y0 - rodRatio * slopeH

  // 3. 矢量箭头绘制的坐标转换，利用最大力进行自适应，防溢出
  const m = 0.5;
  const g = GRAVITY;
  const F_max = Math.max(
    m * g,
    Math.abs(physicsResult.F_ampere),
    Math.abs(physicsResult.f),
    Math.abs(physicsResult.N),
    5.0
  );
  const forceScale = computeScale(w, h, { xMin: -F_max, xMax: F_max, yMin: -F_max, yMax: F_max })

  const localScale = useMemo<SceneScale>(() => {
    return {
      originX: px,
      originY: py,
      scaleX: forceScale,
      scaleY: forceScale,
      scale: forceScale,
      maxVectorLength: 60,
      refMagnitudes: { force: 2.0 },
    }
  }, [px, py, forceScale])

  // 重力 mg
  const G_phys = { x: 0, y: -m * g }

  // 支持力 N
  const N_phys = {
    x: -physicsResult.N * Math.sin(thetaRad),
    y: physicsResult.N * Math.cos(thetaRad),
  }

  // 安培力 F_安，读取自适应物理分量
  const Fa_phys = { x: physicsResult.F_ampere_x, y: physicsResult.F_ampere_y }

  // 摩擦力 f (沿斜面向上为正，方向为 (cosθ, sinθ)，向下为负)
  const f_phys = {
    x: physicsResult.f * Math.cos(thetaRad),
    y: physicsResult.f * Math.sin(thetaRad),
  }

  // 4. 正交分解坐标轴与投影辅助线
  // 沿斜面坐标轴轴线：从棒心 px, py 沿 (cosθ, -sinθ)
  // 垂直斜面坐标轴轴线：从棒心 px, py 沿 (-sinθ, -cosθ)
  const axisLen = 45

  // 计算投影点
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)

  // 任意力矢量在 x'(沿斜面向上) 与 y'(垂直斜面向外) 上的正交投影。
  // 旧版只按“安培力水平”处理投影，切到“垂直斜面/水平磁场”时虚线会与真实力箭头不一致。
  const G_mag = m * g * forceScale
  const slopeAxis = { x: cosT, y: sinT }
  const normalAxis = { x: -sinT, y: cosT }
  const toScreenOffset = (v: { x: number; y: number }) => ({ x: v.x * forceScale, y: -v.y * forceScale })
  const projectForce = (v: { x: number; y: number }) => {
    const slopeComp = v.x * slopeAxis.x + v.y * slopeAxis.y
    const normalComp = v.x * normalAxis.x + v.y * normalAxis.y
    const slopeVector = { x: slopeComp * slopeAxis.x, y: slopeComp * slopeAxis.y }
    const normalVector = { x: normalComp * normalAxis.x, y: normalComp * normalAxis.y }
    return {
      end: toScreenOffset(v),
      slope: toScreenOffset(slopeVector),
      normal: toScreenOffset(normalVector),
    }
  }

  const G_projection = projectForce(G_phys)
  const Fa_projection = projectForce(Fa_phys)

  // 正方向约定：物理计算中 x' 沿斜面向上为正；因此 a < 0 表示沿斜面下滑。
  const signAxisLen = 34
  const signAxisStart = { x: x0 + Math.min(70, slopeW * 0.25), y: y0 - 12 }
  const signAxisEnd = {
    x: signAxisStart.x + signAxisLen * cosT,
    y: signAxisStart.y - signAxisLen * sinT,
  }
  const signAxisAngleDeg = (Math.atan2(signAxisEnd.y - signAxisStart.y, signAxisEnd.x - signAxisStart.x) * 180) / Math.PI

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 侧视图底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill="none"
        stroke="none"
      />
      <text
        x="12"
        y="18"
        fontSize={font(7.5)}
        fill={CANVAS_COLORS.strokeDark}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        2D 侧视受力图 (原理)
      </text>

      {/* 平衡电流区间标注 */}
      <g transform="translate(12, 32)">
        <text
          fontSize={font(6.5)}
          fill={CANVAS_COLORS.textMuted}
          fontWeight="semibold"
          style={{ userSelect: 'none' }}
        >
          平衡电流范围:
        </text>
        <text
          x="0"
          y="11"
          fontSize={font(7)}
          fill={physicsResult.state === 'equilibrium' ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.forceArrowRed}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          {(() => {
            const imin = physicsResult.I_min
            const imax = physicsResult.I_max
            const formatVal = (v: number) => {
              if (v === -Infinity) return '-∞'
              if (v === Infinity) return '+∞'
              return `${v.toFixed(2)} A`
            }
            return `[${formatVal(imin)}, ${formatVal(imax)}]`
          })()}
        </text>
      </g>

      {/* 磁场文字标注 */}
      <text
        x={w - 12}
        y="18"
        fontSize={font(7.5)}
        fill={PHYSICS_COLORS.magneticField}
        fontWeight="extrabold"
        textAnchor="end"
        style={{ userSelect: 'none' }}
      >
        磁场 B = {Math.abs(B).toFixed(1)} T {(() => {
          if (Math.abs(B) < 1e-4) return '(无磁场)';
          if (bFieldDir === 0) return B > 0 ? '(竖直向上 ↑)' : '(竖直向下 ↓)';
          if (bFieldDir === 1) return B > 0 ? '(垂直斜面向外 ↖)' : '(垂直斜面向内 ↘)';
          return B > 0 ? '(水平向右 →)' : '(水平向左 ←)';
        })()}
      </text>

      {/* 匀强磁场多方向箭头 (指示整个空间磁场) */}
      {Math.abs(B) > 1e-4 && (
        <g opacity="0.45">
          {Array.from({ length: 4 }).map((_, i) => {
            const isBUp = B > 0;
            let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
            
            if (bFieldDir === 0) {
              const fx = padX + 15 + i * ((slopeW - 30) / 3);
              lx1 = fx; ly1 = y0 - 10;
              lx2 = fx; ly2 = y0 - slopeH - 15;
            } else if (bFieldDir === 1) {
              const ratio = 0.15 + i * 0.23;
              const xp = x0 + ratio * slopeW;
              const yp = y0 - ratio * slopeH;
              const ext = 35;
              lx1 = xp + ext * sinT; ly1 = yp + ext * cosT;
              lx2 = xp - ext * sinT; ly2 = yp - ext * cosT;
            } else {
              const fy = y0 - 15 - i * ((slopeH + 10) / 3);
              lx1 = padX + 10; ly1 = fy;
              lx2 = w - padX - 10; ly2 = fy;
            }

            const startX = isBUp ? lx1 : lx2;
            const startY = isBUp ? ly1 : ly2;
            const endX = isBUp ? lx2 : lx1;
            const endY = isBUp ? ly2 : ly1;

            const angleRad = Math.atan2(endY - startY, endX - startX);
            const angleDeg = (angleRad * 180) / Math.PI;

            return (
              <g key={i}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={PHYSICS_COLORS.magneticField}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <g transform={`translate(${endX}, ${endY}) rotate(${angleDeg})`}>
                  <polygon
                    points="0,0 -4,-2.2 -4,2.2"
                    fill={PHYSICS_COLORS.magneticField}
                  />
                </g>
                {i === 0 && (
                  <g transform={`translate(${endX + (bFieldDir === 2 ? -15 : -8)}, ${endY + (bFieldDir === 2 ? 10 : -8)})`}>
                    <text
                      x="0"
                      y="0"
                      fontSize={font(8)}
                      fill={PHYSICS_COLORS.magneticField}
                      fontWeight="bold"
                      fontStyle="italic"
                      textAnchor="middle"
                    >
                      B
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* 侧视斜劈 */}
      <polygon
        points={`${x0},${y0} ${rightX},${y0} ${rightX},${topY}`}
        fill={CANVAS_COLORS.gridSubtle}
        stroke={CANVAS_COLORS.axis}
        strokeWidth="1"
      />
      {/* 斜面高光顶边 */}
      <line
        x1={x0}
        y1={y0}
        x2={rightX}
        y2={topY}
        stroke={CANVAS_COLORS.white}
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* 角度标注 */}
      <path
        d={`M ${x0 + 18} ${y0} A 18 18 0 0 0 ${x0 + 18 * Math.cos(thetaRad)} ${y0 - 18 * Math.sin(thetaRad)}`}
        fill="none"
        stroke={CANVAS_COLORS.trackHistory}
        strokeWidth="0.8"
      />
      <text
        x={x0 + 22}
        y={y0 - 5}
        fontSize={font(5.5)}
        fill={CANVAS_COLORS.textMuted}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {theta}°
      </text>

      {/* 正方向约定：解释右侧面板中加速度正负号 */}
      <g opacity="0.82">
        <line
          x1={signAxisStart.x}
          y1={signAxisStart.y}
          x2={signAxisEnd.x}
          y2={signAxisEnd.y}
          stroke={CANVAS_COLORS.axis}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <g transform={`translate(${signAxisEnd.x}, ${signAxisEnd.y}) rotate(${signAxisAngleDeg})`}>
          <polygon points="0,0 -5,-2.5 -5,2.5" fill={CANVAS_COLORS.axis} />
        </g>
        <text
          x={signAxisEnd.x + 4}
          y={signAxisEnd.y - 3}
          fontSize={font(5.5)}
          fill={CANVAS_COLORS.labelTextLight}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          +x′
        </text>
        <text
          x={12}
          y={h - 7}
          fontSize={font(5.2)}
          fill={CANVAS_COLORS.textMuted}
          fontWeight="semibold"
          style={{ userSelect: 'none' }}
        >
          约定：+x′ 沿斜面向上，a&lt;0 表示下滑
        </text>
      </g>

      {/* 正交分解辅助坐标轴 */}
      {showForceComponents && (
        <g opacity="0.45">
          {/* 沿斜面坐标轴 (x') */}
          <line
            x1={px - axisLen * cosT}
            y1={py + axisLen * sinT}
            x2={px + axisLen * cosT}
            y2={py - axisLen * sinT}
            stroke={CANVAS_COLORS.axis}
            strokeWidth="0.8"
            strokeDasharray="3,3"
          />
          <text
            x={px + axisLen * cosT + 3}
            y={py - axisLen * sinT}
            fontSize={font(5)}
            fill={CANVAS_COLORS.labelTextLight}
            fontWeight="bold"
          >
            x'
          </text>

          {/* 垂直斜面坐标轴 (y') */}
          <line
            x1={px + axisLen * sinT}
            y1={py + axisLen * cosT}
            x2={px - axisLen * sinT}
            y2={py - axisLen * cosT}
            stroke={CANVAS_COLORS.axis}
            strokeWidth="0.8"
            strokeDasharray="3,3"
          />
          <text
            x={px - axisLen * sinT - 6}
            y={py - axisLen * cosT}
            fontSize={font(5)}
            fill={CANVAS_COLORS.labelTextLight}
            fontWeight="bold"
          >
            y'
          </text>
        </g>
      )}

      {/* 投影辅助虚线 (重力与安培力分解) */}
      {showForceComponents && (
        <g stroke={CANVAS_COLORS.trackHistory} strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.8">
          {/* 重力投影到 y' 轴 (垂直斜面) */}
          <line
            x1={px + G_projection.end.x}
            y1={py + G_projection.end.y}
            x2={px + G_projection.normal.x}
            y2={py + G_projection.normal.y}
          />
          {/* 重力投影到 x' 轴 (平行斜面) */}
          <line
            x1={px + G_projection.end.x}
            y1={py + G_projection.end.y}
            x2={px + G_projection.slope.x}
            y2={py + G_projection.slope.y}
          />

          {/* 安培力投影到 y' 轴 (垂直斜面) */}
          <line
            x1={px + Fa_projection.end.x}
            y1={py + Fa_projection.end.y}
            x2={px + Fa_projection.normal.x}
            y2={py + Fa_projection.normal.y}
          />
          {/* 安培力投影到 x' 轴 (平行斜面) */}
          <line
            x1={px + Fa_projection.end.x}
            y1={py + Fa_projection.end.y}
            x2={px + Fa_projection.slope.x}
            y2={py + Fa_projection.slope.y}
          />
        </g>
      )}

      {/* 导体棒侧视圆截面 */}
      <g transform={`translate(${px}, ${py})`}>
        <circle
          cx="0"
          cy="0"
          r="7"
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth="1.5"
        />
        {/* 电流方向符号 */}
        {I > 0 ? (
          /* 向里 ⊗ */
          <g opacity="0.6">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" />
            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" />
          </g>
        ) : I < 0 ? (
          /* 向外 ⊙ */
          <circle cx="0" cy="0" r="1.8" fill={PHYSICS_COLORS.electricCurrent} />
        ) : null}
      </g>

      {/* 受力矢量箭头 */}
      {/* 重力 G (红色/深灰色) */}
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={G_phys}
        type="gravity"
        sceneScale={localScale}
        strokeWidth={1.8}
        pixelLength={G_mag}
      />
      <text
        x={px + 3}
        y={py + G_mag - 2}
        fontSize={font(6.5)}
        fill={PHYSICS_COLORS.gravity}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        G
      </text>

      {/* 支持力 N (蓝色) */}
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={N_phys}
        type="normalForce"
        sceneScale={localScale}
        strokeWidth={1.8}
        pixelLength={physicsResult.N * forceScale}
      />
      <text
        x={px + N_phys.x * forceScale - 9}
        y={py - N_phys.y * forceScale + 2}
        fontSize={font(6.5)}
        fill={PHYSICS_COLORS.normalForce}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        N
      </text>

      {/* 安培力 F_安 (橙色) */}
      {Math.abs(physicsResult.F_ampere) > 1e-4 && (
        <g>
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={Fa_phys}
            type="lorentzForce"
            sceneScale={localScale}
            strokeWidth={1.8}
            pixelLength={Math.hypot(Fa_phys.x, Fa_phys.y) * forceScale}
          />
          <text
            x={px + Fa_phys.x * forceScale + (Fa_phys.x >= 0 ? 4 : -18)}
            y={py - Fa_phys.y * forceScale + (Fa_phys.y > 0 ? -5 : 11)}
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="bold"
            textAnchor={Fa_phys.x < 0 ? 'end' : 'start'}
            style={{ userSelect: 'none' }}
          >
            F_安
          </text>
        </g>
      )}

      {/* 摩擦力 f */}
      {Math.abs(physicsResult.f) > 1e-4 && (
        <g>
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={f_phys}
            type="friction"
            sceneScale={localScale}
            strokeWidth={1.8}
            pixelLength={Math.abs(physicsResult.f * forceScale)}
          />
          <text
            x={px + f_phys.x * forceScale + (physicsResult.f > 0 ? 3 : -14)}
            y={py - f_phys.y * forceScale - 3}
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.friction}
            fontWeight="bold"
            style={{ userSelect: 'none' }}
          >
            f
          </text>
        </g>
      )}

      {/* 运动失稳时的合外力粗红色箭头 */}
      {Math.abs(physicsResult.a) > 0.05 && (
        <g>
          <VectorArrow
            origin={{ x: 0, y: 3.5 }}
            vector={{
              x: physicsResult.a > 0 ? 2.5 * cosT : -2.5 * cosT,
              y: physicsResult.a > 0 ? 2.5 * sinT : -2.5 * sinT,
            }}
            type="acceleration"
            sceneScale={localScale}
            strokeWidth={2.5}
            pixelLength={2.5 * forceScale}
          />
          <text
            x={px + (physicsResult.a > 0 ? 15 * cosT + 4 : -15 * cosT - 12)}
            y={py - (physicsResult.a > 0 ? 15 * sinT + 12 : -15 * sinT + 3)}
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.acceleration}
            fontWeight="extrabold"
            style={{ userSelect: 'none' }}
          >
            F_合
          </text>
        </g>
      )}
    </g>
  )
}

export default InclineForceDiagram
