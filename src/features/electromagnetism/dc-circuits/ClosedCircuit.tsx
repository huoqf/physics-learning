import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { DialMeter, Rheostat } from '@/components/Physics'

/**
 * 闭合电路欧姆定律核心电路动画
 * 元素：1. 真实电源（虚线框、电池、内阻）、2. 滑动变阻器（游标联动）、3. 电流表、4. 电压表（路端并联）
 */
export default function ClosedCircuit() {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const { font } = canvasSize

  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10
  const highlightLoss = (params.highlightLoss ?? 0) === 1

  const { I, U_terminal } = calculateClosedCircuit(EMF, r, R)

  // 1. 回路矩形顶点参数定义 (矩形: x从150到550, y从120到320)
  // 周长 = 100(正极向右) + 200(向右向上) + 400(向左) + 200(向下) + 100(向右连负极) + 200(内电路泵送) = 1200
  function getLoopPosition(pos: number): { x: number; y: number } {
    let p = pos % 1200
    if (p < 0) p += 1200

    // 段 1: 电源右端正极向右到右下角 (450, 320) -> (550, 320) [长度 100]
    if (p < 100) {
      return { x: 450 + p, y: 320 }
    }
    p -= 100

    // 段 2: 右下角向上到右上角 (550, 320) -> (550, 120) [长度 200]
    if (p < 200) {
      return { x: 550, y: 320 - p }
    }
    p -= 200

    // 段 3: 右上角向左到左上角 (550, 120) -> (150, 120) [长度 400]
    if (p < 400) {
      return { x: 550 - p, y: 120 }
    }
    p -= 400

    // 段 4: 左上角向下到左下角 (150, 120) -> (150, 320) [长度 200]
    if (p < 200) {
      return { x: 150, y: 120 + p }
    }
    p -= 200

    // 段 5: 左下角到电源左端负极 (150, 320) -> (250, 320) [长度 100]
    if (p < 100) {
      return { x: 150 + p, y: 320 }
    }
    p -= 100

    // 段 6: 电源内部泵送 (250, 320) -> (450, 320) [长度 200]
    return { x: 250 + p, y: 320 }
  }

  // 2. 渲染微观电荷粒子 (流速与电流 I 呈正比)
  const numCharges = 26
  const chargeParticles = Array.from({ length: numCharges }, (_, idx) => {
    // 电荷在回路中循环移动。流速乘以 speedFactor。
    const speedFactor = 120
    const pos = (idx * (1200 / numCharges) + time * speedFactor * I) % 1200
    return getLoopPosition(pos)
  })



  // 4. 内阻发热红光高亮的实时透明度 (随电流 I 的大小变强)
  // 当 I = 6A (最大可能) 时，透明度可接近 0.75
  const heatOpacity = highlightLoss ? Math.min(0.75, I * 0.15) : 0

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-2">
      <svg
        viewBox="0 0 700 420"
        className="w-full h-full bg-white rounded-xl shadow-inner border border-neutral-150"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 电源外壳金属质感渐变 */}
          <linearGradient id="battery-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={CANVAS_COLORS.labelTextLight} />
            <stop offset="100%" stopColor={CANVAS_COLORS.labelText} />
          </linearGradient>

          {/* 内阻发热暗红色系渐变 */}
          <radialGradient id="heat-grad" cx="70%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="1" />
            <stop offset="70%" stopColor="#7F1D1D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
          </radialGradient>


        </defs>

        {/* ==================== 1. 主回路导线与并联引线 ==================== */}
        {/* 并联电压表导线 */}
        <path
          d="M 180 320 L 180 210 L 318 210"
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M 520 320 L 520 210 L 382 210"
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* 主回路导线底槽 */}
        <rect
          x={150}
          y={120}
          width={400}
          height={200}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 主回路铜芯导线 */}
        <rect
          x={150}
          y={120}
          width={400}
          height={200}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 并联节点圆点 */}
        <circle cx={180} cy={320} r={4.5} fill={PHYSICS_COLORS.labelText} />
        <circle cx={520} cy={320} r={4.5} fill={PHYSICS_COLORS.labelText} />

        {/* ==================== 2. 微观电荷流动动画 ==================== */}
        {/* 主回路上流动的带电粒子，流速与电流成正比，电压表并联支路无粒子流动 */}
        {chargeParticles.map((pt, idx) => (
          <circle
            key={`charge-cc-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={3.8}
            fill={PHYSICS_COLORS.electricCurrent}
            style={{
              filter: `drop-shadow(0px 0px 2px ${PHYSICS_COLORS.electricCurrent})`,
            }}
          />
        ))}

        {/* ==================== 3. 理想电压表与电流表 ==================== */}
        {/* 路端电压表 V (悬浮并联在电源两端) */}
        <DialMeter type="V" value={U_terminal} max={8} x={350} y={210} r={32} />

        {/* 干路电流表 A (串联在右侧干路) */}
        <DialMeter type="A" value={I} max={8} x={550} y={220} r={32} />

        {/* ==================== 4. 滑动变阻器元件 R ==================== */}
        <Rheostat x={350} y={120} value={R} min={0.1} max={20} label="滑动变阻器 R" />

        {/* ==================== 5. 真实电源区域 (虚线框内) ==================== */}
        {/* 真实电源外部虚线外框 */}
        <rect
          x={240}
          y={280}
          width={220}
          height={80}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray="4,4"
          rx={6}
        />
        <text
          x={350}
          y={273}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
        >
          真实电源 (电动势 E, 内阻 r)
        </text>

        {/* 热焦耳损耗视觉高亮遮罩层 (暗红色系渐变，随着电流 I 的平方发热量加深) */}
        <rect
          x={241.5}
          y={281.5}
          width={217}
          height={77}
          rx={5}
          fill="url(#heat-grad)"
          opacity={heatOpacity}
          style={{ transition: 'opacity 0.2s ease-out' }}
          pointerEvents="none"
        />

        {/* A. 理想电源部分 (化学能泵送) */}
        <g transform="translate(255, 320)">
          {/* 接线端连线 */}
          <line x1={-5} y1={0} x2={20} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={30} y1={0} x2={55} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

          {/* 负极片 (短粗) */}
          <line x1={20} y1={-10} x2={20} y2={10} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          {/* 正极片 (长细) */}
          <line x1={30} y1={-18} x2={30} y2={18} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.2} />

          {/* 理想电源标签 */}
          <text x={25} y={-23} fill={PHYSICS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            E = {EMF} V
          </text>
        </g>

        {/* 内部过渡导线 */}
        <line x1={310} y1={320} x2={370} y2={320} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

        {/* B. 内阻部分 r */}
        <g transform="translate(370, 320)">
          {/* 电阻器符号 (高考标准矩形框) */}
          <rect
            x={0}
            y={-9}
            width={36}
            height={18}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={2}
          />
          {/* 阻值字母标注 */}
          <text x={18} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
            r
          </text>
          
          {/* 连接回主干路 */}
          <line x1={36} y1={0} x2={80} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

          {/* 内阻标签 */}
          <text x={18} y={-14} fill={PHYSICS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            r = {r.toFixed(1)} Ω
          </text>
        </g>
      </svg>
    </div>
  )
}
