import React, { useEffect, useState } from 'react'
import { duration, easing } from '@/theme/motion'

interface PageTransitionProps {
  children: React.ReactNode
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 延迟一小段时间以确保 DOM 更新后再开始动画
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${duration.slow}ms ${easing.standard}`,
        height: '100%',
      }}
    >
      {children}
    </div>
  )
}

