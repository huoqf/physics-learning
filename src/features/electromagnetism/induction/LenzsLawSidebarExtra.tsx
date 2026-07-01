import React from 'react'
import { SegmentedControl, ToggleSwitch, Slider, TipCard } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export const LenzsLawSidebarExtra: React.FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled = false,
}) => {
  const magnetSpeed = params.magnetSpeed ?? 2
  const magnetPole = params.magnetPole ?? 1
  const coilN = params.coilN ?? 10
  const motionMode = params.motionMode ?? 1
  const currentStep = params.currentStep ?? 0
  const showLines = params.showLines ?? 1
  const showEquivalentPoles = params.showEquivalentPoles ?? 1

  return (
    <div className="space-y-6">
      {/* 1. 四步法探究面板 */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-neutral-600">楞次定律“四步探究法”</h3>
        
        <SegmentedControl
          options={[
            { label: '完整', value: 0 },
            { label: '步骤1', value: 1 },
            { label: '步骤2', value: 2 },
            { label: '步骤3', value: 3 },
            { label: '步骤4', value: 4 },
          ]}
          value={currentStep}
          onChange={(val) => updateParam('currentStep', Number(val))}
          disabled={disabled}
        />

        {/* 动态步骤卡片 */}
        {currentStep === 0 && (
          <TipCard variant="info">
            楞次定律是判断感应电流方向的普遍规律。选择分步探究，可逐步推导感应电流的方向及其能量转化。
          </TipCard>
        )}
        {currentStep === 1 && (
          <TipCard variant="info">
            <strong>【第一步：确定原磁场方向 B原】</strong><br />
            条形磁铁的外部磁场由N极指向S极。请观察当前磁铁极性，确定在磁铁与线圈之间，原磁场方向是向上还是向下。
          </TipCard>
        )}
        {currentStep === 2 && (
          <TipCard variant="info">
            <strong>【第二步：确定磁通量变化 ΔΦ】</strong><br />
            根据磁铁运动状态，靠近线圈时穿过线圈的磁通量增加，远离时减少。可在画布上观察穿过线圈的磁感线条数变化。
          </TipCard>
        )}
        {currentStep === 3 && (
          <TipCard variant="info">
            <strong>【第三步：确定感应磁场方向 B感】</strong><br />
            根据楞次定律<strong>“增反减同”</strong>原则：<br />
            • 磁通量<strong>增加</strong>，感应磁场与原磁场<strong>相反</strong>以阻碍其增加；<br />
            • 磁通量<strong>减少</strong>，感应磁场与原磁场<strong>相同</strong>以阻碍其减少。
          </TipCard>
        )}
        {currentStep === 4 && (
          <TipCard variant="primary">
            <strong>【第四步：确定电流方向 I感 及相对运动阻碍】</strong><br />
            • <strong>安培定则：</strong>右手大拇指指向感应磁场方向，四指弯曲方向即为电流方向。<br />
            • <strong>来拒去留：</strong>感应电流阻碍相对运动，靠近排斥，远离吸引，阻碍机制由等效磁极体现。<br />
            • <strong>能量守恒：</strong>克服安培力做功，机械能转化为电能。
          </TipCard>
        )}
      </div>

      {/* 2. 实验参数调节 */}
      <div className="pt-6 border-t border-neutral-200 space-y-4">
        <h3 className="text-xs font-semibold text-neutral-600">参数调节</h3>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-neutral-500 block">磁极朝向</span>
          <SegmentedControl
            options={[
              { label: 'N极朝下 (红下)', value: 1 },
              { label: 'S极朝下 (蓝下)', value: -1 },
            ]}
            value={magnetPole}
            onChange={(val) => {
              updateParam('magnetPole', Number(val))
              animationActions?.resetAnimation()
            }}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-neutral-500 block">运动方式</span>
          <SegmentedControl
            options={[
              { label: '靠近线圈 (插入)', value: 1 },
              { label: '远离线圈 (拔出)', value: 2 },
            ]}
            value={motionMode}
            onChange={(val) => {
              updateParam('motionMode', Number(val))
              animationActions?.resetAnimation()
            }}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Slider
            label="线圈匝数 N"
            value={coilN}
            min={5}
            max={30}
            step={5}
            unit="匝"
            onChange={(val) => updateParam('coilN', val)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Slider
            label="自动运动速度 v"
            value={magnetSpeed}
            min={0.5}
            max={5}
            step={0.5}
            unit="m/s"
            onChange={(val) => updateParam('magnetSpeed', val)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 3. 视觉辅助 */}
      <div className="pt-6 border-t border-neutral-200 space-y-3">
        <h3 className="text-xs font-semibold text-neutral-600">视觉辅助</h3>
        
        <div className="flex items-center justify-between">
          <ToggleSwitch
            label="显示背景磁感线"
            checked={showLines === 1}
            onChange={(checked) => updateParam('showLines', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <ToggleSwitch
            label="显示等效磁极 (来拒去留)"
            checked={showEquivalentPoles === 1}
            onChange={(checked) => updateParam('showEquivalentPoles', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}

export default LenzsLawSidebarExtra
