export const MT_LAYOUT = {
  /** Canvas 安全余量 (px) */
  canvasPadding: 50,
  /** 地面线 Y 偏移 (px) */
  groundOffset: 80,
  /** 球基础半径 (px) */
  ballBaseRadius: 16,
  /** 质量缩放半径系数 (px/kg) */
  massRadiusScale: 2,
  /** 缓冲垫高度 (px) */
  cushionHeight: 20,
  /** 缓冲垫最大压缩量 (px) */
  cushionMaxCompression: 30,
  /** 下落缩放因子 (px per m) */
  fallScale: 40,
  /** 力条最大长度 (px) */
  forceBarMaxLength: 100,
  /** 进阶模式：挡板宽度 (px) */
  plateWidth: 16,
  /** 进阶模式：挡板高度 (px) */
  plateHeight: 80,
  /** 进阶模式：管口宽度 (px) */
  nozzleWidth: 30,
  /** 进阶模式：粒子半径 (px) */
  particleRadius: 3,
  /** 进阶模式：弹簧线段长度 (px) */
  springSegmentLen: 8,
  /** 进阶模式：弹簧圈数 */
  springCoils: 6,
  /** 重力加速度 (m/s²) */
  g: 9.8,
} as const
