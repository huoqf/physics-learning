/**
 * src/theme/colors.ts
 * 唯一颜色 token 来源。Tailwind 配置从此导入，禁止在 tailwind.config.* 中重复定义颜色值。
 * 修改颜色必须先更新本文件，再同步 tailwind.config.ts。
 */

export const colors = {
  // ─── Physics Blue 主色系 ────────────────────────────────────────────────
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // 主色：交互元素、链接
    600: '#2563EB', // 主按钮默认态
    700: '#1D4ED8', // 主按钮 hover、标题强调
    800: '#1E40AF', // 顶部导航背景
    900: '#1E3A8A',
    950: '#172554',
  },

  // ─── Quantum Cyan 辅助色系 ──────────────────────────────────────────────
  secondary: {
    50:  '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE', // 数据面板高亮值
    500: '#06B6D4', // 次要操作按钮、慢放进度条
    600: '#0891B2', // hover
    700: '#0E7490', // active
    800: '#155E75',
    900: '#164E63',
  },

  // ─── Gaokao Gold 高考重点专属色 ─────────────────────────────────────────
  // ⚠️ 仅用于高考要点标注系统，禁止挪作其他用途
  accent: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24', // 高考要点标签背景、难度星星
    500: '#F59E0B', // 快放进度条
    600: '#D97706', // 高考要点文字、极值数值高亮
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // ─── Cool Neutral 冷灰中性色（带蓝调，与主色调和谐）────────────────────
  neutral: {
    0:   '#FFFFFF', // 纯白（仅卡片内部）
    50:  '#F8FAFC', // 页面背景（非纯白，减少视疲劳）
    100: '#F1F5F9', // 次级背景、hover 背景
    200: '#E2E8F0', // 边框、分隔线
    300: '#CBD5E1', // 禁用边框、Canvas 坐标轴
    400: '#94A3B8', // 禁用文字、占位符、Track Gray 粒子轨迹
    500: '#64748B', // 辅助文字（图注、标签）
    600: '#475569', // 正文次要
    700: '#334155', // 正文主要
    800: '#1E293B', // 标题
    900: '#0F172A', // 最深文本、Canvas 内标注、深色模式备用背景
  },

  // ─── 语义状态色 ─────────────────────────────────────────────────────────
  success: {
    100: '#D1FAE5',
    500: '#10B981', // 已掌握状态
    600: '#059669', // 已掌握文字（数值正向激励）
    700: '#047857',
  },
  danger: {
    100: '#FEE2E2',
    500: '#EF4444', // 错题未复习、答错
    600: '#DC2626', // 负值数字、加速度矢量
    700: '#B91C1C', // 多次错误
  },
  warning: {
    100: '#FEF3C7',
    // ⚠️ warning.500 与 accent.500 同值 (#F59E0B) 系有意为之：
    //   accent 用于高考要点标注（装饰语义），warning 用于错题已查看（状态语义），
    //   两者不应同屏共存；若日后需要区分可将 warning.500 改为 #F97316（orange-500）
    500: '#F59E0B', // 错题已查看（状态语义，勿与 accent 混用）
    700: '#B45309',
  },
} as const

export type ColorScale = typeof colors
export type PrimaryColor = keyof typeof colors.primary

// ─── Tailwind 兼容格式（在 tailwind.config.ts 中展开使用）────────────────
export const tailwindColors = {
  primary:   colors.primary,
  secondary: colors.secondary,
  accent:    colors.accent,
  neutral:   colors.neutral,
  success:   colors.success,
  danger:    colors.danger,
  warning:   colors.warning,
}
