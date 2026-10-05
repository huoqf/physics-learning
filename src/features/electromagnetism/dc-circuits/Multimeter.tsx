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

      {/* ==================== 1. 内部等效电路 (欧姆表外壳) ==================== */}
      <g>
        {/* 欧姆表内部虚线框（代表表壳） */}
        <rect
          x={110}
          y={80}
          width={420}
          height={185}
          rx={12}
          fill={withAlpha(colors.neutral[50], 0.35)}
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth={1.8}
          strokeDasharray="6,4"
        />
        
        {/* 表头标题 */}
        <text x={320} y={105} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold" textAnchor="middle">
          欧姆表内部等效电路 (挡位: ×{multiplier})
        </text>

        {/* 内部主回路导线 (2.5px 标准墨线) */}
        {/* 左路：负插孔 -> 电池正极 (160, 80) -> (160, 145) */}
        <line x1={160} y1={80} x2={160} y2={145} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        {/* 左路：电池负极 -> 左下角 (160, 195) -> (160, 240) */}
        <line x1={160} y1={195} x2={160} y2={240} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        {/* 底路：左下角 -> 调零电阻 -> 右下角 */}
        <line x1={160} y1={240} x2={285} y2={240} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        <line x1={335} y1={240} x2={470} y2={240} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        {/* 右路：右下角 -> 表头底端 (470, 240) -> (470, 205) */}
        <line x1={470} y1={240} x2={470} y2={205} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        {/* 右路：表头顶端 -> 正插孔 (470, 135) -> (470, 80) */}
        <line x1={470} y1={135} x2={470} y2={80} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />

        {/* A. 内部干电池 (1.5V)：正极朝上连负插孔(高考核心考点！) */}
        <g transform="translate(160, 170)">
          {/* 正极：长细红线 (上) */}
          <line x1={-16} y1={-12} x2={16} y2={-12} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.5} />
          <text x={20} y={-10} fill={SCENE_COLORS.circuit.batteryPos} fontSize={font(10)} fontWeight="bold">+</text>
          {/* 负极：短粗黑线 (下) */}
          <line x1={-9} y1={12} x2={9} y2={12} stroke={CANVAS_COLORS.labelText} strokeWidth={4.5} />
          <text x={16} y={15} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold">-</text>
          {/* 内部极板连接柱 */}
          <line x1={0} y1={-25} x2={0} y2={-12} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          <line x1={0} y1={12} x2={0} y2={25} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          
          <text x={-24} y={-2} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="end">
            E = 1.5V
          </text>
          <text x={-24} y={12} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="end">
            r = 1.0Ω
          </text>
        </g>

        {/* B. 调零可变电阻 R_adjust */}
        <g transform="translate(310, 240)">
          <rect x={-25} y={-10} width={50} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
          {/* 调节箭头斜穿 */}
          <line x1={-18} y1={14} x2={18} y2={-14} stroke={PHYSICS_COLORS.alertRed} strokeWidth={1.8} />
          <polygon
            points="18,-14 12,-16 15,-10"
            fill={PHYSICS_COLORS.alertRed}
          />
          <text x={0} y={-16} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">
            调零电阻 R_Ω
          </text>
          <text x={0} y={24} fill={PHYSICS_COLORS.resistance} fontSize={font(10)} textAnchor="middle" fontWeight="bold">
            {R_adjust.toFixed(0)} Ω
          </text>
        </g>

        {/* C. 灵敏电流表头 G */}
        <g>
          <DialMeter type="A" value={res.I} max={Ig} x={470} y={170} r={32} font={font} />
          <circle cx={470} cy={170 + 21} r={9} fill={withAlpha(colors.neutral[100], 0.94)} />
          <text x={470} y={170 + 24} fontSize={font(11)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle">
            G
          </text>
          <text x={470} y={218} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
            Rg = 100Ω
          </text>
        </g>

        {/* D. 接线插孔（高考核心规范：红正黑负，内部电源正极接负插孔） */}
        {/* 左侧：负插孔 (-) 黑色，接黑表笔 */}
        <g>
          <circle cx={160} cy={80} r={7} fill={CANVAS_COLORS.labelText} stroke={colors.neutral[400]} strokeWidth={1.5} />
          <circle cx={160} cy={80} r={2.5} fill={CANVAS_COLORS.white} />
          {/* 文字放置在插孔正下方内部，彻底避开上方引线 */}
          <text x={160} y={100} fill={CANVAS_COLORS.labelText} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">
            － 插孔 (黑)
          </text>
          <text x={160} y={114} fill={colors.neutral[500]} fontSize={font(8.5)} textAnchor="middle">
            内接电源正极
          </text>
        </g>
        {/* 右侧：正插孔 (+) 红色，接红表笔 */}
        <g>
          <circle cx={470} cy={80} r={7} fill={PHYSICS_COLORS.alertRed} stroke={colors.neutral[400]} strokeWidth={1.5} />
          <circle cx={470} cy={80} r={2.5} fill={CANVAS_COLORS.white} />
          {/* 文字放置在插孔正下方内部，彻底避开上方引线 */}
          <text x={470} y={100} fill={PHYSICS_COLORS.alertRed} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">
            ＋ 插孔 (红)
          </text>
          <text x={470} y={114} fill={colors.neutral[500]} fontSize={font(8.5)} textAnchor="middle">
            内接表头正端
          </text>
        </g>
      </g>

      {/* ==================== 2. 外部表笔与外电路 (彻底杜绝穿心) ==================== */}
      {/* 黑表笔高空导线：从负插孔 (160, 80) -> 上升至 y=40 -> 水平拉伸至右侧 -> 下折进黑表笔 */}
      {opMode === 0 ? (
        /* 短接模式：黑表笔从上向下，红表笔从下向上相抵在 (660, 170) */
        <>
          {/* 黑表笔外引线 (黑色) */}
          <path
            d="M 160 80 L 160 38 L 660 38 L 660 100"
            fill="none"
            stroke={ELECTRICAL_APPARATUS_COLORS.probeBlack}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 红表笔外引线 (红色) */}
          <path
            d="M 470 80 L 470 290 L 660 290 L 660 235"
            fill="none"
            stroke={ELECTRICAL_APPARATUS_COLORS.probeRed}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 上方黑表笔 */}
          <g transform="translate(660, 120)">
            <rect x={-6} y={-20} width={12} height={38} fill={ELECTRICAL_APPARATUS_COLORS.probeBlack} rx={2} />
            <line x1={0} y1={18} x2={0} y2={45} stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
            <text x={-14} y={-4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="end">
              黑表笔 (－)
            </text>
          </g>

          {/* 下方红表笔 */}
          <g transform="translate(660, 215)">
            <rect x={-6} y={-18} width={12} height={38} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} rx={2} />
            <line x1={0} y1={-18} x2={0} y2={-45} stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
            <text x={-14} y={10} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} fontSize={font(10)} fontWeight="bold" textAnchor="end">
              红表笔 (＋)
            </text>
          </g>

          {/* 表笔金黄色接触点 */}
          <circle cx={660} cy={168} r={4.5} fill={PHYSICS_COLORS.referencePoint} filter="url(#glow-zero)" />

          {/* 状态与教学提示独立区域（彻底避开任何导线） */}
          <g transform="translate(710, 145)">
            <rect
              x={0}
              y={-15}
              width={115}
              height={55}
              rx={6}
              fill={res.isZeroed ? withAlpha(colors.success[50], 0.9) : withAlpha(colors.warning[50], 0.9)}
              stroke={res.isZeroed ? colors.success[400] : colors.warning[400]}
              strokeWidth={1.5}
            />
            <text x={57.5} y={5} fill={colors.neutral[800]} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">
              表笔已短接
            </text>
            {res.isZeroed ? (
              <text x={57.5} y={25} fill={colors.success[600]} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">
                ✓ 欧姆调零成功
              </text>
            ) : (
              <text x={57.5} y={25} fill={colors.warning[600]} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
                未满偏，请调R_Ω
              </text>
            )}
          </g>
        </>
      ) : (
        /* 测量模式：黑表笔抵在 Rx 左端，红表笔抵在 Rx 右端，整体右移拉开呼吸感 */
        <>
          {/* 黑表笔外引线 (黑色) */}
          <path
            d="M 160 80 L 160 38 L 610 38 L 610 120"
            fill="none"
            stroke={ELECTRICAL_APPARATUS_COLORS.probeBlack}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 红表笔外引线 (红色) */}
          <path
            d="M 470 80 L 470 290 L 760 290 L 760 215"
            fill="none"
            stroke={ELECTRICAL_APPARATUS_COLORS.probeRed}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 左侧黑表笔 (探头向右下) */}
          <g transform="translate(610, 140)">
            <rect x={-6} y={-20} width={12} height={38} fill={ELECTRICAL_APPARATUS_COLORS.probeBlack} rx={2} />
            {/* 金属针弯向 Rx 左端 */}
            <path d="M 0 18 L 0 30 L 40 30" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
            <text x={-14} y={0} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="end">
              黑表笔 (－)
            </text>
          </g>

          {/* 右侧红表笔 (探头向左上) */}
          <g transform="translate(760, 195)">
            <rect x={-6} y={-18} width={12} height={38} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} rx={2} />
            {/* 金属针弯向 Rx 右端 */}
            <path d="M 0 -18 L 0 -25 L -40 -25" fill="none" stroke={ELECTRICAL_APPARATUS_COLORS.terminalCore} strokeWidth={2.5} />
            <text x={14} y={5} fill={ELECTRICAL_APPARATUS_COLORS.probeRed} fontSize={font(10)} fontWeight="bold" textAnchor="start">
              红表笔 (＋)
            </text>
          </g>

          {/* 中间待测电阻 Rx */}
          <g transform="translate(685, 170)">
            {/* 端子小圆点 */}
            <circle cx={-32} cy={0} r={2.5} fill={SCENE_COLORS.circuit.wire} />
            <circle cx={32} cy={0} r={2.5} fill={SCENE_COLORS.circuit.wire} />
            <line x1={-32} y1={0} x2={-22} y2={0} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
            <line x1={22} y1={0} x2={32} y2={0} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
            <rect x={-22} y={-10} width={44} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
            <text x={0} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
              Rx
            </text>
            <text x={0} y={26} fill={PHYSICS_COLORS.resistance} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">
              Rx = {Rx} Ω
            </text>
          </g>
        </>
      )}
    </AnimationSvgCanvas>
  )
}
