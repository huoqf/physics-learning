/**
 * getVisibleRows — 频闪数据表取最后 N 行 + 高亮索引
 *
 * 纯函数，无副作用。调用方自行决定缓存策略（useMemo）。
 *
 * @param data  原始数据（已按时间正序）
 * @param maxRows  最大可见行数
 * @returns { visibleRows, highlightIndex }
 *   - visibleRows: 截取后的行（最后 maxRows 行）
 *   - highlightIndex: 应高亮的行索引（始终指向 visibleRows 最后一行）
 */
export function getVisibleRows<T>(data: T[], maxRows: number): {
  visibleRows: T[]
  highlightIndex: number
} {
  const visible = data.slice(-maxRows)
  return { visibleRows: visible, highlightIndex: visible.length - 1 }
}