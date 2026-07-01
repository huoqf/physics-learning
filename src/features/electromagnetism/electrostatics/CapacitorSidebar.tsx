import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard, LeftPanelSection } from '@/components/UI'

export default function CapacitorSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const connected = params.connected ?? 1
  const epsilon_r = params.epsilon_r ?? 1

  const handleConnectionChange = (value: number | string) => {
    updateParam('connected', value as number)
  }

  const handleDielectricChange = (checked: boolean) => {
    // 真空 = 1.0, 电介质设为 5.0
    updateParam('epsilon_r', checked ? 5 : 1)
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="电路状态"
        options={[
          { value: 1, label: '连接电源 (U不变)' },
          { value: 0, label: '断开电源 (Q不变)' },
        ]}
        value={connected}
        onChange={handleConnectionChange}
        disabled={disabled}
      />

      <div className="flex items-center justify-between mt-1">
        <ToggleSwitch
          label="插入电介质 (εᵣ = 5)"
          checked={epsilon_r > 1.5}
          onChange={handleDielectricChange}
          disabled={disabled}
        />
      </div>

      <TipCard variant="primary">
        <span className="font-semibold block mb-1">💡 实验探索建议</span>
        <div className="space-y-2 text-xs text-neutral-600 leading-relaxed">
          <p>
            <strong>1. 验证电容规律</strong>：在<span className="text-primary-700 font-medium">【断开电源】</span>状态下，勾选<span className="text-primary-700 font-medium">【插入电介质】</span>，可以观察到静电计张角瞬间闭合（电压降低），以此验证电容变大。
          </p>
          <p>
            <strong>2. 探索场强恒定</strong>：在<span className="text-primary-700 font-medium">【断开电源】</span>状态下，拉大板间距 $d$。虽然电压升高、静电计张角随之变大，但板间黄色匀强电场线的密度没有任何改变，完美验证了 $E$ 的恒定性。
          </p>
        </div>
      </TipCard>
    </LeftPanelSection>
  )
}
