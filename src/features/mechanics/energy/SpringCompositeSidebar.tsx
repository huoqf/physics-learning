import type { FC } from 'react';
import { SegmentedControl, ToggleSwitch } from '@/components/UI';
import type { SidebarExtraProps } from '@/data/types';

/**
 * 竖直弹簧复合模型侧边栏扩展
 */
const SpringCompositeSidebar: FC<SidebarExtraProps> = ({ params, updateParam, disabled }) => {
  const mode = params.mode ?? 0; // 0=下落砸弹簧，1=原长释放
  const showVectors = params.showVectors !== 0; // 默认为开启 (1)
  const autoPause = params.autoPause !== 0; // 默认为开启 (1)

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number);
    updateParam('time', 0); // 重置时间
  };

  return (
    <div className='flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200'>
      <SegmentedControl
        label='运动模式'
        options={[
          { value: 0, label: '下落砸弹簧' },
          { value: 1, label: '原长释放挂球' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      <h4 className='text-xs font-semibold text-neutral-600'>辅助分析显示</h4>

      <div className='flex flex-col gap-3'>
        <ToggleSwitch
          label='显示物理矢量'
          checked={showVectors}
          onChange={(checked) => updateParam('showVectors', checked ? 1 : 0)}
          disabled={disabled}
        />
        <ToggleSwitch
          label='平衡位置自动暂停高亮'
          checked={autoPause}
          onChange={(checked) => updateParam('autoPause', checked ? 1 : 0)}
          disabled={disabled}
        />
      </div>

      <p className='text-[10px] text-neutral-400 leading-normal'>
        {mode === 1 ? (
          <>
            弹簧固定在顶部，小球从原长位置（B点）由静止释放。
            B→C段重力大于弹力，小球加速；C点平衡位置速度最大；C→D段弹力大于重力，小球减速。
            根据对称性，最低点D满足 x_D = 2x_C（伸长量为平衡位置的2倍）。
          </>
        ) : (
          <>
            在自由落体阶段小球仅受重力，速度增大，加速度恒为 g。
            触网瞬间，弹簧弹力开始增加但小于重力，合力仍向下，小球继续加速，但加速度减小。
            到达平衡位置时，重力等于弹力，加速度为
            0，速度达到极大。之后弹力大于重力，小球开始减速直至最低点。
          </>
        )}
      </p>
    </div>
  );
};

export default SpringCompositeSidebar;
