import React from 'react'

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
 */
export const LeftPanel: React.FC<LeftPanelProps> = ({ children, className = '' }) => {
  return (
    <div className={['relative flex min-h-full flex-col gap-3 p-4', className].filter(Boolean).join(' ')}>
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
  const padding = compact ? 'p-2' : 'p-4'
  const headerSpacing = compact ? 'mb-1' : 'mb-3'

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
