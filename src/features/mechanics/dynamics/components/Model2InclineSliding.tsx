import { worldToDesign } from '@/scene'
import { Block, Incline, VectorArrow, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { SystemViewBox } from './SystemViewBox'
import type { SceneScale } from '@/scene/SceneScale'

interface Model2Props {
  sceneScale: SceneScale
  groundY: number
  isSystemView: boolean
  isIsolatedView: boolean
  activeObject: number
  m1: number
  m2: number
  theta: number
  thetaRad: number
  g: number
  time: number
  model2: {
    slope_left_x: number
    slope_right_x: number
    slope_W: number
    slope_H: number
    block_pos: { x: number; y: number }
    w_block: number
    h_block: number
    a: number
    ax: number
    ay: number
    N_slope: number
    f_slope: number
    N_ground: number
    f_ground: number
  }
  font: (size: number) => number
}

export function Model2InclineSliding({
  sceneScale,
  groundY,
  isSystemView,
  isIsolatedView,
  activeObject,
  m1,
  m2,
  theta,
  thetaRad,
  g,
  time,
  model2,
  font,
}: Model2Props) {
  return (
    <g>
      {/* 整体法虚线包裹框 */}
      {isSystemView && (
        <SystemViewBox
          sceneScale={sceneScale}
          topLeft={{ x: model2.slope_left_x - 0.2, y: groundY + model2.slope_H + 0.6 }}
          bottomRight={{ x: model2.slope_right_x + 0.2, y: groundY - 0.1 }}
          m1={m1}
          m2={m2}
          font={font}
        />
      )}

      {/* 斜面体 M */}
      {(() => {
        const slope_origin = worldToDesign(model2.slope_left_x, groundY, sceneScale)
        const w_px = model2.slope_W * sceneScale.scaleX
        const h_px = model2.slope_H * sceneScale.scaleY
        const opacity = isIsolatedView && activeObject !== 1 ? 0.15 : 1
        return (
          <g opacity={opacity} className="transition-opacity duration-200">
            <Incline
              x0={slope_origin.px}
              y0={slope_origin.py}
              width={w_px}
              height={h_px}
            />
            <text
              x={slope_origin.px + w_px * 0.4}
              y={slope_origin.py - 15}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
            >
              M = {m2}kg
            </text>
            <path
              d={`M ${slope_origin.px + w_px - 24} ${slope_origin.py} A 24 24 0 0 0 ${slope_origin.px + w_px - 24 * Math.cos(theta * Math.PI / 180)} ${slope_origin.py - 24 * Math.sin(theta * Math.PI / 180)}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1.2}
            />
            <text
              x={slope_origin.px + w_px - 44}
              y={slope_origin.py - 8}
              fontSize={font(9)}
              fill={colors.neutral[600]}
              fontWeight="medium"
            >
              θ={theta}°
            </text>
          </g>
        )
      })()}

      {/* 滑块 m (沿斜面加速下滑) */}
      {(() => {
        const lt = worldToDesign(model2.block_pos.x - model2.w_block / 2, model2.block_pos.y + model2.h_block / 2, sceneScale)
        const w = model2.w_block * sceneScale.scaleX
        const h = model2.h_block * sceneScale.scaleY
        const center_px = worldToDesign(model2.block_pos.x, model2.block_pos.y, sceneScale)
        const opacity = isIsolatedView && activeObject !== 0 ? 0.15 : 1
        return (
          <g
            transform={`rotate(${theta}, ${center_px.px}, ${center_px.py})`}
            opacity={opacity}
            className="transition-opacity duration-200"
          >
            <Block
              x={lt.px}
              y={lt.py}
              width={w}
              height={h}
              type="standard"
              label={`m = ${m1}kg`}
              font={font}
              translucent={isIsolatedView && activeObject === 0}
            />
          </g>
        )
      })()}

      {/* 加速度分量标注 */}
      {isSystemView && model2.a > 0 && time > 0 && (
        <g>
          {(() => {
            const origin_design = worldToDesign(model2.block_pos.x + 0.6, model2.block_pos.y + 0.6, sceneScale)
            const origin_px = { x: origin_design.px, y: origin_design.py }
            return (
              <g opacity={0.85}>
                <VectorArrow
                  originDesign={origin_px}
                  vector={{ x: model2.a * Math.cos(thetaRad), y: -model2.a * Math.sin(thetaRad) }}
                  type="acceleration"
                  sceneScale={sceneScale}
                  label={`a = ${model2.a.toFixed(1)}`}
                  font={font}
                />
                <VectorArrow
                  originDesign={origin_px}
                  vector={{ x: model2.ax, y: 0 }}
                  type="acceleration"
                  dashed
                  sceneScale={sceneScale}
                  label={`a_x=${model2.ax.toFixed(1)}`}
                  font={font}
                />
                <VectorArrow
                  originDesign={origin_px}
                  vector={{ x: 0, y: -model2.ay }}
                  type="acceleration"
                  dashed
                  sceneScale={sceneScale}
                  label={`a_y=${model2.ay.toFixed(1)}`}
                  font={font}
                />
              </g>
            )
          })()}
        </g>
      )}

      {/* 力学矢量渲染 */}
      <g>
        {/* 整体法 (系统牛二定律) */}
        {isSystemView && (
          <g>
            <PhysicsVectorArrow
              origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY + model2.slope_H * 0.3 }}
              vector={{ x: 0, y: -(m1 + m2) * g }}
              type="gravity"
              sceneScale={sceneScale}
              label={`(M+m)g = ${((m1 + m2) * g).toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
              vector={{ x: 0, y: model2.N_ground }}
              type="normalForce"
              sceneScale={sceneScale}
              label={`N_地 = ${model2.N_ground.toFixed(1)}N`}
              font={font}
              glow
            />
            <PhysicsVectorArrow
              origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
              vector={{ x: model2.f_ground, y: 0 }}
              type="friction"
              sceneScale={sceneScale}
              label={`f_地 = ${model2.f_ground.toFixed(1)}N`}
              font={font}
            />
          </g>
        )}

        {/* 隔离滑块 m */}
        {isIsolatedView && activeObject === 0 && (
          <g>
            <PhysicsVectorArrow
              origin={model2.block_pos}
              vector={{ x: 0, y: -m1 * g }}
              type="gravity"
              sceneScale={sceneScale}
              label="mg"
              font={font}
            />
            <PhysicsVectorArrow
              origin={model2.block_pos}
              vector={{ x: model2.N_slope * Math.sin(thetaRad), y: model2.N_slope * Math.cos(thetaRad) }}
              type="normalForce"
              sceneScale={sceneScale}
              label={`N = ${model2.N_slope.toFixed(1)}N`}
              font={font}
              glow
            />
            <PhysicsVectorArrow
              origin={model2.block_pos}
              vector={{ x: -model2.f_slope * Math.cos(thetaRad), y: model2.f_slope * Math.sin(thetaRad) }}
              type="friction"
              sceneScale={sceneScale}
              label={`f = ${model2.f_slope.toFixed(1)}N`}
              font={font}
            />
          </g>
        )}

        {/* 隔离斜面 M (处于静止) */}
        {isIsolatedView && activeObject === 1 && (
          <g>
            <PhysicsVectorArrow
              origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY + model2.slope_H * 0.3 }}
              vector={{ x: 0, y: -m2 * g }}
              type="gravity"
              sceneScale={sceneScale}
              label="Mg"
              font={font}
            />
            <PhysicsVectorArrow
              origin={model2.block_pos}
              vector={{ x: -model2.N_slope * Math.sin(thetaRad), y: -model2.N_slope * Math.cos(thetaRad) }}
              type="tension"
              sceneScale={sceneScale}
              label={`N' = ${model2.N_slope.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={model2.block_pos}
              vector={{ x: model2.f_slope * Math.cos(thetaRad), y: -model2.f_slope * Math.sin(thetaRad) }}
              type="friction"
              sceneScale={sceneScale}
              color="#f43f5e"
              label={`f' = ${model2.f_slope.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
              vector={{ x: 0, y: model2.N_ground }}
              type="normalForce"
              sceneScale={sceneScale}
              label={`N_地 = ${model2.N_ground.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
              vector={{ x: model2.f_ground, y: 0 }}
              type="friction"
              sceneScale={sceneScale}
              label={`f_地 = ${model2.f_ground.toFixed(1)}N`}
              font={font}
            />
          </g>
        )}
      </g>
    </g>
  )
}
