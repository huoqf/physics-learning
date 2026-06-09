import type { SidebarExtraProps } from '@/data/types'
import { duration, easing } from '@/theme/motion'
import { SegmentedControl, OptionButton, ToggleSwitch, TipCard } from '@/components/UI'

export default function GravitySidebar({ params, updateParam, setParams, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const preset = params.preset ?? 0
  const showChart = params.showChart ?? 1

  const handleModeChange = (newMode: number) => {
    setParams({
      ...params,
      mode: newMode,
      preset: newMode === 1 ? 1 : 0
    })
    animationActions.resetAnimation()
  }

  const handlePresetChange = (newPreset: number) => {
    updateParam('preset', newPreset)
    animationActions.resetAnimation()
  }

  const presetList = [
    { id: 1, name: '地月系统' },
    { id: 2, name: '太阳 - 地球' },
    { id: 3, name: '同步卫星 - 地球' },
    { id: 4, name: '宇航员 - 空间站' }
  ]

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式 */}
      <SegmentedControl
        label="演示模式"
        options={[
          { label: '比例验证 (相对数值)', value: 0 },
          { label: '天体探索 (真实尺度)', value: 1 },
        ]}
        value={mode}
        onChange={(v) => handleModeChange(v as number)}
        disabled={disabled}
      />

      {mode === 1 && (
        <div className="flex flex-col gap-3" style={{ animation: `fadeIn ${duration.fast}ms ${easing.standard}` }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600">选择天体系统</label>
            <div className="grid grid-cols-2 gap-2">
              {presetList.map((p) => (
                <OptionButton
                  key={p.id}
                  label={p.name}
                  selected={preset === p.id}
                  onClick={() => handlePresetChange(p.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>

          <TipCard>
            💡 <strong>提示：</strong>在真实天体尺度下，系统参数已绑定真实物理数值（看板以科学计数法展示）。您可以在右侧看板对比引力数量级，亦可直接在画面中拖拽天体调节距离。
          </TipCard>
        </div>
      )}

      {mode === 0 && (
        <TipCard variant="info">
          💡 <strong>提示：</strong>您可以通过左侧参数滑块调节质量与距离，也可以在画面中<strong>鼠标拖拽</strong>天体实时改变间距，观察引力箭头的强弱响应。
        </TipCard>
      )}

      <ToggleSwitch
        checked={showChart === 1}
        onChange={(checked) => updateParam('showChart', checked ? 1 : 0)}
        label="显示平方反比 F-r 曲线"
        disabled={disabled}
      />
    </div>
  )
}
