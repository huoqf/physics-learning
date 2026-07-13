/**
 * 字体缩放函数类型。
 *
 * 由 useCanvasSize / useAnimationViewport 提供，
 * 组件接收此函数将设计稿基准字号缩放到实际容器尺寸。
 * 签名：(baseDesignPx: number) => actualPx
 */
export type FontScaler = (base: number) => number

/**
 * 默认字体缩放函数（恒等映射）。
 * 用于不需要响应式缩放的场景或测试环境。
 */
export const identityFontScaler: FontScaler = (n) => n
