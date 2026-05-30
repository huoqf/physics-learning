import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { colors } from '@/theme/colors'

interface ProgressBadgeProps {
  mastered: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
  mastered,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex-shrink-0">
      {mastered ? (
        <CheckCircle2
          className={sizeClasses[size]}
          style={{ color: colors.success[600] }}
        />
      ) : (
        <Circle
          className={sizeClasses[size]}
          style={{ color: colors.neutral[300] }}
        />
      )}
    </div>
  )
}

export default ProgressBadge
