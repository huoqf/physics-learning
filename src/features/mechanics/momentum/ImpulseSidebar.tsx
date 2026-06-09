import { SegmentedControl } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ImpulseSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础', value: 0 },
          { label: '进阶', value: 1 },
        ]}
        value={advancedMode}
        onChange={(v) => {
          updateParam('advancedMode', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {isAdvanced && (
        <div className="mt-3 space-y-3">
          <SegmentedControl
            label="力变化类型"
            options={[
              { label: '线性衰减', value: 0 },
              { label: '正弦半波', value: 1 },
            ]}
            value={params.forceType ?? 0}
            onChange={(v) => {
              updateParam('forceType', v as number)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
