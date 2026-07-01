import type { FC } from 'react';
import { SegmentedControl, LeftPanelSection } from '@/components/UI';
import type { SidebarExtraProps } from '@/data/types';

const SpringCompositeSidebar: FC<SidebarExtraProps> = ({ params, updateParam, disabled }) => {
  const mode = params.mode ?? 0;

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number);
    updateParam('time', 0);
  };

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
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
      <p className='text-ui-base text-neutral-400 leading-normal'>
        {mode === 1 ? (
          <>弹簧固定在顶部，小球从原长位置 B 点由静止释放。</>
        ) : (
          <>自由落体段（A→B）：小球仅受重力，加速度 a = g 恒定。</>
        )}
      </p>
    </LeftPanelSection>
  );
};

export default SpringCompositeSidebar;
