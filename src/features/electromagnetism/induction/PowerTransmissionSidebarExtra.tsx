import React from 'react'
import { SegmentedControl } from '@/components/UI'
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
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const scenario = params.scenario ?? 0

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
    const currentK = params.k ?? 0.02
    setParams({ ...params, k: Math.max(0.01, currentK - 0.005) })
  }

  const handleVoltageUp = () => {
    const currentK = params.k ?? 0.02
    setParams({ ...params, k: Math.min(0.1, currentK + 0.005) })
  }

  return (
    <div className="space-y-4">
      {/* 场景预设（顶端） */}
      <div>
        <SegmentedControl
          label="电网规模"
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
            ? '高电压远距离：自动联动 P₁=500kW, r=50Ω'
            : '低电压近距离：自动联动 P₁=100kW, r=5Ω'}
        </span>
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
                ⬇️ 降变比
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleVoltageUp}
                disabled={disabled}
              >
                ⬆️ 升变比
              </Button>
            </div>
          </div>

          <TipCard variant="warning">
            <div className="font-medium mb-1">稳压原理</div>
            <div>用电高峰时由于分流导致用户端 U₄ 下降，可通过「升变比」增大 k (即增加副线圈匝数) 补偿跌落，重使灯泡变亮。</div>
          </TipCard>
        </div>
      )}
    </div>
  )
}

export default PowerTransmissionSidebarExtra
