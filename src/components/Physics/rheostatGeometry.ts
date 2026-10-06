/**
 * 滑动变阻器几何拓扑与尺寸计算函数
 */

export const getRheostatLayout = (width: number) => {
  const baseW = 140
  const scale = width / baseW

  return {
    scale,
    baseW: width,
    coilW: 140 * scale,
    coilH: 20 * scale,
    wiperRange: 120 * scale,
    wiperOffset: -60 * scale,
  }
}

/**
 * 获取滑动变阻器在原理图模式下的关键几何拓扑与有效接入长度（供单测与对齐守卫使用）
 */
export const getRheostatSymbolicGeometry = (
  width: number,
  value: number,
  min = 0,
  max = 100,
) => {
  const layout = getRheostatLayout(width)
  const range = max - min
  const ratio = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0
  const boxW = 48 * layout.scale
  const symbolicWiperX = -18 * layout.scale + ratio * 36 * layout.scale
  const sliderY = -18 * layout.scale
  // 限流式接法（左下进、右上出）：有效接入段为 [-boxW / 2, symbolicWiperX]
  const connectedLength = symbolicWiperX - (-boxW / 2)
  return {
    scale: layout.scale,
    boxW,
    sliderY,
    ratio,
    symbolicWiperX,
    connectedLength,
    termIn: { x: -73 * layout.scale, y: 0 },
    termOut: { x: 73 * layout.scale, y: 0 },
  }
}
