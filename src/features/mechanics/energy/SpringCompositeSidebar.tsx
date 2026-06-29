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
            弹簧固定在顶部，小球从原长位置 B 点由静止释放。
            B→C段重力大于弹力，小球做加速度减小的加速运动；C点（平衡位置）速度达到最大；C→D段弹力大于重力，小球做加速度增大的减速运动。
            根据简谐运动的对称性，最低点D的伸长量满足 x_D = 2x_C，此时弹簧拉力为 2mg，合力大小为
            mg，方向向上。
          </>
        ) : (
          <>
            自由落体段（A→B）：小球仅受重力，加速度 a = g 恒定，速度持续增大。
            加速压缩段（B→C）：小球接触弹簧，受到向上的弹力，但 mg &gt; kx，合外力仍向下，加速度 a
            逐渐减小，小球继续做加速运动，速度在平衡位置 C 点（kx_C = mg）达到最大值。
            减速压缩段（C→D）：过平衡点后，弹力大于重力，合外力向上且逐渐增大，小球做加速度增大的减速运动，直到最低点
            D 点速度降为 0，此时弹簧压缩量最大，弹性势能达到最高峰。
          </>
        )}
      </p>
    </div>
  );
};

export default SpringCompositeSidebar;
