import type { WrongStatus } from '@/stores'
import { colors } from '@/theme/colors'

export const STATUS_META: Record<WrongStatus, { label: string; color: string }> = {
  new: { label: '未复习', color: colors.danger[500] },
  viewed: { label: '已查看', color: colors.warning[500] },
  retrying: { label: '重练中', color: colors.primary[500] },
  mastered: { label: '已掌握', color: colors.success[500] },
}