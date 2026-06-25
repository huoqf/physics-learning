import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Button 组件 Props 接口。
 * 继承自 React.ButtonHTMLAttributes<HTMLButtonElement>，支持所有标准的 button 属性。
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮样式变体。
   * - 'primary': 主要按钮，蓝色背景
   * - 'secondary': 次要按钮，白色背景蓝色边框
   * - 'ghost': 幽灵按钮，透明背景
   * - 'danger': 危险按钮，红色背景
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /**
   * 按钮尺寸。
   * - 'sm': 小尺寸 (h-8)
   * - 'md': 中等尺寸 (h-10)
   * - 'lg': 大尺寸 (h-12)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * 是否显示加载状态。
   * 为 true 时会显示旋转图标并禁用按钮。
   * @default false
   */
  loading?: boolean
}

/**
 * Button 通用按钮组件
 *
 * 【设计意图】
 * 1. 统一项目中所有按钮的样式和交互行为，避免各页面重复编写样式代码。
 * 2. 支持四种样式变体：primary、secondary、ghost、danger，覆盖常见使用场景。
 * 3. 内置 loading 状态，异步操作时自动显示加载图标并禁用按钮。
 * 4. 继承原生 button 属性，可直接使用 onClick、disabled 等标准属性。
 *
 * @example
 * ```tsx
 * // 主要按钮
 * <Button onClick={() => console.log('clicked')}>确认</Button>
 *
 * // 次要按钮
 * <Button variant="secondary">取消</Button>
 *
 * // 加载状态
 * <Button loading={true}>提交中...</Button>
 *
 * // 危险操作按钮
 * <Button variant="danger">删除</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = [
    'relative inline-flex items-center justify-center font-medium rounded-md transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'active:scale-[0.97]',
  ]

  const variantStyles = {
    primary: [
      'bg-primary-600 text-white',
      'hover:bg-primary-700',
      'active:bg-primary-800',
      'disabled:bg-neutral-300 disabled:cursor-not-allowed',
    ],
    secondary: [
      'bg-white text-primary-700 border border-primary-300',
      'hover:bg-primary-50 hover:border-primary-400',
      'active:bg-primary-100',
      'disabled:border-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed',
    ],
    ghost: [
      'bg-transparent text-neutral-700',
      'hover:bg-neutral-100',
      'active:bg-neutral-200',
      'disabled:text-neutral-400 disabled:cursor-not-allowed',
    ],
    danger: [
      'bg-danger-500 text-white',
      'hover:bg-danger-600',
      'active:bg-danger-700',
      'disabled:bg-neutral-300 disabled:cursor-not-allowed',
    ],
  }

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        ...baseStyles,
        ...variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-40 cursor-not-allowed',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'inline-flex items-center justify-center'}>
        {children}
      </span>
    </button>
  )
}
