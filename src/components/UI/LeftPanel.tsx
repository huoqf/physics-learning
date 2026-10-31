import React from 'react'
import { LEFT_PANEL_PADDING } from '@/theme/spacing'

interface LeftPanelProps {
  children: React.ReactNode
  className?: string
}

interface LeftPanelSectionProps {
  children: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  compact?: boolean
}

/**
 * 左屏统一容器。
 *
 * 用于 AnimationPage 的左侧控制台，统一外边距、纵向间距和定位上下文。
 * 内部具体内容仍可由 ParamControl 渐进迁移。
 *
 * 内边距取 p-3（12px）而非 p-4：左屏固定只有 280px（窄屏 240px），
 * 外层 p-4 + 分区 p-4 + 段控轨道 p-1 三层叠加会吃掉 72px（26%），
 * 留给按钮的只剩 208px —— 三档分段器每格仅 65px（约 5 个汉字），
 * 「弹簧与胡克定律」这类 7 字标签被迫折两行，全仓 51% 的分段器都受影响。
 *
 * 类名本身来自 `LEFT_PANEL_PADDING`（theme/spacing.ts），**不要在组件里写 `p-3` 字面量**：
 * 静态守卫 `check-control-meta` 按该 token 现算分段器宽度预算，改内边距只改 token 一处。
 */
export const LeftPanel: React.FC<LeftPanelProps> = ({ children, className = '' }) => {
  return (
    <div
      className={['relative flex min-h-full flex-col gap-2', LEFT_PANEL_PADDING.panel, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

/**
 * 左屏分区卡片。
 *
 * 统一“模型选择 / 核心参数 / 显示辅助 / 快捷预设 / 教学提示”等控制区的视觉容器。
 */
export const LeftPanelSection: React.FC<LeftPanelSectionProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  compact = false,
}) => {
  // 12px 是左屏常态档（见 LeftPanel 注释）；compact 档留给「参数设置」这类纯滑块区。
  // 两档都取自 LEFT_PANEL_PADDING，静态守卫据此算分段器宽度预算。
  const padding = compact ? LEFT_PANEL_PADDING.sectionCompact : LEFT_PANEL_PADDING.section
  const headerSpacing = compact ? 'mb-1' : 'mb-2'

  return (
    <section
      className={[
        'shrink-0 rounded-xl border border-neutral-200 bg-white shadow-sm',
        padding,
        className,
      ].filter(Boolean).join(' ')}
    >
      {(title || subtitle || action) && (
        <div className={['flex items-start justify-between gap-2', headerSpacing].filter(Boolean).join(' ')}>
          <div className="min-w-0">
            {title && (
              <div className="text-[12px] font-semibold text-neutral-600 leading-snug">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-ui-base text-neutral-400 leading-snug">
                {subtitle}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
