import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch } from '@/components/UI'

export default function ElectricFieldSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const chargeConfig = params.chargeConfig ?? 0
  const showFieldLines = params.showFieldLines ?? 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  const handleConfigChange = (value: number | string) => {
    updateParam('chargeConfig', value as number)
    animationActions.resetAnimation()
  }

  const handleShowLinesChange = (checked: boolean) => {
    updateParam('showFieldLines', checked ? 1 : 0)
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础单电荷' },
          { value: 1, label: '合场强叠加' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 1 && (
        <SegmentedControl
          label="电荷配置"
          options={[
            { value: 0, label: '等量异种' },
            { value: 1, label: '等量同正' },
            { value: 2, label: '等量同负' },
          ]}
          value={chargeConfig}
          onChange={handleConfigChange}
          disabled={disabled}
        />
      )}

      <div className="flex items-center justify-between mt-2">
        <ToggleSwitch
          label="显示背景电场线"
          checked={showFieldLines === 1}
          onChange={handleShowLinesChange}
          disabled={disabled}
        />
      </div>

      {mode === 0 ? (
        <div className="alert-card-info">
          <p className="font-semibold leading-relaxed">
            💡 物理提示：
          </p>
          <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
            1. 支持直接拖动<b>试探电荷 q</b> 在空间中任意移动位置。<br />
            2. 调节上方 <b>试探电量 q</b> 观察：黄色 <b>E 矢量</b> 保持恒定，橙色 <b>F 矢量</b> 正比缩放/反向，直观体验场强的独立性。
          </p>
        </div>
      ) : (
        <div className="alert-card-warning">
          <p className="font-semibold leading-relaxed">
            💡 物理提示：
          </p>
          <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
            1. 在空间内拖拽试探电荷，观察分矢量 <b>E₁</b> 与 <b>E₂</b> 的平行四边形矢量叠加合成。<br />
            2. 切换不同配置，观察同种电荷与异种电荷空间场强的叠加区别。
          </p>
        </div>
      )}
    </div>
  )
}
