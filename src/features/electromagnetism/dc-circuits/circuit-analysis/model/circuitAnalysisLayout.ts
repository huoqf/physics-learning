/**
 * 串并联电路布局定义（设计坐标 840×325，与 CANVAS_PRESETS.splitV 对齐）。
 * 纯函数，无副作用，不依赖 React/DOM。
 *
 * 布局原则（v2 优化）：
 *   - 上导线 y=120，下导线 y=210（压缩纵向，减少底部空白）
 *   - 并联/混联支路间距 40px（R1 y=150，R2 y=190）
 *   - 右侧回路段缩短至 x=660（减少右侧空洞）
 *   - 串联元件均匀分布，R₁/R₂ 间距适中
 */

export interface Point {
  x: number
  y: number
}

// ═══════════════════════════════════════════════════════════════════════════
// 导线路径常量 — 与布局坐标统一维护
// ═══════════════════════════════════════════════════════════════════════════

/** 串联电路导线路径 (下导线沉底至 y=235) */
export const SERIES_PATHS = {
  /** 主回路：电源正极(70,157)→R1(±18)→R2变阻器(±63)→电流表(660,177±24)→电源负极(70,197) */
  mainLoop:
    'M 70,157 L 70,120 L 282,120 M 318,120 L 437,120 M 563,120 L 660,120 L 660,153 M 660,201 L 660,235 L 70,235 L 70,197',
  /** 电压表引线：从 R2 两端向上到 y=60，在电压表(500,60±28)两侧接入 */
  voltmeterLead: 'M 437,120 L 437,60 L 472,60 M 528,60 L 563,60 L 563,120',
} as const

/** 并联电路导线路径（黄金对称日字形布局） */
export const PARALLEL_PATHS = {
  /** 干路 A：电源正极(80,153)→向上到顶轨(80,75)→电流表(220,75±24)→分流节点(350,75) */
  mainA: 'M 80,153 L 80,75 L 196,75 M 244,75 L 350,75',
  /** 干路 B：汇合节点(690,75)→右回路(760,75)→底导线(760,270)→电源负极(80,270→80,193) */
  mainB: 'M 690,75 L 760,75 L 760,270 L 80,270 L 80,193',
  /** 支路 1 (R1) — 上支路 y=75，中心(520,75)，左右端子 520±18 */
  branch1: 'M 350,75 L 502,75 M 538,75 L 690,75',
  /** 支路 2 (R2 变阻器) — 下支路 y=150，中心(520,150)，左右端子 520±63=(457, 583) */
  branch2: 'M 350,75 L 350,150 L 457,150 M 583,150 L 690,150 L 690,75',
  /** 电压表引线：从 R2 支路两端端子向下并联至电压表(520,215±24)两侧 */
  voltmeterLead: 'M 457,150 L 457,215 L 496,215 M 544,215 L 583,215 L 583,150',
} as const

