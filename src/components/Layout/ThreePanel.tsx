import React, { useEffect, useState } from 'react'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { BREAKPOINT, PANEL } from '@/theme/spacing'
import { duration, easing } from '@/theme/motion'

// ─── 响应式断点分级 ──────────────────────────────────────────────────────
type Tier = 'mobile' | 'tablet' | 'compact' | 'standard'

function getTier(w: number): Tier {
  if (w >= BREAKPOINT.desktop) return 'standard'   // ≥1440
  if (w >= BREAKPOINT.tablet)  return 'compact'     // 1280–1439
  if (w >= BREAKPOINT.mobile)  return 'tablet'       // 1024–1279
  return 'mobile'                                    // < 1024
}

function useBreakpoint(): Tier {
  const [tier, setTier] = useState<Tier>(() => getTier(window.innerWidth))
  useEffect(() => {
    const onResize = () => setTier(getTier(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return tier
}

// ─── ThreePanel ──────────────────────────────────────────────────────────
interface ThreePanelProps {
  left?: React.ReactNode
  center: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export const ThreePanel: React.FC<ThreePanelProps> = ({
  left,
  center,
  right,
  className = '',
}) => {
  const tier = useBreakpoint()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 桌面端自动关闭抽屉
  useEffect(() => {
    if (tier === 'standard' || tier === 'compact') setDrawerOpen(false)
  }, [tier])

  const leftDrawer = tier === 'tablet' || tier === 'mobile'
  const rightBelow = tier === 'mobile'
  const leftW = tier === 'standard' ? PANEL.left.standard : PANEL.left.compact
  const rightW = tier === 'standard' ? PANEL.right.standard : PANEL.right.compact

  return (
    <div className={`relative flex h-full ${rightBelow ? 'flex-col' : ''} ${className}`}>
      {/* ── 左侧面板 ──────────────────────────────────────────────── */}
      {left && (
        leftDrawer ? (
          <>
            {/* 抽屉切换按钮 */}
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="absolute top-3 left-3 z-30 p-1.5 rounded-lg bg-white shadow-md border border-neutral-200 hover:bg-neutral-50 active:scale-[0.97]"
              style={{ transition: `all ${duration.fast}ms ${easing.standard}` }}
              aria-label={drawerOpen ? '关闭参数面板' : '打开参数面板'}
            >
              {drawerOpen
                ? <PanelLeftClose className="w-4 h-4 text-neutral-600" />
                : <PanelLeftOpen className="w-4 h-4 text-neutral-600" />}
            </button>

            {/* 遮罩层 */}
            {drawerOpen && (
              <div
                className="absolute inset-0 z-20 bg-black/20"
                onClick={() => setDrawerOpen(false)}
              />
            )}

            {/* 抽屉面板 */}
            <div
              className="absolute top-0 left-0 z-30 h-full bg-neutral-50 border-r border-neutral-200 overflow-y-auto shadow-xl"
              style={{
                width: leftW,
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: `transform ${duration.normal}ms ${easing.standard}`,
              }}
            >
              {left}
            </div>
          </>
        ) : (
          /* 固定侧边面板 */
          <div
            className="flex-shrink-0 bg-neutral-50 border-r border-neutral-200 overflow-y-auto"
            style={{ width: leftW }}
          >
            {left}
          </div>
        )
      )}

      {/* ── 中间 Canvas 区域 ───────────────────────────────────────── */}
      <div
        className="flex-1 bg-white overflow-hidden"
        style={{ minWidth: rightBelow ? 0 : 400 }}
      >
        {center}
      </div>

      {/* ── 右侧面板 ──────────────────────────────────────────────── */}
      {right && (
        rightBelow ? (
          /* 移动端：右侧下移 */
          <div
            className="flex-shrink-0 bg-neutral-50 border-t border-neutral-200 overflow-y-auto"
            style={{ maxHeight: '40vh' }}
          >
            {right}
          </div>
        ) : (
          /* 固定侧边面板 */
          <div
            className="flex-shrink-0 bg-neutral-50 border-l border-neutral-200 overflow-y-auto"
            style={{ width: rightW }}
          >
            {right}
          </div>
        )
      )}
    </div>
  )
}
