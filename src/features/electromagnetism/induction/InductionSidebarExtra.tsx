import React from 'react'
import { SegmentedControl, ToggleSwitch, Slider } from '@/components/UI'

interface InductionSidebarExtraProps {
  params: Record<string, number>
  updateParam: (key: string, value: number) => void
  setParams: (params: Record<string, number>) => void
  disabled?: boolean
}

export const InductionSidebarExtra: React.FC<InductionSidebarExtraProps> = ({
  params,
  updateParam,
  setParams,
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const showLines = params.showLines ?? 1
  const magnetSpeed = params.magnetSpeed ?? 0
  const magnetPole = params.magnetPole ?? 1
  const resistance = params.resistance ?? 50
  const circuitSwitch = params.circuitSwitch ?? 1
  const hasIronCore = params.hasIronCore ?? 1

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    // 切换模式时，重置速度和位置
    setParams({
      ...params,
      mode: nextMode,
      magnetX: nextMode === 0 ? 160 : 400, // 基础模式下重置在左侧，进阶模式磁铁隐藏/不用
      magnetSpeed: 0,
      dR_dt: 0,
      resistance: 50,
      circuitSwitch: 1,
      hasIronCore: 1,
    })
  }

  const handleShowLinesChange = (checked: boolean) => {
    updateParam('showLines', checked ? 1 : 0)
  }

  const handlePoleChange = (val: number | string) => {
    updateParam('magnetPole', Number(val))
  }

  const handleSpeedChange = (val: number) => {
    updateParam('magnetSpeed', val)
  }

  const handleResistanceChange = (val: number) => {
    // 此时由 InductionPhenomenon 计算阻值变化率 dR_dt，此处仅做值同步
    updateParam('resistance', val)
  }

  return (
    <div className={`space-y-6 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* 模式选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-800">实验模式</h3>
        <SegmentedControl
          options={[
            { label: '基础: 磁铁运动', value: 0 },
            { label: '进阶: 双线圈回路', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
        />
      </div>

      {/* 显示开关 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-800">视觉辅助</span>
        <ToggleSwitch
          label="显示磁感线"
          checked={showLines === 1}
          onChange={handleShowLinesChange}
        />
      </div>

      {/* 模式特异参数控制 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-5">
        <h3 className="text-sm font-semibold text-neutral-800">参数控制</h3>

        {mode === 0 ? (
          // 基础模式下的自变量控制
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-600 block">磁极朝向</span>
              <SegmentedControl
                options={[
                  { label: '左S 右N (推荐)', value: 1 },
                  { label: '左N 右S', value: -1 },
                ]}
                value={magnetPole}
                onChange={handlePoleChange}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Slider
                label="磁铁运动速度 v"
                value={magnetSpeed}
                min={-5}
                max={5}
                step={0.1}
                unit="px/s"
                onChange={handleSpeedChange}
              />
              <span className="text-[10px] text-neutral-400 block mt-1 leading-relaxed">
                正值代表磁铁向右运动（插入/靠近线圈），负值代表磁铁向左运动（拔出/远离线圈）。
              </span>
            </div>
          </div>
        ) : (
          // 进阶模式下的自变量控制
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <ToggleSwitch
                label="电路开关"
                checked={!!circuitSwitch}
                onChange={(checked) => updateParam('circuitSwitch', checked ? 1 : 0)}
              />
            </div>
            <span className="text-[10px] text-neutral-400 block leading-relaxed">
              点击画布上的开关或此处切换。断开瞬间和闭合瞬间都会在副线圈中产生感应电流。
            </span>

            <div className="flex items-center justify-between pt-1">
              <ToggleSwitch
                label="插入铁芯"
                checked={!!hasIronCore}
                onChange={(checked) => updateParam('hasIronCore', checked ? 1 : 0)}
              />
            </div>
            <span className="text-[10px] text-neutral-400 block leading-relaxed">
              铁芯能大幅增强磁场聚集能力。关闭后感应电流显著减弱，演示真实实验中为何必须插入铁棒。
            </span>

            <div className="space-y-2 pt-1">
              <Slider
                label="滑动变阻器阻值 R"
                value={resistance}
                min={5}
                max={100}
                step={1}
                unit="Ω"
                onChange={handleResistanceChange}
                disabled={!circuitSwitch}
              />
              <span className="text-[10px] text-neutral-400 block mt-1 leading-relaxed">
                拖动滑块改变阻值。改变阻值的速度越快，感应电流越大；静止时无感应电流。
                {!circuitSwitch && '（电路断开时不可调）'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InductionSidebarExtra
