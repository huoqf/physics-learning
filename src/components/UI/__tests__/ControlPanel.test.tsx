import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ControlMeta } from '@/data/types'
import { ControlPanel } from '../ControlPanel'

function renderControlPanel(controls: ControlMeta[], params: Record<string, number> = {}) {
  const updateParam = vi.fn()
  const setParams = vi.fn()
  const resetAnimation = vi.fn()
  const restartAnimation = vi.fn()

  render(
    <ControlPanel
      controls={controls}
      params={params}
      updateParam={updateParam}
      setParams={setParams}
      resetAnimation={resetAnimation}
      restartAnimation={restartAnimation}
    />,
  )

  return { updateParam, setParams, resetAnimation, restartAnimation }
}

describe('ControlPanel', () => {
  it('渲染 segmented 控件并在 resetOnChange 时重置动画', () => {
    const { updateParam, resetAnimation } = renderControlPanel([
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        options: [
          { value: 0, label: '基础' },
          { value: 1, label: '进阶' },
        ],
        resetOnChange: true,
      },
    ], { mode: 0 })

    fireEvent.click(screen.getByRole('button', { name: '进阶' }))
    expect(updateParam).toHaveBeenCalledWith('mode', 1)
    expect(resetAnimation).toHaveBeenCalledTimes(1)
  })

  it('根据 showIf 条件显示提示控件', () => {
    renderControlPanel([
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        title: '提示',
        content: '仅进阶模式显示',
      },
    ], { mode: 1 })

    expect(screen.getByText('提示')).toBeTruthy()
    expect(screen.getByText('仅进阶模式显示')).toBeTruthy()
  })

  it('tip 控件支持函数式 content 根据 params 动态渲染', () => {
    renderControlPanel([
      {
        type: 'tip',
        group: '教学提示',
        content: (params) => `当前步骤: ${params.step ?? 0}`,
      },
    ], { step: 2 })

    expect(screen.getByText('当前步骤: 2')).toBeTruthy()
  })

  it('preset 控件批量写入参数并默认重置动画', () => {
    const { setParams, resetAnimation } = renderControlPanel([
      {
        type: 'preset',
        label: '常用组合',
        params: { theta: 37, mu: 0.2 },
        description: '37° / 0.2',
      },
    ], { theta: 30, mu: 0.1 })

    fireEvent.click(screen.getByRole('button', { name: /常用组合/ }))
    expect(setParams).toHaveBeenCalledWith({ theta: 37, mu: 0.2 })
    expect(resetAnimation).toHaveBeenCalledTimes(1)
  })
})
