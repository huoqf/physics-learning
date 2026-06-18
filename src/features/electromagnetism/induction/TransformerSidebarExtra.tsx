import React from 'react'
import { SegmentedControl, TipCard } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

/**
 * TransformerSidebarExtra — 变压器左侧屏扩展
 *
 * 仅承载模式切换（SegmentedControl）与模式提示（TipCard）。
 * 参数滑块（n1/n2/U1/R）由 paramMeta 经 ParamControl 自动渲染于上方。
 *
 * @agent-rule 模式切换在底部，使用线分隔（08_THREE_PANEL_RULES §2.1/§4.2）
 */
export const TransformerSidebarExtra: React.FC<SidebarExtraProps> = ({
  params,
  setParams,
  animationActions,
  disabled = false,
}) => {
  const mode = params.mode ?? 0

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    animationActions.resetAnimation()
    setParams({ ...params, mode: nextMode })
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="实验模式"
          options={[
            { label: '基础：变压变流', value: 0 },
            { label: '进阶：负载因果链', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>

      {mode === 1 && (
        <div className="mt-3">
          <TipCard variant="warning">
            拖动负载电阻 R，观察副边电流 I₂ → 输出功率 P_out → 输入功率 P_in →
            原边电流 I₁ 的多米诺因果链（中间屏右侧实时高亮）。
          </TipCard>
        </div>
      )}

      {mode === 0 && (
        <div className="mt-3">
          <TipCard>
            调节 U₁、n₁、n₂，观察四只电表读数与变压变流规律 U₂/U₁ = n₂/n₁。
          </TipCard>
        </div>
      )}
    </>
  )
}

export default TransformerSidebarExtra
