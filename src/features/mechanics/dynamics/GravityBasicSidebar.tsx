import type { SidebarExtraProps } from '@/data/types'
import { duration, easing } from '@/theme/motion'
import { SegmentedControl, OptionButton, ToggleSwitch, TipCard } from '@/components/UI'

export default function GravityBasicSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const suspendPoint = params.suspendPoint ?? 0
  const showLines = params.showLines ?? 1
  const latitude = params.latitude ?? 45
  const omegaScale = params.omegaScale ?? 80

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

      {/* 模式 0 地球自转重力分解专有控件 */}
      {mode === 0 && (
        <div className="flex flex-col gap-4" style={{ animation: `fadeIn ${duration.fast}ms ${easing.standard}` }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600">
              纬度 φ = {latitude}°
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={latitude}
              onChange={(e) => updateParam('latitude', Number(e.target.value))}
              className="w-full accent-primary-600"
              disabled={disabled}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>赤道 0°</span>
              <span>北极 90°</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600">
              离心力放大倍数 = {omegaScale}×
            </label>
            <input
              type="range"
              min={10}
              max={300}
              step={10}
              value={omegaScale}
              onChange={(e) => updateParam('omegaScale', Number(e.target.value))}
              className="w-full accent-primary-600"
              disabled={disabled}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>10×</span>
              <span>300×</span>
            </div>
          </div>

          <TipCard variant="info">
            💡 <strong>提示：</strong>真实地球自转产生的离心力仅为引力的约 0.0034（1/290），为便于观察已放大显示。点击播放按钮可自动演示纬度从赤道到极地的变化。
          </TipCard>
        </div>
      )}

      {/* 模式 1 重心实验专有侧边控件 */}
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
