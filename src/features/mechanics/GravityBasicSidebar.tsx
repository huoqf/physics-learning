import type { SidebarExtraProps } from '@/data/types'
import { duration, easing } from '@/theme/motion'
import { SegmentedControl, OptionButton, ToggleSwitch } from '@/components/UI'

export default function GravityBasicSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const suspendPoint = params.suspendPoint ?? 0
  const showLines = params.showLines ?? 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    // 切换模式重置动画时间与播放状态
    animationActions.resetAnimation()
  }

  const handleSuspendPointChange = (idx: number) => {
    updateParam('suspendPoint', idx)
    // 重新悬挂时，必须重置动画时间，以触发板的阻尼摆动晃动效果
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式选择 */}
      <SegmentedControl
        label="演示模式"
        options={[
          { label: '地球自转重力分解', value: 0 },
          { label: '悬挂法重心实验', value: 1 },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {/* 模式 2 重心实验专有侧边控件 */}
      {mode === 1 && (
        <div className="flex flex-col gap-4" style={{ animation: `fadeIn ${duration.fast}ms ${easing.standard}` }}>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-neutral-600">选择悬挂孔 (A1 - A3)</p>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => (
                <OptionButton
                  key={`suspend-btn-${idx}`}
                  label={`挂载点 A${idx + 1}`}
                  selected={suspendPoint === idx}
                  onClick={() => handleSuspendPointChange(idx)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>

          <ToggleSwitch
            checked={showLines === 1}
            onChange={(checked) => updateParam('showLines', checked ? 1 : 0)}
            label="显示悬挂铅垂虚线"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
