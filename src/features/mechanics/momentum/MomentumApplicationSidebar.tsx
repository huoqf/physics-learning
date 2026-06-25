import { SegmentedControl, Slider } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function MomentumApplicationSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const modelType = params.modelType ?? 0
  
  // 模型 0 参数
  const m_block = params.m_block ?? 2
  const M_slot = params.M_slot ?? 5
  const R_slot = params.R_slot ?? 1.5

  // 模型 1 参数
  const mA_spring = params.mA_spring ?? 2
  const mB_spring = params.mB_spring ?? 3
  const v0_spring = params.v0_spring ?? 5
  const k_spring = params.k_spring ?? 20

  // 模型 2 参数
  const m_person = params.m_person ?? 50
  const M_boat = params.M_boat ?? 150
  const L_boat = params.L_boat ?? 4
  const manBoatControl = params.manBoatControl ?? 0

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      <SegmentedControl
        label="选择经典模型"
        options={[
          { label: '弧形槽-滑块', value: 0 },
          { label: '弹簧双滑块', value: 1 },
          { label: '人船与质心', value: 2 },
        ]}
        value={modelType}
        onChange={(v) => {
          updateParam('modelType', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {/* 模型 0：弧形槽-滑块 */}
      {modelType === 0 && (
        <>
          <div className="text-xs text-neutral-500 font-semibold border-b pb-1">模型参数（光滑水平面）</div>
          <Slider
            label="滑块质量 m"
            value={m_block}
            min={0.5}
            max={5}
            step={0.1}
            unit="kg"
            onChange={(v) => {
              updateParam('m_block', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
          <Slider
            label="弧形槽质量 M"
            value={M_slot}
            min={1}
            max={10}
            step={0.1}
            unit="kg"
            onChange={(v) => {
              updateParam('M_slot', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
          <Slider
            label="弧形半径 R"
            value={R_slot}
            min={0.8}
            max={2.5}
            step={0.1}
            unit="m"
            onChange={(v) => {
              updateParam('R_slot', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
        </>
      )}

      {/* 模型 1：弹簧双滑块 */}
      {modelType === 1 && (
        <>
          <div className="text-xs text-neutral-500 font-semibold border-b pb-1">模型参数（光滑水平面）</div>
          <Slider
            label="滑块 A 质量 m_A"
            value={mA_spring}
            min={0.5}
            max={5}
            step={0.1}
            unit="kg"
            onChange={(v) => {
              updateParam('mA_spring', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
          <Slider
            label="滑块 B 质量 m_B"
            value={mB_spring}
            min={0.5}
            max={5}
            step={0.1}
            unit="kg"
            onChange={(v) => {
              updateParam('mB_spring', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
          <Slider
            label="A 初速度 v₀"
            value={v0_spring}
            min={2}
            max={8}
            step={0.2}
            unit="m/s"
            onChange={(v) => {
              updateParam('v0_spring', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
          <Slider
            label="弹簧劲度系数 k"
            value={k_spring}
            min={5}
            max={50}
            step={1}
            unit="N/m"
            onChange={(v) => {
              updateParam('k_spring', v)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
        </>
      )}

      {/* 模型 2：人船模型 */}
      {modelType === 2 && (
        <>
          <div className="text-xs text-neutral-500 font-semibold border-b pb-1">模型参数（死水微尘）</div>
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
        </>
      )}
    </div>
  )
}
