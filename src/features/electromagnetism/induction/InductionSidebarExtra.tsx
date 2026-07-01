import React from 'react'
import { SegmentedControl, ToggleSwitch, Slider, TipCard } from '@/components/UI'

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
  const subCircuitSwitch = params.subCircuitSwitch ?? 1
  const magnetSpeed = params.magnetSpeed ?? 0
  const magnetPole = params.magnetPole ?? 1
  const resistance = params.resistance ?? 50
  const circuitSwitch = params.circuitSwitch ?? 1
  const hasIronCore = params.hasIronCore ?? 1

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    setParams({
      ...params,
      mode: nextMode,
      rodX: 200,
      rodSpeed: 0,
      magnetX: 160,
      magnetSpeed: 0,
      primaryCoilX: 220,
      primaryCoilSpeed: 0,
      dR_dt: 0,
      resistance: 50,
      circuitSwitch: 1,
      hasIronCore: 1,
      subCircuitSwitch: 1,
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. 参数调节 (最上方) */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-neutral-600">参数调节</h3>

        {mode === 0 && (
          <div className="space-y-2">
            <TipCard variant="info">
              请在左侧画布上<strong>直接左右拖拽金属棒</strong>。金属棒向右移动切割时，感应电流向上（指针右偏）；向左移动切割时，感应电流向下（指针左偏）；静止时无感应电流。
            </TipCard>
          </div>
        )}

        {mode === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-500 block">磁极朝向</span>
              <SegmentedControl
                options={[
                  { label: '左S 右N (推荐)', value: 1 },
                  { label: '左N 右S', value: -1 },
                ]}
                value={magnetPole}
                onChange={(val) => updateParam('magnetPole', Number(val))}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Slider
                label="自动移动速度 v"
                value={magnetSpeed}
                min={-5}
                max={5}
                step={0.1}
                unit="px/s"
                onChange={(val) => updateParam('magnetSpeed', val)}
                disabled={disabled}
              />
              <TipCard variant="info">
                正值代表磁铁自动向右穿过线圈，负值代表磁铁自动向左穿出线圈。您也可以<strong>在画布上直接拖拽磁铁</strong>进行手动穿插。
              </TipCard>
            </div>
          </div>
        )}

        {mode === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <ToggleSwitch
                label="原回路开关 (激励侧)"
                checked={circuitSwitch === 1}
                onChange={(checked) => updateParam('circuitSwitch', checked ? 1 : 0)}
                disabled={disabled}
              />
            </div>
            <TipCard variant="info">
              点击激励侧刀闸或此处切换。闭合或断开的<strong>瞬间</strong>，磁通量发生改变，产生瞬时感应电流，随后回弹归零。
            </TipCard>

            <div className="flex items-center justify-between pt-1">
              <ToggleSwitch
                label="插入软铁芯"
                checked={hasIronCore === 1}
                onChange={(checked) => updateParam('hasIronCore', checked ? 1 : 0)}
                disabled={disabled}
              />
            </div>
            <TipCard variant="info">
              软铁芯能极大地聚集磁感线。未插入铁芯时，由于磁场过度发散，感应电流非常微弱。
            </TipCard>

            <div className="space-y-2 pt-1">
              <Slider
                label="滑动变阻器电阻 R"
                value={resistance}
                min={5}
                max={100}
                step={1}
                unit="Ω"
                onChange={(val) => updateParam('resistance', val)}
                disabled={disabled || circuitSwitch !== 1}
              />
              <TipCard variant="info">
                原回路闭合时拖动滑阻。<strong>拖拽滑动的瞬间</strong>磁场变化产生感应电流，滑动越快，感应电流越大；静止时无电流。您也可以<strong>手动拖拽原线圈</strong>进行插拔。
              </TipCard>
            </div>
          </div>
        )}
      </div>

      {/* 2. 核心控制项：副回路控制 */}
      <div className="space-y-4 pt-6 border-t border-neutral-200">
        <h3 className="text-xs font-semibold text-neutral-600">感应回路状态</h3>
        <div className="flex items-center justify-between">
          <ToggleSwitch
            label="副回路开关 (电流计侧)"
            checked={subCircuitSwitch === 1}
            onChange={(checked) => updateParam('subCircuitSwitch', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
        <TipCard variant="info">
          探究产生感应电流是否必须有“<strong>闭合回路</strong>”。断开开关后，无论如何运动或磁场如何改变，灵敏电流计都不会发生偏转。
        </TipCard>
      </div>

      {/* 3. 视觉辅助显示开关 (仅在 mode !== 0 时显示) */}
      {mode !== 0 && (
        <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
          <span className="text-xs font-semibold text-neutral-600">视觉辅助</span>
          <ToggleSwitch
            label="显示磁感线"
            checked={showLines === 1}
            onChange={(checked) => updateParam('showLines', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
      )}

      {/* 4. 实验模式选择 (最下方) */}
      <div className="space-y-3 pt-6 border-t border-neutral-200">
        <h3 className="text-xs font-semibold text-neutral-600">选择探究实验</h3>
        <SegmentedControl
          options={[
            { label: '一：导体切割', value: 0 },
            { label: '二：磁铁穿过', value: 1 },
            { label: '三：双线圈互感', value: 2 },
          ]}
          value={mode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default InductionSidebarExtra
