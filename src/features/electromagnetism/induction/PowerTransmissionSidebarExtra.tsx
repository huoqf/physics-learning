/**
 * 远距离输电 - 左侧屏扩展组件
 * 职责：模式切换、辅助开关、一键触发
 *
 * @agent-rule 遵循 SidebarExtraProps 标准签名
 * @agent-rule 复用 SegmentedControl / ToggleSwitch / TipCard / Button
 * @agent-rule 参数 Slider 由 paramMeta 自动生成，此处不重复
 */
import React from 'react'
import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import { TipCard } from '@/components/UI/TipCard'
import { Button } from '@/components/UI/Button'
import type { SidebarExtraProps } from '@/data/types'

export const PowerTransmissionSidebarExtra: React.FC<SidebarExtraProps> = ({
  params,
  setParams,
  animationActions,
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const showIdeal = params.showIdeal ?? 0

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    animationActions.resetAnimation()
    setParams({
      ...params,
      mode: nextMode,
    })
  }

  const handlePeakLoad = () => {
    setParams({
      ...params,
      N: 1000,
      peakLoad: 1,
    })
  }

  return (
    <>
      {/* 开关控制 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600">理想无损耗对比</span>
          <ToggleSwitch
            label="显示"
            checked={showIdeal === 1}
            onChange={(checked) => setParams({ ...params, showIdeal: checked ? 1 : 0 })}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 进阶模式：一键触发 + 提示 */}
      {mode === 1 && (
        <div className="pt-3 border-t border-neutral-200 space-y-3">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handlePeakLoad}
            disabled={disabled}
          >
            一键触发：傍晚用电高峰
          </Button>

          <TipCard variant="warning">
            <div className="font-medium mb-1">稳压补偿</div>
            <div>用电高峰时 U₄ 下降，可通过增大 n₄ 或减小 n₃ 来补偿。</div>
          </TipCard>
        </div>
      )}

      {/* 模式切换（底部） */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="学习模式"
          options={[
            { label: '基础：高压输电优越性', value: 0 },
            { label: '进阶：动态负载与稳压', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>

      {/* 基础模式提示 */}
      {mode === 0 && (
        <div className="mt-3">
          <TipCard variant="info">
            <div className="font-medium mb-1">高压输电优越性</div>
            <div>提高 U₂ → 降低 I_line → 大幅减少 P_loss = I²r</div>
          </TipCard>
        </div>
      )}
    </>
  )
}

export default PowerTransmissionSidebarExtra
