import React from 'react'
import { SegmentedControl, ToggleSwitch, Slider } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export const ACGenerationSidebarExtra: React.FC<SidebarExtraProps> = ({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const B = params.B ?? 0.5
  const omega = params.omega ?? 2
  const initialPhase = params.initialPhase ?? 0
  const N = params.N ?? 100
  const showVelocityDecomp = params.showVelocityDecomp ?? 0
  const showCoilNormal = params.showCoilNormal ?? 0

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    animationActions.resetAnimation()
    setParams({
      ...params,
      mode: nextMode,
      initialPhase: nextMode === 1 ? params.initialPhase : 0,
      N: nextMode === 1 ? params.N : 100,
    })
  }

  return (
    <>
      {/* 物理参数 */}
      <div className="space-y-4">
        <Slider
          label="磁感应强度 B"
          value={B}
          min={0.1}
          max={2.0}
          step={0.1}
          unit="T"
          onChange={(val) => updateParam('B', val)}
          disabled={disabled}
        />
        <Slider
          label="角速度 ω"
          value={omega}
          min={0.5}
          max={10}
          step={0.5}
          unit="rad/s"
          onChange={(val) => updateParam('omega', val)}
          disabled={disabled}
        />
        {mode === 1 && (
          <>
            <div className="border-t border-neutral-100 pt-3 space-y-4">
              <Slider
                label="初始倾角 θ₀"
                value={initialPhase}
                min={0}
                max={360}
                step={15}
                unit="°"
                onChange={(val) => updateParam('initialPhase', (val * Math.PI) / 180)}
                disabled={disabled}
              />
              <span className="text-ui-base text-neutral-400 block -mt-2">
                θ₀=0° 为中性面起始，θ₀=90° 为最大电动势面起始
              </span>
              <Slider
                label="线圈匝数 N"
                value={N}
                min={10}
                max={500}
                step={10}
                unit="匝"
                onChange={(val) => updateParam('N', val)}
                disabled={disabled}
              />
              <span className="text-ui-base text-neutral-400 block -mt-2">
                匝数影响峰值 Em=NBSω，不影响磁通量 Φ
              </span>
            </div>
          </>
        )}
      </div>

      {/* 开关控制 */}
      <div className="pt-3 border-t border-neutral-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600">速度分解矢量</span>
          <ToggleSwitch
            label="显示"
            checked={showVelocityDecomp === 1}
            onChange={(checked) => updateParam('showVelocityDecomp', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600">线圈法线轴</span>
          <ToggleSwitch
            label="显示"
            checked={showCoilNormal === 1}
            onChange={(checked) => updateParam('showCoilNormal', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 模式切换（底部） */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="实验模式"
          options={[
            { label: '基础：正弦发生', value: 0 },
            { label: '进阶：任意初相', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>
    </>
  )
}

export default ACGenerationSidebarExtra
