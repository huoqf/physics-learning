import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard } from '@/components/UI'
import { duration, easing } from '@/theme/motion'

export default function VelocitySelectorSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const q = params.q ?? 1.0
  const keepTrack = params.keepTrack === 1
  const showElectricField = params.showElectricField === 1
  const showHandRule = params.showHandRule !== 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  const handleLaunch = () => {
    animationActions.restartAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式选择 */}
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础：单粒子偏转' },
          { value: 1, label: '进阶：速度选择器' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      <ToggleSwitch
        label="显示左手定则"
        checked={showHandRule}
        onChange={(checked) => updateParam('showHandRule', checked ? 1 : 0)}
        disabled={disabled}
      />

      {mode === 0 ? (
        // ─── 基础模式控制 ───
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="电荷极性"
            options={[
              { value: 1.0, label: '正电荷 (+q)' },
              { value: -1.0, label: '负电荷 (-q)' },
            ]}
            value={q}
            onChange={(val) => updateParam('q', val as number)}
            disabled={disabled}
          />

          <ToggleSwitch
            label="留存历史轨迹"
            checked={keepTrack}
            onChange={(checked) => updateParam('keepTrack', checked ? 1 : 0)}
            disabled={disabled}
          />

          <button
            onClick={handleLaunch}
            disabled={disabled}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-40"
            style={{
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: easing.standard,
            }}
          >
            发射粒子
          </button>

          <TipCard>
            💡 调节入射速度 v 或磁场强度 B，观察洛伦兹力大小和轨道半径的变化。利用左手定则判断正/负电荷在向里（⊗）的磁场中的偏转方向。
          </TipCard>
        </div>
      ) : (
        // ─── 进阶模式控制 ───
        <div className="flex flex-col gap-4">
          <ToggleSwitch
            label="开启平行板电场"
            checked={showElectricField}
            onChange={(checked) => updateParam('showElectricField', checked ? 1 : 0)}
            disabled={disabled}
          />

          <button
            onClick={handleLaunch}
            disabled={disabled}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-40"
            style={{
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: easing.standard,
            }}
          >
            重新筛选粒子束
          </button>

          <TipCard>
            💡 调节电场强度 E 或磁场强度 B，改变滤出速度（v_滤 = E/B）。只有速度刚好等于该值的粒子，才能受力平衡做匀速直线运动穿出极板。
          </TipCard>
        </div>
      )}
    </div>
  )
}
