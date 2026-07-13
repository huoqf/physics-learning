import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateOhmmeter } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { DialMeter } from '@/components/Physics'
import { colors } from '@/theme/colors'

export default function Multimeter() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const opMode = params.opMode ?? 0 // 0=短接调零, 1=阻值测量
  const multiplier = params.multiplier ?? 1
  const R_adjust = params.R_adjust ?? 199
  const Rx = params.Rx ?? 1500
  const E = 1.5
  const Rg = 100
  const r = 1
  const Ig = 0.001

  // 物理计算
  const res = calculateOhmmeter(E, Rg, r, R_adjust, Rx, multiplier, Ig)

  // 粒子流动动画控制
  const particleSpeed = res.I * 8000
  const particleOffset = (time * particleSpeed) % 40

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        {/* 调零表盘高亮投影 */}
        <filter id="glow-zero" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 整个电路框架 */}
      <g>
        {/* 欧姆表内部虚线框（代表表壳） */}
        <rect x={100} y={35} width={440} height={250} rx={12} fill={withAlpha(colors.neutral[50], 0.3)} stroke={PHYSICS_COLORS.axis} strokeWidth={2} strokeDasharray="6,4" />
        <text x={320} y={58} fill={PHYSICS_COLORS.labelText} fontSize={font(12)} fontWeight="bold" textAnchor="middle">
          欧姆表内部等效电路 (挡位: ×{multiplier})
        </text>

        {/* ==================== 1. 欧姆表内部元件 ==================== */}
        {/* A. 内部干电池 (1.5V) */}
        <g transform="translate(180, 220)">
          <line x1={-30} y1={0} x2={10} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={20} y1={0} x2={50} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={10} y1={-12} x2={10} y2={12} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          <line x1={20} y1={-20} x2={20} y2={20} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.5} />
          <text x={0} y={-24} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle">E = 1.5V (r = 1Ω)</text>
        </g>

        {/* B. 调零可变电阻 R_adjust */}
        <g transform="translate(320, 220)">
          <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
          <line x1={-15} y1={12} x2={15} y2={-12} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          <path d="M 10 -12 L 15 -12 L 15 -7" fill="none" stroke={PHYSICS_COLORS.labelText} strokeWidth={1.5} />
          <text x={0} y={-24} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle">R_Ω = {R_adjust.toFixed(0)} Ω</text>
        </g>

        {/* C. 敏感表头 G */}
        <g>
          <DialMeter type="A" value={res.I} max={Ig} x={450} y={150} r={32} font={font} />
          <circle cx={450} cy={150 + 21} r={9} fill={withAlpha(colors.neutral[100], 0.94)} />
          <text x={450} y={150 + 24} fontSize={font(11)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle">G</text>
          <text x={450} y={202} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">Rg = 100Ω</text>
        </g>

        {/* 内部连接导线 */}
        <path d="M 140 220 L 150 220" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        <path d="M 230 220 L 300 220" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        <path d="M 340 220 L 450 220 L 450 182" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        <path d="M 450 118 L 450 90 L 140 90 L 140 220" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

        {/* ==================== 2. 表笔引出端 ==================== */}
        <path d="M 140 180 L 80 180 L 80 280 L 600 280 L 600 250" fill="none" stroke="#ef4444" strokeWidth={2.5} />
        <path d="M 140 90 L 680 90 L 680 130" fill="none" stroke="#1e293b" strokeWidth={2.5} />

        {/* 红表笔护套 */}
        <g transform="translate(600, 220)">
          <rect x={-6} y={-20} width={12} height={40} fill="#ef4444" rx={2} />
          <line x1={0} y1={-20} x2={0} y2={-32} stroke="#cbd5e1" strokeWidth={2.5} />
          <text x={18} y={4} fill="#ef4444" fontSize={font(10)} fontWeight="bold">红表笔 (-)</text>
        </g>

        {/* 黑表笔护套 */}
        {opMode === 0 ? (
          <g transform="translate(600, 180)">
            <rect x={-6} y={-20} width={12} height={40} fill="#1e293b" rx={2} />
            <line x1={0} y1={20} x2={0} y2={32} stroke="#cbd5e1" strokeWidth={2.5} />
            <text x={18} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold">黑表笔 (+)</text>
          </g>
        ) : (
          <g transform="translate(680, 150)">
            <rect x={-6} y={-20} width={12} height={40} fill="#1e293b" rx={2} />
            <line x1={0} y1={20} x2={0} y2={32} stroke="#cbd5e1" strokeWidth={2.5} />
            <text x={15} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold">黑表笔 (+)</text>
          </g>
        )}

        {/* ==================== 3. 外部连接 ==================== */}
        {opMode === 0 ? (
          <g>
            <circle cx={600} cy={188} r={3} fill="#ffb703" filter="url(#glow-zero)" />
            <text x={600} y={150} fill="#22c55e" fontSize={font(10)} fontWeight="bold" textAnchor="middle">已短接</text>
            {res.isZeroed && (
              <text x={600} y={135} fill="#22c55e" fontSize={font(10)} fontWeight="bold" textAnchor="middle" filter="url(#glow-zero)">调零成功！</text>
            )}
          </g>
        ) : (
          <g>
            <path d="M 600 188 L 600 170 L 620 170" fill="none" stroke="#ef4444" strokeWidth={2} />
            <path d="M 680 182 L 680 170 L 660 170" fill="none" stroke="#1e293b" strokeWidth={2} />
            <g transform="translate(640, 170)">
              <rect x={-16} y={-8} width={32} height={16} fill="#f59e0b" stroke="#d97706" strokeWidth={1.5} />
              <text x={0} y={3} fill="#fff" fontSize={font(8)} fontWeight="bold" textAnchor="middle">Rx</text>
              <text x={0} y={23} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="middle">Rx = {Rx}Ω</text>
            </g>
          </g>
        )}

        {/* ==================== 4. 电荷粒子循环流动 ==================== */}
        {res.I > 0.00005 && (
          <g>
            {[0, 80, 160, 240, 320, 400, 480, 560, 640].map((baseOffset) => {
              const curPos = (baseOffset + particleOffset) % 800
              let px = 140, py = 90
              if (curPos < 310) {
                px = 140 + curPos
                py = 90
              } else if (curPos < 310 + 130) {
                px = 450
                py = 90 + (curPos - 310)
              } else if (curPos < 310 + 130 + 310) {
                px = 450 - (curPos - 310 - 130)
                py = 220
              } else {
                px = 140
                py = 220 - (curPos - 310 - 130 - 310)
              }
              if (Math.abs(px - 180) < 30 && py === 220) return null
              if (Math.abs(px - 320) < 25 && py === 220) return null
              if (px === 450 && Math.abs(py - 150) < 35) return null

              return (
                <circle key={baseOffset} cx={px} cy={py} r={3} fill="#22c55e" style={{ filter: 'drop-shadow(0px 0px 1px #22c55e)' }} />
              )
            })}
          </g>
        )}
      </g>
    </AnimationSvgCanvas>
  )
}
