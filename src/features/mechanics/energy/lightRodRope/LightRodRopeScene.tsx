import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Ball, Pulley, VectorArrow } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import type { UseLightRodRopePhysicsResult } from '../hooks/useLightRodRopePhysics'

interface LightRodRopeSceneProps {
  physics: UseLightRodRopePhysicsResult
}

export function LightRodRopeScene({ physics }: LightRodRopeSceneProps) {
  const { params, state, layout, forceVectors, particles, tEnd, time, canvasSize } = physics
  const { font } = canvasSize
  const { constraint, showGravity, showTension, showResolution, showVelocityDecomp } = params
  const {
    pivotX,
    pivotY,
    L_pix,
    R_p,
    x_A,
    y_A,
    x_B,
    y_B,
    x_start_A,
    y_start_A,
    x_start_B,
    y_start_B,
  } = layout

  const renderRope = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    isSlack: boolean,
    nominalLength: number
  ) => {
    if (isSlack) {
      const dx = x2 - x1
      const dy = y2 - y1
      const dist = Math.sqrt(dx * dx + dy * dy)
      const sag = Math.max(6, (nominalLength - dist) * 0.8)
      const cx = (x1 + x2) / 2
      const cy = (y1 + y2) / 2 + sag
      return (
        <path
          d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
          fill="none"
          stroke={SCENE_COLORS.surface.ropeColor}
          strokeWidth={1.5}
          strokeDasharray="4,4"
          strokeLinecap="round"
        />
      )
    } else {
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={SCENE_COLORS.surface.ropeActive}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )
    }
  }

  return (
    <g>
      {/* 依据约束模式，动态渲染固定点或定滑轮 */}
      {constraint === 0 ? (
        <>
          <rect x={pivotX - 40} y={pivotY - 14} width={80} height={8} fill={SCENE_COLORS.surface.wallFill} rx={1} />
          <line x1={pivotX - 50} y1={pivotY - 6} x2={pivotX + 50} y2={pivotY - 6} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />
          <line x1={pivotX} y1={pivotY - 6} x2={pivotX} y2={pivotY} stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={1.5} />
          <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />
        </>
      ) : constraint === 1 ? (
        <Pulley cx={pivotX} cy={pivotY} r={R_p} hangerTopY={pivotY - 45} />
      ) : (
        <>
          <rect x={pivotX - 30} y={pivotY - 14} width={60} height={8} fill={SCENE_COLORS.surface.wallFill} rx={1} />
          <line x1={pivotX - 40} y1={pivotY - 6} x2={pivotX + 40} y2={pivotY - 6} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />
          <line x1={pivotX} y1={pivotY - 6} x2={pivotX} y2={pivotY} stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={1.5} />
          <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />
        </>
      )}

      {/* 杆/绳渲染 */}
      {constraint === 0 ? (
        <g>
          <line
            x1={pivotX}
            y1={pivotY}
            x2={x_B}
            y2={y_B}
            stroke={SCENE_COLORS.pendulum.rodFill}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={pivotX} cy={pivotY} r={5} fill="none" stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={1} />
          <circle cx={x_A} cy={y_A} r={4} fill="none" stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={1} />
          <circle cx={x_B} cy={y_B} r={5} fill="none" stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={1.2} />
        </g>
      ) : constraint === 1 ? (
        <g>
          <path
            d={`M ${x_start_A} ${y_start_A} A ${R_p} ${R_p} 0 0 1 ${x_start_B} ${y_start_B}`}
            fill="none"
            stroke={SCENE_COLORS.surface.ropeActive}
            strokeWidth={1.5}
          />
          {renderRope(x_start_A, y_start_A, x_A, y_A, state.isSlackA, L_pix / 2)}
          {renderRope(x_start_B, y_start_B, x_B, y_B, state.isSlackB, L_pix)}
        </g>
      ) : (
        <g>
          {renderRope(pivotX, pivotY, x_A, y_A, state.isSlackA, L_pix / 2)}
          {renderRope(x_A, y_A, x_B, y_B, state.isSlackB, L_pix / 2)}
        </g>
      )}

      {/* 能量转移粒子 */}
      {constraint === 0 &&
        params.showParticles &&
        particles.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={2.2}
            fill="white"
            stroke={PHYSICS_COLORS.kineticEnergy}
            strokeWidth={0.5}
            opacity={0.8}
          />
        ))}

      {/* 小球 A (m1) */}
      <Ball
        cx={x_A}
        cy={y_A}
        r={10}
        type="planetCool"
        stroke={SCENE_COLORS.sphere.planetCool.stroke}
        strokeWidth={1.5}
      />

      {/* 小球 B (m2) */}
      <Ball
        cx={x_B}
        cy={y_B}
        r={13}
        type="pendulumBob"
        stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
        strokeWidth={1.5}
      />

      {/* 受力与速度矢量箭头 */}
      <g>
        {/* 重力 */}
        {showGravity && (!showVelocityDecomp || constraint !== 2) && (
          <>
            <VectorArrow
              originDesign={{ x: x_A, y: y_A }}
              vector={{ x: 0, y: -params.m1 * params.g * 5 }}
              type="gravity"
              sceneScale={IDENTITY_SCENE_SCALE}
              label="G_A"
            />
            <VectorArrow
              originDesign={{ x: x_B, y: y_B }}
              vector={{ x: 0, y: -params.m2 * params.g * 5 }}
              type="gravity"
              sceneScale={IDENTITY_SCENE_SCALE}
              label="G_B"
            />
          </>
        )}

        {/* 杆/绳作用力及其分解 */}
        {constraint === 0 ? (
          <>
            {showTension && (
              <VectorArrow
                originDesign={{ x: x_A, y: y_A }}
                vector={state.F_A}
                pixelLength={forceVectors.mag_F_A * 2.5}
                type="tension"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                label="F_杆A"
              />
            )}
            {showResolution && (
              <>
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={forceVectors.F_A_radial}
                  pixelLength={forceVectors.mag_F_A_rad * 2.5}
                  type="forceComponent"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F_A径"
                  dashed={true}
                />
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={forceVectors.F_A_tangential}
                  pixelLength={forceVectors.mag_F_A_tan * 2.5}
                  type="forceComponent"
                  arrowType="visual-only"
                  color={PHYSICS_COLORS.velocity}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F_A切"
                />
                <line
                  x1={forceVectors.x_A_rad}
                  y1={forceVectors.y_A_rad}
                  x2={forceVectors.x_A_total}
                  y2={forceVectors.y_A_total}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
                <line
                  x1={forceVectors.x_A_tan}
                  y1={forceVectors.y_A_tan}
                  x2={forceVectors.x_A_total}
                  y2={forceVectors.y_A_total}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              </>
            )}

            {showTension && (
              <VectorArrow
                originDesign={{ x: x_B, y: y_B }}
                vector={state.F_B}
                pixelLength={forceVectors.mag_F_B * 2.5}
                type="tension"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                label="F_杆B"
              />
            )}
            {showResolution && (
              <>
                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={forceVectors.F_B_radial}
                  pixelLength={forceVectors.mag_F_B_rad * 2.5}
                  type="forceComponent"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F_B径"
                  dashed={true}
                />
                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={forceVectors.F_B_tangential}
                  pixelLength={forceVectors.mag_F_B_tan * 2.5}
                  type="forceComponent"
                  arrowType="visual-only"
                  color={PHYSICS_COLORS.power}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F_B切"
                />
                <line
                  x1={forceVectors.x_B_rad}
                  y1={forceVectors.y_B_rad}
                  x2={forceVectors.x_B_total}
                  y2={forceVectors.y_B_total}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
                <line
                  x1={forceVectors.x_B_tan}
                  y1={forceVectors.y_B_tan}
                  x2={forceVectors.x_B_total}
                  y2={forceVectors.y_B_total}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              </>
            )}
          </>
        ) : constraint === 1 ? (
          <>
            {showTension && (
              <>
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={{ x: state.F_A.x * 2.5, y: state.F_A.y * 2.5 }}
                  type="force"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F_绳A"
                />
                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={{ x: state.F_B.x * 2.5, y: state.F_B.y * 2.5 }}
                  type="force"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F_绳B"
                />
              </>
            )}
          </>
        ) : (
          <>
            {showTension && !showVelocityDecomp && (
              <>
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={state.F_A}
                  pixelLength={state.T_A * 2.5}
                  type="tension"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="T_OA"
                />

                {(() => {
                  const dx_AB = x_B - x_A
                  const dy_AB = y_B - y_A
                  const len_AB = Math.sqrt(dx_AB * dx_AB + dy_AB * dy_AB)
                  const nx_AB = len_AB > 1e-6 ? dx_AB / len_AB : 0
                  const ny_AB = len_AB > 1e-6 ? dy_AB / len_AB : 1
                  const F_A_AB_phys = {
                    x: state.T_B * nx_AB,
                    y: -state.T_B * ny_AB,
                  }
                  return (
                    <VectorArrow
                      originDesign={{ x: x_A, y: y_A }}
                      vector={F_A_AB_phys}
                      pixelLength={state.T_B * 2.5}
                      type="tension"
                      arrowType="visual-only"
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="T_AB"
                    />
                  )
                })()}

                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={state.F_B}
                  pixelLength={state.T_B * 2.5}
                  type="tension"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="T_AB"
                />
              </>
            )}
          </>
        )}

        {/* 模式 2 速度矢量与直角分解三角形 */}
        {constraint === 2 &&
          showVelocityDecomp &&
          (() => {
            const dx_AB = x_B - x_A
            const dy_AB = y_B - y_A
            const len_AB = Math.sqrt(dx_AB * dx_AB + dy_AB * dy_AB)
            const nx_AB = len_AB > 1e-6 ? dx_AB / len_AB : 0
            const ny_AB = len_AB > 1e-6 ? dy_AB / len_AB : 1

            const vScale = 22

            const vA_para = state.vAx * nx_AB + state.vAy * -ny_AB
            const vAx_para = vA_para * nx_AB
            const vAy_para = vA_para * -ny_AB
            const vAx_perp = state.vAx - vAx_para
            const vAy_perp = state.vAy - vAy_para

            const x_A_v = x_A + state.vAx * vScale
            const y_A_v = y_A - state.vAy * vScale
            const x_A_v_para = x_A + vAx_para * vScale
            const y_A_v_para = y_A - vAy_para * vScale

            const vB_para = state.vBx * nx_AB + state.vBy * -ny_AB
            const vBx_para = vB_para * nx_AB
            const vBy_para = vB_para * -ny_AB
            const vBx_perp = state.vBx - vBx_para
            const vBy_perp = state.vBy - vBy_para

            const x_B_v = x_B + state.vBx * vScale
            const y_B_v = y_B - state.vBy * vScale
            const x_B_v_para = x_B + vBx_para * vScale
            const y_B_v_para = y_B - vBy_para * vScale

            return (
              <>
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={{ x: state.vAx, y: state.vAy }}
                  pixelLength={state.vA * vScale}
                  type="velocity"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v_A"
                />
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={{ x: vAx_para, y: vAy_para }}
                  pixelLength={Math.abs(vA_para) * vScale}
                  type="velocity"
                  arrowType="visual-only"
                  color={PHYSICS_COLORS.velocityX}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v_A∥"
                />
                <VectorArrow
                  originDesign={{ x: x_A, y: y_A }}
                  vector={{ x: vAx_perp, y: vAy_perp }}
                  pixelLength={Math.sqrt(vAx_perp * vAx_perp + vAy_perp * vAy_perp) * vScale}
                  type="velocity"
                  arrowType="visual-only"
                  color={PHYSICS_COLORS.velocityY}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v_A⊥"
                />
                <line
                  x1={x_A_v_para}
                  y1={y_A_v_para}
                  x2={x_A_v}
                  y2={y_A_v}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />

                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={{ x: state.vBx, y: state.vBy }}
                  pixelLength={state.vB * vScale}
                  type="velocity"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v_B"
                />
                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={{ x: vBx_para, y: vBy_para }}
                  pixelLength={Math.abs(vB_para) * vScale}
                  type="velocity"
                  arrowType="visual-only"
                  color={PHYSICS_COLORS.velocityX}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v_B∥"
                />
                <VectorArrow
                  originDesign={{ x: x_B, y: y_B }}
                  vector={{ x: vBx_perp, y: vBy_perp }}
                  pixelLength={Math.sqrt(vBx_perp * vBx_perp + vBy_perp * vBy_perp) * vScale}
                  type="velocity"
                  arrowType="visual-only"
                  color={PHYSICS_COLORS.velocityY}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v_B⊥"
                />
                <line
                  x1={x_B_v_para}
                  y1={y_B_v_para}
                  x2={x_B_v}
                  y2={y_B_v}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />

                {!state.isSlackB && (
                  <text
                    x={(x_A + x_B) / 2}
                    y={(y_A + y_B) / 2 - 12}
                    textAnchor="middle"
                    fill={PHYSICS_COLORS.velocityX}
                    fontSize={font(9)}
                    fontWeight="bold"
                  >
                    v_A∥ = v_B∥
                  </text>
                )}
              </>
            )
          })()}
      </g>

      {/* 终点提示 */}
      {constraint === 1 && time >= tEnd - 0.001 && state.stopReason && (
        <g transform={`translate(20, 580)`}>
          <rect
            width={310}
            height={28}
            rx={4}
            fill={state.stopReason === 'slack' ? colors.danger[50] : colors.success[50]}
            stroke={state.stopReason === 'slack' ? colors.danger[200] : colors.success[200]}
            strokeWidth={1}
          />
          <text
            x={155}
            y={18}
            textAnchor="middle"
            fill={state.stopReason === 'slack' ? colors.danger[700] : colors.success[700]}
            fontSize={font(11)}
            fontWeight="bold"
          >
            {state.stopReason === 'slack'
              ? '⚠️ 绳子张力降为 0 开始松弛，第一阶段结束'
              : '✅ 小球到达最低点，第一运动阶段结束'}
          </text>
        </g>
      )}
    </g>
  )
}
