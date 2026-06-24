import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function CentripetalSidebar({
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
          { label: '基础模式 (匀速)', value: 0 },
          { label: '进阶模式 (竖直圆)', value: 1 },
        ]}
        value={advancedMode}
        onChange={(v) => {
          updateParam('advancedMode', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />
 
      <div className="mt-3 space-y-3">
        <ToggleSwitch
          label="显示加速度矢量"
          checked={(params.showAcceleration ?? 1) === 1}
          onChange={(checked) => updateParam('showAcceleration', checked ? 1 : 0)}
          disabled={disabled}
        />
      </div>

      {!isAdvanced && (
        <div className="mt-3 space-y-3">
          {/* F-a Chart Switch */}
          <ToggleSwitch
            label="显示 F-a 联动图表"
            checked={(params.showWaveform ?? 1) === 1}
            onChange={(checked) => updateParam('showWaveform', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
      )}

      {isAdvanced && (
        <div className="mt-3 space-y-3">
          {/* Track Type Selector */}
          <SegmentedControl
            label="轨道物理模型"
            options={[
              { label: '单面轨 (绳模型)', value: 0 },
              { label: '双面轨 (杆模型)', value: 1 },
            ]}
            value={params.trackType ?? 0}
            onChange={(v) => {
              updateParam('trackType', v as number)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
