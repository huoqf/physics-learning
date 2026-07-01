import React from 'react'
import { SegmentedControl, ToggleSwitch, TipCard, Slider, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export const CircuitAnalysisSidebar: React.FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = params.mode ?? 0
  const subMode = params.subMode ?? 0
  const R2 = params.R2 ?? 10
  const showChart = params.showChart ?? 1

  return (
    <LeftPanelSection bodyClassName="space-y-5">
      {/* 滑动变阻器 R2 控制 */}
      <Slider
        label="滑动变阻器 R₂"
        value={R2}
        min={0}
        max={100}
        step={1}
        unit="Ω"
        minLabel="0 Ω (短路)"
        midLabel="50 Ω"
        maxLabel="100 Ω (最大)"
        onChange={(v) => updateParam('R2', v)}
        disabled={disabled}
      />

      {/* 图表显示控制 */}
      <div className="pt-2">
        <ToggleSwitch
          label="显示分配对比柱状图"
          checked={showChart === 1}
          onChange={(checked) => updateParam('showChart', checked ? 1 : 0)}
          disabled={disabled}
        />
      </div>

      {/* 操作与极限提示卡片 */}
      <div className="pt-2">
        <TipCard>
          {R2 === 0
            ? '当前变阻器为 0Ω (短路)。基础并联时电路总电阻趋于 0，干路电流极大；混联时并联部分短路，R₃无电流。'
            : R2 === 100
            ? '当前变阻器为 100Ω。观察当 R₂ 增大到极限（断路）时，各电表的读数逼近哪个固定数值。'
            : '拖动 R₂ 滑块，观察电荷粒子流速及导线亮度的此消彼长。右侧将同步显示"串反并同"的推导链条。'}
        </TipCard>
      </div>

      {/* 连接方式选择 (仅基础模式显示) */}
      {mode === 0 && (
        <div className="animate-fade-in pt-3 border-t border-neutral-200">
          <SegmentedControl
            label="连接方式"
            options={[
              { label: '串联电路', value: 0 },
              { label: '并联电路', value: 1 },
            ]}
            value={subMode}
            onChange={(v) => {
              updateParam('subMode', v as number)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
        </div>
      )}

      {/* 模式选择（底部） */}
      <div className="pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础：串/并联分配', value: 0 },
            { label: '进阶：混联动态电路', value: 1 },
          ]}
          value={mode}
          onChange={(v) => {
            updateParam('mode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      </div>
    </LeftPanelSection>
  )
}

export default CircuitAnalysisSidebar
