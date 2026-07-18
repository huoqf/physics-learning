import { FC, useMemo } from 'react'
import { Card } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { calculateOhmmeter } from '@/physics'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  PHYSICS_COLORS,
  CANVAS_COLORS,
  CIRCUIT_COLORS,
  ELECTRICAL_APPARATUS_COLORS,
  withAlpha,
} from '@/theme/physics'
import { colors } from '@/theme/colors'

export const MultimeterCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const { containerRef, canvasSize } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const opMode = params.opMode ?? 0
  const multiplier = params.multiplier ?? 1
  const R_adjust = params.R_adjust ?? 199
  const Rx = params.Rx ?? 1500
  const E = 1.5
  const Rg = 100
  const r = 1
  const Ig = 0.001

  // 物理计算：短接调零时外部电阻视为 0
  const effectiveRx = opMode === 0 ? 0 : Rx
  const res = calculateOhmmeter(E, Rg, r, R_adjust, effectiveRx, multiplier, Ig)
  const ratio = res.ratio

  // 经典物理万用表表盘：指针偏角从 -50 度（最左，无电流/欧姆常规无穷大）到 +50 度（最右，满偏电流/欧姆为0）
  const pointerAngle = -50 + ratio * 100

  const CX = 420
  const CY = 200
  const R_ohm = 165
  const R_dc = 138
  const R_ac = 102

  // 欧姆表中心刻度值（由 E=1.5V, Ig=1mA 决定：R_mid = E/Ig = 1500Ω）
  const OHM_CENTER = 1500

  // 1. 电阻刻度 (Ohm Scale)：反向非线性刻度，以 1500 为中心
  const ohmTicks = useMemo(() => {
    const points: { val: number; label: string; type: 'major' | 'medium' | 'minor' }[] = []

    const majors: Record<number, string> = {
      0: '0',
      500: '500',
      1000: '1000',
      1500: '1500',
      2000: '2k',
      [Infinity]: '∞',
    }

    // 0 到 2000，步长 100
    for (let v = 0; v <= 2000; v += 100) {
      const isMajor = majors[v] !== undefined
      const isMedium = v % 500 === 0
      points.push({ val: v, label: majors[v] || '', type: isMajor ? 'major' : (isMedium ? 'medium' : 'minor') })
    }

    // 3000, 5000
    points.push({ val: 3000, label: '3k', type: 'major' })
    points.push({ val: 4000, label: '', type: 'minor' })
    points.push({ val: 5000, label: '5k', type: 'major' })

    // 10k, 20k, 50k, 100k
    points.push({ val: 10000, label: '10k', type: 'major' })
    points.push({ val: 20000, label: '20k', type: 'medium' })
    points.push({ val: 50000, label: '50k', type: 'medium' })
    points.push({ val: 100000, label: '100k', type: 'major' })

    // 无穷大
    points.push({ val: Infinity, label: '∞', type: 'major' })

    return points.map((item) => {
      let tickRatio = 0
      if (item.val !== Infinity) {
        tickRatio = OHM_CENTER / (OHM_CENTER + item.val)
      }
      const angle = -50 + tickRatio * 100
      const rad = ((angle - 90) * Math.PI) / 180

      let len = 4
      if (item.type === 'major') len = 8
      else if (item.type === 'medium') len = 6

      return {
        x1: CX + R_ohm * Math.cos(rad),
        y1: CY + R_ohm * Math.sin(rad),
        x2: CX + (R_ohm - len) * Math.cos(rad),
        y2: CY + (R_ohm - len) * Math.sin(rad),
        tx: CX + (R_ohm - 15) * Math.cos(rad),
        ty: CY + (R_ohm - 15) * Math.sin(rad),
        label: item.label,
        type: item.type,
        angle,
      }
    })
  }, [])

  // 2. 直流电压电流刻度 (DC V/A)：均匀刻度
  const dcTicks = useMemo(() => {
    const points = []
    for (let i = 0; i <= 50; i++) {
      const tickRatio = i / 50
      const angle = -50 + tickRatio * 100
      const rad = ((angle - 90) * Math.PI) / 180

      const isMajor = i % 5 === 0
      const len = isMajor ? 7 : 4

      let label50 = ''
      let label250 = ''
      if (isMajor && (i / 5) % 2 === 0) {
        const idx = i / 5
        label50 = (idx * 10).toFixed(0) // 0, 10, 20, 30, 40, 50
        label250 = (idx * 50).toFixed(0) // 0, 50, 100, 150, 200, 250
      }

      points.push({
        x1: CX + R_dc * Math.cos(rad),
        y1: CY + R_dc * Math.sin(rad),
        x2: CX + (R_dc - len) * Math.cos(rad),
        y2: CY + (R_dc - len) * Math.sin(rad),
        t1x: CX + (R_dc - 13) * Math.cos(rad),
        t1y: CY + (R_dc - 13) * Math.sin(rad),
        t2x: CX + (R_dc - 22) * Math.cos(rad),
        t2y: CY + (R_dc - 22) * Math.sin(rad),
        label50,
        label250,
        isMajor,
      })
    }
    return points
  }, [])

  // 3. 交流电压刻度 (AC 10V)：均匀刻度，红色
  const acTicks = useMemo(() => {
    const points = []
    for (let i = 0; i <= 10; i++) {
      const tickRatio = i / 10
      const angle = -50 + tickRatio * 100
      const rad = ((angle - 90) * Math.PI) / 180

      const isMajor = i % 2 === 0
      const len = isMajor ? 6 : 3.5
      const label = isMajor ? i.toFixed(0) : ''

      points.push({
        x1: CX + R_ac * Math.cos(rad),
        y1: CY + R_ac * Math.sin(rad),
        x2: CX + (R_ac - len) * Math.cos(rad),
        y2: CY + (R_ac - len) * Math.sin(rad),
        tx: CX + (R_ac - 11) * Math.cos(rad),
        ty: CY + (R_ac - 11) * Math.sin(rad),
        label,
      })
    }
    return points
  }, [])

  const ohmArcPath = `M ${CX - R_ohm * Math.sin((50 * Math.PI) / 180)} ${CY - R_ohm * Math.cos((50 * Math.PI) / 180)} A ${R_ohm} ${R_ohm} 0 0 1 ${CX + R_ohm * Math.sin((50 * Math.PI) / 180)} ${CY - R_ohm * Math.cos((50 * Math.PI) / 180)}`
  const dcArcPath = `M ${CX - R_dc * Math.sin((50 * Math.PI) / 180)} ${CY - R_dc * Math.cos((50 * Math.PI) / 180)} A ${R_dc} ${R_dc} 0 0 1 ${CX + R_dc * Math.sin((50 * Math.PI) / 180)} ${CY - R_dc * Math.cos((50 * Math.PI) / 180)}`
  const acArcPath = `M ${CX - R_ac * Math.sin((50 * Math.PI) / 180)} ${CY - R_ac * Math.cos((50 * Math.PI) / 180)} A ${R_ac} ${R_ac} 0 0 1 ${CX + R_ac * Math.sin((50 * Math.PI) / 180)} ${CY - R_ac * Math.cos((50 * Math.PI) / 180)}`

  return (
    <div ref={containerRef} className="w-full h-full flex gap-3 px-2 py-2 border-b border-neutral-200 bg-neutral-100/50">
      <Card className="flex-1 p-3 flex flex-col justify-center min-w-0 relative bg-[#fdfbf6] text-neutral-800 rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.05)] border border-neutral-300/80 overflow-hidden animate-fade-in">
        {/* 表盘标题与装饰 */}
        <span className="absolute top-2.5 left-4 text-[11px] font-bold text-neutral-500 tracking-wider">
          万用表多重模拟刻度盘 (满偏电流 Ig = 1.0mA)
        </span>

        <svg className="w-full h-full" viewBox="0 0 840 220">
          {/* ==================== 1. 欧姆刻度 (绿色) ==================== */}
          <path fill="none" stroke={colors.success[600]} strokeWidth={1.8} d={ohmArcPath} />
          {ohmTicks.map((t, idx) => (
            <g key={`ohm-${idx}`}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={colors.success[600]}
                strokeWidth={t.type === 'major' ? 1.5 : 1}
              />
              {t.label && (
                <text
                  x={t.tx}
                  y={t.ty + 3}
                  fill={t.label === '∞' || t.label === '0' || t.label === '1500' ? colors.success[600] : CANVAS_COLORS.labelText}
                  fontSize={t.label === '1500' ? font(11) : font(9)}
                  fontWeight={t.label === '1500' || t.label === '∞' ? 'bold' : 'normal'}
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}
          <text
            x={CX + R_ohm * Math.sin((52 * Math.PI) / 180) + 12}
            y={CY - R_ohm * Math.cos((52 * Math.PI) / 180) + 2}
            fill={colors.success[600]}
            fontSize={font(14)}
            fontWeight="bold"
            textAnchor="start"
          >
            Ω
          </text>

          {/* ==================== 2. 直流电压电流刻度 (黑色) ==================== */}
          <path fill="none" stroke={CANVAS_COLORS.labelText} strokeWidth={1.5} d={dcArcPath} />
          {dcTicks.map((t, idx) => (
            <g key={`dc-${idx}`}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={CANVAS_COLORS.labelText}
                strokeWidth={t.isMajor ? 1.2 : 0.8}
              />
              {t.label50 && (
                <text x={t.t1x} y={t.t1y + 2.5} fill={CANVAS_COLORS.labelText} fontSize={font(7.5)} textAnchor="middle">
                  {t.label50}
                </text>
              )}
              {t.label250 && (
                <text x={t.t2x} y={t.t2y + 2.5} fill={CANVAS_COLORS.labelTextLight} fontSize={font(7.5)} textAnchor="middle">
                  {t.label250}
                </text>
              )}
            </g>
          ))}
          <text
            x={CX - R_dc * Math.sin((52 * Math.PI) / 180) - 10}
            y={CY - R_dc * Math.cos((52 * Math.PI) / 180) + 2}
            fill={CANVAS_COLORS.labelText}
            fontSize={font(10)}
            fontWeight="bold"
            textAnchor="end"
          >
            DC V·A
          </text>

          {/* ==================== 3. 交流电压 10V 专用刻度 (红色) ==================== */}
          <path fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeRed} strokeWidth={1.2} d={acArcPath} />
          {acTicks.map((t, idx) => (
            <g key={`ac-${idx}`}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={ELECTRICAL_APPARATUS_COLORS.probeRed}
                strokeWidth={t.label ? 1.2 : 0.7}
              />
              {t.label && (
                <text x={t.tx} y={t.ty + 2} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} fontSize={font(7.5)} textAnchor="middle">
                  {t.label}
                </text>
              )}
            </g>
          ))}
          <text
            x={CX - R_ac * Math.sin((52 * Math.PI) / 180) - 10}
            y={CY - R_ac * Math.cos((52 * Math.PI) / 180) + 2}
            fill={ELECTRICAL_APPARATUS_COLORS.probeRed}
            fontSize={font(9)}
            fontWeight="bold"
            textAnchor="end"
          >
            AC 10V
          </text>

          {/* ==================== 4. 仪表标志和文字装饰 ==================== */}
          {/* 马蹄形磁铁和动圈微缩物理标志 */}
          <g transform="translate(0, -55)">
            {/* 磁铁 */}
            <path
              d="M 414,213 A 6 6 0 0 1 426,213 L 426,222 L 422,222 L 422,214 A 2 2 0 0 0 418,214 L 418,222 L 414,222 Z"
              fill={CANVAS_COLORS.trackHistoryAlt}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth="0.8"
            />
            {/* 线圈 */}
            <circle cx={420} cy={211} r={3} fill={CANVAS_COLORS.white} stroke={CANVAS_COLORS.strokeDark} strokeWidth="0.8" />
            {/* 线圈中横跨的斜线，表示指针 */}
            <line x1={416} y1={215} x2={424} y2={207} stroke={CIRCUIT_COLORS.meterNeedle} strokeWidth="0.8" />
            {/* 精度等级和直立标志 */}
            <text x={436} y={218} fill={CANVAS_COLORS.labelTextLight} fontSize={font(7)} textAnchor="start">
              2.5 ⊥
            </text>
          </g>

          <text
            x={CX}
            y={CY - 70}
            fill={withAlpha(colors.neutral[900], 0.08)}
            fontSize={font(15)}
            fontWeight="900"
            textAnchor="middle"
            letterSpacing="4"
            fontFamily="monospace"
          >
            MF-47 MULTIMETER
          </text>

          {/* ==================== 5. 亮红色金属指针 ==================== */}
          <g transform={`rotate(${pointerAngle}, ${CX}, ${CY})`}>
            {/* 细长红色指针针尖 */}
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - R_ohm - 10}
              stroke={CIRCUIT_COLORS.meterNeedle}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            {/* 指针配重尾部 */}
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY + 15}
              stroke={CIRCUIT_COLORS.meterNeedle}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>

          {/* 指针轴心圆盘，立体金属质感 */}
          <circle cx={CX} cy={CY} r={8} fill={colors.neutral[800]} />
          <circle cx={CX} cy={CY} r={5} fill={colors.neutral[700]} stroke={colors.neutral[500]} strokeWidth={1} />
          <circle cx={CX} cy={CY} r={2} fill={colors.neutral[400]} />
        </svg>
      </Card>
    </div>
  )
}

export default MultimeterCenterExtra
