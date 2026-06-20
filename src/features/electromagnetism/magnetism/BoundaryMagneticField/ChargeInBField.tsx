import { useAnimationStore } from '@/stores'
import { SimulationView } from './SimulationView'
import { useCanvasSize } from '@/utils'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS } from '@/theme/physics'


export default function ChargeInBField() {
    const params = useAnimationStore((s) => s.params)
  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const [sizeRef, size] = useCanvasSize({ width: 800, height: 600 })

  const isWide = size.width > size.height * 1.1

  // 基础模式需要两栏（Canvas + VTChart）
  // 根据显示区域宽高比，动态决定左右横排还是上下竖排
  if (mode === 0) {
    return (
      <div ref={sizeRef} className={`w-full h-full flex overflow-hidden ${isWide ? 'flex-row' : 'flex-col'}`}>
        <div className="flex-1 relative min-w-0 min-h-0 border-neutral-200" style={{ borderRightWidth: isWide ? 1 : 0, borderBottomWidth: isWide ? 0 : 1 }}>
          <SimulationView />
        </div>
        <div className={`relative bg-white flex flex-col p-4 shrink-0 min-w-0 min-h-0 ${isWide ? 'w-80 h-full' : 'w-full h-64'}`}>
          <h3 className="text-sm font-bold text-neutral-700 mb-2">时间-速度 (t-v) 图像</h3>
          <div className="flex-1 min-h-0 relative">
            <VelocityChart />
          </div>
          <div className="mt-4 text-xs text-neutral-500">
            粒子在匀强磁场中受到的洛伦兹力始终与速度方向垂直，洛伦兹力不做功，只改变速度方向，不改变速度大小。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={sizeRef} className="w-full h-full relative min-w-0 min-h-0">
      <SimulationView />
    </div>
  )
}

function VelocityChart() {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 10
  const B = params.B ?? 1

  // 基础模式强制 θ = 90
  const thetaRad = Math.PI / 2

  const sign = (q * B) >= 0 ? -1 : 1
  const omega = Math.abs((q * B) / m)

  // 磁场内运动圆心角和时间
  const deltaPhi = sign === 1 ? 2 * (Math.PI - thetaRad) : 2 * thetaRad
  const tOut = deltaPhi / omega

  // 映射大循环周期时间
  const tSlideIn = 0.5 * tOut
  const tSlideOut = 1.0 * tOut
  const tCycle = tSlideIn + tOut + tSlideOut

  const progressTime = time > 0 ? (time % tCycle) - tSlideIn : -tSlideIn

  const [sizeRef, canvasSize] = useCanvasSize({ width: 200, height: 180 })

  const cw = canvasSize.width
  const ch = canvasSize.height
  const paddingLeft = 45
  const paddingRight = 15
  const paddingTop = 20
  const paddingBottom = 25

  // 映射函数：物理时间映射到 SVG 的 X 坐标
  const getSvgX = (tVal: number) => {
    const fraction = (tVal - (-tSlideIn)) / tCycle
    return paddingLeft + fraction * (cw - paddingLeft - paddingRight)
  }

  // 映射函数：物理速度大小映射到 SVG 的 Y 坐标 (自适应范围 [0, v*1.35])
  const vScale = v * 1.35
  const getSvgY = (val: number) => {
    const chartHeight = ch - paddingTop - paddingBottom
    return (ch - paddingBottom) - (val / vScale) * chartHeight
  }

  const currentSvgX = getSvgX(progressTime)
  const yV = getSvgY(v)
  const zeroY = ch - paddingBottom

  const inBFieldStart = getSvgX(0)
  const inBFieldEnd = getSvgX(tOut)

  return (
    <div ref={sizeRef} className="w-full h-full relative bg-neutral-50 rounded-lg border border-neutral-100 flex flex-col p-2 min-w-0 min-h-0">
      {/* 图例 */}
      <div className="flex gap-4 text-xs justify-end pr-2 mb-1 shrink-0">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-blue-500 inline-block"></span>
          <span className="text-neutral-500 font-medium">速度大小 v (恒定)</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {cw > 0 && ch > 0 && (
          <svg width={cw} height={ch} className="absolute top-0 left-0">
            {/* 磁场时宽半透明高亮色块 (从 t=0 到 t=tOut，y 从 yV 到 zeroY) */}
            <rect
              x={inBFieldStart}
              y={yV}
              width={inBFieldEnd - inBFieldStart}
              height={zeroY - yV}
              fill="#3B82F614"
              stroke="#3B82F622"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* 色块内包装的教学辅助文字 */}
            {inBFieldEnd - inBFieldStart > 50 && (
              <text
                x={(inBFieldStart + inBFieldEnd) / 2}
                y={(yV + zeroY) / 2 + 3}
                fontSize="9"
                fill="#3B82F699"
                textAnchor="middle"
                fontWeight="500"
              >
                磁场偏转 (v恒定)
              </text>
            )}

            {/* 射入/射出时间轴分界刻度文字 */}
            <line
              x1={inBFieldStart}
              y1={yV}
              x2={inBFieldStart}
              y2={zeroY}
              stroke={colors.neutral[200]}
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <text x={inBFieldStart} y={ch - paddingBottom + 12} fontSize="9" fill={colors.neutral[400]} textAnchor="middle">
              射入
            </text>

            <line
              x1={inBFieldEnd}
              y1={yV}
              x2={inBFieldEnd}
              y2={zeroY}
              stroke={colors.neutral[200]}
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <text x={inBFieldEnd} y={ch - paddingBottom + 12} fontSize="9" fill={colors.neutral[400]} textAnchor="middle">
              射出
            </text>

            {/* 时宽双向指示箭头 */}
            <g>
              <line
                x1={inBFieldStart + 4}
                y1={ch - paddingBottom - 12}
                x2={inBFieldEnd - 4}
                y2={ch - paddingBottom - 12}
                stroke={colors.neutral[500]}
                strokeWidth="1"
              />
              <polygon points={`${inBFieldStart + 5},${ch - paddingBottom - 14} ${inBFieldStart},${ch - paddingBottom - 12} ${inBFieldStart + 5},${ch - paddingBottom - 10}`} fill={colors.neutral[500]} />
              <polygon points={`${inBFieldEnd - 5},${ch - paddingBottom - 14} ${inBFieldEnd},${ch - paddingBottom - 12} ${inBFieldEnd - 5},${ch - paddingBottom - 10}`} fill={colors.neutral[500]} />
              <text x={(inBFieldStart + inBFieldEnd) / 2} y={ch - paddingBottom - 16} fontSize="8" fill={colors.neutral[500]} textAnchor="middle" fontWeight="bold">
                时宽 Δt = {tOut.toFixed(2)}s
              </text>
            </g>

            {/* 坐标轴 */}
            {/* 时间 t 轴 */}
            <line
              x1={paddingLeft}
              y1={zeroY}
              x2={cw - 8}
              y2={zeroY}
              stroke={colors.neutral[500]}
              strokeWidth="1.5"
            />
            {/* 速度 v 轴 */}
            <line
              x1={paddingLeft}
              y1={paddingTop - 5}
              x2={paddingLeft}
              y2={zeroY}
              stroke={colors.neutral[500]}
              strokeWidth="1.5"
            />

            {/* 轴箭头 */}
            <polygon
              points={`${cw - 8},${zeroY - 3} ${cw},${zeroY} ${cw - 8},${zeroY + 3}`}
              fill={colors.neutral[500]}
            />
            <polygon
              points={`${paddingLeft - 3},${paddingTop - 3} ${paddingLeft},${paddingTop - 10} ${paddingLeft + 3},${paddingTop - 3}`}
              fill={colors.neutral[500]}
            />

            {/* 轴标签 */}
            <text x={cw - 12} y={zeroY + 15} fontSize="9" fill={colors.neutral[500]} textAnchor="middle" fontWeight="bold">
              t
            </text>
            <text x={paddingLeft - 12} y={paddingTop - 5} fontSize="9" fill={colors.neutral[500]} textAnchor="middle" fontWeight="bold">
              v
            </text>

            {/* y 轴数值刻度 */}
            <text x={paddingLeft - 8} y={yV + 3} fontSize="9" fill={PHYSICS_COLORS.velocity} textAnchor="end" fontWeight="bold">
              {v.toFixed(1)}
            </text>
            <line x1={paddingLeft - 3} y1={yV} x2={paddingLeft} y2={yV} stroke={PHYSICS_COLORS.velocity} strokeWidth="1.5" />

            <text x={paddingLeft - 8} y={zeroY + 3} fontSize="9" fill={colors.neutral[400]} textAnchor="end">
              0
            </text>

            {/* 绘制完美的水平恒定线 */}
            <line
              x1={paddingLeft}
              y1={yV}
              x2={cw - paddingRight}
              y2={yV}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* 当前时间指示红垂线 */}
            <line
              x1={currentSvgX}
              y1={paddingTop}
              x2={currentSvgX}
              y2={zeroY}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* 水平线上的当前红动点 */}
            <circle cx={currentSvgX} cy={yV} r="5" fill={PHYSICS_COLORS.velocity} stroke={colors.neutral.white} strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </div>
  )
}
