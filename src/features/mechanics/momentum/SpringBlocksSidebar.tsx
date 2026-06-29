import { SegmentedControl, Button } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function SpringBlocksSidebar({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const connectionMode_spring = params.connectionMode_spring ?? 0

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      <div className="text-xs text-neutral-500 font-semibold border-b pb-1">弹簧连接体参数配置</div>
      
      <SegmentedControl
        label="弹簧连接方式"
        value={connectionMode_spring}
        options={[
          { label: '非固连 (接触后分离)', value: 0 },
          { label: '固连 (往复振动)', value: 1 },
        ]}
        onChange={(v) => {
          updateParam('connectionMode_spring', Number(v))
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
        <span className="text-xs font-semibold text-neutral-600 block">高考典型考境一键配置</span>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setParams({
                mA_spring: 2,
                mB_spring: 2,
                v0_spring: 5,
                k_spring: 20,
                connectionMode_spring: 0,
              })
              animationActions.resetAnimation()
            }}
            disabled={disabled}
            className="text-[11px] py-1 px-2"
          >
            等质交换速度
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setParams({
                mA_spring: 1.5,
                mB_spring: 4.5,
                v0_spring: 6,
                k_spring: 20,
                connectionMode_spring: 0,
              })
              animationActions.resetAnimation()
            }}
            disabled={disabled}
            className="text-[11px] py-1 px-2"
          >
            小碰大 (反弹)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setParams({
                mA_spring: 4.5,
                mB_spring: 1.5,
                v0_spring: 5,
                k_spring: 20,
                connectionMode_spring: 0,
              })
              animationActions.resetAnimation()
            }}
            disabled={disabled}
            className="text-[11px] py-1 px-2"
          >
            大碰小 (同向)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setParams({
                mA_spring: 2,
                mB_spring: 3,
                v0_spring: 5,
                k_spring: 25,
                connectionMode_spring: 1,
              })
              animationActions.resetAnimation()
            }}
            disabled={disabled}
            className="text-[11px] py-1 px-2"
          >
            固连往复振动
          </Button>
        </div>
      </div>
    </div>
  )
}
