import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, TipCard, LeftPanelSection } from '@/components/UI'

export default function VelocitySelectorSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      {mode === 0 ? (
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="电荷极性"
            options={[
              { value: 1.0, label: '正电荷 (+q)' },
              { value: -1.0, label: '负电荷 (-q)' },
            ]}
            value={params.q ?? 1.0}
            onChange={(val) => updateParam('q', val as number)}
            disabled={disabled}
          />
          <TipCard>
            💡 调节入射速度 v 或磁场强度 B，观察洛伦兹力大小和轨道半径的变化。利用左手定则判断正/负电荷在向里（⊗）的磁场中的偏转方向。
          </TipCard>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <TipCard>
            💡 调节电场强度 E 或磁场强度 B，改变滤出速度（v_滤 = E/B）。只有速度刚好等于该值的粒子，才能受力平衡做匀速直线运动穿出极板。
          </TipCard>
        </div>
      )}
    </LeftPanelSection>
  )
}
