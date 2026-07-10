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

/** 串联电路导线路径 */
export const SERIES_PATHS = {
  /** 主回路：电源正极→R1(±18)→R2变阻器(±63)→电流表→电源负极 */
  mainLoop:
    'M 70,165 L 70,120 L 282,120 M 318,120 L 437,120 M 563,120 L 660,120 L 660,165 M 660,165 L 660,210 L 70,210 L 70,165',
  /** 电压表引线：从 R2 两端向上到 y=60，横向连接，形成 U 形 */
  voltmeterLead: 'M 437,120 L 437,60 L 563,60 L 563,120',
} as const

/** 并联电路导线路径 */
export const PARALLEL_PATHS = {
  /** 干路 A：电源正极(122,147)→向上到顶轨 y=40→电流表→分流节点/R1 (y=40 同高直线) */
  mainA: 'M 122,147 L 122,40 L 272,40 M 328,40 L 400,40',
  /** 干路 B：汇合节点 x=700→右侧回路 x=780→底部回路 y=290→电源负极(78,147) */
  mainB: 'M 700,40 L 780,40 L 780,290 L 78,290 L 78,147',
  /** 支路 1 (R1) — 上支路 y=40，导线直连电阻边缘 (550±18) */
  branch1: 'M 400,40 L 532,40 M 568,40 L 700,40',
  /** 支路 2 (R2) — 下支路，延长 R2 两端竖向导线到电压表顶部 y=147，再横向连到电压表 (x=550) */
  branch2: 'M 400,40 L 400,110 L 487,110 L 487,147 L 550,147 M 550,147 L 613,147 L 613,110 L 700,110 L 700,40',
} as const

/** 混联电路导线路径 */
export const MIXED_PATHS = {
  /** 干路 A：电源→R1(±18)→电流表(±28)→分流节点 (y=120) */
  mainA: 'M 70,165 L 70,120 L 162,120 M 198,120 L 272,120 M 328,120 L 380,120',
  /** 干路 B：汇合节点→回路→电源负极 */
  mainB: 'M 620,120 L 660,120 L 660,210 L 70,210 L 70,165',
  /** 支路 1 (R2 变阻器) — y=120 与主轨同高，延长两端竖向导线到电压表底部 y=88，再横向连到电压表 (x=480) */
  branch1: 'M 380,120 L 417,120 L 417,88 L 480,88 M 480,88 L 543,88 L 543,120 L 620,120',
  /** 支路 2 (R3 定值电阻) — y=190 下支路，从分流节点向下 */
  branch2: 'M 380,120 L 380,190 L 462,190 M 498,190 L 620,190 L 620,120',
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
  const batteryCenter = { x: 70, y: 165 }
  const r1Center = { x: 300, y: 120 }
  const r2Center = { x: 500, y: 120 }
  const ammeterCenter = { x: 660, y: 165 }
  const voltmeterCenter = { x: 500, y: 60 }

  // 完整的电荷闭合回路路径
  const loopPoints: Point[] = [
    { x: 70, y: 130 },   // 电源正极
    { x: 70, y: 120 },
    { x: 262, y: 120 },  // R1 左侧
    { x: 338, y: 120 },  // R1 右侧
    { x: 442, y: 120 },  // R2 左侧
    { x: 558, y: 120 },  // R2 右侧
    { x: 660, y: 120 },
    { x: 660, y: 140 },  // 电流表顶端
    { x: 660, y: 190 },  // 电流表底端
    { x: 660, y: 210 },
    { x: 70, y: 210 },
    { x: 70, y: 185 },   // 电源负极
    { x: 70, y: 130 },   // 回到起点
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
  const batteryCenter = { x: 100, y: 125 }
  const ammeterCenter = { x: 300, y: 40 }   // 串在干路
  const r1Center = { x: 550, y: 40 }        // 支路1 (上，与顶轨同高)
  const r2Center = { x: 550, y: 110 }       // 支路2 (下)
  const voltmeterCenter = { x: 550, y: 175 } // R2 正下方 (上移，减少间距)

  const mainA: Point[] = [
    { x: 100, y: 90 },    // 电源正极
    { x: 100, y: 40 },
    { x: 272, y: 40 },    // 电流表左
    { x: 328, y: 40 },    // 电流表右
    { x: 400, y: 40 },    // 左分流节点
  ]
  const branch1: Point[] = [
    { x: 400, y: 40 },    // 左分流节点 (与 R1 同高)
    { x: 532, y: 40 },    // R1 左边缘 (550-18)
    { x: 568, y: 40 },    // R1 右边缘 (550+18)
    { x: 700, y: 40 },    // 右汇合节点
  ]
  const branch2: Point[] = [
    { x: 400, y: 40 },    // 左分流节点
    { x: 400, y: 110 },
    { x: 487, y: 110 },   // R2 左接线柱 (550-63)
    { x: 613, y: 110 },   // R2 右接线柱 (550+63)
    { x: 700, y: 110 },
    { x: 700, y: 40 },    // 右汇合节点
  ]
  const mainB: Point[] = [
    { x: 700, y: 40 },    // 右汇合节点
    { x: 780, y: 40 },
    { x: 780, y: 290 },
    { x: 78, y: 290 },
    { x: 78, y: 147 },    // 电源负极接线柱
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
  const batteryCenter = { x: 70, y: 165 }
  const r1Center = { x: 180, y: 120 }       // 串在干路
  const ammeterCenter = { x: 300, y: 120 }  // 串在干路测量总电流
  const r2Center = { x: 480, y: 120 }       // 并联支路1 (上，变阻器，与主轨同高)
  const r3Center = { x: 480, y: 190 }       // 并联支路2 (下，定值电阻)
  const voltmeterCenter = { x: 480, y: 60 } // 跨接在 R2 两端

  const mainA: Point[] = [
    { x: 70, y: 130 },   // 电源正极
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
    { x: 70, y: 185 },   // 电源负极
    { x: 70, y: 130 },
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
