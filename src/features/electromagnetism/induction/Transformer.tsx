/**
 * Transformer.tsx — 变压器原理与动态分析（[M4-1] 优化版）
 *
 * 物理模型：理想变压器（交流有效值代数稳态求解，单帧同步刷新）
 *   U₂/U₁ = n₂/n₁，I₁/I₂ = n₂/n₁（单副线圈），P_in = P_out
 *
 * 三屏中间屏布局：左右分区
 *   左：SVG 变压器实体（铁芯 + 原/副线圈 + 4 只 DialMeter + Rheostat 负载）
 *   右（进阶模式）：InfoBar 功率配平 + 动态因果链多米诺高亮
 *
 * 颜色：原边回路红（electricCurrent）、副边回路蓝（magnetSouth）、磁通量绿（magneticField）
 *
 * @agent-rule 遵循 useCanvasSize + theme token（PHYSICS_COLORS / CANVAS_STYLE / FONT）
 * @agent-rule 磁通/电子流动采用 CSS 动画，禁止裸调 requestAnimationFrame
 * @agent-rule 电表显示有效值（稳态），参数变化即同步刷新
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, FONT } from '@/theme/physics'
import { calculateTransformerWithLoad } from '@/physics'
import { DialMeter, Rheostat } from '@/components/Physics'
import { Card } from '@/components/UI'

// ─── 布局参数 ─────────────────────────────────────────────────────────────
const MAX_DISPLAY_TURNS = 20 // 线圈最大显示匝数

// ─── 电表量程自适应（自动选 1/2/5/10 × 10^n）──────────────────────────────
function niceMeterMax(value: number): number {
  if (value <= 0) return 10
  const order = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / order
  if (n <= 1) return order
  if (n <= 2) return 2 * order
  if (n <= 5) return 5 * order
  return 10 * order
}

// ─── 生成线圈绕线 SVG path ─────────────────────────────────────────────────
/**
 * 每匝由两段二次贝塞尔曲线组成，模拟导线在铁芯前/后的缠绕效果。
 *
 * @param left     线圈左边界 x
 * @param right    线圈右边界 x
 * @param top      铁芯上边界 y
 * @param bottom   铁芯下边界 y
 * @param n        实际匝数
 * @param isPrimary true=原线圈（弧线向右凸），false=副线圈（弧线向左凸）
 * @param topInset 顶部留白（已缩放 px 值）
 * @param bulge    线圈弧线凸出量（已缩放 px 值）
 */
function generateCoilPath(
  left: number,
  right: number,
  top: number,
  bottom: number,
  n: number,
  isPrimary: boolean,
  topInset: number,
  bulge: number,
): string {
  const turns = Math.min(Math.max(1, n), MAX_DISPLAY_TURNS)
  const availableH = bottom - top - topInset * 2
  const gap = availableH / (turns + 1)

  let d = ''
  for (let i = 0; i < turns; i++) {
    const yStart = top + topInset + i * gap
    const yEnd = yStart + gap * 0.8
    const midY = (yStart + yEnd) / 2

    if (i === 0) {
      d += `M ${right} ${yStart}`
    }

    if (isPrimary) {
      d += ` Q ${right + bulge} ${midY} ${right} ${yEnd}`
    } else {
      d += ` Q ${left - bulge} ${midY} ${left} ${yEnd}`
    }
  }
  return d
}

// ─── 动态因果链步骤定义 ────────────────────────────────────────────────────
interface ChainStep {
  key: string
  label: string
  value: number
  unit: string
  color: string
}

// ─── 透明度常量（避免魔法数字）─────────────────────────────────────────────
const HIGHLIGHT_ALPHA = '15' // 十六进制 alpha，约 8% 透明度

