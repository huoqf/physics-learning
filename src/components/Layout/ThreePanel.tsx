import React, { useEffect, useState } from 'react'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { PANEL } from '@/theme/spacing'
import { duration, easing } from '@/theme/motion'
import { useBreakpoint } from '@/utils'

// ─── ThreePanel ──────────────────────────────────────────────────────────

/**
 * ThreePanel 三栏布局组件 Props 接口。
 * 提供响应式三栏布局，支持桌面端固定侧边栏和移动端抽屉/堆叠模式。
 */
interface ThreePanelProps {
  /**
   * 左侧面板内容。
   * 在桌面端显示为固定侧边栏，在移动端显示为抽屉式面板。
   */
  left?: React.ReactNode
  /**
   * 中间主内容区域。
   * 始终占据主要空间，是页面的核心内容区。
   */
  center: React.ReactNode
  /**
   * 右侧面板内容。
   * 在桌面端显示为固定侧边栏，在移动端下移到主内容下方。
   */
  right?: React.ReactNode
  /**
   * 额外的 CSS 类名。
   */
  className?: string
}

/**
 * ThreePanel 三栏布局组件
 *
 * 【设计意图】
 * 1. 提供响应式三栏布局，适配桌面端、平板端和移动端。
 * 2. 桌面端：左侧面板（参数区）固定，中间（画布）自适应，右侧面板（图例/信息）固定。
 * 3. 平板端：左侧面板变为抽屉式，点击按钮展开/收起。
 * 4. 移动端：左侧面板抽屉式，右侧面板下移到主内容下方。
 * 5. 所有过渡动画使用统一的缓动函数和时长，保证视觉一致性。
 *
 * @example
 * ```tsx
 * // 基础三栏布局
 * <ThreePanel
 *   left={<ParamPanel />}
 *   center={<PhysicsCanvas />}
 *   right={<InfoPanel />}
 * />
 *
 * // 仅有中间内容
 * <ThreePanel center={<FullWidthContent />} />
 *
 * // 带自定义类名
 * <ThreePanel
 *   left={<ControlPanel />}
 *   center={<MainView />}
 *   className="h-screen"
 * />
 * ```
 */
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
