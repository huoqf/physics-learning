import { SegmentedControl, Slider, Button } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ManBoatSidebar({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const m_person2 = params.m_person2 ?? 60
  const manBoatControl = params.manBoatControl ?? 0
  const manBoatMode = params.manBoatMode ?? 0

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      <div className="text-xs text-neutral-500 font-semibold border-b pb-1">人船模型参数配置</div>
      
      <SegmentedControl
        label="控制方式"
        options={[
          { label: '自动走动', value: 0 },
          { label: '键盘互动', value: 1 },
        ]}
        value={manBoatControl}
        onChange={(v) => {
          const nextVal = v as number
          updateParam('manBoatControl', nextVal)
          if (nextVal === 1) {
            updateParam('manBoatMode', 0) // 键盘互动强制单人
          }
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {manBoatControl === 0 && (
        <SegmentedControl
          label="演示模式"
          options={[
            { label: '单人走动', value: 0 },
            { label: '双人交换', value: 1 },
            { label: '相向汇合', value: 2 },
            { label: '依次走动', value: 3 },
          ]}
          value={manBoatMode}
          onChange={(v) => {
            updateParam('manBoatMode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      )}

      {manBoatControl === 0 && manBoatMode > 0 && (
        <Slider
          label="人2质量 m₂"
          value={m_person2}
          min={30}
          max={100}
          step={2}
          unit="kg"
          onChange={(v) => {
            updateParam('m_person2', v)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      )}
      
      {manBoatControl === 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
          <span className="text-xs font-semibold text-neutral-600 block">高考典型情境一键配置</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setParams({
                  m_person: 50,
                  m_person2: 50,
                  M_boat: 150,
                  L_boat: 4,
                  manBoatMode: 1,
                  manBoatControl: 0,
                })
                animationActions.resetAnimation()
              }}
              disabled={disabled}
              className="text-ui-md py-1 px-2"
            >
              等质交换 (船不移)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setParams({
                  m_person: 50,
                  m_person2: 80,
                  M_boat: 150,
                  L_boat: 4,
                  manBoatMode: 1,
                  manBoatControl: 0,
                })
                animationActions.resetAnimation()
              }}
              disabled={disabled}
              className="text-ui-md py-1 px-2"
            >
              不等质交换位置
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setParams({
                  m_person: 50,
                  m_person2: 70,
                  M_boat: 150,
                  L_boat: 4,
                  manBoatMode: 2,
                  manBoatControl: 0,
                })
                animationActions.resetAnimation()
              }}
              disabled={disabled}
              className="text-ui-md py-1 px-2"
            >
              相向走向中央
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setParams({
                  m_person: 50,
                  m_person2: 60,
                  M_boat: 150,
                  L_boat: 4,
                  manBoatMode: 3,
                  manBoatControl: 0,
                })
                animationActions.resetAnimation()
              }}
              disabled={disabled}
              className="text-ui-md py-1 px-2"
            >
              依次依次运动
            </Button>
          </div>
        </div>
      )}

      {manBoatControl === 1 && (
        <div className="text-xs text-pink-600 bg-pink-50 rounded p-2 border border-pink-100 mt-1 leading-relaxed">
          💡 <strong>操作提示：</strong>
          <p>请点击主画面使其获取焦点，然后使用键盘 <strong>←（左方向键）</strong> 或 <strong>→（右方向键）</strong> 即可操控小人在船上行走！</p>
        </div>
      )}
    </div>
  )
}
