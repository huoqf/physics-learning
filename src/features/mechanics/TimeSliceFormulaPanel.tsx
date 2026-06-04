/**
 * 时间切片公式面板（动画模式右侧辅屏）。
 *
 * 当 showTimeSlices 开启时显示，用颜色编码与主屏 SVG 色块建立视觉联系，
 * 展示连续相等时间间隔内位移比 1:3:5:7 的公式推导过程。
 */
import { calculateFreeFall } from '@/physics'
import { CHART_COLORS } from '@/theme/physics'

/** 时间切片颜色序列（与 FreeFallAnimation 一致） */
const TIME_SLICE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.compareB,
  CHART_COLORS.compareC,
  CHART_COLORS.criticalPt,
] as const

const TIME_SLICE_RATIOS = [1, 3, 5, 7] as const

/** 固定参考时长（秒），与 FreeFallAnimation 保持一致 */
const TARGET_FALL_TIME = 2.0

interface TimeSliceFormulaPanelProps {
  g: number
  v0: number
}

export default function TimeSliceFormulaPanel({ g, v0 }: TimeSliceFormulaPanelProps) {
  const maxFallHeight = 0.5 * g * TARGET_FALL_TIME * TARGET_FALL_TIME
  const disc = v0 * v0 + 2 * g * maxFallHeight
  const groundTime = g > 0 ? (-v0 + Math.sqrt(disc)) / g : Infinity
  const sliceTime = groundTime < Infinity ? groundTime / 4 : TARGET_FALL_TIME / 4

  const slices = Array.from({ length: 4 }, (_, i) => {
    const t1 = i * sliceTime
    const t2 = (i + 1) * sliceTime
    const { y: y1 } = calculateFreeFall(v0, g, t1)
    const { y: y2 } = calculateFreeFall(v0, g, t2)
    const dy = y2 - y1
    return {
      i,
      t1,
      t2,
      dy,
      ratio: TIME_SLICE_RATIOS[i],
      color: TIME_SLICE_COLORS[i],
    }
  })

  return (
    <div className="mt-3 bg-white rounded-lg shadow-sm border border-neutral-200 p-5">
      <h3 className="text-lg font-semibold text-neutral-800 mb-3">连续相等时间间隔位移规律</h3>

      <div className="mb-3 text-base text-neutral-500">
        每段时间 T = {sliceTime.toFixed(2)}s
      </div>

      <div className="space-y-3">
        {slices.map((s) => (
          <div key={s.i} className="flex items-center gap-3 text-base">
            {/* 颜色方块，与主屏 SVG 色块同色（opacity 0.12 + 同色边框） */}
            <div
              className="w-5 h-5 rounded flex-shrink-0"
              style={{
                backgroundColor: s.color + '1F',
                border: `1px solid ${s.color}80`,
              }}
            />
            <span className="text-neutral-600 font-mono flex-1">
              h{s.i + 1} = {s.dy.toFixed(3)}m
            </span>
            <span
              className="font-bold text-lg"
              style={{ color: s.color }}
            >
              {s.ratio}h₁
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
        <span className="text-base font-bold text-neutral-700">
          h₁ : h₂ : h₃ : h₄ = 1 : 3 : 5 : 7
        </span>
        <span className="ml-1 text-base text-primary-600">★</span>
      </div>

      <div className="mt-3 text-base text-neutral-500 leading-relaxed">
        初速度为零的匀加速运动，在连续相等时间间隔内的位移之比为连续奇数比
      </div>
    </div>
  )
}