// ─── 主组件 ──────────────────────────────────────────────────────────────
export default function Transformer() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const [containerRef, canvasSize] = useCanvasSize({ width: 760, height: 440 })
  const { font, px } = canvasSize

  const mode = params.mode ?? 0 // 0=基础, 1=进阶
  const n1 = params.n1 ?? 100
  const n2 = params.n2 ?? 200
  const U1 = params.U1 ?? 220
  const R = params.R ?? 50

  const { U2, I2, I1, P_input, P_output } = calculateTransformerWithLoad(n1, n2, U1, R)

  // ── 电表量程（自适应）────────────────────────────────────────────────
  const v1Max = useMemo(() => niceMeterMax(U1), [U1])
  const v2Max = useMemo(() => niceMeterMax(U2), [U2])
  const a1Max = useMemo(() => niceMeterMax(I1), [I1])
  const a2Max = useMemo(() => niceMeterMax(I2), [I2])

  // ── 视觉参数（参数变化时计算，非每帧）──────────────────────────────────
  // 磁通量亮度随 U₁ 微调（Φ ∝ U₁/n₁·ω）
  const fluxMaxOpacity = Math.min(0.85, 0.35 + (U1 / 500) * 0.5)
  const fluxStrokeW = px(CANVAS_STYLE.stroke.grid + U1 / 1000)
  // 电子流速随电流增大而加快（duration 缩短）
  const primaryFlowDur = Math.max(0.35, Math.min(3, 1.8 / (I1 + 0.3)))
  const secondaryFlowDur = Math.max(0.35, Math.min(3, 1.8 / (I2 + 0.3)))

  // ── 布局尺寸（所有像素值通过 px() 缩放）─────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height

  // 铁芯/线圈尺寸（设计基准值）
  const coreW = px(56)
  const coreH = px(130)
  const coilW = px(22)

  const cx = W / 2
  const cy = H / 2 - px(6)

  const coreLeft = cx - coreW / 2
  const coreRight = cx + coreW / 2
  const coreTop = cy - coreH / 2
  const coreBottom = cy + coreH / 2

  const primaryLeft = coreLeft - coilW - px(6)
  const primaryRight = coreLeft - px(6)
  const secondaryLeft = coreRight + px(6)
  const secondaryRight = coreRight + coilW + px(6)

  // 电表位置（原副线圈正上方/正下方）
  const meterR = px(22)
  const v1X = (primaryLeft + primaryRight) / 2
  const v2X = (secondaryLeft + secondaryRight) / 2
  const meterTopY = coreTop - meterR - px(16)
  const meterBotY = coreBottom + meterR + px(18)

  // 电源 / 负载位置
  const sourceX = primaryLeft - px(42)
  const rheostatX = secondaryRight + px(52)
  const rheostatW = px(86)

  // ── 线圈路径 ──────────────────────────────────────────────────────────
  const coilTopInset = px(10)
  const coilBulge = coilW / 2
  
  const primaryCoilPath = useMemo(
    () => generateCoilPath(primaryLeft, primaryRight, coreTop, coreBottom, n1, true, coilTopInset, coilBulge),
    [primaryLeft, primaryRight, coreTop, coreBottom, n1, coilTopInset, coilBulge]
  )
  const secondaryCoilPath = useMemo(
    () => generateCoilPath(secondaryLeft, secondaryRight, coreTop, coreBottom, n2, false, coilTopInset, coilBulge),
    [secondaryLeft, secondaryRight, coreTop, coreBottom, n2, coilTopInset, coilBulge]
  )

  // ── 磁通量虚线环（3 圈，CSS 脉动 + 错相）──────────────────────────────
  const fluxRings = useMemo(() => {
    const rings = []
    const ringCount = 3
    for (let i = 0; i < ringCount; i++) {
      const inset = px(6) + i * px(9)
      const path = `M ${coreLeft + inset} ${coreTop + inset} L ${coreRight - inset} ${coreTop + inset} L ${coreRight - inset} ${coreBottom - inset} L ${coreLeft + inset} ${coreBottom - inset} Z`
      rings.push(
        <path
          key={`flux-ring-${i}`}
          d={path}
          fill="none"
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={fluxStrokeW}
          strokeDasharray={`${px(5)} ${px(4)}`}
          className="tf-flux"
          style={{ animationDelay: `${i * 0.3}s`, '--flux-max': fluxMaxOpacity } as CSSProperties}
        />
      )
    }
    return rings
  }, [coreLeft, coreRight, coreTop, coreBottom, fluxStrokeW, fluxMaxOpacity, px])

  // ── 动态因果链多米诺高亮（进阶模式，R 变化时触发）──────────────────────
  const chainSteps: ChainStep[] = [
    { key: 'U1', label: 'U₁', value: U1, unit: 'V', color: PHYSICS_COLORS.electricCurrent },
    { key: 'U2', label: 'U₂', value: U2, unit: 'V', color: PHYSICS_COLORS.magnetSouth },
    { key: 'I2', label: 'I₂', value: I2, unit: 'A', color: PHYSICS_COLORS.magnetSouth },
    { key: 'Pout', label: 'P_out', value: P_output, unit: 'W', color: PHYSICS_COLORS.power },
    { key: 'Pin', label: 'P_in', value: P_input, unit: 'W', color: PHYSICS_COLORS.power },
    { key: 'I1', label: 'I₁', value: I1, unit: 'A', color: PHYSICS_COLORS.electricCurrent },
  ]

  const [dominoStep, setDominoStep] = useState(-1)
  const firstRunRef = useRef(true)

  useEffect(() => {
    if (mode !== 1) {
      setDominoStep(-1)
      return
    }
    // 首次进入进阶模式不触发（避免初始闪烁）
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    setDominoStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    chainSteps.forEach((_, i) => {
      timers.push(setTimeout(() => setDominoStep(i), i * 350))
    })
    timers.push(setTimeout(() => setDominoStep(-1), chainSteps.length * 350 + 1200))
    return () => timers.forEach(clearTimeout)
    // 仅 R 变化时触发多米诺（按 spec：改变 R 观察因果链）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, mode])

  // ── 功率配平参考（1kW 归一化）──────────────────────────────────────────
  const pRef = 1000
  const pBarW = Math.min(100, (P_input / pRef) * 100)
  const powerBalanced = Math.abs(P_input - P_output) < 0.01

  return (
    <div className="w-full h-full flex gap-2">
      {/* ═══════════ 左：SVG 变压器实体 ═══════════ */}
      <div ref={containerRef} className="flex-1 min-w-0 h-full">
        <svg
          width={W}
          height={H}
          className="bg-white rounded-lg shadow-inner select-none"
          style={{ fontFamily: CANVAS_STYLE.font.family }}
        >
          {/* ── CSS 动画定义（磁通脉动 + 电子流动）──────────────────────── */}
          <defs>
            <style>{`
              @keyframes tf-flux-pulse {
                0%, 100% { opacity: 0.2 }
                50% { opacity: var(--flux-max, 0.7) }
              }
              .tf-flux { animation: tf-flux-pulse 2s ease-in-out infinite; }
              @keyframes tf-electron-flow {
                from { stroke-dashoffset: 0 }
                to { stroke-dashoffset: var(--electron-offset, -24px) }
              }
            `}</style>
          </defs>

          {/* ═══════════ 铁芯（闭合矩形）═══════════ */}
          <rect
            x={coreLeft}
            y={coreTop}
            width={coreW}
            height={coreH}
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={px(3)}
          />
          {/* 铁芯叠片纹理 */}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`core-lam-${i}`}
              x1={coreLeft + px(4)}
              y1={coreTop + px(18) + i * px(22)}
              x2={coreRight - px(4)}
              y2={coreTop + px(18) + i * px(22)}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={CANVAS_STYLE.stroke.grid}
              opacity={0.5}
            />
          ))}

          {/* ═══════════ 磁通量虚线环 ═══════════ */}
          {fluxRings}

          {/* ═══════════ 原线圈（左侧，红）═══════════ */}
          <g>
            <path
              d={primaryCoilPath}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            {/* 电子流动（CSS 动画，速度随 I₁）*/}
            <path
              d={primaryCoilPath}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine + px(1)}
              strokeDasharray={`${px(4)} ${px(20)}`}
              strokeLinecap="round"
              opacity={0.65}
              style={{
                animation: 'tf-electron-flow linear infinite',
                animationDuration: `${primaryFlowDur}s`,
                ['--electron-offset' as string]: `${px(-24)}`,
              }}
            />
            <text
              x={v1X}
              y={coreTop - meterR * 2 - px(10)}
              fontSize={font(FONT.axisSize)}
              fill={PHYSICS_COLORS.electricCurrent}
              textAnchor="middle"
              fontWeight="bold"
            >
              原线圈 n₁={n1}
            </text>
          </g>

          {/* ═══════════ 副线圈（右侧，蓝）═══════════ */}
          <g>
            <path
              d={secondaryCoilPath}
              fill="none"
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            <path
              d={secondaryCoilPath}
              fill="none"
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine + px(1)}
              strokeDasharray={`${px(4)} ${px(20)}`}
              strokeLinecap="round"
              opacity={0.65}
              style={{
                animation: 'tf-electron-flow linear infinite',
                animationDuration: `${secondaryFlowDur}s`,
                animationDirection: 'reverse',
                ['--electron-offset' as string]: `${px(-24)}`,
              }}
            />
            <text
              x={v2X}
              y={coreTop - meterR * 2 - px(10)}
              fontSize={font(FONT.axisSize)}
              fill={PHYSICS_COLORS.magnetSouth}
              textAnchor="middle"
              fontWeight="bold"
            >
              副线圈 n₂={n2}
            </text>
          </g>

          {/* ═══════════ 原边回路接线 + 交流电源 ═══════════ */}
          <g>
            {/* 上线：电源 → 线圈顶 */}
            <line
              x1={sourceX} y1={cy - px(14)}
              x2={sourceX} y2={coreTop + px(8)}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <line
              x1={sourceX} y1={coreTop + px(8)}
              x2={primaryRight} y2={coreTop + px(8)}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            {/* 下线：线圈底 → 电源 */}
            <line
              x1={primaryRight} y1={coreBottom - px(8)}
              x2={sourceX} y2={coreBottom - px(8)}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <line
              x1={sourceX} y1={coreBottom - px(8)}
              x2={sourceX} y2={cy + px(14)}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            {/* 交流电源符号 */}
            <circle
              cx={sourceX} cy={cy} r={px(14)}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectThin}
            />
            <text
              x={sourceX} y={cy + px(5)}
              fontSize={font(FONT.bodySize)}
              fill={PHYSICS_COLORS.electricCurrent}
              textAnchor="middle"
              fontWeight="bold"
            >
              ~
            </text>
            <text
              x={sourceX} y={cy + px(30)}
              fontSize={font(FONT.smallSize)}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              U₁={U1}V
            </text>
          </g>

          {/* ═══════════ 副边回路接线 + 滑动变阻器负载 ═══════════ */}
          <g>
            {/* 上线：线圈顶 → 变阻器 */}
            <line
              x1={secondaryLeft} y1={coreTop + px(8)}
              x2={rheostatX} y2={coreTop + px(8)}
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <line
              x1={rheostatX} y1={coreTop + px(8)}
              x2={rheostatX} y2={cy - px(12)}
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            {/* 下线：变阻器 → 线圈底 */}
            <line
              x1={rheostatX} y1={cy + px(12)}
              x2={rheostatX} y2={coreBottom - px(8)}
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <line
              x1={rheostatX} y1={coreBottom - px(8)}
              x2={secondaryLeft} y2={coreBottom - px(8)}
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
          </g>

          {/* 滑动变阻器（负载 R）*/}
          <Rheostat
            x={rheostatX}
            y={cy}
            value={R}
            min={5}
            max={200}
            width={rheostatW}
            label="R"
            unit="Ω"
          />

          {/* ═══════════ 四只指针电表 ═══════════ */}
          {/* V1 原边电压表 */}
          <DialMeter type="V" value={U1} max={v1Max} x={v1X} y={meterTopY} r={meterR} />
          <text x={v1X} y={meterTopY - meterR - px(4)} fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle" fontWeight="bold">
            V₁
          </text>
          {/* A1 原边电流表 */}
          <DialMeter type="A" value={I1} max={a1Max} x={v1X} y={meterBotY} r={meterR} />
          <text x={v1X} y={meterBotY + meterR + px(10)} fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle" fontWeight="bold">
            A₁
          </text>
          {/* V2 副边电压表 */}
          <DialMeter type="V" value={U2} max={v2Max} x={v2X} y={meterTopY} r={meterR} />
          <text x={v2X} y={meterTopY - meterR - px(4)} fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.magnetSouth} textAnchor="middle" fontWeight="bold">
            V₂
          </text>
          {/* A2 副边电流表 */}
          <DialMeter type="A" value={I2} max={a2Max} x={v2X} y={meterBotY} r={meterR} />
          <text x={v2X} y={meterBotY + meterR + px(10)} fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.magnetSouth} textAnchor="middle" fontWeight="bold">
            A₂
          </text>

          {/* ═══════════ 底部公式标注（短公式，允许在中间屏）═══════════ */}
          <g transform={`translate(${px(8)}, ${H - px(30)})`}>
            <rect width={W - px(16)} height={px(24)} rx={px(5)} fill={PHYSICS_COLORS.objectFill}
              opacity="0.85" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} />
            <text x={px(10)} y={px(16)} fontSize={font(FONT.axisSize)}
              fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              U₂/U₁ = n₂/n₁ · P_in = P_out{powerBalanced ? ' ✓' : ''}
            </text>
          </g>
        </svg>
      </div>

      {/* ═══════════ 右：InfoBar（仅进阶模式）═══════════ */}
      {mode === 1 && (
        <div className="shrink-0 h-full flex flex-col gap-2 overflow-y-auto" style={{ width: px(208) }}>
          {/* 功率配平 */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-neutral-600 mb-2">功率配平</div>
            {/* P_in */}
            <div className="mb-2">
              <div className="flex justify-between mb-0.5" style={{ fontSize: font(FONT.smallSize) }}>
                <span className="text-neutral-500">P_in（输入）</span>
                <span className="font-mono font-bold" style={{ color: PHYSICS_COLORS.power }}>
                  {P_input.toFixed(1)} W
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pBarW}%`, backgroundColor: PHYSICS_COLORS.power }} />
              </div>
            </div>
            {/* P_out */}
            <div className="mb-2">
              <div className="flex justify-between mb-0.5" style={{ fontSize: font(FONT.smallSize) }}>
                <span className="text-neutral-500">P_out（输出）</span>
                <span className="font-mono font-bold" style={{ color: PHYSICS_COLORS.power }}>
                  {P_output.toFixed(1)} W
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pBarW}%`, backgroundColor: PHYSICS_COLORS.power }} />
              </div>
            </div>
            <div className="text-emerald-600 font-semibold" style={{ fontSize: font(FONT.smallSize) }}>
              {powerBalanced ? '✓ P_in = P_out 严格守恒' : '计算中…'}
            </div>
          </Card>

          {/* 动态因果链多米诺 */}
          <Card className="p-3 flex-1 min-h-0">
            <div className="text-xs font-semibold text-neutral-600 mb-2">动态因果链</div>
            <div className="flex flex-col gap-1">
              {chainSteps.map((step, i) => {
                const isLit = dominoStep === -1 || i <= dominoStep
                const isActive = dominoStep === i
                return (
                  <div key={step.key} className="flex items-center gap-1.5">
                    <div
                      className="flex-1 flex items-center justify-between rounded-md px-2 py-1 transition-all duration-200 border"
                      style={{
                        backgroundColor: isLit ? `${step.color}${HIGHLIGHT_ALPHA}` : 'transparent',
                        borderColor: isActive ? step.color : 'transparent',
                        transform: isActive ? 'scale(1.04)' : 'scale(1)',
                        opacity: isLit ? 1 : 0.35,
                      }}
                    >
                      <span
                        className="font-bold"
                        style={{ fontSize: font(FONT.smallSize + 1), color: isLit ? step.color : PHYSICS_COLORS.labelTextLight }}
                      >
                        {step.label}
                      </span>
                      <span
                        className="font-mono"
                        style={{ fontSize: font(FONT.smallSize), color: isLit ? step.color : PHYSICS_COLORS.labelTextLight }}
                      >
                        {step.value.toFixed(2)} {step.unit}
                      </span>
                    </div>
                    {i < chainSteps.length - 1 && (
                      <span className="text-neutral-300" style={{ fontSize: font(FONT.smallSize) }}>↓</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 text-neutral-400 leading-relaxed" style={{ fontSize: font(FONT.smallSize) }}>
              铁律：U₁→U₂→I₂→P_out→P_in→I₁
              <br />
              改变 R 触发多米诺高亮
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
