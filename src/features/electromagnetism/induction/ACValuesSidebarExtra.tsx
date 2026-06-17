import React, { useState } from 'react'
import { Slider, SegmentedControl, Button } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'
import { getEffectiveCurrent } from '@/physics/rmsCalculator'
import type { WaveformType } from '@/physics/rmsCalculator'

const WAVEFORM_LABELS: Record<number, { label: string; type: WaveformType }> = {
  0: { label: '标准正弦波', type: 'sine' },
  1: { label: '正负对称方波', type: 'square' },
  2: { label: '单极性脉冲波', type: 'pulse' },
  3: { label: '正弦半波整流', type: 'half_sine' },
}

const WAVEFORM_OPTIONS = [
  { label: '正弦波', value: 0 },
  { label: '方波', value: 1 },
  { label: '脉冲波', value: 2 },
  { label: '半波整流', value: 3 },
]

const VISUAL_PERIOD = 2 // 视觉周期 (s)

export const ACValuesSidebarExtra: React.FC<SidebarExtraProps> = ({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled = false,
}) => {
  const [revealed, setRevealed] = useState(false)

  const mode = params.mode ?? 0
  const waveform = params.waveform ?? 0
  const Im = params.Im ?? 5
  const R = params.R ?? 10
  const Idc = params.Idc ?? 3
  const duty = params.duty ?? 0.5

  // 计算理论有效值（纯函数调用）
  const I_eff = getEffectiveCurrent({
    type: WAVEFORM_LABELS[waveform]?.type ?? 'sine',
    Im,
    R,
    period: VISUAL_PERIOD,
    dcCurrent: Idc,
    duty,
  })

  // 判断学生是否已找到有效值（误差 ≤ 2%）
  const isFound = Math.abs(Idc - I_eff) <= Math.max(0.02 * I_eff, 0.02)

  // Auto 按钮：自动吸附 Idc 到理论有效值
  const handleAutoEquivalent = () => {
    updateParam('Idc', Math.round(I_eff * 100) / 100)
    setRevealed(true)
  }

  // 切换模式时重置动画 + 隐藏有效值
  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    animationActions.resetAnimation()
    setParams({
      ...params,
      mode: nextMode,
      waveform: nextMode === 0 ? 0 : params.waveform,
    })
    setRevealed(false)
  }

  // 切换波形时重置动画 + 隐藏有效值
  const handleWaveformChange = (val: number | string) => {
    animationActions.resetAnimation()
    updateParam('waveform', Number(val))
    setRevealed(false)
  }

  // 修改 Im / R / duty 时重置动画（Idc 不触发重置）+ 隐藏有效值
  const handleImChange = (val: number) => {
    animationActions.resetAnimation()
    updateParam('Im', val)
    setRevealed(false)
  }

  const handleRChange = (val: number) => {
    animationActions.resetAnimation()
    updateParam('R', val)
    setRevealed(false)
  }

  const handleDutyChange = (val: number) => {
    animationActions.resetAnimation()
    updateParam('duty', val)
    setRevealed(false)
  }

  return (
    <>
      {/* 物理参数控件 */}
      <div className="space-y-4">
        <Slider
          label="交流峰值 Im"
          value={Im}
          min={1}
          max={10}
          step={0.1}
          unit="A"
          onChange={handleImChange}
          disabled={disabled}
        />
        <Slider
          label="负载电阻 R"
          value={R}
          min={1}
          max={20}
          step={0.5}
          unit="Ω"
          onChange={handleRChange}
          disabled={disabled}
        />
        <Slider
          label="直流电流 Idc"
          value={Idc}
          min={0}
          max={10}
          step={0.01}
          unit="A"
          onChange={(val) => updateParam('Idc', val)}
          disabled={disabled}
          description="调节此滑块使直流热量对齐交流热量"
        />

        {/* 占空比：仅 pulse 模式下显示 */}
        {waveform === 2 && (
          <Slider
            label="占空比 D"
            value={duty}
            min={0.1}
            max={0.9}
            step={0.01}
            unit=""
            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={handleDutyChange}
            disabled={disabled}
          />
        )}
      </div>

      {/* Auto 一键等效按钮 */}
      <div className="pt-3 border-t border-neutral-200">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleAutoEquivalent}
          disabled={disabled}
        >
          Auto · 一键等效
        </Button>
        <span className="text-[10px] text-neutral-400 block mt-1 text-center">
          {revealed || isFound
            ? <>将 Idc 自动吸附至理论有效值 I_eff = {I_eff.toFixed(2)} A</>
            : '将 Idc 自动吸附至当前波形的理论有效值'}
        </span>
      </div>

      {/* 波形选择（进阶模式下显示） */}
      {mode === 1 && (
        <div className="pt-3 border-t border-neutral-200">
          <SegmentedControl
            label="波形类型"
            options={WAVEFORM_OPTIONS}
            value={waveform}
            onChange={handleWaveformChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* 模式切换（底部） */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="实验模式"
          options={[
            { label: '基础：正弦波', value: 0 },
            { label: '进阶：多波形', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>
    </>
  )
}

export default ACValuesSidebarExtra
