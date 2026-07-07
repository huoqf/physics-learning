/**
 * 电磁感应矩形线框匀速穿过有界匀强磁场模型纯物理计算库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 物理模型：
 * 刚性闭合矩形导线框，沿运动方向水平宽度为 d (m)，垂直方向纵向切割边长为 L (m)，总电阻为 R (Ω)。
 * 线框在恒定外拉力 F_ext 作用下，以恒定速度 v (m/s) 沿水平向右匀速穿过宽度为 D (m) 的匀强磁场区域。
 * 磁感应强度为 B (T)，方向垂直纸面向里。
 *
 * 设定磁场左边缘空间位移坐标为 x = 0，磁场右边缘坐标为 x = D。
 * 以线框前端边（右侧导线）所在位置 x_front = x 为自变量或依据 t 确定的坐标。
 * 则线框后端边（左侧导线）坐标 x_back = x - d。
 */

export type LoopPassState = 'BEFORE' | 'ENTERING' | 'TOTALLY_IN' | 'LEAVING' | 'AFTER'

export interface LoopPassResult {
  /** 运动分段状态 */
  state: LoopPassState
  /** 瞬时磁通量 Φ (Wb) */
  phi: number
  /** 感应电流 I (A，规定逆时针方向为正) */
  currentI: number
  /** 安培力大小 F_A (N，方向恒阻碍运动，水平向左) */
  forceAmpere: number
  /** 感应电动势大小 E (V) */
  emf: number
  /** 外拉力机械做功功率 P_外 (W) */
  powerMech: number
  /** 回路焦耳热电功率 P_热 (W) */
  powerHeat: number
}

/**
 * 精确计算线框前端位于 x 时的分段状态及核心物理量
 *
 * @param x 当前线框前端边（右侧导线）所在位移坐标 (m)
 * @param d 线框沿运动方向宽度 (m)
 * @param D 磁场区域宽度 (m)
 * @param B 磁感应强度 (T)
 * @param L 线框纵向边长 (m)
 * @param R 线框总电阻 (Ω)
 * @param v 线框匀速速度 (m/s)
 * @returns 瞬时物理量与分段状态
 */
export function evaluateLoopSegment(
  x: number,
  d: number,
  D: number,
  B: number,
  L: number,
  R: number,
  v: number
): LoopPassResult {
  const frontX = x
  const backX = x - d

  let state: LoopPassState = 'BEFORE'
  let phi = 0
  let currentI = 0
  let emf = 0

  if (d <= D) {
    // ── 情形一：线框窄于或等于磁场宽度 (d <= D) ──
    if (frontX < 0) {
      state = 'BEFORE'
      phi = 0
      emf = 0
      currentI = 0
    } else if (frontX >= 0 && frontX < d) {
      state = 'ENTERING'
      phi = B * L * frontX
      emf = B * L * v
      // 前侧导线进场切割，根据右手定则，感应电动势方向向上，在回路形成逆时针感应电流 (+)
      currentI = emf / R
    } else if (frontX >= d && frontX < D) {
      state = 'TOTALLY_IN'
      phi = B * L * d
      // 前后两侧导线均在磁场中同时同方向以恒定速度 v 切割磁感线，感应电动势等大反向，互相抵消
      emf = 0
      currentI = 0
    } else if (frontX >= D && backX < D) {
      state = 'LEAVING'
      phi = B * L * (D - backX)
      emf = B * L * v
      // 前侧导线已离场，后侧导线留场切割，感应电动势方向向上，在回路形成顺时针电流 (-)
      currentI = -emf / R
    } else {
      state = 'AFTER'
      phi = 0
      emf = 0
      currentI = 0
    }
  } else {
    // ── 情形二：线框宽于磁场宽度 (d > D) ──
    if (frontX < 0) {
      state = 'BEFORE'
      phi = 0
      emf = 0
      currentI = 0
    } else if (frontX >= 0 && frontX < D) {
      state = 'ENTERING'
      phi = B * L * frontX
      emf = B * L * v
      currentI = emf / R
    } else if (frontX >= D && backX < 0) {
      state = 'TOTALLY_IN' // 磁场被宽线框完全包围在中央
      phi = B * L * D
      // 前后两导线均在无磁场区域运动，无导线切割磁感线，无感应电动势
      emf = 0
      currentI = 0
    } else if (backX >= 0 && backX < D) {
      state = 'LEAVING'
      phi = B * L * (D - backX)
      emf = B * L * v
      currentI = -emf / R
    } else {
      state = 'AFTER'
      phi = 0
      emf = 0
      currentI = 0
    }
  }

  // 安培力方向恒阻碍相对运动（向左），大小取决于切割产生电流的大小
  const forceAmpere = Math.abs(B * currentI * L)
  const powerMech = forceAmpere * v
  const powerHeat = currentI * currentI * R

  return {
    state,
    phi,
    currentI,
    forceAmpere,
    emf,
    powerMech,
    powerHeat,
  }
}
