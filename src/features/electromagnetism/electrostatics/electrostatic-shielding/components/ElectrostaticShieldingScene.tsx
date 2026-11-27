import { Ball, PhysicsGround, PhysicsVectorArrow, VectorArrow } from '@/components/Physics'
import {
  ELECTROSTATIC_APPARATUS_COLORS,
  EM_COLORS,
  DYNAMICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
  STROKE,
} from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils'
import type { ElectrostaticShieldingPhysicsResult } from '../hooks/useElectrostaticShieldingPhysics'

interface ElectrostaticShieldingSceneProps {
  physics: ElectrostaticShieldingPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  mode: number
  isGrounded: number
  showFieldLines: number
  tipRadius: number
  shieldType: number
}

export function ElectrostaticShieldingScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
  mode,
  isGrounded,
  showFieldLines,
  tipRadius,
  shieldType,
}: ElectrostaticShieldingSceneProps) {
  const { font } = canvasSize

  const centerX = 420
  const centerY = 310

  // 模式 1：随尖端曲率半径 R (0.2 ~ 3.0 mm) 连续形变的导体右端与电荷分布
  const bluntness = Math.max(0, Math.min(1, (tipRadius - 0.2) / 2.8))
  const tipArcY = 8 + bluntness * 46 // 尖端纵半高：8(极尖) -> 54(圆钝)
  const tipCtrlX = 620 + bluntness * 18
  const tipPath = `M 220,310 C 220,200 320,180 440,240 L 585,${310 - tipArcY} Q ${tipCtrlX},310 585,${310 + tipArcY} L 440,380 C 320,440 220,420 220,310 Z`
  const tipChargeCount = Math.max(2, Math.min(5, Math.round(2 + (1 - bluntness) * 3)))
  const tipRayLen = Math.min(95, 22 + physics.shielding.tipChargeDensity * 1.8)

  return (
    <g>
      {/* 底部基座 */}
      <PhysicsGround
        x={vp.designLeft}
        y={570}
        width={vp.designVisibleW}
        type="ground"
      />

      {/* 模式 0: 静电平衡下的导体 (实心金属块内部零场) */}
      {mode === 0 && (
        <g>
          {/* 背景外电场线 E0 */}
          {showFieldLines === 1 && (
            <g>
              {physics.fieldLineOffsets.map((offset, i) => {
                const y = centerY + offset
                return (
                  <g key={i}>
                    <VectorArrow
                      originDesign={{ x: 80, y }}
                      vector={{ x: 1, y: 0 }}
                      type="electricField"
                      arrowType="visual-only"
                      sceneScale={sceneScale}
                      pixelLength={190}
                      strokeWidth={STROKE.vectorThin}
                      color={EM_COLORS.electricField}
                    />
                    <VectorArrow
                      originDesign={{ x: 570, y }}
                      vector={{ x: 1, y: 0 }}
                      type="electricField"
                      arrowType="visual-only"
                      sceneScale={sceneScale}
                      pixelLength={190}
                      strokeWidth={STROKE.vectorThin}
                      color={EM_COLORS.electricField}
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* 实心金属导体块 */}
          <rect
            x={280}
            y={160}
            width={280}
            height={300}
            rx={20}
            fill={withAlpha(SCENE_COLORS.materials.structBgPale, 0.6)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={3}
          />
          <text
            x={centerX}
            y={200}
            fontSize={font(13)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            静电平衡金属导体 (整体为等势体)
          </text>

          {/* 左表面感应负电荷群 (-) */}
          {[-100, -50, 0, 50, 100].map((dy, idx) => (
            <g key={`neg-${idx}`} transform={`translate(295, ${centerY + dy})`}>
              <circle cx={0} cy={0} r={9} fill={EM_COLORS.negativeCharge} />
              <text x={0} y={4} fontSize={font(12)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">-</text>
            </g>
          ))}

          {/* 右表面感应正电荷群 (+) */}
          {[-100, -50, 0, 50, 100].map((dy, idx) => (
            <g key={`pos-${idx}`} transform={`translate(545, ${centerY + dy})`}>
              <circle cx={0} cy={0} r={9} fill={EM_COLORS.positiveCharge} />
              <text x={0} y={4} fontSize={font(12)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">+</text>
            </g>
          ))}

          {/* 导体内部矢量合成特写 (E0 与 E' 用不同语义色区分) */}
          <g transform={`translate(${centerX}, ${centerY + 30})`}>
            <PhysicsVectorArrow
              originDesign={{ x: 0, y: -25 }}
              vector={{ x: physics.shielding.E0, y: 0 }}
              type="electricField"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
              color={EM_COLORS.electricField}
            />
            <text x={0} y={-36} fontSize={font(11)} fontWeight="bold" fill={EM_COLORS.electricField} textAnchor="middle">
              外加场强 E₀ (向右)
            </text>

            <PhysicsVectorArrow
              originDesign={{ x: 0, y: 15 }}
              vector={{ x: -physics.shielding.EPrime, y: 0 }}
              type="electricForce"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
              color={EM_COLORS.electricForce}
            />
            <text x={0} y={34} fontSize={font(11)} fontWeight="bold" fill={EM_COLORS.electricForce} textAnchor="middle">
              感应场强 E&apos; (向左)
            </text>

            <rect
              x={-85}
              y={55}
              width={170}
              height={36}
              rx={6}
              fill={withAlpha(DYNAMICS_COLORS.appliedForce, 0.1)}
              stroke={DYNAMICS_COLORS.appliedForce}
              strokeWidth={1.5}
            />
            <text x={0} y={78} fontSize={font(12)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce} textAnchor="middle">
              内部合场强 E合 ≡ 0
            </text>
          </g>
        </g>
      )}

      {/* 模式 1: 尖端放电与避雷针 (曲率半径连续形变 + 避雷针接地) */}
      {mode === 1 && (
        <g>
          {/* 随 tipRadius 连续形变的带电导体 (左钝右尖) */}
          <path
            d={tipPath}
            fill={withAlpha(SCENE_COLORS.materials.structBgPale, 0.7)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={3}
          />

          {/* 圆钝端稀疏电荷 */}
          {[230, 265, 305].map((x, i) => (
            <g key={`blunt-${i}`} transform={`translate(${x}, ${222 - i * 8})`}>
              <circle cx={0} cy={0} r={8} fill={EM_COLORS.positiveCharge} />
              <text x={0} y={3.5} fontSize={font(11)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">+</text>
            </g>
          ))}

          {/* 右侧尖端电荷（数量与密集度随 1/R 动态变化，保持最小间距避免文字重叠） */}
          {Array.from({ length: tipChargeCount }, (_, idx) => {
            const frac = tipChargeCount > 1 ? idx / (tipChargeCount - 1) - 0.5 : 0
            const spreadY = Math.max(60, tipArcY * 1.45)
            const cx = 562 + (1 - Math.abs(frac) * 1.4) * (36 + bluntness * 8)
            const cy = 310 + frac * spreadY
            return (
              <g key={`sharp-${idx}`} transform={`translate(${cx}, ${cy})`}>
                <circle cx={0} cy={0} r={6} fill={EM_COLORS.positiveCharge} />
                <text x={0} y={3} fontSize={font(9)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">+</text>
              </g>
            )
          })}

          {/* 尖端周边场强辐射线（随 σ 伸长）+ 击穿放电火花 */}
          <g>
            {[-28, 0, 28].map((dy, idx) => (
              <line
                key={`ray-${idx}`}
                x1={614}
                y1={310 + dy * 0.2}
                x2={614 + tipRayLen}
                y2={310 + dy * (physics.shielding.isAirBreakdown ? 1.1 : 0.7)}
                stroke={physics.shielding.isAirBreakdown ? DYNAMICS_COLORS.appliedForce : EM_COLORS.electricField}
                strokeWidth={physics.shielding.isAirBreakdown ? 2.5 : 1.5}
                strokeDasharray={physics.shielding.isAirBreakdown ? '4 2' : '3 4'}
                opacity={physics.shielding.isAirBreakdown ? 0.95 : 0.6}
              />
            ))}
            {physics.shielding.isAirBreakdown && (
              <text x={630} y={258} fontSize={font(12)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce}>
                ⚡ 击穿空气放电微粒流
              </text>
            )}
          </g>

          {/* 接地引线（如避雷针接地预设） */}
          {isGrounded === 1 && (
            <g transform="translate(340, 405)">
              <line x1={0} y1={0} x2={0} y2={60} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={2.5} />
              <line x1={-18} y1={60} x2={18} y2={60} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={3} />
              <line x1={-11} y1={67} x2={11} y2={67} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={2.5} />
              <line x1={-4} y1={74} x2={4} y2={74} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={2} />
              <text x={24} y={66} fontSize={font(11)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce}>
                避雷针接地引流 (φ = 0V)
              </text>
            </g>
          )}

          {/* 物理量实时数据标注看板 */}
          <rect
            x={150}
            y={120}
            width={300}
            height={60}
            rx={6}
            fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.9)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />
          <text x={170} y={145} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
            • 尖端曲率半径: R = {tipRadius.toFixed(1)} mm
          </text>
          <text x={170} y={168} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
            • 尖端电荷面密度指数: σ = {physics.shielding.tipChargeDensity} (相对值)
          </text>
        </g>
      )}

      {/* 模式 2: 空腔静电屏蔽（外屏蔽 vs 内屏蔽） */}
      {mode === 2 && (
        <g>
          {/* 金属空腔外壳 */}
          <path
            d="M 280,170 C 280,170 560,170 560,170 C 600,170 600,450 560,450 C 560,450 280,450 280,450 C 240,450 240,170 280,170 Z
               M 320,210 C 300,210 300,410 320,410 C 320,410 520,410 520,410 C 540,410 540,210 520,210 C 520,210 320,210 320,210 Z"
            fill={withAlpha(SCENE_COLORS.materials.structStroke, 0.2)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={3}
            fillRule="evenodd"
          />

          {shieldType === 0 ? (
            <g>
              {/* 外屏蔽：外部水平匀强电场线 E0（左侧进入壳外壁，右侧由壳外壁发出，腔内完全无场线） */}
              {[-100, -50, 0, 50, 100].map((offset, i) => {
                const y = centerY + offset
                return (
                  <g key={`cavity-ef-${i}`}>
                    <VectorArrow
                      originDesign={{ x: 80, y }}
                      vector={{ x: 1, y: 0 }}
                      type="electricField"
                      arrowType="visual-only"
                      sceneScale={sceneScale}
                      pixelLength={162}
                      strokeWidth={STROKE.vectorThin}
                      color={EM_COLORS.electricField}
                    />
                    <VectorArrow
                      originDesign={{ x: 598, y }}
                      vector={{ x: 1, y: 0 }}
                      type="electricField"
                      arrowType="visual-only"
                      sceneScale={sceneScale}
                      pixelLength={162}
                      strokeWidth={STROKE.vectorThin}
                      color={EM_COLORS.electricField}
                    />
                  </g>
                )
              })}

              <text x={centerX} y={148} fontSize={font(13)} fontWeight="bold" fill={CANVAS_COLORS.labelText} textAnchor="middle">
                外屏蔽：阻挡外部电场进入空腔 (E_内 ≡ 0)
              </text>
              <text x={centerX} y={235} fontSize={font(12)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
                腔内验电器金箔保持闭合
              </text>

              {/* 金属空腔内部金箔验电器 */}
              <g>
                <circle
                  cx={centerX}
                  cy={340}
                  r={48}
                  fill={ELECTROSTATIC_APPARATUS_COLORS.glassDomeFill}
                  stroke={ELECTROSTATIC_APPARATUS_COLORS.glassDomeStroke}
                  strokeWidth={2}
                />
                <rect
                  x={centerX - 10}
                  y={286}
                  width={20}
                  height={14}
                  rx={3}
                  fill={ELECTROSTATIC_APPARATUS_COLORS.insulatorPlug}
                  stroke={SCENE_COLORS.materials.structStroke}
                  strokeWidth={1}
                />
                <circle
                  cx={centerX}
                  cy={268}
                  r={9}
                  fill={ELECTROSTATIC_APPARATUS_COLORS.ballFill}
                  stroke={SCENE_COLORS.materials.structStroke}
                  strokeWidth={1.5}
                />
                <rect
                  x={centerX - 2.5}
                  y={277}
                  width={5}
                  height={58}
                  fill={ELECTROSTATIC_APPARATUS_COLORS.rodFill}
                />
                <line
                  x1={centerX - 2}
                  y1={335}
                  x2={centerX - 2}
                  y2={368}
                  stroke={ELECTROSTATIC_APPARATUS_COLORS.foilGold}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <line
                  x1={centerX + 2}
                  y1={335}
                  x2={centerX + 2}
                  y2={368}
                  stroke={ELECTROSTATIC_APPARATUS_COLORS.foilGold}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </g>

              {/* 外表面感应电荷 */}
              <g>
                {[-80, -40, 0, 40, 80].map((dy, i) => (
                  <circle key={`out-neg-${i}`} cx={255} cy={centerY + dy} r={6} fill={EM_COLORS.negativeCharge} />
                ))}
                {isGrounded === 0 &&
                  [-80, -40, 0, 40, 80].map((dy, i) => (
                    <circle key={`out-pos-${i}`} cx={585} cy={centerY + dy} r={6} fill={EM_COLORS.positiveCharge} />
                  ))}
              </g>
            </g>
          ) : (
            <g>
              {/* 内屏蔽：腔内放置 +Q，内壁感应等量负电荷 -Q；未接地时外壁带 +Q 并向外辐射电场，接地后外场消失 */}
              <text x={centerX} y={148} fontSize={font(13)} fontWeight="bold" fill={CANVAS_COLORS.labelText} textAnchor="middle">
                {isGrounded === 1
                  ? '内屏蔽（外壳接地）：外表面感应电荷导走，外部空间场强 E_外 ≡ 0'
                  : '内屏蔽（未接地）：外表面感应出 +Q，向外激发电场 E_外 ≠ 0'}
              </text>

              {/* 腔内中心正电荷 +Q */}
              <Ball cx={centerX} cy={centerY} r={18} type="pendulumBob" chargeSign="+" />
              <text
                x={centerX}
                y={centerY + 34}
                fontSize={font(12)}
                fontWeight="bold"
                fill={EM_COLORS.positiveCharge}
                textAnchor="middle"
              >
                腔内带电体 +Q
              </text>

              {/* 腔内辐射电场线（由 +Q 指向内壁） + 内壁负感应电荷 */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const ang = (idx * Math.PI) / 4
                const ux = Math.cos(ang)
                const uy = Math.sin(ang)
                const inOriginX = centerX + ux * 24
                const inOriginY = centerY + uy * 24
                const wallNegX = centerX + ux * 102
                const wallNegY = centerY + uy * 82
                const outerPosX = centerX + ux * 172
                const outerPosY = centerY + uy * 138
                return (
                  <g key={`inner-ray-${idx}`}>
                    <VectorArrow
                      originDesign={{ x: inOriginX, y: inOriginY }}
                      vector={{ x: ux, y: -uy }}
                      type="electricField"
                      arrowType="visual-only"
                      sceneScale={sceneScale}
                      pixelLength={56}
                      strokeWidth={STROKE.vectorThin}
                      color={EM_COLORS.electricField}
                    />
                    <circle cx={wallNegX} cy={wallNegY} r={5.5} fill={EM_COLORS.negativeCharge} />
                    {isGrounded === 0 && (
                      <g>
                        <circle cx={outerPosX} cy={outerPosY} r={6} fill={EM_COLORS.positiveCharge} />
                        <VectorArrow
                          originDesign={{ x: outerPosX + ux * 10, y: outerPosY + uy * 10 }}
                          vector={{ x: ux, y: -uy }}
                          type="electricField"
                          arrowType="visual-only"
                          sceneScale={sceneScale}
                          pixelLength={68}
                          strokeWidth={STROKE.vectorThin}
                          color={EM_COLORS.electricField}
                        />
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          )}

          {/* 接地引线与地线符号 */}
          {isGrounded === 1 && (
            <g transform={`translate(${centerX}, 450)`}>
              <line x1={0} y1={0} x2={0} y2={45} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={2.5} />
              <line x1={-20} y1={45} x2={20} y2={45} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={3} />
              <line x1={-12} y1={52} x2={12} y2={52} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={2.5} />
              <line x1={-5} y1={59} x2={5} y2={59} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={2} />
              <text x={30} y={55} fontSize={font(11)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce}>
                外壳接地 (φ = 0V)
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  )
}
