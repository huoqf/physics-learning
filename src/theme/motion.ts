/**
 * src/theme/motion.ts
 * 动效 token — 所有过渡时长、缓动函数、Framer Motion 配置的唯一来源
 *
 * 动效规范 — 详细规则见 docs/agent-rules/ui/03_MOTION_RULES.md
 * ⚠️ 铁律：组件内禁止硬编码 duration / easing / transition，必须从此处引用
 */

// ─── 时长（ms） ───────────────────────────────────────────────────────────
export const duration = {
  instant:  100,  // 即时反馈（hover 高亮、focus 边框）
  fast:     200,  // 按钮状态切换、下拉展开
  normal:   300,  // 卡片进场、面板展开（默认）
  slow:     500,  // 页面级过渡、模态弹出
  xslow:        800,
  celebration:  800,
  stateChange:  300,
  feedback:     400,
} as const

// ─── 缓动函数（CSS cubic-bezier / Framer Motion 字符串） ──────────────────
export const easing = {
  // 标准交互
  standard:    'cubic-bezier(0.4, 0, 0.2, 1)',   // Material standard — 进出均匀
  decelerate:  'cubic-bezier(0.0, 0.0, 0.2, 1)', // 元素进场（由快到慢）
  accelerate:  'cubic-bezier(0.4, 0.0, 1, 1)',   // 元素退场（由慢到快）
  // 物理感
  spring:      [0.43, 0.195, 0.02, 1.1] as const, // 弹性 spring（Framer Motion array）
  bounce:      'cubic-bezier(0.34, 1.56, 0.64, 1)', // 轻微回弹（参数拖拽释放）
} as const

// ─── 预设 transition 对象（直接传给 Framer Motion motion.div 等）──────────
export const transition = {
  /** 快速淡入淡出（Toast、Tooltip） */
  fade:    { duration: duration.fast   / 1000, ease: easing.standard },
  /** 卡片 / 面板进场 */
  slide:   { duration: duration.normal / 1000, ease: easing.decelerate },
  /** 步骤揭示（解析页） */
  reveal:  { duration: duration.slow   / 1000, ease: easing.decelerate },
  /** 弹簧感弹出（参数面板、模态） */
  spring:  { type: 'spring', stiffness: 260, damping: 20 },
} as const

// ─── Framer Motion 全局配置（传给 <MotionConfig>） ────────────────────────
export const motionConfig = {
  reducedMotion: 'user' as const,  // 尊重系统 prefers-reduced-motion
  transition: transition.slide,
} as const

// ─── Canvas 动画节拍（requestAnimationFrame 相关）────────────────────────
export const canvasAnimation = {
  /** 物理仿真步长（s），配合 speed 倍速播放 */
  dtBase:        1 / 60,
  /** 最大允许 dt（防止窗口失焦后跳帧） */
  dtMax:         1 / 20,
  /** 暂停时 Canvas 整体透明度（见 physicsColors CANVAS_STYLE.opacity.dimmed） */
  pauseOpacity:  0.9,
} as const
