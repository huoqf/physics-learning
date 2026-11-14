import {
  Ball,
  PhysicsGround,
  PhysicsVectorArrow,
  VectorArrow,
} from '@/components/Physics'
import {
  CANVAS_COLORS,
  DYNAMICS_COLORS,
  ELECTROSTATIC_APPARATUS_COLORS,
  EM_COLORS,
  PHYSICS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { ChargeElementaryPhysicsResult } from '../hooks/useChargeElementaryPhysics'

interface ChargeElementarySceneProps {
  physics: ChargeElementaryPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  mode: number
}

function formatCharge(q: number): string {
  if (Math.abs(q) < 1e-6) return '0.0 nC'
  const sign = q > 0 ? '+' : ''
  return `${sign}${q.toFixed(1)} nC`
}

function chargeSignOf(q: number): '+' | '-' | 'none' {
  if (q > 1e-6) return '+'
  if (q < -1e-6) return '-'
  return 'none'
}

function chargeColorOf(q: number): string {
  if (q > 1e-6) return EM_COLORS.positiveCharge
  if (q < -1e-6) return EM_COLORS.negativeCharge
  return CANVAS_COLORS.labelText
}

/**
 * 电荷、起电方式与元电荷场景渲染组件。
 * mode = 0: 三种起电方式、电荷守恒与金箔验电器（full 840×650）
 * mode = 1: 密立根油滴实验（splitV 上屏 840×325）
 */
export function ChargeElementaryScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
  mode,
}: ChargeElementarySceneProps) {
  const { font } = canvasSize

  if (mode === 1) {
    const m = physics.millikan
    const dropY = Math.max(132, Math.min(188, 160 - m.acceleration * 1.8))
    const statusText = m.isBalanced
      ? '悬浮平衡 (Fe ≈ G)'
      : m.acceleration > 0
        ? '加速上升 (Fe > G)'
        : '加速下落 (Fe < G)'
    const statusColor = m.isBalanced
      ? DYNAMICS_COLORS.appliedForce
      : m.acceleration > 0
        ? EM_COLORS.electricForce
        : PHYSICS_COLORS.gravity

    return (
      <g>
        {/* 上平行金属板（正极 +U） */}
        <rect
          x={130}
          y={42}
          width={380}
          height={14}
          rx={3}
          fill={SCENE_COLORS.materials.structFillPale}
          stroke={EM_COLORS.positiveCharge}
          strokeWidth={2}
        />
        <text
          x={120}
          y={53}
          fontSize={font(11)}
          fontWeight="bold"
          fill={EM_COLORS.positiveCharge}
          textAnchor="end"
        >
          上极板 (+U)
        </text>

        {/* 下平行金属板（0 V） */}
        <rect
          x={130}
          y={268}
          width={380}
          height={14}
          rx={3}
          fill={SCENE_COLORS.materials.structFillPale}
          stroke={EM_COLORS.negativeCharge}
          strokeWidth={2}
        />
        <text
          x={120}
          y={279}
          fontSize={font(11)}
          fontWeight="bold"
          fill={EM_COLORS.negativeCharge}
          textAnchor="end"
        >
          下极板 (0 V)
        </text>

        {/* 板间竖直向下匀强电场线 */}
        {[175, 235, 405, 465].map((xPos) => (
          <VectorArrow
            key={xPos}
            originDesign={{ x: xPos, y: 66 }}
            vector={{ x: 0, y: -1 }}
            type="electricField"
            arrowType="visual-only"
            sceneScale={sceneScale}
            pixelLength={190}
            strokeWidth={STROKE.vectorThin}
            color={withAlpha(EM_COLORS.electricField, 0.55)}
          />
        ))}
        <text
          x={160}
          y={162}
          fontSize={font(11)}
          fontWeight="bold"
          fill={EM_COLORS.electricField}
          textAnchor="end"
        >
          E = {(m.electricField / 1000).toFixed(1)} kV/m
        </text>

        {/* 带负电油滴 */}
        <Ball cx={320} cy={dropY} r={14} type="brassWeight" chargeSign="-" />

        {/* 油滴所受电场力（向上）与重力（向下） */}
        <PhysicsVectorArrow
          originDesign={{ x: 320, y: dropY }}
          vector={{ x: 0, y: m.electricForce }}
          type="electricForce"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorMain}
          label="Fe"
          labelPlacement="side"
          font={font}
        />
        <PhysicsVectorArrow
          originDesign={{ x: 320, y: dropY }}
          vector={{ x: 0, y: -m.gravityForce }}
          type="gravity"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorMain}
          label="G"
          labelPlacement="side"
          font={font}
        />

        {/* 右侧实验状态与定量读数面板 */}
        <rect
          x={538}
          y={42}
          width={272}
          height={240}
          rx={8}
          fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.92)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1.5}
        />
        <text
          x={556}
          y={76}
          fontSize={font(13)}
          fontWeight="bold"
          fill={statusColor}
        >
          {statusText}
        </text>
        <text x={556} y={116} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
          油滴电量：q = {m.n}e = {m.chargeQIn1e19.toFixed(1)}×10⁻¹⁹ C
        </text>
        <text x={556} y={154} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
          平衡电压：U平 = {m.balanceVoltage.toFixed(1)} V
        </text>
        <text x={556} y={192} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
          油滴比荷：q/m = {m.specificChargeDrop.toFixed(2)} C/kg
        </text>
        <text x={556} y={230} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
          电子比荷：e/mₑ ≈ 1.76×10¹¹ C/kg
        </text>
        <text x={556} y={260} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>
          下表统计多组油滴电量呈 e 的整数倍
        </text>
      </g>
    )
  }

  // ── mode === 0: 三种起电方式、电荷守恒与金箔验电器 ──
  const ch = physics.charging
  const methodTitle =
    ch.method === 0
      ? (ch.isRubberFur ? '摩擦起电：橡胶棒(A)与毛皮(B)' : '摩擦起电：玻璃棒(A)与丝绸(B)')
      : ch.method === 1
        ? '接触起电：同规格金属球(A, B)'
        : '感应起电：带电球(C)靠近枕形导体(A-B)'
  const stepLabel =
    ch.step === 0
      ? '① 初态（电中性 / 未接触）'
      : ch.step === 1
        ? (ch.method === 0
            ? '② 相互摩擦（电子转移）'
            : ch.method === 1
              ? '② 接触导通（先中和再平分）'
              : ch.isGrounded
                ? '② 靠近并接地（远端电荷入地）'
                : '② 靠近感应（近端异号远端同号）')
        : (ch.method === 2
            ? (ch.isGrounded
                ? '③ 先断接地再撤 C（全导体带异号）'
                : '③ 先分 A/B 再撤 C（两端带异号）')
            : '③ 分离定态（电荷分布锁定）')

  // 接触起电两球坐标
  const contactGap = ch.step === 1 ? 72 : 210
  const ballACx = 270 - contactGap / 2
  const ballBCx = 270 + contactGap / 2

  // 感应起电导体位置
  const indSplit = ch.method === 2 && ch.step === 2 && !ch.isGrounded
  const condAX = indSplit ? 180 : 205
  const condBX = indSplit ? 345 : 320
  const condW = 115

  return (
    <g>
      {/* 底部实验室台面 */}
      <PhysicsGround
        x={vp.designLeft}
        y={580}
        width={vp.designVisibleW}
        type="ground"
      />

      {/* 顶部状态摘要栏 */}
      <rect
        x={40}
        y={24}
        width={760}
        height={68}
        rx={8}
        fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.9)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.5}
      />
      <text
        x={60}
        y={49}
        fontSize={font(13)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        {methodTitle}
      </text>
      <text
        x={780}
        y={49}
        fontSize={font(12)}
        fontWeight="bold"
        fill={DYNAMICS_COLORS.appliedForce}
        textAnchor="end"
      >
        守恒核验：初 Q总 = {formatCharge(ch.qTotalInit)} → 现 Q总 ={' '}
        {formatCharge(ch.qTotalAfter)}
      </text>
      <text
        x={60}
        y={76}
        fontSize={font(12)}
        fill={CANVAS_COLORS.labelTextLight}
      >
        转移电量 |Δq| = {ch.deltaQ.toFixed(1)} nC（约{' '}
        {ch.transferredElectronsIn1e10.toFixed(2)}×10¹⁰ 个自由电子）
      </text>
      <text
        x={780}
        y={76}
        fontSize={font(12)}
        fill={EM_COLORS.electricField}
        textAnchor="end"
      >
        {stepLabel}
      </text>

      {/* ═══ 方式 0：摩擦起电 ═══ */}
      {ch.method === 0 && (
        <g>
          {/* 玻璃棒 / 橡胶棒 A */}
          <rect
            x={ch.step === 1 ? 155 : 85}
            y={286}
            width={170}
            height={36}
            rx={18}
            fill={
              ch.isRubberFur
                ? withAlpha(SCENE_COLORS.materials.structStroke, 0.18)
                : withAlpha(SCENE_COLORS.materials.structBgPale, 0.9)
            }
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={2.5}
          />
          <text
            x={ch.step === 1 ? 240 : 170}
            y={309}
            fontSize={font(12)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            {ch.isRubberFur ? '橡胶棒 A' : '玻璃棒 A'}
          </text>
          <text
            x={ch.step === 1 ? 210 : 170}
            y={258}
            fontSize={font(12)}
            fontWeight="bold"
            fill={chargeColorOf(ch.qA)}
            textAnchor="middle"
          >
            q_A = {formatCharge(ch.qA)}
          </text>

          {/* 丝绸 / 毛皮 B */}
          <rect
            x={ch.step === 1 ? 265 : 325}
            y={ch.step === 1 ? 314 : 262}
            width={145}
            height={84}
            rx={14}
            fill={
              ch.step === 0
                ? withAlpha(CANVAS_COLORS.axis, 0.1)
                : withAlpha(chargeColorOf(ch.qB), 0.12)
            }
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={2}
            strokeDasharray={ch.step === 1 ? '4 3' : undefined}
          />
          <text
            x={ch.step === 1 ? 338 : 398}
            y={ch.step === 1 ? 360 : 308}
            fontSize={font(12)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            {ch.isRubberFur ? '毛皮 B' : '丝绸 B'}
          </text>
          <text
            x={ch.step === 1 ? 360 : 398}
            y={232}
            fontSize={font(12)}
            fontWeight="bold"
            fill={chargeColorOf(ch.qB)}
            textAnchor="middle"
          >
            q_B = {formatCharge(ch.qB)}
          </text>

          {/* 电荷符号徽章 */}
          {ch.step >= 1 && (
            <g>
              {[0, 1, 2].map((idx) => (
                <g key={idx}>
                  <circle
                    cx={(ch.step === 1 ? 185 : 120) + idx * 42}
                    cy={338}
                    r={8}
                    fill={chargeColorOf(ch.qA)}
                  />
                  <text
                    x={(ch.step === 1 ? 185 : 120) + idx * 42}
                    y={342}
                    fontSize={font(11)}
                    fontWeight="bold"
                    fill={CANVAS_COLORS.white}
                    textAnchor="middle"
                  >
                    {ch.qA >= 0 ? '+' : '−'}
                  </text>
                  <circle
                    cx={(ch.step === 1 ? 295 : 355) + idx * 42}
                    cy={380}
                    r={8}
                    fill={chargeColorOf(ch.qB)}
                  />
                  <text
                    x={(ch.step === 1 ? 295 : 355) + idx * 42}
                    y={384}
                    fontSize={font(11)}
                    fontWeight="bold"
                    fill={CANVAS_COLORS.white}
                    textAnchor="middle"
                  >
                    {ch.qB >= 0 ? '+' : '−'}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* 电子转移箭头 */}
          {ch.step === 1 && (
            <g>
              <VectorArrow
                originDesign={{ x: ch.isRubberFur ? 350 : 225, y: 192 }}
                vector={{ x: ch.isRubberFur ? -1 : 1, y: 0 }}
                type="electricForce"
                arrowType="visual-only"
                sceneScale={sceneScale}
                pixelLength={125}
                color={EM_COLORS.negativeCharge}
                strokeWidth={STROKE.vectorMain}
              />
              <text
                x={288}
                y={176}
                fontSize={font(11)}
                fontWeight="bold"
                fill={EM_COLORS.negativeCharge}
                textAnchor="middle"
              >
                {ch.isRubberFur
                  ? 'e⁻ 从毛皮转移到橡胶棒'
                  : 'e⁻ 从玻璃棒转移到丝绸'}
              </text>
            </g>
          )}
        </g>
      )}

      {/* ═══ 方式 1：接触起电 ═══ */}
      {ch.method === 1 && (
        <g>
          {/* 绝缘支架 */}
          {[ballACx, ballBCx].map((cx, i) => (
            <g key={i}>
              <rect
                x={cx - 5}
                y={346}
                width={10}
                height={224}
                fill={SCENE_COLORS.materials.structStroke}
              />
              <rect
                x={cx - 28}
                y={568}
                width={56}
                height={12}
                rx={3}
                fill={SCENE_COLORS.materials.structFillPale}
                stroke={SCENE_COLORS.materials.structStroke}
                strokeWidth={1.5}
              />
            </g>
          ))}

          {/* 金属球 A、B */}
          <Ball
            cx={ballACx}
            cy={310}
            r={36}
            type="steel"
            chargeSign={chargeSignOf(ch.qA)}
          />
          <Ball
            cx={ballBCx}
            cy={310}
            r={36}
            type="steel"
            chargeSign={chargeSignOf(ch.qB)}
          />

          {/* A、B 球标签（上下错行防止接触时压字） */}
          <text
            x={ballACx}
            y={254}
            fontSize={font(12)}
            fontWeight="bold"
            fill={chargeColorOf(ch.qA)}
            textAnchor="middle"
          >
            球 A：{formatCharge(ch.qA)}
          </text>
          <text
            x={ballBCx}
            y={ch.step === 1 ? 226 : 254}
            fontSize={font(12)}
            fontWeight="bold"
            fill={chargeColorOf(ch.qB)}
            textAnchor="middle"
          >
            球 B：{formatCharge(ch.qB)}
          </text>

          {/* 电子转移箭头 */}
          {ch.step === 1 && ch.electronFlowDir !== 'none' && (
            <g>
              <VectorArrow
                originDesign={{
                  x: ch.electronFlowDir === 'AtoB' ? 215 : 325,
                  y: 185,
                }}
                vector={{
                  x: ch.electronFlowDir === 'AtoB' ? 1 : -1,
                  y: 0,
                }}
                type="electricForce"
                arrowType="visual-only"
                sceneScale={sceneScale}
                pixelLength={110}
                color={EM_COLORS.negativeCharge}
                strokeWidth={STROKE.vectorMain}
              />
              <text
                x={270}
                y={168}
                fontSize={font(11)}
                fontWeight="bold"
                fill={EM_COLORS.negativeCharge}
                textAnchor="middle"
              >
                {ch.electronFlowDir === 'AtoB'
                  ? 'e⁻ 由球 A 流向球 B'
                  : 'e⁻ 由球 B 流向球 A'}
              </text>
            </g>
          )}
          {ch.step >= 1 && (
            <text
              x={270}
              y={420}
              fontSize={font(11)}
              fill={CANVAS_COLORS.labelTextLight}
              textAnchor="middle"
            >
              接触均分机制：异号先中和再平分
            </text>
          )}
        </g>
      )}

      {/* ═══ 方式 2：感应起电 ═══ */}
      {ch.method === 2 && (
        <g>
          {/* 施感带电球 C */}
          <g opacity={ch.step === 2 ? 0.35 : 1}>
            <rect
              x={(ch.step === 2 ? 72 : 112) - 4}
              y={336}
              width={8}
              height={234}
              fill={SCENE_COLORS.materials.structStroke}
            />
            <rect
              x={(ch.step === 2 ? 72 : 112) - 22}
              y={568}
              width={44}
              height={12}
              rx={3}
              fill={SCENE_COLORS.materials.structFillPale}
            />
            <Ball
              cx={ch.step === 2 ? 72 : 112}
              cy={310}
              r={26}
              type="steel"
              chargeSign={chargeSignOf(ch.inducerQ)}
            />
            <text
              x={ch.step === 2 ? 72 : 112}
              y={266}
              fontSize={font(11)}
              fontWeight="bold"
              fill={chargeColorOf(ch.inducerQ)}
              textAnchor="middle"
            >
              {ch.step === 2 ? 'C（已移走）' : `C：${formatCharge(ch.inducerQ)}`}
            </text>
          </g>

          {/* 枕形导体 A、B 的绝缘支架 */}
          {[condAX + condW / 2, condBX + condW / 2].map((cx, i) => (
            <g key={i}>
              <rect
                x={cx - 5}
                y={350}
                width={10}
                height={220}
                fill={SCENE_COLORS.materials.structStroke}
              />
              <rect
                x={cx - 26}
                y={568}
                width={52}
                height={12}
                rx={3}
                fill={SCENE_COLORS.materials.structFillPale}
              />
            </g>
          ))}

          {/* 枕形导体左部 A */}
          <rect
            x={condAX}
            y={270}
            width={condW}
            height={80}
            rx={16}
            fill={withAlpha(SCENE_COLORS.materials.structBgPale, 0.85)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={2.5}
          />
          <text
            x={condAX + condW / 2}
            y={248}
            fontSize={font(12)}
            fontWeight="bold"
            fill={chargeColorOf(ch.qA)}
            textAnchor="middle"
          >
            A：{formatCharge(ch.qA)}
          </text>

          {/* 枕形导体右部 B */}
          <rect
            x={condBX}
            y={270}
            width={condW}
            height={80}
            rx={16}
            fill={withAlpha(SCENE_COLORS.materials.structBgPale, 0.85)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={2.5}
          />
          <text
            x={condBX + condW / 2}
            y={218}
            fontSize={font(12)}
            fontWeight="bold"
            fill={chargeColorOf(ch.qB)}
            textAnchor="middle"
          >
            B：{formatCharge(ch.qB)}
          </text>

          {/* 感应正负电荷圆点 */}
          {ch.qA !== 0 &&
            [-18, 0, 18].map((dy, idx) => (
              <g key={`indA-${idx}`} transform={`translate(${condAX + 22}, ${310 + dy})`}>
                <circle cx={0} cy={0} r={7} fill={chargeColorOf(ch.qA)} />
                <text
                  x={0}
                  y={3.5}
                  fontSize={font(10)}
                  fontWeight="bold"
                  fill={CANVAS_COLORS.white}
                  textAnchor="middle"
                >
                  {ch.qA > 0 ? '+' : '−'}
                </text>
              </g>
            ))}
          {ch.qB !== 0 &&
            [-18, 0, 18].map((dy, idx) => (
              <g key={`indB-${idx}`} transform={`translate(${condBX + condW - 22}, ${310 + dy})`}>
                <circle cx={0} cy={0} r={7} fill={chargeColorOf(ch.qB)} />
                <text
                  x={0}
                  y={3.5}
                  fontSize={font(10)}
                  fontWeight="bold"
                  fill={CANVAS_COLORS.white}
                  textAnchor="middle"
                >
                  {ch.qB > 0 ? '+' : '−'}
                </text>
              </g>
            ))}

          {/* 接地导线与大地电荷标注（步骤 1 实时接地，步骤 2 显示已先断地并保留大地电量核验） */}
          {ch.isGrounded && ch.step >= 1 && (
            <g opacity={ch.step === 2 ? 0.72 : 1}>
              <path
                d={`M ${condBX + condW} 310 L 485 310 L 485 450`}
                fill="none"
                stroke={DYNAMICS_COLORS.appliedForce}
                strokeWidth={2.5}
                strokeDasharray={ch.step === 2 ? '5 4' : undefined}
              />
              <line x1={465} y1={450} x2={505} y2={450} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={3} />
              <line x1={473} y1={458} x2={497} y2={458} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={2.5} />
              <line x1={480} y1={466} x2={490} y2={466} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={2} />
              <text
                x={485}
                y={492}
                fontSize={font(11)}
                fontWeight="bold"
                fill={DYNAMICS_COLORS.appliedForce}
                textAnchor="middle"
              >
                {ch.step === 2
                  ? `已先断地 (q地=${formatCharge(ch.qGround)})`
                  : `接地 (q地=${formatCharge(ch.qGround)})`}
              </text>
            </g>
          )}

          {/* 电子移动箭头 */}
          {ch.step === 1 && ch.electronFlowDir !== 'none' && (
            <g>
              <VectorArrow
                originDesign={{
                  x:
                    ch.electronFlowDir === 'AtoB'
                      ? 250
                      : ch.electronFlowDir === 'BtoA'
                        ? 380
                        : 485,
                  y:
                    ch.electronFlowDir === 'GroundToB'
                      ? 410
                      : ch.electronFlowDir === 'BtoGround'
                        ? 340
                        : 175,
                }}
                vector={{
                  x:
                    ch.electronFlowDir === 'AtoB'
                      ? 1
                      : ch.electronFlowDir === 'BtoA'
                        ? -1
                        : 0,
                  y:
                    ch.electronFlowDir === 'GroundToB'
                      ? 1
                      : ch.electronFlowDir === 'BtoGround'
                        ? -1
                        : 0,
                }}
                type="electricForce"
                arrowType="visual-only"
                sceneScale={sceneScale}
                pixelLength={ch.electronFlowDir === 'AtoB' || ch.electronFlowDir === 'BtoA' ? 110 : 70}
                color={EM_COLORS.negativeCharge}
                strokeWidth={STROKE.vectorMain}
              />
              <text
                x={315}
                y={156}
                fontSize={font(11)}
                fontWeight="bold"
                fill={EM_COLORS.negativeCharge}
                textAnchor="middle"
              >
                {ch.electronFlowDir === 'GroundToB'
                  ? 'e⁻ 从大地流入导体'
                  : ch.electronFlowDir === 'BtoGround'
                    ? 'e⁻ 从导体流入大地'
                    : ch.electronFlowDir === 'BtoA'
                      ? 'e⁻ 由 B 端移向 A 端'
                      : 'e⁻ 由 A 端移向 B 端'}
              </text>
            </g>
          )}
        </g>
      )}

      {/* ═══ 右侧：金箔验电器（实时检测 B 端净电荷） ═══ */}
      <g>
        {/* 测试引线（虚线连至 B 端） */}
        <path
          d={`M ${ch.method === 0 ? 470 : ch.method === 1 ? ballBCx + 36 : condBX + condW} 310 L 575 310 L 575 235 L 654 235`}
          fill="none"
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />

        {/* 验电器绝缘底座与外壳 */}
        <rect
          x={632}
          y={458}
          width={76}
          height={16}
          rx={4}
          fill={SCENE_COLORS.materials.structFillPale}
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={2}
        />
        <rect
          x={665}
          y={474}
          width={10}
          height={106}
          fill={SCENE_COLORS.materials.structStroke}
        />
        <circle
          cx={670}
          cy={385}
          r={74}
          fill={ELECTROSTATIC_APPARATUS_COLORS.glassDomeFill}
          stroke={ELECTROSTATIC_APPARATUS_COLORS.glassDomeStroke}
          strokeWidth={2.5}
        />
        <rect
          x={655}
          y={298}
          width={30}
          height={22}
          rx={4}
          fill={ELECTROSTATIC_APPARATUS_COLORS.insulatorPlug}
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={1}
        />

        {/* 金属球与传导杆 */}
        <circle
          cx={670}
          cy={235}
          r={16}
          fill={ELECTROSTATIC_APPARATUS_COLORS.ballFill}
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={2}
        />
        <rect
          x={667}
          y={251}
          width={6}
          height={124}
          fill={ELECTROSTATIC_APPARATUS_COLORS.rodFill}
        />

        {/* 金箔电荷微光与两片偏转金箔 */}
        {ch.foilAngleDeg > 0.5 && (
          <circle
            cx={670}
            cy={398}
            r={30}
            fill={ELECTROSTATIC_APPARATUS_COLORS.foilGlow}
          />
        )}
        <line
          x1={670}
          y1={375}
          x2={670}
          y2={428}
          stroke={ELECTROSTATIC_APPARATUS_COLORS.foilGold}
          strokeWidth={4}
          strokeLinecap="round"
          transform={`rotate(${-ch.foilAngleDeg}, 670, 375)`}
        />
        <line
          x1={670}
          y1={375}
          x2={670}
          y2={428}
          stroke={ELECTROSTATIC_APPARATUS_COLORS.foilGold}
          strokeWidth={4}
          strokeLinecap="round"
          transform={`rotate(${ch.foilAngleDeg}, 670, 375)`}
        />
        <circle cx={670} cy={375} r={4} fill={SCENE_COLORS.materials.structStroke} />

        {/* 验电器文字读数 */}
        <text
          x={670}
          y={198}
          fontSize={font(12)}
          fontWeight="bold"
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
        >
          金箔验电器 (检 B 端)
        </text>
        <text
          x={670}
          y={506}
          fontSize={font(12)}
          fontWeight="bold"
          fill={chargeColorOf(ch.electroscopeQ)}
          textAnchor="middle"
        >
          金箔张角 θ = {ch.foilAngleDeg}°
        </text>
      </g>
    </g>
  )
}
