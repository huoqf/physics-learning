import { useEffect, useState } from 'react'
import { useWrongStore, registerBeforeUnload } from '@/stores/useWrongStore'
import { usePracticeStore } from '@/stores/usePracticeStore'

/**
 * 应用启动初始化器 — 统一执行所有 store 的异步水合，
 * 避免在各页面分散调用 hydrate()。
 *
 * 就绪前渲染 loading 态，就绪后渲染 children。
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const cleanup = registerBeforeUnload()

    Promise.all([
      useWrongStore.getState().hydrate(),
      usePracticeStore.getState().hydrate(),
    ])
      .catch((err) => console.error('[AppInitializer] 水合异常:', err))
      .finally(() => setReady(true))

    return cleanup
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-400 text-sm">加载中…</div>
      </div>
    )
  }

  return <>{children}</>
}
