import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/utils/storage', () => {
  let store: Record<string, unknown> = {}
  return {
    storage: {
      getDB: vi.fn(async (k: string) => store[k] ?? null),
      setDB: vi.fn(async (k: string, v: unknown) => {
        store[k] = v
      }),
      __reset: () => {
        store = {}
      },
    },
    // useProgressStore 在模块顶层调用一次；测试里无需真正迁移
    migrateFromLocalStorage: vi.fn(),
  }
})

import WrongPage from '@/pages/WrongPage'
import { useWrongStore, type WrongRecord } from '@/stores/useWrongStore'

const rec = (problemId: string, reasons?: WrongRecord['reasons']): WrongRecord => ({
  problemId,
  errorCount: 1,
  correctStreak: 0,
  status: 'new',
  knowledgeIds: ['mechanics-5x-1'],
  createdAt: 1,
  lastAttemptTime: 1,
  reasons,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <WrongPage />
    </MemoryRouter>,
  )
}

/**
 * 回归：错因 chip 的「选中即隐身」死锁。
 *
 * 复现路径：只有一道题挂了错因 A → 点 A 的 chip 筛选 → 把这道题删掉
 * → `records` 里再没有 A，chip 若跟着消失，选中态却仍生效，列表恒空且无从取消。
 */
describe('WrongPage · 错因 chip 可见性', () => {
  beforeEach(() => {
    // hydrated: true 让 hydrate() 提前返回，保住下面种的数据
    useWrongStore.setState({ records: [], hydrated: true })
  })

  it('删掉最后一条带该错因的记录后，chip 仍在且可再次点击取消', () => {
    act(() => {
      useWrongStore.setState({
        records: [rec('prob-m6-1', ['friction-mutation']), rec('prob-m6-2')],
        hydrated: true,
      })
    })
    renderPage()

    const chip = screen.getByRole('button', { name: '漏判摩擦力突变' })
    act(() => chip.click())

    // 筛选生效：只剩挂了该错因的一道题
    expect(screen.queryByText(/没有符合筛选条件的错题/)).toBeNull()

    // 删掉这道题 —— 数据里已不存在该错因
    act(() => useWrongStore.getState().removeWrong('prob-m6-1'))

    // 关键：chip 不能消失，否则学生无处取消
    const stillThere = screen.getByRole('button', { name: '漏判摩擦力突变' })
    expect(stillThere).toBeTruthy()
    // 列表此时确实为空，并给出了出口
    expect(screen.getByText(/没有符合筛选条件的错题/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '清除全部筛选' })).toBeTruthy()

    // 点掉它 → 恢复全部记录
    act(() => stillThere.click())
    expect(screen.queryByText(/没有符合筛选条件的错题/)).toBeNull()
  })

  it('数据里从未出现过、也没选中的错因不占位（不制造死胶囊）', () => {
    act(() => {
      useWrongStore.setState({ records: [rec('prob-m6-1')], hydrated: true })
    })
    renderPage()
    expect(screen.queryByRole('button', { name: '漏判摩擦力突变' })).toBeNull()
    expect(screen.queryByRole('button', { name: '矢量方向/正负号' })).toBeNull()
  })
})
