import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, TipCard } from '@/components/UI'

export default function UniformAccelerationSidebar({
  params,
  setParams,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  if (advancedMode === 1) return null

  const splitN = params.splitN ?? 0
  const showEquivRect = params.showEquivRect ?? 0
  const showSplit = params.showSplit ?? 1

  const splitNOptions = [0, 4, 8, 16, 32]
  const splitNIndex = splitNOptions.indexOf(splitN) !== -1 ? splitNOptions.indexOf(splitN) : 0

  const areaMode = splitN === 0 && showEquivRect === 0 && showSplit === 0 ? 0
    : splitN === 0 && showEquivRect === 0 && showSplit === 1 ? 1
    : 2

  return (
    <div className="mt-4 pt-3 border-t border-neutral-200 space-y-4">
      <SegmentedControl
        label="v-t 图位移面积展示"
        options={[
          { label: '合并梯形', value: 0 },
          { label: '拆分公式', value: 1 },
          { label: '等效割补', value: 2 },
        ]}
        value={areaMode}
        onChange={(v) => {
          if (v === 0) setParams({ ...params, splitN: 0, showEquivRect: 0, showSplit: 0 })
          else if (v === 1) setParams({ ...params, splitN: 0, showEquivRect: 0, showSplit: 1 })
          else setParams({ ...params, splitN: 0, showEquivRect: 1, showSplit: 0 })
        }}
        disabled={disabled}
      />
      <TipCard>
        {showEquivRect === 1
          ? '等效割补：利用中间时刻速度 v(t/2) 围成的等效矩形替代原梯形面积。'
          : showSplit === 1
          ? '拆分公式：将面积拆分为矩形位移 v₀t 与三角形位移 ½at²。'
          : '合并梯形：以整体梯形面积 S = ½(v₀+v_t)t 直接代表总位移。'}
      </TipCard>
      <div className="pt-2 border-t border-neutral-100">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-neutral-600 font-semibold">微元切割份数 N</span>
          <span className="font-mono text-neutral-700 font-bold">
            {splitN === 0 ? '连续不分割' : `${splitN} 份`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={splitNOptions.length - 1}
          step={1}
          value={splitNIndex}
          onChange={(e) => {
            const val = splitNOptions[parseInt(e.target.value)]
            setParams({ ...params, splitN: val })
          }}
          disabled={disabled}
          className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
        />
      </div>
    </div>
  )
}
