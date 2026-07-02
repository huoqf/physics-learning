/**
 * 串并联电路布局定义。
 * 纯函数，无副作用，不依赖 React/DOM。
 */

export interface Point {
  x: number
  y: number
}

/** 串联电路布局 */
export interface SeriesLayout {
  batteryCenter: Point
  r1Center: Point
  r2Center: Point
  ammeterCenter: Point
  voltmeterCenter: Point
  loopPoints: Point[]
}

/** 并联电路布局 */
export interface ParallelLayout {
  batteryCenter: Point
  ammeterCenter: Point
  r1Center: Point
  r2Center: Point
  voltmeterCenter: Point
  mainA: Point[]
  branch1: Point[]
  branch2: Point[]
  mainB: Point[]
}

/** 混联电路布局 */
export interface MixedLayout {
  batteryCenter: Point
  r1Center: Point
  ammeterCenter: Point
  r2Center: Point
  r3Center: Point
  voltmeterCenter: Point
  mainA: Point[]
  branch1: Point[]
  branch2: Point[]
  mainB: Point[]
}

/** 串联电路几何位置和电荷路径 */
export function buildSeriesLayout(): SeriesLayout {
  const batteryCenter = { x: 80, y: 180 }
  const r1Center = { x: 250, y: 80 }
  const r2Center = { x: 440, y: 80 }
  const ammeterCenter = { x: 570, y: 180 }
  const voltmeterCenter = { x: 440, y: 30 }

  // 完整的电荷闭合回路路径 (电源正极->R1->R2->电流表->电源负极)
  const loopPoints: Point[] = [
    { x: 80, y: 140 }, // 电源正极
    { x: 80, y: 80 },
    { x: 200, y: 80 }, // R1左侧
    { x: 300, y: 80 }, // R1右侧
    { x: 380, y: 80 }, // R2左侧 (变阻器接入端)
    { x: 500, y: 80 }, // R2右侧 (滑杆输出端)
    { x: 570, y: 80 },
    { x: 570, y: 140 }, // 电流表顶端
    { x: 570, y: 220 }, // 电流表底端
    { x: 570, y: 280 },
    { x: 80, y: 280 },
    { x: 80, y: 220 }, // 电源负极
    { x: 80, y: 140 }, // 回到起点
  ]

  return { batteryCenter, r1Center, r2Center, ammeterCenter, voltmeterCenter, loopPoints }
}

/** 并联电路几何位置和电荷路径 */
export function buildParallelLayout(): ParallelLayout {
  const batteryCenter = { x: 80, y: 180 }
  const ammeterCenter = { x: 190, y: 80 } // 串在干路
  const r1Center = { x: 390, y: 130 }   // 支路1
  const r2Center = { x: 390, y: 230 }   // 支路2
  const voltmeterCenter = { x: 390, y: 300 } // 并联在 R2 两端

  // 并联分段电荷路径：干路 + 支路1 + 支路2
  const mainA: Point[] = [
    { x: 80, y: 140 }, // 电源正极
    { x: 80, y: 80 },
    { x: 150, y: 80 }, // 电流表左
    { x: 230, y: 80 }, // 电流表右
    { x: 290, y: 80 }, // 左分流点
  ]
  const branch1: Point[] = [
    { x: 290, y: 80 }, // 左分流点
    { x: 290, y: 130 },
    { x: 330, y: 130 }, // R1 左
    { x: 450, y: 130 }, // R1 右
    { x: 490, y: 130 },
    { x: 490, y: 80 }, // 右汇合点
  ]
  const branch2: Point[] = [
    { x: 290, y: 80 }, // 左分流点
    { x: 290, y: 230 },
    { x: 330, y: 230 }, // R2 左
    { x: 450, y: 230 }, // R2 右
    { x: 490, y: 230 },
    { x: 490, y: 80 }, // 右汇合点
  ]
  const mainB: Point[] = [
    { x: 490, y: 80 }, // 右汇合点
    { x: 570, y: 80 },
    { x: 570, y: 280 },
    { x: 80, y: 280 },
    { x: 80, y: 220 }, // 电源负极
    { x: 80, y: 140 }, // 回到起点
  ]

  return { batteryCenter, ammeterCenter, r1Center, r2Center, voltmeterCenter, mainA, branch1, branch2, mainB }
}

/** 混联电路几何位置和电荷路径 */
export function buildMixedLayout(): MixedLayout {
  const batteryCenter = { x: 80, y: 180 }
  const r1Center = { x: 200, y: 80 }   // 串在干路
  const ammeterCenter = { x: 320, y: 80 } // 串在干路测量总电流
  const r2Center = { x: 490, y: 130 }   // 并联支路1
  const r3Center = { x: 490, y: 230 }   // 并联支路2
  const voltmeterCenter = { x: 490, y: 30 } // 跨接在 R2 两端

  const mainA: Point[] = [
    { x: 80, y: 140 }, // 电源正极
    { x: 80, y: 80 },
    { x: 140, y: 80 }, // R1左
    { x: 260, y: 80 }, // R1右
    { x: 280, y: 80 }, // 电流表左
    { x: 360, y: 80 }, // 电流表右
    { x: 410, y: 80 }, // 左分流点
  ]
  const branch1: Point[] = [
    { x: 410, y: 80 },
    { x: 410, y: 130 },
    { x: 430, y: 130 }, // R2左
    { x: 550, y: 130 }, // R2右
    { x: 580, y: 130 },
    { x: 580, y: 80 }, // 右汇合点
  ]
  const branch2: Point[] = [
    { x: 410, y: 80 },
    { x: 410, y: 240 },
    { x: 430, y: 240 }, // R3左
    { x: 550, y: 240 }, // R3右
    { x: 580, y: 240 },
    { x: 580, y: 80 }, // 右汇合点
  ]
  const mainB: Point[] = [
    { x: 580, y: 80 },
    { x: 580, y: 280 },
    { x: 80, y: 280 },
    { x: 80, y: 220 }, // 电源负极
    { x: 80, y: 140 },
  ]

  return { batteryCenter, r1Center, ammeterCenter, r2Center, r3Center, voltmeterCenter, mainA, branch1, branch2, mainB }
}

/**
 * 路径线性插值函数。
 * 在路径上根据 progress (0~1) 插值得到坐标点。
 */
export function getPointOnPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]

  const segments: number[] = []
  let totalLength = 0
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segments.push(len)
    totalLength += len
  }

  if (totalLength === 0) return points[0]

  let targetLen = (progress % 1.0) * totalLength
  if (targetLen < 0) targetLen += totalLength

  let accumulated = 0
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i]
    if (accumulated + len >= targetLen) {
      const ratio = (targetLen - accumulated) / len
      const pStart = points[i]
      const pEnd = points[i + 1]
      return {
        x: pStart.x + (pEnd.x - pStart.x) * ratio,
        y: pStart.y + (pEnd.y - pStart.y) * ratio,
      }
    }
    accumulated += len
  }

  return points[points.length - 1]
}
