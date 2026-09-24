import { PhysicsGround, PhysicsVectorArrow, VectorArrow } from '@/components/Physics'
import {
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
}: ElectrostaticShieldingSceneProps) {
  const { font } = canvasSize

  const centerX = 420
  const centerY = 310

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
                    {/* 左侧进入电场线（指向导体左表面，终止于负感应电荷） */}
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
                    {/* 右侧发出电场线（由导体右表面正感应电荷发出） */}
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

          {/* 实心金属导体块 (圆角矩形) */}
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

          {/* 导体内部矢量合成特写 (E0 向右, E' 向左, E合 = 0) */}
          <g transform={`translate(${centerX}, ${centerY + 30})`}>
            {/* 外电场矢量 E0 (向右) */}
            <PhysicsVectorArrow
              originDesign={{ x: 0, y: -25 }}
              vector={{ x: physics.shielding.E0, y: 0 }}
              type="electricField"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={35} y={-20} fontSize={font(11)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce}>
              外加场强 E₀ (向右)
            </text>

            {/* 感应电荷电场 E' (向左) */}
            <PhysicsVectorArrow
              originDesign={{ x: 0, y: 15 }}
              vector={{ x: -physics.shielding.EPrime, y: 0 }}
              type="electricField"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={-140} y={20} fontSize={font(11)} fontWeight="bold" fill={EM_COLORS.electricField}>
              感应场强 E&apos; (向左)
            </text>

            {/* 合场强高亮标签 */}
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

      {/* 模式 1: 尖端放电与避雷针 (曲率半径电荷密度) */}
      {mode === 1 && (
        <g>
          {/* 水滴形/尖锥形带电导体 (左钝右尖) */}
          <path
            d="M 220,310 C 220,200 320,180 440,240 L 620,310 L 440,380 C 320,440 220,420 220,310 Z"
            fill={withAlpha(SCENE_COLORS.materials.structBgPale, 0.7)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={3}
          />

          {/* 圆钝端稀疏电荷 */}
          {[230, 260, 300].map((x, i) => (
            <g key={`blunt-${i}`} transform={`translate(${x}, 220)`}>
              <circle cx={0} cy={0} r={8} fill={EM_COLORS.positiveCharge} />
              <text x={0} y={3.5} fontSize={font(11)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">+</text>
            </g>
          ))}

          {/* 尖端极密集电荷 */}
          {[550, 575, 595, 612].map((x, i) => (
            <g key={`sharp-${i}`} transform={`translate(${x}, 310)`}>
              <circle cx={0} cy={0} r={6} fill={EM_COLORS.positiveCharge} />
              <text x={0} y={3} fontSize={font(9)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">+</text>
            </g>
          ))}

          {/* 尖端放电电离微粒与电火花光效 */}
          {physics.shielding.isAirBreakdown && (
            <g>
              <line x1={625} y1={310} x2={720} y2={280} stroke={EM_COLORS.electricField} strokeWidth={2} strokeDasharray="3 3" />
              <line x1={625} y1={310} x2={730} y2={310} stroke={EM_COLORS.electricField} strokeWidth={2.5} strokeDasharray="4 2" />
              <line x1={625} y1={310} x2={720} y2={340} stroke={EM_COLORS.electricField} strokeWidth={2} strokeDasharray="3 3" />
              <text x={650} y={260} fontSize={font(12)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce}>
                ⚡ 击穿空气放电微粒流
              </text>
            </g>
          )}

          {/* 物理量实时数据标注看板 (无大段教学文字) */}
          <rect
            x={150}
            y={120}
            width={280}
            height={60}
            rx={6}
            fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.9)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />
          <text x={170} y={145} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
            • 尖端曲率半径: R = {tipRadius} mm
          </text>
          <text x={170} y={168} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
            • 尖端电荷面密度指数: σ = {physics.shielding.tipChargeDensity} (相对值)
          </text>
        </g>
      )}

      {/* 模式 2: 空腔静电屏蔽 */}
      {mode === 2 && (
        <g>
          {/* 金属空腔外壳 (环形外壳) */}
          <path
            d="M 280,170 C 280,170 560,170 560,170 C 600,170 600,450 560,450 C 560,450 280,450 280,450 C 240,450 240,170 280,170 Z
               M 320,210 C 300,210 300,410 320,410 C 320,410 520,410 520,410 C 540,410 540,210 520,210 C 520,210 320,210 320,210 Z"
            fill={withAlpha(SCENE_COLORS.materials.structStroke, 0.2)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={3}
            fillRule="evenodd"
          />

          <text x={centerX} y={260} fontSize={font(13)} fontWeight="bold" fill={CANVAS_COLORS.labelText} textAnchor="middle">
            金属空腔内室 (E ≡ 0)
          </text>
          <text x={centerX} y={350} fontSize={font(12)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
            外屏蔽：外部电场在腔内合场强为零
          </text>

          {/* 接地引线与地线符号 */}
          {isGrounded === 1 && (
            <g transform={`translate(${centerX}, 450)`}>
              <line x1={0} y1={0} x2={0} y2={45} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={2.5} />
              {/* 地线三横线 */}
              <line x1={-20} y1={45} x2={20} y2={45} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={3} />
              <line x1={-12} y1={52} x2={12} y2={52} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={2.5} />
              <line x1={-5} y1={59} x2={5} y2={59} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={2} />
              <text x={30} y={55} fontSize={font(11)} fontWeight="bold" fill={DYNAMICS_COLORS.appliedForce}>
                外壳接地 (φ = 0V)
              </text>
            </g>
          )}

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
      )}
    </g>
  )
}
