import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** 自定义降级 UI；不传则使用默认卡片 */
  fallback?: ReactNode
  /** 用于在 key 变化时重置错误状态（如路由切换） */
  resetKey?: string | number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界：捕获子树渲染期抛出的错误，避免单个动画/页面崩溃导致整个应用白屏。
 * React 错误边界必须为 class 组件（无 Hook 等价物）。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 仅记录，不上报（本地离线应用）
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <div className="w-full h-full min-h-[40vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-xl font-bold text-neutral-700">该内容暂时无法显示</h2>
        <p className="text-sm text-neutral-500 max-w-md">
          渲染时发生了错误，可尝试重试。若问题持续，请返回上一页或刷新。
        </p>
        <button
          onClick={this.handleReset}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-[0.97]"
        >
          重试
        </button>
      </div>
    )
  }
}
