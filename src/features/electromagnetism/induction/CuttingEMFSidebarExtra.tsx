import React from 'react'
import { SegmentedControl, ToggleSwitch, Slider } from '@/components/UI'

interface CuttingEMFSidebarExtraProps {
  params: Record<string, number>
  updateParam: (key: string, value: number) => void
  setParams: (params: Record<string, number>) => void
  animationActions: {
    resetAnimation: () => void
    pauseAnimation: () => void
    restartAnimation: () => void
  }
  disabled?: boolean
}

export const CuttingEMFSidebarExtra: React.FC<CuttingEMFSidebarExtraProps> = ({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const B = params.B ?? 1.5
  const L = params.L ?? 1.0
  const R = params.R ?? 2.0
  const v = params.v ?? 2.0
  const F_ext = params.F_ext ?? 2.0
  const m = params.m ?? 0.2
  const showForceAnalysis = params.showForceAnalysis ?? 1

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    // 切换模式时重置动画时间并停止播放，以防溢出
    animationActions.resetAnimation()
    setParams({
      ...params,
      mode: nextMode,
    })
  }

  const handleBChange = (val: number) => updateParam('B', val)
  const handleLChange = (val: number) => updateParam('L', val)
  const handleRChange = (val: number) => updateParam('R', val)
  const handleVChange = (val: number) => updateParam('v', val)
  const handleFextChange = (val: number) => updateParam('F_ext', val)
  const handleMChange = (val: number) => updateParam('m', val)
  const handleShowForceChange = (checked: boolean) => updateParam('showForceAnalysis', checked ? 1 : 0)

  return (
    <div className={`space-y-6 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* 模式选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-800">实验模式</h3>
        <SegmentedControl
          options={[
            { label: '基础: 恒速切割', value: 0 },
            { label: '进阶: 自由释放(变加速)', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
        />
      </div>

      {/* 视觉辅助开关 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-800">受力矢量分析图层</span>
        <ToggleSwitch
          label="开启"
          checked={showForceAnalysis === 1}
          onChange={handleShowForceChange}
        />
      </div>

      {/* 参数控制滑块 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-5">
        <h3 className="text-sm font-semibold text-neutral-800">物理参数</h3>

        <div className="space-y-4">
          <Slider
            label="磁感应强度 B"
            value={B}
            min={0.1}
            max={3.0}
            step={0.1}
            unit="T"
            onChange={handleBChange}
          />
          
          <Slider
            label="导轨间距 L"
            value={L}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="m"
            onChange={handleLChange}
          />

          <Slider
            label="回路电阻 R"
            value={R}
            min={0.5}
            max={5.0}
            step={0.1}
            unit="Ω"
            onChange={handleRChange}
          />

          {mode === 0 ? (
            <Slider
              label="切割速度 v"
              value={v}
              min={-5.0}
              max={5.0}
              step={0.2}
              unit="m/s"
              onChange={handleVChange}
            />
          ) : (
            <>
              <Slider
                label="恒定外力 F外"
                value={F_ext}
                min={0.0}
                max={5.0}
                step={0.1}
                unit="N"
                onChange={handleFextChange}
              />
              <Slider
                label="导体棒质量 m"
                value={m}
                min={0.05}
                max={1.0}
                step={0.05}
                unit="kg"
                onChange={handleMChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CuttingEMFSidebarExtra
