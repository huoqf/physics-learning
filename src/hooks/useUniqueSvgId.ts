import { useId } from 'react'

/**
 * 返回一个可用于 SVG id 属性的唯一字符串。
 *
 * React useId() 生成的 ID 包含冒号（如 `:r0:`），
 * 在 SVG `<linearGradient id=...>` 等属性中无效。
 * 本 hook 统一将冒号替换为连字符。
 */
export function useUniqueSvgId(): string {
  return useId().replace(/:/g, '-')
}
