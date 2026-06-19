import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, Slider, ToggleSwitch, TipCard } from '@/components/UI'

export default function ThinLensSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = (params.mode ?? 0) as number
  const isConcave = (params.isConcave ?? 0) === 1
  const f = params.f ?? 10
  const u = params.u ?? 30
  const L = params.L ?? 50

  return (
    <>
      <div className="pt-3">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '凸透镜基础成像', value: 0 },
            { label: '共轭法测焦距', value: 1 },
          ]}
          value={mode}
          onChange={(v) => {
            updateParam('mode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      </div>

      {mode === 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <ToggleSwitch
            label="凹透镜"
            checked={isConcave}
            onChange={(v) => updateParam('isConcave', v ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>凹透镜始终成正立缩小虚像</TipCard>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-neutral-200">
        <Slider
          label="焦距 f"
          value={f}
          min={5}
          max={20}
          step={0.5}
          unit="cm"
          onChange={(v) => updateParam('f', v)}
          disabled={disabled}
          minLabel="5 cm"
          maxLabel="20 cm"
        />
      </div>

      {mode === 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <Slider
            label="物距 u"
            value={u}
            min={1}
            max={80}
            step={0.5}
            unit="cm"
            onChange={(v) => updateParam('u', v)}
            disabled={disabled}
            minLabel="1 cm"
            maxLabel="80 cm"
          />
          <TipCard>将蜡烛移近焦点 F，观察像的变化</TipCard>
        </div>
      )}

      {mode === 1 && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <Slider
            label="物屏距离 L"
            value={L}
            min={41}
            max={100}
            step={1}
            unit="cm"
            onChange={(v) => updateParam('L', v)}
            disabled={disabled}
            minLabel="41 cm"
            maxLabel="100 cm"
          />
          <TipCard>固定蜡烛与光屏，拖动透镜寻找两个成像位置</TipCard>
        </div>
      )}
    </>
  )
}