/** 混联电路导线路径 (下导线沉底至 y=235) */
export const MIXED_PATHS = {
  /** 干路 A：电源(70,157)→R1(±18)→电流表(±24)→分流节点 (y=120) */
  mainA: 'M 70,157 L 70,120 L 162,120 M 198,120 L 276,120 M 324,120 L 380,120',
  /** 干路 B：汇合节点→回路→电源负极(70,197) */
  mainB: 'M 620,120 L 660,120 L 660,235 L 70,235 L 70,197',
  /** 支路 1 (R2 变阻器) — y=120 与主轨同高，平直端子连线 */
  branch1: 'M 380,120 L 417,120 M 543,120 L 620,120',
  /** 支路 2 (R3 定值电阻) — y=190 下支路，从分流节点向下 */
  branch2: 'M 380,120 L 380,190 L 462,190 M 498,190 L 620,190 L 620,120',
  /** 电压表引线：从 R2 变阻器两端接线柱(417,120 与 543,120)向上并联至电压表(480,60)两侧端子 */
  voltmeterLead: 'M 417,120 L 417,60 L 452,60 M 508,60 L 543,60 L 543,120',
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 布局接口
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// 布局构建函数（设计坐标 840×325）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 串联电路几何位置和电荷路径
 *
 *   ┌── R₁ ──── R₂(变) ── V ──┐
 *   │                           │
 *   E                          A
 *   │                           │
 *   └───────────────────────────┘
 */
export function buildSeriesLayout(): SeriesLayout {
  const batteryCenter = { x: 70, y: 177 }
  const r1Center = { x: 300, y: 120 }
  const r2Center = { x: 500, y: 120 }
  const ammeterCenter = { x: 660, y: 177 }
  const voltmeterCenter = { x: 500, y: 60 }

  // 完整的电荷闭合回路路径
  const loopPoints: Point[] = [
    { x: 70, y: 157 },   // 电源正极端子
    { x: 70, y: 120 },
    { x: 262, y: 120 },  // R1 左侧
    { x: 338, y: 120 },  // R1 右侧
    { x: 442, y: 120 },  // R2 左侧
    { x: 558, y: 120 },  // R2 右侧
    { x: 660, y: 120 },
    { x: 660, y: 153 },  // 电流表顶端
    { x: 660, y: 201 },  // 电流表底端
    { x: 660, y: 235 },
    { x: 70, y: 235 },
    { x: 70, y: 197 },   // 电源负极端子
    { x: 70, y: 157 },   // 回到起点
  ]

  return { batteryCenter, r1Center, r2Center, ammeterCenter, voltmeterCenter, loopPoints }
}

/**
 * 并联电路几何位置和电荷路径
 *
 *   ── A ──── R₁ ──┬──
 *          │        │
 *          └── R₂ ──┘── V(右置)
 *   E                  (回路撑满画布)
 */
export function buildParallelLayout(): ParallelLayout {
  const batteryCenter = { x: 80, y: 173 }
  const ammeterCenter = { x: 220, y: 75 }   // 串在顶干路
  const r1Center = { x: 520, y: 75 }        // 支路1 (上支路)
  const r2Center = { x: 520, y: 150 }       // 支路2 (下支路，变阻器)
  const voltmeterCenter = { x: 520, y: 215 } // 并联跨接在 R2 两端下方

  const mainA: Point[] = [
    { x: 80, y: 153 },   // 电源正极端子
    { x: 80, y: 75 },
    { x: 196, y: 75 },   // 电流表左
    { x: 244, y: 75 },   // 电流表右
    { x: 350, y: 75 },   // 左分流节点
  ]
  const branch1: Point[] = [
    { x: 350, y: 75 },   // 左分流节点 (与 R1 同高)
    { x: 502, y: 75 },   // R1 左边缘 (520-18)
    { x: 538, y: 75 },   // R1 右边缘 (520+18)
    { x: 690, y: 75 },   // 右汇合节点
  ]
  const branch2: Point[] = [
    { x: 350, y: 75 },   // 左分流节点
    { x: 350, y: 150 },  // 垂直折弯至 R2 高度
    { x: 457, y: 150 },  // R2 左端子 (520-63)
    { x: 583, y: 150 },  // R2 右端子 (520+63)
    { x: 690, y: 150 },
    { x: 690, y: 75 },   // 右汇合节点
  ]
  const mainB: Point[] = [
    { x: 690, y: 75 },   // 右汇合节点
    { x: 760, y: 75 },
    { x: 760, y: 270 },
    { x: 80, y: 270 },
    { x: 80, y: 193 },   // 电源负极端子
  ]

  return { batteryCenter, ammeterCenter, r1Center, r2Center, voltmeterCenter, mainA, branch1, branch2, mainB }
}

/**
 * 混联电路几何位置和电荷路径
 *
 *   ── R₁ ── A ──┬── R₂(变) ──┬──
 *                │             │
 *                └── R₃ ───────┘
 *   E                        (回路)
 */
export function buildMixedLayout(): MixedLayout {
  const batteryCenter = { x: 70, y: 177 }
  const r1Center = { x: 180, y: 120 }       // 串在干路
  const ammeterCenter = { x: 300, y: 120 }  // 串在干路测量总电流
  const r2Center = { x: 480, y: 120 }       // 并联支路1 (上，变阻器，与主轨同高)
  const r3Center = { x: 480, y: 190 }       // 并联支路2 (下，定值电阻)
  const voltmeterCenter = { x: 480, y: 60 } // 跨接在 R2 两端

  const mainA: Point[] = [
    { x: 70, y: 145 },   // 电源正极端子
    { x: 70, y: 120 },
    { x: 162, y: 120 },  // R1 左 (180-18)
    { x: 198, y: 120 },  // R1 右 (180+18)
    { x: 272, y: 120 },  // 电流表左 (300-28)
    { x: 328, y: 120 },  // 电流表右 (300+28)
    { x: 380, y: 120 },  // 左分流节点
  ]
  const branch1: Point[] = [
    { x: 380, y: 120 },  // 左分流节点
    { x: 417, y: 120 },  // R2 左接线柱 (480-63)
    { x: 543, y: 120 },  // R2 右接线柱 (480+63)
    { x: 620, y: 120 },  // 右汇合节点
  ]
  const branch2: Point[] = [
    { x: 380, y: 120 },  // 左分流节点
    { x: 380, y: 190 },
    { x: 462, y: 190 },  // R3 左 (480-18)
    { x: 498, y: 190 },  // R3 右 (480+18)
    { x: 620, y: 190 },
    { x: 620, y: 120 },  // 右汇合节点
  ]
  const mainB: Point[] = [
    { x: 620, y: 120 },
    { x: 660, y: 120 },
    { x: 660, y: 210 },
    { x: 70, y: 210 },
    { x: 70, y: 185 },   // 电源负极端子
    { x: 70, y: 145 },
  ]

  return { batteryCenter, r1Center, ammeterCenter, r2Center, r3Center, voltmeterCenter, mainA, branch1, branch2, mainB }
}

// ═══════════════════════════════════════════════════════════════════════════
// 路径插值工具
// ═══════════════════════════════════════════════════════════════════════════

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
