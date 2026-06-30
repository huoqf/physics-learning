/**
 * 远距离输电 - 左侧屏扩展组件
 * 职责：场景预设、模式切换、辅助开关、一键触发
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

// 场景预设配置
interface ScenePreset {
  label: string
  P1: number
  r: number
  U2: number
}

const SCENE_PRESETS: Record<number, ScenePreset> = {
  0: { label: '跨省大电网', P1: 500, r: 50, U2: 50 },  // 高压远距离
  1: { label: '近郊小供电', P1: 100, r: 5, U2: 11 },   // 低压近距离
}

export const PowerTransmissionSidebarExtra: React.FC<SidebarExtraProps> = ({
  params,
  setParams,
  animationActions,
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const scenario = params.scenario ?? 0
  const showIdeal = params.showIdeal ?? 0

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    animationActions.resetAnimation()
    setParams({
      ...params,
      mode: nextMode,
    })
  }

  const handleScenarioChange = (val: number | string) => {
    const nextScenario = Number(val)
    const preset = SCENE_PRESETS[nextScenario]
    setParams({
      ...params,
      scenario: nextScenario,
      P1: preset.P1,
      r: preset.r,
      U2: preset.U2,
    })
  }

  const handlePeakLoad = () => {
    setParams({
      ...params,
      N: 1000,
      peakLoad: 1,
    })
  }

  // 稳压补偿：步进调节变比 k
  const handleVoltageDown = () => {
    // 降电压：减小 k
    const currentK = params.k ?? 0.02
    setParams({ ...params, k: Math.max(0.01, currentK - 0.005) })
  }

  const handleVoltageUp = () => {
    // 升电压：增大 k
    const currentK = params.k ?? 0.02
    setParams({ ...params, k: Math.min(0.1, currentK + 0.005) })
  }

  return (
    <>
      {/* 场景预设（顶端） */}
      <div>
        <SegmentedControl
          label="场景预设"
          options={[
            { label: '跨省大电网', value: 0 },
            { label: '近郊小供电', value: 1 },
          ]}
          value={scenario}
          onChange={handleScenarioChange}
          disabled={disabled}
        />
        <span className="text-ui-base text-neutral-400 block mt-1">
          {scenario === 0
            ? '高电压远距离：自动锁定 P₁=500kW, r=50Ω'
            : '低电压近距离：自动锁定 P₁=100kW, r=5Ω'}
        </span>
      </div>

      {/* 开关控制 */}
      <div className="pt-3 border-t border-neutral-200 space-y-3">
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

      {/* 进阶模式：一键触发 + 稳压补偿 + 提示 */}
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

          {/* 稳压补偿步进按钮 */}
          <div>
            <div className="text-xs font-semibold text-neutral-600 mb-1">稳压补偿（调节变比 k）</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleVoltageDown}
                disabled={disabled}
              >
                ⬇️ 降电压
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleVoltageUp}
                disabled={disabled}
              >
                ⬆️ 升电压
              </Button>
            </div>
          </div>

          <TipCard variant="warning">
            <div className="font-medium mb-1">稳压补偿</div>
            <div>用电高峰时 U₄ 下降，点击「升电压」增大 k 补偿跌落。</div>
          </TipCard>
        </div>
      )}

      {/* 模式切换（底部） */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="学习模式"
          options={[
            { label: '基础：高压输电优越性', value: 0 },
            { label: '进阶:动态负载与稳压', value: 1 },
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
