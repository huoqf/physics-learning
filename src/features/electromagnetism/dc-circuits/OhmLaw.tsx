import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateOhmLaw } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { LightBulb, DialMeter, DCSource } from '@/components/Physics'

export default function OhmLaw() {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 400 })
  const { font } = canvasSize

  const mode = params.mode ?? 0 // 0=定值电阻, 1=小灯泡
  const U = params.U ?? 2
  const R = params.R ?? 10
  const isBulb = mode === 1

  // 物理计算
  let I = 0
  let P = 0
  let R_eff = R

  if (!isBulb) {
    const res = calculateOhmLaw(U, R)
    I = res.I
    P = U * I
    R_eff = R
  } else {
    R_eff = 5 + 2 * U
    I = U / R_eff
    P = U * I
  }

  // 拓扑电路导线回路参数 (矩形: x从180到480, y从160到320)
  // 周长 = 300 + 160 + 300 + 160 = 920
  function getLoopPosition(pos: number): { x: number; y: number } {
    let p = pos % 920
    if (p < 0) p += 920

    // 段 1: 从正极连接线开始 (370, 320) -> (480, 320) [长度 110]
    if (p < 110) {
      return { x: 370 + p, y: 320 }
    }
    p -= 110

    // 段 2: 右侧竖直导线向上 (480, 320) -> (480, 160)，通过电流表 [长度 160]
    if (p < 160) {
      return { x: 480, y: 320 - p }
    }
    p -= 160

    // 段 3: 上方水平导线向左 (480, 160) -> (180, 160)，通过待测元件 [长度 300]
    if (p < 300) {
      return { x: 480 - p, y: 160 }
    }
    p -= 300

    // 段 4: 左侧竖直导线向下 (180, 160) -> (180, 320) [长度 160]
    if (p < 160) {
      return { x: 180, y: 160 + p }
    }
    p -= 160

    // 段 5: 下方水平导线向右回到负极 (180, 320) -> (290, 320) [长度 110]
    if (p < 110) {
      return { x: 180 + p, y: 320 }
    }
    p -= 110

    // 段 6: 电源内部泵送 (290, 320) -> (370, 320) [长度 80]
    return { x: 290 + p, y: 320 }
  }

  // 渲染微观电荷粒子 (流速与电流 I 呈正比)
  const numCharges = 22
  const chargeParticles = Array.from({ length: numCharges }, (_, idx) => {
    // 电流越大，移动速度越快。若 I = 0，则静止。
    const speedFactor = 150
    const pos = (idx * (920 / numCharges) + time * speedFactor * I) % 920
    return getLoopPosition(pos)
  })

  // 电阻色环定义
  const digitColors = [
    '#1C1917', // 0: 黑色
    '#78350F', // 1: 棕色
    PHYSICS_COLORS.positiveCharge, // 2: 红色 (Red-500)
    PHYSICS_COLORS.emf, // 3: 橙色 (Amber-600)
    PHYSICS_COLORS.equipotential, // 4: 黄色 (Amber-600)
    PHYSICS_COLORS.magneticField, // 5: 绿色 (Emerald-500)
    PHYSICS_COLORS.magnetSouth, // 6: 蓝色 (Blue-600)
    PHYSICS_COLORS.tension, // 7: 紫色 (Purple-500)
    '#4B5563', // 8: 灰色
    '#F3F4F6', // 9: 白色
  ]
  const firstDigit = Math.floor(R_eff / 10)
  const secondDigit = Math.round(R_eff) % 10
  const band1Color = digitColors[Math.min(9, Math.max(0, firstDigit))]
  const band2Color = digitColors[Math.min(9, Math.max(0, secondDigit))]
  const band3Color = '#1C1917' // 乘数 10^0 = 1 (黑色)
  const band4Color = '#D4AF37' // 误差 5% (金色)

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-2">
      <svg
        viewBox="0 0 650 400"
        className="w-full h-full bg-white rounded-xl shadow-inner border border-neutral-100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>

          {/* 表盘金属圈渐变 */}
          <linearGradient id="dial-ring" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.neutral[400]} />
            <stop offset="100%" stopColor={colors.neutral[600]} />
          </linearGradient>
        </defs>

        {/* ==================== 1. 导线与并联节点 ==================== */}
        {/* 闭合回路导线底色线 */}
        <rect
          x={180}
          y={160}
          width={300}
          height={160}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 内部铜芯线 */}
        <rect
          x={180}
          y={160}
          width={300}
          height={160}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 电压表并联支路导线 */}
        <path
          d="M 240 160 L 240 70 L 330 70"
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={3}
        />
        <path
          d="M 420 160 L 420 70 L 330 70"
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={3}
        />
        
        {/* 并联分流节点 */}
        <circle cx={240} cy={160} r={4.5} fill={PHYSICS_COLORS.labelText} />
        <circle cx={420} cy={160} r={4.5} fill={PHYSICS_COLORS.labelText} />

        {/* ==================== 2. 微观电荷流动动画 ==================== */}
        {/* 只在主回路上流动，电压表支路电阻无穷大，没有流动电荷（极佳教学隐喻） */}
        {chargeParticles.map((pt, idx) => (
          <circle
            key={`charge-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={3.5}
            fill={PHYSICS_COLORS.electricCurrent}
            className="transition-transform duration-100"
            style={{
              filter: `drop-shadow(0px 0px 1.5px ${PHYSICS_COLORS.electricCurrent})`
            }}
          />
        ))}

        {/* ==================== 3. 直流稳压电源 ==================== */}
        <DCSource type="instrument" x={330} y={320} voltage={U} polarity="right-positive" />

        {/* ==================== 4. 待测元件区域 ==================== */}
        {!isBulb ? (
          /* ----- A. 定值电阻元件 ----- */
          <g transform="translate(330, 160)">
            {/* 色环电阻陶瓷本体 */}
            <rect
              x={-24}
              y={-10}
              width={48}
              height={20}
              rx={6}
              fill={colors.neutral[200]}
              stroke={colors.neutral[500]}
              strokeWidth={1.5}
            />
            {/* 电阻两端金属帽 */}
            <path
              d="M -24 -10 L -18 -10 L -18 10 L -24 10 Z"
              fill={colors.neutral[400]}
            />
            <path
              d="M 24 -10 L 18 -10 L 18 10 L 24 10 Z"
              fill={colors.neutral[400]}
            />
            
            {/* 动态色环 1 */}
            <rect x={-14} y={-10} width={4} height={20} fill={band1Color} />
            {/* 动态色环 2 */}
            <rect x={-6} y={-10} width={4} height={20} fill={band2Color} />
            {/* 动态色环 3 (倍率) */}
            <rect x={2} y={-10} width={4} height={20} fill={band3Color} />
            {/* 动态色环 4 (误差环-金色) */}
            <rect x={11} y={-10} width={4} height={20} fill={band4Color} />

            {/* 文字标签 */}
            <text x={0} y={24} fill={colors.neutral[600]} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
              定值电阻 R
            </text>
          </g>
        ) : (
          /* ----- B. 小灯泡元件 ----- */
          <LightBulb x={330} y={160} power={P} time={time} />
        )}

        {/* ==================== 5. 理想表盘组件 ==================== */}
        <DialMeter type="V" value={U} max={10} x={330} y={70} />
        <DialMeter type="A" value={I} max={2} x={480} y={240} />
      </svg>
    </div>
  )
}
