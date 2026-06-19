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
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, FONT } from '@/theme/physics'
import { calculateTransformerWithLoad } from '@/physics'
import { DialMeter, Rheostat } from '@/components/Physics'
import { Card } from '@/components/UI'
import { duration } from '@/theme/motion'

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

// ─── 生成3D环绕线圈绕线 SVG path ───────────────────────────────────────────
/**
 * 生成螺旋线圈的正面和背面路径。
 * 背面半匝和正面半匝交替连接，形成包裹立柱的 3D 物理效果。
 */
function generateCoilPaths3D(
  left: number,
  right: number,
  top: number,
  bottom: number,
  n: number,
  isPrimary: boolean,
  topInset: number,
  bulge: number,
) {
  const turns = Math.min(Math.max(1, n), MAX_DISPLAY_TURNS)
  const availableH = bottom - top - topInset * 2
  const gap = availableH / turns

  let backD = ''
  let frontD = ''

  for (let i = 0; i < turns; i++) {
    const yStart = top + topInset + i * gap
    const yMid = yStart + gap / 2
    const yEnd = yStart + gap

    if (isPrimary) {
      // 原线圈（左立柱）：
      // 背面从 left 绕到 right，控制点向左凸出
      if (i === 0) {
        backD += `M ${left} ${yStart}`
      } else {
        backD += ` L ${left} ${yStart}`
      }
      backD += ` Q ${left - bulge} ${(yStart + yMid) / 2} ${right} ${yMid}`

      // 正面从 right 绕到 left，控制点向右凸出
      if (i === 0) {
        frontD += `M ${right} ${yMid}`
      } else {
        frontD += ` L ${right} ${yMid}`
      }
      frontD += ` Q ${right + bulge} ${(yMid + yEnd) / 2} ${left} ${yEnd}`
    } else {
      // 副线圈（右立柱）：
      // 背面从 right 绕到 left，控制点向右凸出
      if (i === 0) {
        backD += `M ${right} ${yStart}`
      } else {
        backD += ` L ${right} ${yStart}`
      }
      backD += ` Q ${right + bulge} ${(yStart + yMid) / 2} ${left} ${yMid}`

      // 正面从 left 绕到 right，控制点向左凸出
      if (i === 0) {
        frontD += `M ${left} ${yMid}`
      } else {
        frontD += ` L ${left} ${yMid}`
      }
      frontD += ` Q ${left - bulge} ${(yMid + yEnd) / 2} ${right} ${yEnd}`
    }
  }

  return { backD, frontD }
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

  // ── 布局尺寸与物理结构定义（口字形闭合铁芯与线圈重合嵌套布局） ─────────────────
  const W = canvasSize.width
  const H = canvasSize.height

  // ── Viewport（可视区域计算：右面板浮层遮挡由 viewport 统一处理） ────
  const rightPanelW = mode === 1 ? Math.round(W * 0.30) : 0
  const vp = useViewport(canvasSize, {
    designWidth: 760,
    designHeight: 440,
    overlayRight: rightPanelW,
  })

  // 铁芯/线圈尺寸（按 viewport contain 缩放，等比放大减少内部空白）
  const coreH = 155 * vp.scale
  const coreColumnW = 18 * vp.scale
  const coilW = 24 * vp.scale

  // 可视区域居中
  const cx = vp.centerX
  const cy = vp.centerY - 6 * vp.scale

  // 跨度（左立柱与右立柱中心的水平距离）
  const span = 110 * vp.scale
  const v1X = cx - span / 2
  const v2X = cx + span / 2

  // 铁芯外框边界（口字形外框）
  const coreLeft = v1X - coreColumnW / 2
  const coreRight = v2X + coreColumnW / 2
  const coreTop = cy - coreH / 2
  const coreBottom = cy + coreH / 2

  // 铁芯内部中空边界（口字形内框）
  const innerLeft = v1X + coreColumnW / 2
  const innerRight = v2X - coreColumnW / 2
  const innerTop = coreTop + coreColumnW
  const innerBottom = coreBottom - coreColumnW

  // 线圈边界（分别缠套在左、右立柱上，宽度略大于立柱以表现包裹物理质感）
  const primaryLeft = v1X - coilW / 2
  const primaryRight = v1X + coilW / 2
  const secondaryLeft = v2X - coilW / 2
  const secondaryRight = v2X + coilW / 2

  // 电表位置（原副线圈正上方/正下方）
  const meterR = 26 * vp.scale
  const meterTopY = coreTop - meterR - 16 * vp.scale
  const meterBotY = coreBottom + meterR + 18 * vp.scale

  // 电源 / 负载位置（接线端改至外侧以避开立柱铁芯）
  const sourceX = primaryLeft - 34 * vp.scale
  const rheostatW = 86 * vp.scale
  const rheostatGap = coilW + 12 * vp.scale
  const rheostatX = secondaryRight + rheostatGap + rheostatW / 2

  // ── 线圈路径 ──────────────────────────────────────────────────────────
  const coilTopInset = px(10)
  const coilBulge = coilW / 2
  
  // 生成绕线路径：原线圈套在左立柱，副线圈套在右立柱。
  const primaryCoils = useMemo(
    () => generateCoilPaths3D(primaryLeft, primaryRight, coreTop, coreBottom, n1, true, coilTopInset, coilBulge),
    [primaryLeft, primaryRight, coreTop, coreBottom, n1, coilTopInset, coilBulge]
  )
  const secondaryCoils = useMemo(
    () => generateCoilPaths3D(secondaryLeft, secondaryRight, coreTop, coreBottom, n2, false, coilTopInset, coilBulge),
    [secondaryLeft, secondaryRight, coreTop, coreBottom, n2, coilTopInset, coilBulge]
  )

  // 电子流速随电流增大而加快（duration 缩短）
  const primaryFlowDur = Math.max(0.35, Math.min(3, 1.8 / (I1 + 0.3)))
  const secondaryFlowDur = Math.max(0.35, Math.min(3, 1.8 / (I2 + 0.3)))

  // ── 磁通量荧光管道与粒子流动（沿着立柱中心磁路闭合传导，磁通粒子顺滑穿过线圈中心） ──────
  // 磁通粒子流速随电压增大而加快
  const fluxFlowDur = Math.max(0.4, Math.min(2.5, 300 / (U1 + 15)))

  // 计算线圈发光强度参数，与回路实际电流挂钩
  const glowRadius1 = Math.max(1.5, Math.min(6, 1 + I1 * 0.25))
  const glowRadius2 = Math.max(1.5, Math.min(6, 1 + I2 * 0.25))
  const primaryGlowOpacity = Math.max(0.12, Math.min(0.85, 0.12 + I1 * 0.15))
  const secondaryGlowOpacity = Math.max(0.12, Math.min(0.85, 0.12 + I2 * 0.15))

  const fluxRings = useMemo(() => {
    const rings = []
    const ringCount = 3
    
    // 磁路超导管道底色 (低不透明度荧光绿，呈圆角跑道状完美嵌在立柱中轴线)
    rings.push(
      <rect
        key="flux-pipe-bg"
        x={v1X}
        y={coreTop + coreColumnW / 2}
        width={v2X - v1X}
        height={coreBottom - coreTop - coreColumnW}
        fill="none"
        stroke={PHYSICS_COLORS.magneticField}
        strokeWidth={coreColumnW - px(4)}
        opacity={0.06}
        rx={px(6)}
      />
    )

    const offsets = [-px(4), 0, px(4)]

    for (let i = 0; i < ringCount; i++) {
      const offset = offsets[i]
      const rx = v1X + offset
      const ry = coreTop + coreColumnW / 2 + offset
      const rw = v2X - v1X - 2 * offset
      const rh = coreBottom - coreTop - coreColumnW - 2 * offset
      const path = `M ${rx} ${ry} L ${rx + rw} ${ry} L ${rx + rw} ${ry + rh} L ${rx} ${ry + rh} Z`
      rings.push(
        <path
          key={`flux-ring-${i}`}
          d={path}
          fill="none"
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={px(1.0 + (3 - i) * 0.3)}
          strokeDasharray={`${px(4)} ${px(14)}`} // 荧光圆点粒子
          strokeLinecap="round"
          style={{
            animation: 'tf-flux-flow linear infinite',
            animationDuration: `${fluxFlowDur}s`,
            animationDelay: `${i * -0.25}s`, // 错开相位
            ['--flux-offset' as string]: `${px(-24)}`,
            opacity: 0.85 - i * 0.15,
          } as CSSProperties}
        />
      )
    }
    return rings
  }, [v1X, v2X, coreTop, coreBottom, coreColumnW, fluxFlowDur, px])

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
      timers.push(setTimeout(() => setDominoStep(i), i * duration.normal))
    })
    timers.push(setTimeout(() => setDominoStep(-1), chainSteps.length * duration.normal + 1000))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, mode])

  // ── 交流电源正弦波参数 ──────────────────────────────────────────────────
  const waveAmp = Math.max(2.5, Math.min(6, (U1 / 500) * 8)) * vp.scale
  const waveWl = 22 * vp.scale
  const wavePath = `M ${sourceX - waveWl} ${cy} 
                    q ${waveWl/4} ${-waveAmp} ${waveWl/2} 0 
                    t ${waveWl/2} 0 
                    t ${waveWl/2} 0 
                    t ${waveWl/2} 0 
                    t ${waveWl/2} 0`

  // ── 功率配平参考（1kW 归一化）──────────────────────────────────────────
  const pRef = 1000
  const pBarW = Math.min(100, (P_input / pRef) * 100)
  const powerBalanced = Math.abs(P_input - P_output) < 0.01

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* ═══════════ SVG 变压器实体（铺满容器） ═══════════ */}
      <div className="w-full h-full">
        <svg
          width={W}
          height={H}
          className="bg-white rounded-lg shadow-inner select-none"
          style={{ fontFamily: CANVAS_STYLE.font.family }}
        >
          {/* ── CSS 动画定义与裁剪路径 ──────────────────────── */}
          <defs>
            <style>{`
              @keyframes tf-flux-flow {
                from { stroke-dashoffset: 0 }
                to { stroke-dashoffset: var(--flux-offset, -24px) }
              }
              @keyframes tf-electron-flow {
                from { stroke-dashoffset: 0 }
                to { stroke-dashoffset: var(--electron-offset, -24px) }
              }
              @keyframes tf-wave-move {
                from { transform: translateX(0); }
                to { transform: translateX(var(--wave-offset, 22px)); }
              }
            `}</style>
            <clipPath id="source-clip">
              <circle cx={sourceX} cy={cy} r={12.5 * vp.scale} />
            </clipPath>
          </defs>

          {/* ═══════════ 1. 最底层：线圈背面 ═══════════ */}
          <path
            d={primaryCoils.backD}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine - px(0.5)}
            opacity={0.4}
            strokeLinecap="round"
          />
          <path
            d={secondaryCoils.backD}
            fill="none"
            stroke={PHYSICS_COLORS.magnetSouth}
            strokeWidth={CANVAS_STYLE.stroke.objectLine - px(0.5)}
            opacity={0.4}
            strokeLinecap="round"
          />

          {/* ═══════════ 2. 中层：口字形铁芯 ═══════════ */}
          {/* 外框 */}
          <rect
            x={coreLeft}
            y={coreTop}
            width={coreRight - coreLeft}
            height={coreH}
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={px(4)}
            ry={px(4)}
          />
          {/* 内框（镂空中空，填充白色以盖住背面线圈） */}
          <rect
            x={innerLeft}
            y={innerTop}
            width={innerRight - innerLeft}
            height={innerBottom - innerTop}
            fill="white"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={px(2)}
            ry={px(2)}
          />
          {/* 铁芯竖向叠片纹理 */}
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={`core-lam-g-${i}`}>
              {/* 左立柱叠片 */}
              <line
                x1={coreLeft + (i + 1) * (coreColumnW / 5)}
                y1={coreTop + px(2)}
                x2={coreLeft + (i + 1) * (coreColumnW / 5)}
                y2={coreBottom - px(2)}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={px(0.8)}
                opacity={0.45}
              />
              {/* 右立柱叠片 */}
              <line
                x1={innerRight + (i + 1) * (coreColumnW / 5)}
                y1={coreTop + px(2)}
                x2={innerRight + (i + 1) * (coreColumnW / 5)}
                y2={coreBottom - px(2)}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={px(0.8)}
                opacity={0.45}
              />
            </g>
          ))}

          {/* ═══════════ 3. 中上层：磁通量虚线环粒子 ═══════════ */}
          {fluxRings}

          {/* ═══════════ 4. 顶层：线圈正面与电子流动 ═══════════ */}
          {/* 原线圈正面（左侧，红） */}
          <g>
            {/* 荧光发光层 */}
            <path
              d={primaryCoils.frontD}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine + px(3)}
              strokeLinecap="round"
              opacity={primaryGlowOpacity * 0.3}
              style={{ filter: `blur(${glowRadius1}px)` }}
            />
            {/* 导线实体 */}
            <path
              d={primaryCoils.frontD}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            {/* 电子流动动画 */}
            {I1 > 0.01 && (
              <path
                d={primaryCoils.frontD}
                fill="none"
                stroke={PHYSICS_COLORS.electricCurrent}
                strokeWidth={CANVAS_STYLE.stroke.objectLine + px(1)}
                strokeDasharray={`${px(4)} ${px(20)}`}
                strokeLinecap="round"
                opacity={0.8}
                style={{
                  animation: 'tf-electron-flow linear infinite',
                  animationDuration: `${primaryFlowDur}s`,
                  ['--electron-offset' as string]: `${px(-24)}`,
                }}
              />
            )}
            <text
              x={v1X}
              y={meterTopY - meterR - px(18)}
              fontSize={font(FONT.axisSize)}
              fill={PHYSICS_COLORS.electricCurrent}
              textAnchor="middle"
              fontWeight="bold"
            >
              原线圈 n₁={n1}
            </text>
          </g>

          {/* 副线圈正面（右侧，蓝） */}
          <g>
            {/* 荧光发光层 */}
            <path
              d={secondaryCoils.frontD}
              fill="none"
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine + px(3)}
              strokeLinecap="round"
              opacity={secondaryGlowOpacity * 0.3}
              style={{ filter: `blur(${glowRadius2}px)` }}
            />
            {/* 导线实体 */}
            <path
              d={secondaryCoils.frontD}
              fill="none"
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            {/* 电子流动动画 */}
            {I2 > 0.01 && (
              <path
                d={secondaryCoils.frontD}
                fill="none"
                stroke={PHYSICS_COLORS.magnetSouth}
                strokeWidth={CANVAS_STYLE.stroke.objectLine + px(1)}
                strokeDasharray={`${px(4)} ${px(20)}`}
                strokeLinecap="round"
                opacity={0.8}
                style={{
                  animation: 'tf-electron-flow linear infinite',
                  animationDuration: `${secondaryFlowDur}s`,
                  animationDirection: 'reverse',
                  ['--electron-offset' as string]: `${px(-24)}`,
                }}
              />
            )}
            <text
              x={v2X}
              y={meterTopY - meterR - px(18)}
              fontSize={font(FONT.axisSize)}
              fill={PHYSICS_COLORS.magnetSouth}
              textAnchor="middle"
              fontWeight="bold"
            >
              副线圈 n₂={n2}
            </text>
          </g>

          {/* ═══════════ 5. 回路外侧接引线与交流电源、负载 ═══════════ */}
          {/* 原边回路外侧接引线 */}
          <g>
            <path
              d={`M ${sourceX} ${cy - 14 * vp.scale} V ${coreTop + coilTopInset} H ${primaryLeft}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            <path
              d={`M ${primaryLeft} ${coreBottom - coilTopInset} H ${sourceX} V ${cy + 14 * vp.scale}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            {/* 交流电源主体符号 */}
            <circle
              cx={sourceX}
              cy={cy}
              r={14 * vp.scale}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.objectThin}
            />
            {/* 裁剪内部滚动的正弦波 */}
            <g clipPath="url(#source-clip)">
              <path
                d={wavePath}
                fill="none"
                stroke={PHYSICS_COLORS.electricCurrent}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                style={{
                  animation: 'tf-wave-move 1.2s linear infinite',
                  ['--wave-offset' as string]: `${22 * vp.scale}px`,
                } as CSSProperties}
              />
            </g>
            <text
              x={sourceX}
              y={cy + 30 * vp.scale}
              fontSize={font(FONT.smallSize)}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              U₁={U1}V
            </text>
          </g>

          {/* 副边回路外侧接引线 */}
          <g>
            <path
              d={`M ${secondaryRight} ${coreTop + coilTopInset} H ${rheostatX} V ${cy - 12.3 * vp.scale}`}
              fill="none"
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
            <path
              d={`M ${rheostatX} ${cy + 6.15 * vp.scale} V ${coreBottom - coilTopInset} H ${secondaryRight}`}
              fill="none"
              stroke={PHYSICS_COLORS.magnetSouth}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinecap="round"
            />
          </g>

          {/* 滑动变阻器负载 */}
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

          {/* ═══════════ 6. 四只高对比度指针电表 ═══════════ */}
          {/* V1 原边电压表 */}
          <DialMeter type="V" value={U1} max={v1Max} x={v1X} y={meterTopY} r={meterR} />
          <text
            x={v1X}
            y={meterTopY - meterR - px(4)}
            fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle"
            fontWeight="bold"
          >
            V₁
          </text>
          {/* A1 原边电流表 */}
          <DialMeter type="A" value={I1} max={a1Max} x={v1X} y={meterBotY} r={meterR} />
          <text
            x={v1X}
            y={meterBotY + meterR + px(10)}
            fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle"
            fontWeight="bold"
          >
            A₁
          </text>
          {/* V2 副边电压表 */}
          <DialMeter type="V" value={U2} max={v2Max} x={v2X} y={meterTopY} r={meterR} />
          <text
            x={v2X}
            y={meterTopY - meterR - px(4)}
            fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.magnetSouth}
            textAnchor="middle"
            fontWeight="bold"
          >
            V₂
          </text>
          {/* A2 副边电流表 */}
          <DialMeter type="A" value={I2} max={a2Max} x={v2X} y={meterBotY} r={meterR} />
          <text
            x={v2X}
            y={meterBotY + meterR + px(10)}
            fontSize={font(FONT.smallSize)}
            fill={PHYSICS_COLORS.magnetSouth}
            textAnchor="middle"
            fontWeight="bold"
          >
            A₂
          </text>

          {/* ═══════════ 7. 底部物理公式标注（限制在可视区域） ═══════════ */}
          <g transform={`translate(${px(8)}, ${H - px(30)})`}>
            <rect
              width={vp.visibleW - px(16)}
              height={px(24)}
              rx={px(5)}
              fill={PHYSICS_COLORS.objectFill}
              opacity="0.85"
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={CANVAS_STYLE.stroke.grid}
            />
            <text
              x={px(10)}
              y={px(16)}
              fontSize={font(FONT.axisSize)}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
            >
              U₂/U₁ = n₂/n₁ · P_in = P_out{powerBalanced ? ' ✓' : ''}
            </text>
          </g>
        </svg>
      </div>

      {/* ═══════════ 右：InfoBar 浮层覆盖（绝对定位，不占用 SVG 空间） ═══════════ */}
      {mode === 1 && (
        <div
          className="absolute right-0 top-0 h-full bg-white/95 rounded-l-xl shadow-xl z-10 overflow-y-auto flex flex-col gap-2"
          style={{ width: rightPanelW }}
        >
          {/* 功率配平 Card */}
          <Card className="p-4">
            <div className="font-semibold text-neutral-600 mb-3" style={{ fontSize: font(FONT.axisSize + 1) }}>功率配平</div>
            {/* P_in */}
            <div className="mb-3">
              <div className="flex justify-between mb-1" style={{ fontSize: font(FONT.smallSize + 2) }}>
                <span className="text-neutral-500">P_in（输入）</span>
                <span className="font-mono font-bold" style={{ color: PHYSICS_COLORS.power }}>
                  {P_input.toFixed(1)} W
                </span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pBarW}%`, backgroundColor: PHYSICS_COLORS.power }}
                />
              </div>
            </div>
            {/* P_out */}
            <div className="mb-3">
              <div className="flex justify-between mb-1" style={{ fontSize: font(FONT.smallSize + 2) }}>
                <span className="text-neutral-500">P_out（输出）</span>
                <span className="font-mono font-bold" style={{ color: PHYSICS_COLORS.power }}>
                  {P_output.toFixed(1)} W
                </span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pBarW}%`, backgroundColor: PHYSICS_COLORS.power }} />
              </div>
            </div>
            <div className="text-emerald-600 font-semibold" style={{ fontSize: font(FONT.smallSize + 2) }}>
              {powerBalanced ? '✓ P_in = P_out 严格守恒' : '计算中…'}
            </div>
          </Card>

          {/* 动态因果链多米诺 */}
          <Card className="p-4 flex-1 min-h-0">
            <div className="font-semibold text-neutral-600 mb-3" style={{ fontSize: font(FONT.axisSize + 1) }}>动态因果链</div>
            <div className="flex flex-col gap-2">
              {chainSteps.map((step, i) => {
                const isLit = dominoStep === -1 || i <= dominoStep
                const isActive = dominoStep === i
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div
                      className="flex-1 flex items-center justify-between rounded-md px-3 py-2 transition-all duration-200 border"
                      style={{
                        backgroundColor: isLit ? `${step.color}${HIGHLIGHT_ALPHA}` : 'transparent',
                        borderColor: isActive ? step.color : 'transparent',
                        transform: isActive ? 'scale(1.04)' : 'scale(1)',
                        opacity: isLit ? 1 : 0.35,
                      }}
                    >
                      <span
                        className="font-bold"
                        style={{ fontSize: font(FONT.axisSize), color: isLit ? step.color : PHYSICS_COLORS.labelTextLight }}
                      >
                        {step.label}
                      </span>
                      <span
                        className="font-mono"
                        style={{ fontSize: font(FONT.smallSize + 2), color: isLit ? step.color : PHYSICS_COLORS.labelTextLight }}
                      >
                        {step.value.toFixed(2)} {step.unit}
                      </span>
                    </div>
                    {i < chainSteps.length - 1 && (
                      <span className="text-neutral-300" style={{ fontSize: font(FONT.smallSize + 2) }}>↓</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 text-neutral-400 leading-relaxed" style={{ fontSize: font(FONT.smallSize + 2) }}>
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
