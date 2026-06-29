import { SegmentedControl, Slider } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ManBoatSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const m_person = params.m_person ?? 50
  const M_boat = params.M_boat ?? 150
  const L_boat = params.L_boat ?? 4
  const manBoatControl = params.manBoatControl ?? 0

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      <div className="text-xs text-neutral-500 font-semibold border-b pb-1">人船模型参数配置</div>
      
      <Slider
        label="人质量 m"
        value={m_person}
        min={30}
        max={100}
        step={2}
        unit="kg"
        onChange={(v) => {
          updateParam('m_person', v)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />
      
      <Slider
        label="船质量 M"
        value={M_boat}
        min={50}
        max={300}
        step={10}
        unit="kg"
        onChange={(v) => {
          updateParam('M_boat', v)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />
      
      <Slider
        label="船长 L"
        value={L_boat}
        min={3}
        max={7}
        step={0.2}
        unit="m"
        onChange={(v) => {
          updateParam('L_boat', v)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />
      
      <SegmentedControl
        label="控制方式"
        options={[
          { label: '自动走动', value: 0 },
          { label: '键盘互动', value: 1 },
        ]}
        value={manBoatControl}
        onChange={(v) => {
          updateParam('manBoatControl', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {manBoatControl === 1 && (
        <div className="text-xs text-pink-600 bg-pink-50 rounded p-2 border border-pink-100 mt-1 leading-relaxed">
          💡 <strong>操作提示：</strong>
          <p>请点击主画面使其获取焦点，然后使用键盘 <strong>←（左方向键）</strong> 或 <strong>→（右方向键）</strong> 即可操控小人在船上行走！</p>
        </div>
      )}
    </div>
  )
}
