import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard, LeftPanelSection } from '@/components/UI'

export default function ElectricPotentialSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const zeroRef = params.zeroRef ?? 0 // 0=无穷远, 1=大地
  const drawMode = params.drawMode ?? 0 // 0=直线, 1=手写

  const handleZeroRefChange = (value: number | string) => {
    updateParam('zeroRef', Number(value))
  }

  const handleDrawModeChange = (checked: boolean) => {
    updateParam('drawMode', checked ? 1 : 0)
    // 切换模式时，重置播放状态和轨迹进度
    updateParam('runTime', 0)
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="零势参考"
        options={[
          { value: 0, label: '无穷远为0V' },
          { value: 1, label: '大地为0V' },
        ]}
        value={zeroRef}
        onChange={handleZeroRefChange}
        disabled={disabled}
      />

      <ToggleSwitch
        label="锁定A-B点并激活自由手绘路径"
        checked={drawMode === 1}
        onChange={handleDrawModeChange}
        disabled={disabled}
      />

      <TipCard variant="primary">
        <span className="font-semibold block mb-1">💡 高考考点探究指导</span>
        <div className="space-y-2 text-xs text-neutral-600 leading-relaxed">
          <p>
            <strong>1. 路径无关性验证</strong>：开启手写模式，用鼠标在下方的动画区域任意绘制出一条弯曲轨迹（起点自 A 开始，终点移向 B 释放）。点击“播放”按钮观察粒子滑行，其电势能与动能剧烈吞吐。当粒子撞击 B 点瞬间，右屏结算的 <span className="text-purple-600 font-bold">ΔEp</span> 与直线滑行做功完全相同，直观打破“路径长做功多”的易错直觉。
          </p>
          <p>
            <strong>2. 零势选择的相对性</strong>：切换零势参考模式为“大地为0V”，观察 A、B 点的绝对电势发生显著平移，但右侧屏的 <span className="text-amber-600 font-bold">U_AB</span> 和 <span className="text-purple-600 font-bold">ΔEp</span> 结算完全不受影响，证实电势的相对性与电势差的绝对性。
          </p>
          <p>
            <strong>3. φ - x 图像切线斜率法</strong>：在最上方的图表上左右滑动鼠标，图表上将同步生成黄色切线。该切线斜率的绝对值 $|k| = |d\varphi/dx|$ 即为该位置的电场强度 $E$，下半屏动画区域对应 x 位置的黄色场强箭头大小会同步收缩变长，揭示压轴题图像核心规律。
          </p>
        </div>
      </TipCard>
    </LeftPanelSection>
  )
}
