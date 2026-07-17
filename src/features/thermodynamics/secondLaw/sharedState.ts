/**
 * 共享热力学第二定律的实时数据，以打通主屏粒子动力学和右侧图表面板。
 */
export const secondLawSharedState = {
  /** 熵的历史记录，用于图表展示。格式为 { x: 时间 t, y: 熵 S } */
  entropyHistory: [] as { x: number; y: number }[],
  /** 当前的熵 */
  currentS: 0,
  /** 当前的微观态数对数 */
  lnOmega: 0,
  /** 重置状态 */
  clear() {
    this.entropyHistory = []
    this.currentS = 0
    this.lnOmega = 0
  }
}
