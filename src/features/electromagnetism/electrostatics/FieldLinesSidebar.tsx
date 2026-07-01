import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard, LeftPanelSection } from '@/components/UI'

export default function FieldLinesSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const topology = params.topology ?? 2 // 0=单正, 1=单负, 2=等量异种, 3=等量同种
  const showFieldLines = (params.showFieldLines ?? 1) === 1
  const showEquipotentials = (params.showEquipotentials ?? 1) === 1

  const handleTopologyChange = (value: number | string) => {
    updateParam('topology', Number(value))
    // 切换场景时，重置探针位置，避开可能的场源中心
    if (Number(value) === 0 || Number(value) === 1) {
      updateParam('probeX', 350)
      updateParam('probeY', 150)
      updateParam('probeStartX', 350)
      updateParam('probeStartY', 150)
    } else {
      updateParam('probeX', 350)
      updateParam('probeY', 120)
      updateParam('probeStartX', 350)
      updateParam('probeStartY', 120)
    }
  }

  const handleFieldLinesChange = (checked: boolean) => {
    updateParam('showFieldLines', checked ? 1 : 0)
  }

  const handleEquipotentialsChange = (checked: boolean) => {
    updateParam('showEquipotentials', checked ? 1 : 0)
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="拓扑场景"
        options={[
          { value: 0, label: '单正电荷' },
          { value: 1, label: '单负电荷' },
          { value: 2, label: '等量异种' },
          { value: 3, label: '等量同种' },
        ]}
        value={topology}
        onChange={handleTopologyChange}
        disabled={disabled}
      />

      <div className="flex flex-col gap-2 mt-1">
        <ToggleSwitch
          label="黄色电场线"
          checked={showFieldLines}
          onChange={handleFieldLinesChange}
          disabled={disabled}
        />
        <ToggleSwitch
          label="紫色等势面"
          checked={showEquipotentials}
          onChange={handleEquipotentialsChange}
          disabled={disabled}
        />
      </div>

      <TipCard variant="primary">
        <span className="font-semibold block mb-1">💡 物理探究与测试</span>
        <div className="space-y-2 text-xs text-neutral-600 leading-relaxed">
          <p>
            <strong>1. 等势面不做功验证</strong>：用鼠标按住中屏的<span className="text-amber-500 font-medium">【探针电荷】</span>，沿着一条紫色等势面圆弧状拖动。观察右屏的“电场力做功 $W$”数值——它将死死稳定在 <span className="font-mono text-amber-600 font-bold">0.0000 J</span>，下方动能与势能条也无任何波动。
          </p>
          <p>
            <strong>2. 沿着场线做功最大</strong>：释放鼠标，改沿着黄色电场线的纵深方向直线拖动，会发现做功数值剧烈吞吐，能量条此消彼长。
          </p>
          <p>
            <strong>3. 自主盲测与验证</strong>：可以关闭<span className="text-amber-600 font-medium">【黄色电场线】</span>图层，仅保留等势面，让学生根据等势面的疏密自主盲测空间中哪里场强最大，随后开启电场线进行验证。
          </p>
        </div>
      </TipCard>
    </LeftPanelSection>
  )
}
