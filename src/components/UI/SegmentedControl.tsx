import { useLayoutEffect, useRef, useState, type FC } from 'react'
import { SEGMENTED, LEFT_PANEL_PADDING } from '@/theme/spacing'

interface SegmentedControlOption {
  label: string
  value: number | string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: number | string
  onChange: (value: number | string) => void
  disabled?: boolean
  label?: string
  className?: string
}

/**
 * 分段器（Segmented Control）。
 *
 * 布局要点（左屏 280px / 窄屏 240px，见 `PANEL.left`）：
 * 1. **列数由选项个数决定**，所以单格宽度只由档位决定，与标签长短无关。
 *    实测轨道内容宽：280px 左屏 → 225px（2 档单格 111.5px、3 档 73.7px）；
 *    240px 左屏 → 185px（2 档 91.5px、3 档降列后同为 91.5px）。
 *    标签一旦超宽就折行，把整行按钮从 27px 撑到 42px —— 这是左屏高度不够的主因，
 *    所以选项长度由 `check:control-meta` §2.6.6 机器卡住，不靠自觉。
 * 2. **列数上限 3**：4/5 档若真按 4/5 列等分，单格只剩 56/44px，
 *    只够 4/3 个汉字，任何物理术语都放不下。改为 3 列（占 2 行）后单格 72px+，
 *    标签单行可读，代价只是多 1 行（+27px），比"每个按钮都折两行"划算。
 * 3. 6/7 档退回 2 列（111.5px），10 档这类「步骤型」短标签组走 5 列。
 *    窄屏下 3 列及以上还会按 `SEGMENTED.minCell` 再降列，见 `fitColumns`。
 * 4. `line-clamp-2` 是兜底：豁免了 §2.6.6 的长选项最多占两行，
 *    不会被四五个字挤成三四行（实测曾有 76px 高的按钮）；全称放 `title` 悬浮可见。
 */
const MAX_COLS = 3

/** 选项个数 → 列数。超过 3 档退列，10 档走 5 列（步骤型短标签） */
function columnsFor(n: number): number {
  if (n <= MAX_COLS) return n
  if (n === 10) return 5
  if (n <= 5) return MAX_COLS
  return 2
}

/**
 * 按轨道实测宽度修正列数。
 *
 * 左屏宽度随视口变化：≥1440px 时 280px、1280–1439px 时仅 240px（见 `PANEL.left`）。
 * 240px 下 3 列单格只剩 60.3px —— 连 6 个汉字都放不下，实测有 30 处标签被迫折行。
 * 此时降到 2 列（单格 91.5px）只多占 1 行，远好过每个按钮折两行。
 * 10 档是纯数字/符号的步骤型短标签组，固定 5 列，不参与降列。
 *
 * 阈值 `SEGMENTED.minCell` 定义在 `theme/spacing`，是 §2.6.6 判定的唯一真源。
 */
function fitColumns(base: number, n: number, avail: number): number {
  if (n === 10 || base < 3 || avail <= 0) return base
  const fit = Math.floor((avail + SEGMENTED.gapPx) / (SEGMENTED.minCell + SEGMENTED.gapPx))
  return Math.max(2, Math.min(base, fit))
}

/** Tailwind 无法识别模板字符串中的动态类名，必须使用完整类名映射 */
const colsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

export const SegmentedControl: FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  label,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(0)

  // 必须用 layoutEffect：useEffect 要等浏览器 paint 之后才跑，
  // 窄屏下会先按 3 列画一帧（文字已折行）、再跳成 2 列——实测 1216ms→1242ms 可见跳变。
  // layoutEffect 在 DOM 更新后、paint 前同步测量并重排，首帧即正确列数。
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    // 扣掉轨道自身 p-0.5 的左右内边距（= SEGMENTED.gapPx × 2）
    setAvail(el.clientWidth - SEGMENTED.gapPx * 2)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setAvail(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const baseCols = columnsFor(options.length)
  const cols = fitColumns(baseCols, options.length, avail)
  const colsClassName = colsClass[cols] ?? 'grid-cols-2'

  return (
    <div className={className}>
      {label && (
        <span className="mb-1 block text-xs font-semibold text-neutral-600">
          {label}
        </span>
      )}
      <div
        ref={trackRef}
        className={`grid ${colsClassName} gap-0.5 ${LEFT_PANEL_PADDING.track} bg-neutral-100 rounded-lg`}
      >
        {options.map((opt) => {
          const isActive = opt.value === value
          return (
            <button
              key={opt.value}
              onClick={() => {
                if (!disabled && !isActive) onChange(opt.value)
              }}
              disabled={disabled}
              title={opt.label}
              className={[
                'py-1.5 text-xs font-semibold leading-tight rounded-md transition-all duration-fast ease-standard active:scale-[0.98]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                isActive
                  ? 'bg-white text-primary-700 shadow-sm font-bold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50',
              ].filter(Boolean).join(' ')}
            >
              {/* clamp 放在内层 span：直接给 button 设 -webkit-box 会与 grid 布局打架 */}
              <span className="line-clamp-2 break-words">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
