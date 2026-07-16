import { worldToDesign } from '@/scene'
import { Block, Incline, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { SystemViewBox } from './SystemViewBox'
import type { SceneScale } from '@/scene/SceneScale'

interface Model1Props {
  sceneScale: SceneScale
  groundY: number
  isSystemView: boolean
  isIsolatedView: boolean
  activeObject: number
  m1: number
  m2: number
  F: number
  theta: number
  thetaRad: number
  g: number
  model1: {
    slope_left_x: number
    slope_right_x: number
    slope_W: number
    slope_H: number
    block_pos: { x: number; y: number }
    w_block: number
    h_block: number
    N_slope: number
    f_slope: number
    N_ground: number
    f_ground: number
  }
  font: (size: number) => number
}

export function Model1InclineEquilibrium({
  sceneScale,
  groundY,
  isSystemView,
  isIsolatedView,
  activeObject,
  m1,
  m2,
  F,
  theta,
  thetaRad,
  g,
  model1,
  font,
}: Model1Props) {
  return (
    <g>
      {/* 整体法虚线包裹框 */}
      {isSystemView && (
        <SystemViewBox
          sceneScale={sceneScale}
          topLeft={{ x: model1.slope_left_x - 0.2, y: groundY + model1.slope_H + 0.6 }}
          bottomRight={{ x: model1.slope_right_x + 0.2, y: groundY - 0.1 }}
          m1={m1}
          m2={m2}
          font={font}
        />
      )}

      {/* 斜面体 M */}
      {(() => {
        const slope_origin = worldToDesign(model1.slope_left_x, groundY, sceneScale)
        const w_px = model1.slope_W * sceneScale.scaleX
        const h_px = model1.slope_H * sceneScale.scaleY
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

      {/* 滑块 m */}
      {(() => {
        const lt = worldToDesign(model1.block_pos.x - model1.w_block / 2, model1.block_pos.y + model1.h_block / 2, sceneScale)
        const w = model1.w_block * sceneScale.scaleX
        const h = model1.h_block * sceneScale.scaleY
        const center_px = worldToDesign(model1.block_pos.x, model1.block_pos.y, sceneScale)
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

      {/* 力学矢量渲染 */}
      <g>
        {/* 整体法 */}
        {isSystemView && (
          <g>
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x - 1.2, y: groundY + 0.3 }}
              vector={{ x: F, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
              label={`F = ${F}N`}
              font={font}
              glow
            />
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
              vector={{ x: -model1.f_ground, y: 0 }}
              type="friction"
              sceneScale={sceneScale}
              label={`f_地 = ${model1.f_ground.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY + model1.slope_H / 3 }}
              vector={{ x: 0, y: -model1.N_ground }}
              type="gravity"
              sceneScale={sceneScale}
              label={`(M+m)g = ${model1.N_ground.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
              vector={{ x: 0, y: model1.N_ground }}
              type="normalForce"
              sceneScale={sceneScale}
              label={`N_地 = ${model1.N_ground.toFixed(1)}N`}
              font={font}
            />
          </g>
        )}

        {/* 隔离滑块 m */}
        {isIsolatedView && activeObject === 0 && (
          <g>
            <PhysicsVectorArrow
              origin={model1.block_pos}
              vector={{ x: 0, y: -m1 * g }}
              type="gravity"
              sceneScale={sceneScale}
              label="mg"
              font={font}
            />
            <PhysicsVectorArrow
              origin={model1.block_pos}
              vector={{ x: model1.N_slope * Math.sin(thetaRad), y: model1.N_slope * Math.cos(thetaRad) }}
              type="normalForce"
              sceneScale={sceneScale}
              label={`N = ${model1.N_slope.toFixed(1)}N`}
              font={font}
              glow
            />
            <PhysicsVectorArrow
              origin={model1.block_pos}
              vector={{ x: -model1.f_slope * Math.cos(thetaRad), y: model1.f_slope * Math.sin(thetaRad) }}
              type="friction"
              sceneScale={sceneScale}
              label={`f = ${model1.f_slope.toFixed(1)}N`}
              font={font}
              glow
            />
          </g>
        )}

        {/* 隔离斜面 M */}
        {isIsolatedView && activeObject === 1 && (
          <g>
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x - 1.2, y: groundY + 0.3 }}
              vector={{ x: F, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
              label={`F = ${F}N`}
              font={font}
              glow
            />
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY + model1.slope_H * 0.3 }}
              vector={{ x: 0, y: -m2 * g }}
              type="gravity"
              sceneScale={sceneScale}
              label="Mg"
              font={font}
            />
            <PhysicsVectorArrow
              origin={model1.block_pos}
              vector={{ x: -model1.N_slope * Math.sin(thetaRad), y: -model1.N_slope * Math.cos(thetaRad) }}
              type="tension"
              sceneScale={sceneScale}
              label={`N' = ${model1.N_slope.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={model1.block_pos}
              vector={{ x: model1.f_slope * Math.cos(thetaRad), y: -model1.f_slope * Math.sin(thetaRad) }}
              type="friction"
              sceneScale={sceneScale}
              color="#f43f5e"
              label={`f' = ${model1.f_slope.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
              vector={{ x: 0, y: model1.N_ground }}
              type="normalForce"
              sceneScale={sceneScale}
              label={`N_地 = ${model1.N_ground.toFixed(1)}N`}
              font={font}
            />
            <PhysicsVectorArrow
              origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
              vector={{ x: -model1.f_ground, y: 0 }}
              type="friction"
              sceneScale={sceneScale}
              label={`f_地 = ${model1.f_ground.toFixed(1)}N`}
              font={font}
            />
          </g>
        )}
      </g>
    </g>
  )
}
