/**
 * EarthGravityScene — 地球自转重力分解场景组件
 *
 * 从 GravityBasicAnimation.tsx 拆分：模式 0 的所有渲染逻辑。
 */
import { FC } from 'react'
import { VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CANVAS_STYLE, FONT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { withAlpha } from '@/theme/physics'
import type { SceneScale } from '@/scene'

interface EarthData {
  objX: number
  objY: number
  R_earth: number
  effectiveLat: number
  Fx_grav: number
  Fy_grav: number
  Fx_centrifugal: number
  Fy_centrifugal: number
  Gx: number
  Gy: number
  G_force: number
  F_centrifugal: number
  F_gravitation: number
  angleDeviation: number
}

interface EarthGravitySceneProps {
  earthData: EarthData
  cx: number
  cy: number
  showVectors: boolean
  font: (size: number) => number
  gravBasicSceneScale: SceneScale
}

export const EarthGravityScene: FC<EarthGravitySceneProps> = ({
  earthData,
  cx,
  cy,
  showVectors,
  font,
  gravBasicSceneScale,
}) => {
  return (
    <g>
      {/* 地球自转轴 */}
      <line
        x1={cx} y1={cy - earthData.R_earth - 30}
        x2={cx} y2={cy + earthData.R_earth + 30}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={1.5}
        strokeDasharray="5,4"
      />
      <text x={cx} y={cy - earthData.R_earth - 36} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">自转轴 (北极 N)</text>
      <text x={cx} y={cy + earthData.R_earth + 44} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">南极 S</text>

      {/* 地球圆形本体 */}
      <circle
        cx={cx} cy={cy} r={earthData.R_earth}
        fill="url(#earth-grad)"
        stroke={SCENE_COLORS.sphere.earthTech.stroke}
        strokeWidth={2}
      />

      {/* 绘制赤道面 */}
      <line
        x1={cx - earthData.R_earth} y1={cy}
        x2={cx + earthData.R_earth} y2={cy}
        stroke={withAlpha(colors.neutral.white, 0.4)}
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      <text x={cx - earthData.R_earth + 16} y={cy - 4} fontSize={font(9)} fill={withAlpha(colors.neutral.white, 0.7)} fontWeight="bold">赤道面</text>

      {/* 绘制纬度虚线圈 (物体所在纬度) */}
      {earthData.effectiveLat > 0 && earthData.effectiveLat < 90 && (
        <line
          x1={cx - earthData.R_earth * Math.cos((earthData.effectiveLat * Math.PI) / 180)}
          y1={earthData.objY}
          x2={cx + earthData.R_earth * Math.cos((earthData.effectiveLat * Math.PI) / 180)}
          y2={earthData.objY}
          stroke={withAlpha(colors.neutral.white, 0.25)}
          strokeWidth={0.8}
          strokeDasharray="2,2"
        />
      )}

      {/* 绘制物体到地心的辅助连线 (半径尺寸线) */}
      <line
        x1={cx} y1={cy}
        x2={earthData.objX} y2={earthData.objY}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {/* 绘制平行四边形力分解虚线 */}
      {showVectors && (
        <g opacity={0.6}>
          {/* 从引力端点连向重力端点 */}
          <line
            x1={earthData.objX + earthData.Fx_grav}
            y1={earthData.objY - earthData.Fy_grav}
            x2={earthData.objX + earthData.Gx}
            y2={earthData.objY - earthData.Gy}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="2,2"
          />
          {/* 从离心力端点连向重力端点 */}
          <line
            x1={earthData.objX + earthData.Fx_centrifugal}
            y1={earthData.objY - earthData.Fy_centrifugal}
            x2={earthData.objX + earthData.Gx}
            y2={earthData.objY - earthData.Gy}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="2,2"
          />
        </g>
      )}

      {/* 绘制力矢量 */}
      {showVectors && (
        <g>
          {/* 1. 万有引力 (指向地心) */}
          <VectorArrow
            originDesign={{ x: earthData.objX, y: earthData.objY }}
            vector={{ x: earthData.Fx_grav, y: earthData.Fy_grav }}
            type="gravity"
            arrowType="physical-schematic"
            sceneScale={gravBasicSceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            pixelLength={Math.hypot(earthData.Fx_grav, earthData.Fy_grav)}
          />
          <text
            x={earthData.objX + earthData.Fx_grav * 0.65 - 12}
            y={earthData.objY - earthData.Fy_grav * 0.65 - 4}
            fontSize={FONT.axisSize} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
          >
            F引
          </text>

          {/* 2. 离心力 (非惯性系，水平背离自转轴) */}
          {earthData.F_centrifugal > 1.5 && (
            <VectorArrow
              originDesign={{ x: earthData.objX, y: earthData.objY }}
              vector={{ x: earthData.Fx_centrifugal, y: earthData.Fy_centrifugal }}
              type="forceComponent"
              arrowType="physical-schematic"
              sceneScale={gravBasicSceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              pixelLength={Math.hypot(earthData.Fx_centrifugal, earthData.Fy_centrifugal)}
            />
          )}
          {earthData.F_centrifugal > 5 && (
            <text
              x={earthData.objX + earthData.Fx_centrifugal + 6}
              y={earthData.objY - 6}
              fontSize={FONT.axisSize} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold" textAnchor="start"
            >
              F离
            </text>
          )}

          {/* 3. 重力 (万有引力和自转向心力的矢量差) */}
          <VectorArrow
            originDesign={{ x: earthData.objX, y: earthData.objY }}
            vector={{ x: earthData.Gx, y: earthData.Gy }}
            type="gravity"
            arrowType="physical-schematic"
            sceneScale={gravBasicSceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            pixelLength={Math.hypot(earthData.Gx, earthData.Gy)}
          />
          <text
            x={earthData.objX + earthData.Gx + (earthData.Gx > 0 ? 6 : -18)}
            y={earthData.objY - earthData.Gy + (earthData.Gy > 0 ? 12 : -4)}
            fontSize={FONT.axisSize} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
          >
            G (重力)
          </text>

          {/* 偏角文字标注 (仅当有可见偏角且在 15~75 度之间时显示) */}
          {earthData.angleDeviation > 0.5 && earthData.effectiveLat > 10 && earthData.effectiveLat < 80 && (
            <text
              x={earthData.objX + 18} y={earthData.objY - 22}
              fontSize={font(10)} fill={CANVAS_COLORS.annotation} fontWeight="bold"
            >
              偏角 θ ≈ {earthData.angleDeviation.toFixed(1)}°
            </text>
          )}
        </g>
      )}

      {/* 放置在地球表面的滑块小球 */}
      <circle
        cx={earthData.objX} cy={earthData.objY} r={8}
        fill="url(#brass-grad)"
        stroke={PHYSICS_COLORS.labelText}
        strokeWidth={1.5}
      />
      {/* 标注球体质量 (可见标注 1/5) */}
      <text x={earthData.objX} y={earthData.objY - 14} fontSize={font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        m
      </text>
      {/* 纬度数值标注 (可见标注 2/5) */}
      <text x={cx + 10} y={cy - 10} fontSize={font(11)} fill="white" fontWeight="bold">
        φ = {earthData.effectiveLat.toFixed(1)}°
      </text>
    </g>
  )
}
