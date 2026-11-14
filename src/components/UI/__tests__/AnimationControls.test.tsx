import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimationControls } from '../AnimationControls'

describe('AnimationControls', () => {
  it('默认开启逐帧微步，并支持在 0.05s / 0.01s / 0.02s 步长间切换', () => {
    const onPlayPause = vi.fn()
    const onTimeChange = vi.fn()

    render(
      <AnimationControls
        isPlaying={true}
        speed={1}
        time={1.0}
        maxTime={10}
        onPlayPause={onPlayPause}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
        onTimeChange={onTimeChange}
      />,
    )

    // 默认步长 0.05s：点前进应暂停并推进 0.05s
    fireEvent.click(screen.getByRole('button', { name: '前进 0.05 秒' }))
    expect(onPlayPause).toHaveBeenCalledTimes(1)
    expect(onTimeChange).toHaveBeenCalledWith(1.05)

    // 切换步长：0.05 -> 0.1 -> 0.01 -> 0.02 -> 0.05
    const stepToggle = screen.getByRole('button', { name: '切换微步步长，当前 0.05s' })
    fireEvent.click(stepToggle)
    expect(screen.getByRole('button', { name: '切换微步步长，当前 0.1s' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '切换微步步长，当前 0.1s' }))
    expect(screen.getByRole('button', { name: '切换微步步长，当前 0.01s' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '后退 0.01 秒' }))
    expect(onTimeChange).toHaveBeenLastCalledWith(0.99)

    fireEvent.click(screen.getByRole('button', { name: '切换微步步长，当前 0.01s' }))
    expect(screen.getByRole('button', { name: '切换微步步长，当前 0.02s' })).toBeTruthy()

    // 验证精简倍速：保留慢放 0.1x 与正常 1x，移除 2x / 4x
    expect(screen.getByRole('button', { name: '0.1x' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '1x' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '2x' })).toBeNull()
    expect(screen.queryByRole('button', { name: '4x' })).toBeNull()
  })

  it('loop 模式提供暂停/继续、重置、逐帧微步与当前时刻显示', () => {
    const onPlayPause = vi.fn()
    const onReset = vi.fn()
    const onSpeedChange = vi.fn()
    const onTimeChange = vi.fn()

    const { rerender } = render(
      <AnimationControls
        controlsMode="loop"
        isPlaying={true}
        speed={1}
        time={12.34}
        maxTime={30}
        onPlayPause={onPlayPause}
        onReset={onReset}
        onSpeedChange={onSpeedChange}
        onTimeChange={onTimeChange}
      />,
    )

    expect(screen.getByText('循环演示中')).toBeTruthy()
    expect(screen.getByText('t = 12.3s')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    expect(onPlayPause).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '前进 0.05 秒' }))
    expect(onTimeChange).toHaveBeenCalledWith(12.39)

    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    expect(onReset).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '0.5x' }))
    expect(onSpeedChange).toHaveBeenCalledWith(0.5)

    rerender(
      <AnimationControls
        controlsMode="loop"
        isPlaying={false}
        speed={0.5}
        time={12.34}
        maxTime={30}
        onPlayPause={onPlayPause}
        onReset={onReset}
        onSpeedChange={onSpeedChange}
        onTimeChange={onTimeChange}
      />,
    )
    expect(screen.getByText('已定格暂停')).toBeTruthy()
    expect(screen.getByRole('button', { name: '播放' })).toBeTruthy()
  })

  it('关键点芯片、上下跳转按钮与遇临界暂停开关交互正确', () => {
    const onPlayPause = vi.fn()
    const onTimeChange = vi.fn()
    const onToggleAutoPause = vi.fn()
    const onToggleRepeat = vi.fn()

    render(
      <AnimationControls
        isPlaying={true}
        speed={1}
        time={1.0}
        maxTime={8}
        onPlayPause={onPlayPause}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
        onTimeChange={onTimeChange}
        repeatLoop={false}
        onToggleRepeatLoop={onToggleRepeat}
        autoPauseCritical={true}
        onToggleAutoPauseCritical={onToggleAutoPause}
        criticalTimes={[
          { time: 1.44, label: '最高点 vy=0', variant: 'critical', autoPause: true },
          { time: 2.88, label: '落地时刻', variant: 'info' },
        ]}
      />,
    )

    // 下一关键点应跳到 1.44
    fireEvent.click(screen.getByRole('button', { name: '下一关键点' }))
    expect(onPlayPause).toHaveBeenCalledTimes(1)
    expect(onTimeChange).toHaveBeenCalledWith(1.44)

    // 直接点第二个关键点芯片
    fireEvent.click(screen.getByText('落地时刻').closest('button')!)
    expect(onTimeChange).toHaveBeenLastCalledWith(2.88)

    // 循环 & 遇临界暂停按钮
    fireEvent.click(screen.getByRole('button', { name: '开启循环重播' }))
    expect(onToggleRepeat).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('遇临界暂停').closest('button')!)
    expect(onToggleAutoPause).toHaveBeenCalledTimes(1)
  })

  it('过滤非有限值或超出 [0, maxTime] 的临界时刻，防止越界跳转', () => {
    render(
      <AnimationControls
        isPlaying={false}
        speed={1}
        time={0}
        maxTime={5}
        onPlayPause={vi.fn()}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
        onTimeChange={vi.fn()}
        criticalTimes={[
          { time: -1, label: '负时刻' },
          { time: Infinity, label: '永不发生' },
          { time: 2.5, label: '有效时刻', variant: 'critical' },
          { time: 8, label: '超窗时刻' },
        ]}
      />,
    )

    expect(screen.getByText('有效时刻')).toBeTruthy()
    expect(screen.queryByText('负时刻')).toBeNull()
    expect(screen.queryByText('永不发生')).toBeNull()
    expect(screen.queryByText('超窗时刻')).toBeNull()
  })

  it('渲染过程阶段分段芯片并支持频闪周期切换与对照组快照交互', () => {
    const onTimeChange = vi.fn()
    const onToggleTimeSlices = vi.fn()
    const onTimeSliceIntervalChange = vi.fn()
    const onCaptureGhost = vi.fn()
    const onClearGhost = vi.fn()

    render(
      <AnimationControls
        isPlaying={false}
        speed={1}
        time={1.5}
        maxTime={8}
        onPlayPause={vi.fn()}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
        onTimeChange={onTimeChange}
        timeStages={[
          { from: 0, to: 1.2, label: '相对滑动', variant: 'primary' },
          { from: 1.2, to: 4.5, label: '共速整体减速', variant: 'secondary' },
        ]}
        showTimeSlices={true}
        timeSliceInterval={0.1}
        onToggleTimeSlices={onToggleTimeSlices}
        onTimeSliceIntervalChange={onTimeSliceIntervalChange}
        ghostActive={true}
        ghostDiffSummary="初速度: 5→8"
        onCaptureGhost={onCaptureGhost}
        onClearGhost={onClearGhost}
      />,
    )

    fireEvent.click(screen.getByText('共速整体减速').closest('button')!)
    expect(onTimeChange).toHaveBeenCalledWith(1.2)

    fireEvent.click(screen.getByRole('button', { name: '频闪周期 0.1s' }))
    expect(onTimeSliceIntervalChange).toHaveBeenCalledWith(0.2)

    expect(screen.getByText('对照: 初速度: 5→8')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '清除对照快照' }))
    expect(onClearGhost).toHaveBeenCalledTimes(1)
  })
})
