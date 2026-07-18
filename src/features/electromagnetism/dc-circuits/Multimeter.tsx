import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateOhmmeter } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, ELECTRICAL_APPARATUS_COLORS, withAlpha } from '@/theme/physics'
import { DialMeter } from '@/components/Physics'
import { colors } from '@/theme/colors'

export default function Multimeter() {
  const params = useAnimationStore((s) => s.params)
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

  // 物理计算：短接调零时外部电阻视为 0
  const effectiveRx = opMode === 0 ? 0 : Rx
  const res = calculateOhmmeter(E, Rg, r, R_adjust, effectiveRx, multiplier, Ig)

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        {/* 调零成功高亮阴影 */}
        <filter id="glow-zero" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ==================== 1. 内部等效电路 (矩形框) ==================== */}
      <g>
        {/* 欧姆表内部虚线框（代表表壳） */}
        <rect
          x={140}
          y={110}
          width={400}
          height={150}
          rx={12}
          fill={withAlpha(colors.neutral[50], 0.25)}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        
        {/* 电路线框 (内部导线) */}
        {/* 左路：电池上下连线 */}
        <line x1={180} y1={110} x2={180} y2={155} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        <line x1={180} y1={205} x2={180} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        {/* 底路：连线至调零电阻 */}
        <line x1={180} y1={250} x2={320} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        <line x1={360} y1={250} x2={500} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        {/* 右路：连线至表头 */}
        <line x1={500} y1={250} x2={500} y2={212} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        <line x1={500} y1={148} x2={500} y2={110} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

        <text x={340} y={135} fill={PHYSICS_COLORS.labelText} fontSize={font(12)} fontWeight="bold" textAnchor="middle">
          欧姆表内部等效电路 (挡位: ×{multiplier})
        </text>

        {/* A. 内部干电池 (1.5V) */}
        <g transform="translate(180, 180)">
          {/* 正极：长细线 */}
          <line x1={-15} y1={-12} x2={15} y2={-12} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.5} />
          {/* 负极：短粗线 */}
          <line x1={-8} y1={12} x2={8} y2={12} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          {/* 内部连接线 */}
          <line x1={0} y1={-25} x2={0} y2={-12} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={0} y1={12} x2={0} y2={25} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          
          <text x={24} y={-2} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="start">
            E = 1.5V
          </text>
          <text x={24} y={10} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="start">
            r = 1Ω
          </text>
        </g>

        {/* B. 调零可变电阻 R_adjust */}
        <g transform="translate(340, 250)">
          <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
          <line x1={-15} y1={12} x2={15} y2={-12} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          <path d="M 10 -12 L 15 -12 L 15 -7" fill="none" stroke={PHYSICS_COLORS.labelText} strokeWidth={1.5} />
          <text x={0} y={-22} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">
            调零电阻 R_Ω
          </text>
          <text x={0} y={-11} fill={PHYSICS_COLORS.resistance} fontSize={font(9)} textAnchor="middle">
            {R_adjust.toFixed(0)} Ω
          </text>
        </g>

        {/* C. 敏感表头 G */}
        <g>
          <DialMeter type="A" value={res.I} max={Ig} x={500} y={180} r={32} font={font} />
          <circle cx={500} cy={180 + 21} r={9} fill={withAlpha(colors.neutral[100], 0.94)} />
          <text x={500} y={180 + 24} fontSize={font(11)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle">
            G
          </text>
          <text x={500} y={230} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
            Rg = 100Ω
          </text>
        </g>

        {/* D. 接线插孔 */}
        {/* 黑表笔插孔 (+) */}
        <g>
          <circle cx={180} cy={110} r={7} fill={colors.neutral[800]} stroke={colors.neutral[400]} strokeWidth={1.5} />
          <circle cx={180} cy={110} r={2} fill={colors.neutral[900]} />
          <text x={180} y={97} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
            + 插孔
          </text>
        </g>
        {/* 红表笔插孔 (-) */}
        <g>
          <circle cx={500} cy={110} r={7} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} stroke={withAlpha(ELECTRICAL_APPARATUS_COLORS.probeRed, 0.2)} strokeWidth={1.5} />
          <circle cx={500} cy={110} r={2} fill={colors.neutral[900]} />
          <text x={500} y={97} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
            - 插孔
          </text>
        </g>
      </g>

      {/* ==================== 2. 外部表笔与连线 ==================== */}
      {/* 黑表笔引线 (黑导线，从左侧插孔引出绕行到右侧黑表笔) */}
      {opMode === 0 ? (
        <path d="M 180 110 L 180 75 L 600 75 L 600 150" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeBlack} strokeWidth={2.5} />
      ) : (
        <path d="M 180 110 L 180 75 L 680 75 L 680 120" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeBlack} strokeWidth={2.5} />
      )}

      {/* 红表笔引线 (红导线，从右侧插孔引出绕行到右侧红表笔) */}
      {opMode === 0 ? (
        <path d="M 500 110 L 560 110 L 560 230 L 600 230" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeRed} strokeWidth={2.5} />
      ) : (
        <path d="M 500 110 L 560 110 L 560 240 L 600 240" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeRed} strokeWidth={2.5} />
      )}

      {/* 红表笔护套 */}
      {opMode === 0 ? (
        <g transform="translate(600, 210)">
          <rect x={-6} y={-20} width={12} height={40} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} rx={2} />
          <line x1={0} y1={-20} x2={0} y2={-32} stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
          <text x={18} y={4} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} fontSize={font(10)} fontWeight="bold">红表笔 (-)</text>
        </g>
      ) : (
        <g transform="translate(600, 220)">
          <rect x={-6} y={-20} width={12} height={40} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} rx={2} />
          <line x1={0} y1={-20} x2={0} y2={-40} stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
          <text x={18} y={4} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} fontSize={font(10)} fontWeight="bold">红表笔 (-)</text>
        </g>
      )}

      {/* 黑表笔护套 */}
      {opMode === 0 ? (
        <g transform="translate(600, 170)">
          <rect x={-6} y={-20} width={12} height={40} fill={ELECTRICAL_APPARATUS_COLORS.probeBlack} rx={2} />
          <line x1={0} y1={20} x2={0} y2={32} stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
          <text x={18} y={0} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold">黑表笔 (+)</text>
        </g>
      ) : (
        <g transform="translate(680, 140)">
          <rect x={-6} y={-20} width={12} height={40} fill={ELECTRICAL_APPARATUS_COLORS.probeBlack} rx={2} />
          <line x1={0} y1={20} x2={0} y2={40} stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
          <text x={18} y={0} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold">黑表笔 (+)</text>
        </g>
      )}

      {/* ==================== 3. 外部状态或待测电阻 ==================== */}
      {opMode === 0 ? (
        <g>
          <circle cx={600} cy={190} r={4} fill={PHYSICS_COLORS.referencePoint} filter="url(#glow-zero)" />
          <text x={600} y={135} fill={colors.success[600]} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            表笔已短接
          </text>
          {res.isZeroed ? (
            <text x={600} y={118} fill={colors.success[600]} fontSize={font(11)} fontWeight="bold" textAnchor="middle" filter="url(#glow-zero)">
              欧姆调零成功！
            </text>
          ) : (
            <text x={600} y={118} fill={colors.warning[500]} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
              请调节左侧电阻以调零
            </text>
          )}
        </g>
      ) : (
        <g>
          {/* Rx 外部连接线 */}
          <path d="M 600 180 L 620 180" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeRed} strokeWidth={2} />
          <path d="M 680 180 L 660 180" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.probeBlack} strokeWidth={2} />
          <g transform="translate(640, 180)">
            <rect x={-20} y={-10} width={40} height={20} fill={PHYSICS_COLORS.power} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={1.5} />
            <text x={0} y={3} fill={CANVAS_COLORS.white} fontSize={font(9)} fontWeight="bold" textAnchor="middle">Rx</text>
            <text x={0} y={23} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="middle">
              Rx = {Rx}Ω
            </text>
          </g>
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
