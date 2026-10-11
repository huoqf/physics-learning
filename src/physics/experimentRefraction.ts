/**
 * 高考物理实验：测定玻璃的折射率（插针法）—— 纯物理计算与几何作图模型。
 *
 * 实验原理与高考核心要素：
 * 1. 矩形平行玻璃砖两界面 aa' 与 bb'，厚度为 d；
 * 2. 入射光线由大头针 P1、P2 确定，入射角 θ₁；
 * 3. 玻璃内部折射角 θ₂ 由折射定律确定：sin θ₂ = (sin θ₁) / n；
 * 4. 出射光线由大头针 P3、P4 确定，方向与入射光线严格平行（因两界面平行）；
 * 5. 单位圆作图法（无量角器法）：以入射点 O 为圆心画圆，截入射与折射光线，向法线作垂线得到线段 AA' 与 BB'，n = AA' / BB'；
 * 6. 高考经典误差分析：下界面 bb' 画窄/画宽时对测得折射率的影响。
 */

/** 默认光线参数 */
export const REFRACTION_EXP_DEFAULTS = {
  theta1Deg: 45,
  nReal: 1.5,
  dMm: 50,
  pinDistMm: 45,
  errorOffsetMm: 0,
}

/** 角度转弧度 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** 弧度转角度 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export interface RefractionExperimentInput {
  /** 入射角 (度, 15° ~ 75°) */
  theta1Deg: number
  /** 玻璃砖真实折射率 (1.30 ~ 1.80) */
  nReal: number
  /** 玻璃砖厚度 (mm, 30 ~ 70 mm) */
  dMm: number
  /** 大头针间距 (mm, 20 ~ 70 mm) */
  pinDistMm: number
  /** 下表面画偏误差 (mm, -10 ~ +10 mm，负为画窄，正为画宽) */
  errorOffsetMm?: number
  /** 单位圆辅助圆半径 (mm, 默认 35 mm) */
  circleRadiusMm?: number
}

export interface PinPosition {
  x: number
  y: number
}

export interface RefractionExperimentResult {
  theta1Deg: number
  theta1Rad: number
  /** 理论折射角 (度) */
  theta2Deg: number
  theta2Rad: number
  /** 玻璃砖真实厚度 (mm) */
  dMm: number
  /** 实际画出的玻璃砖厚度 (mm) = dMm + errorOffsetMm */
  dDrawnMm: number
  /** 下表面画偏量 (mm) */
  errorOffsetMm: number
  /** 真实折射率 */
  nReal: number

  /** 侧向水平偏移量 Δx (mm) = d * tan(θ₂) */
  lateralShiftMm: number
  /** 平行光线出射侧移量 (mm) = d * sin(θ₁ - θ₂) / cos(θ₂) */
  lateralOffsetMm: number

  /** 测量折射角 (度)：若下表面画偏，学生连线测出的折射角 */
  theta2MeasDeg: number
  theta2MeasRad: number
  /** 测得折射率 n_meas = sin(θ₁) / sin(θ₂_meas) */
  nMeas: number
  /** 相对测量误差 (%) = (n_meas - n_real) / n_real * 100 */
  relativeErrorPercent: number

  /** 关键几何点位置 (以入射点 O 为原点，单位 mm，向右为+X，向下为+Y) */
  pointO: PinPosition
  pointOReal: PinPosition
  pointODrawn: PinPosition
  pinP1: PinPosition
  pinP2: PinPosition
  pinP3: PinPosition
  pinP4: PinPosition

  /** 单位圆作图法参数 */
  unitCircleRadiusMm: number
  /** 入射线上交点 A (到法线的水平距离 AA' = R * sin θ₁) */
  distAAPrimeMm: number
  /** 测得折射线上交点 B (到法线的水平距离 BB' = R * sin θ₂_meas) */
  distBBPrimeMm: number
  /** 单位圆法测得折射率 = AA' / BB' */
  nCircleMeas: number

  /** 高考评价指标 */
  evaluations: {
    pinDistanceAdequate: boolean
    angleAppropriate: boolean
    boundaryAccurate: boolean
  }
}

/**
 * 求解「测定玻璃的折射率（插针法）」实验物理与几何全状态
 */
export function solveRefractionExperiment(
  input: RefractionExperimentInput,
): RefractionExperimentResult {
  const theta1Deg = Math.min(Math.max(input.theta1Deg, 15), 75)
  const nReal = Math.min(Math.max(input.nReal, 1.2), 2.0)
  const dMm = Math.min(Math.max(input.dMm, 20), 80)
  const pinDistMm = Math.min(Math.max(input.pinDistMm, 15), 80)
  const errorOffsetMm = Math.min(Math.max(input.errorOffsetMm ?? 0, -15), 15)
  const circleRadiusMm = Math.min(Math.max(input.circleRadiusMm ?? 35, 20), 50)

  const theta1Rad = degToRad(theta1Deg)
  const sinTheta1 = Math.sin(theta1Rad)

  // 理论折射角：sin θ₂ = sin θ₁ / n
  const sinTheta2 = Math.min(1.0, sinTheta1 / nReal)
  const theta2Rad = Math.asin(sinTheta2)
  const theta2Deg = radToDeg(theta2Rad)

  // 内部光线在真实下表面处的横向平移 Δx = d * tan(θ₂)
  const lateralShiftMm = dMm * Math.tan(theta2Rad)
  // 平行板侧移
  const lateralOffsetMm = (dMm * Math.sin(theta1Rad - theta2Rad)) / Math.cos(theta2Rad)

  // 关键几何坐标计算（以入射点 O 为坐标原点 (0, 0)，法线为 Y 轴，界面为 X 轴）：
  // 光线从左上方射入 O(0, 0)，方向向量为 (sin θ₁, cos θ₁)
  const pointO: PinPosition = { x: 0, y: 0 }

  // P1, P2 在入射光线上（Y < 0）
  // P2 靠近 O，距离 O 为 1.0 * pinDistMm
  // P1 远离 O，距离 O 为 2.0 * pinDistMm
  const pinP2: PinPosition = {
    x: -pinDistMm * Math.sin(theta1Rad),
    y: -pinDistMm * Math.cos(theta1Rad),
  }
  const pinP1: PinPosition = {
    x: -2 * pinDistMm * Math.sin(theta1Rad),
    y: -2 * pinDistMm * Math.cos(theta1Rad),
  }

  // 真实下表面上的出射点 O_real
  const pointOReal: PinPosition = {
    x: lateralShiftMm,
    y: dMm,
  }

  // 画出的下表面（可能存在画偏误差）
  const dDrawnMm = dMm + errorOffsetMm
  // 学生移去玻璃砖后，将折射光线出射点误定在画出的下表面 bb' 与出射光线的交点处：
  // 出射光线从 pointOReal(lateralShiftMm, dMm) 出发，方向仍为 (sin θ₁, cos θ₁)
  // 出射光线方程：x = lateralShiftMm + (y - dMm) * tan(θ₁)
  const pointODrawn: PinPosition = {
    x: lateralShiftMm + errorOffsetMm * Math.tan(theta1Rad),
    y: dDrawnMm,
  }

  // P3, P4 在出射光线上（从 pointOReal 向右下方延伸，Y > dMm）
  // P3 靠近出射点，距离 O_real 为 1.0 * pinDistMm
  // P4 远离出射点，距离 O_real 为 2.0 * pinDistMm
  const pinP3: PinPosition = {
    x: pointOReal.x + pinDistMm * Math.sin(theta1Rad),
    y: pointOReal.y + pinDistMm * Math.cos(theta1Rad),
  }
  const pinP4: PinPosition = {
    x: pointOReal.x + 2 * pinDistMm * Math.sin(theta1Rad),
    y: pointOReal.y + 2 * pinDistMm * Math.cos(theta1Rad),
  }

  // 学生作图连线：连接 O(0, 0) 与 pointODrawn(xDrawn, yDrawn) 作为“折射光线”
  // 测量得到的折射角 θ₂_meas
  const measuredTanTheta2 = Math.max(1e-4, pointODrawn.x / Math.max(1e-4, pointODrawn.y))
  const theta2MeasRad = Math.atan(measuredTanTheta2)
  const theta2MeasDeg = radToDeg(theta2MeasRad)

  // 测得折射率
  const sinTheta2Meas = Math.sin(theta2MeasRad)
  const nMeas = sinTheta2Meas > 1e-4 ? sinTheta1 / sinTheta2Meas : nReal
  const relativeErrorPercent = ((nMeas - nReal) / nReal) * 100

  // 单位圆法：以 O 为圆心半径 R
  const distAAPrimeMm = circleRadiusMm * sinTheta1
  const distBBPrimeMm = circleRadiusMm * sinTheta2Meas
  const nCircleMeas = distBBPrimeMm > 1e-4 ? distAAPrimeMm / distBBPrimeMm : nReal

  // 高考评价
  const pinDistanceAdequate = pinDistMm >= 40
  const angleAppropriate = theta1Deg >= 30 && theta1Deg <= 60
  const boundaryAccurate = Math.abs(errorOffsetMm) <= 0.5

  return {
    theta1Deg,
    theta1Rad,
    theta2Deg,
    theta2Rad,
    dMm,
    dDrawnMm,
    errorOffsetMm,
    nReal,
    lateralShiftMm,
    lateralOffsetMm,
    theta2MeasDeg,
    theta2MeasRad,
    nMeas,
    relativeErrorPercent,
    pointO,
    pointOReal,
    pointODrawn,
    pinP1,
    pinP2,
    pinP3,
    pinP4,
    unitCircleRadiusMm: circleRadiusMm,
    distAAPrimeMm,
    distBBPrimeMm,
    nCircleMeas,
    evaluations: {
      pinDistanceAdequate,
      angleAppropriate,
      boundaryAccurate,
    },
  }
}

/**
 * 生成不同入射角下的测量曲线点集（用于 sin θ₁ - sin θ₂ 关系图）
 */
export function generateRefractionSeries(
  nReal: number,
  errorOffsetMm = 0,
  dMm = 50,
): Array<{ theta1Deg: number; sinTheta1: number; sinTheta2Meas: number; sinTheta2Real: number }> {
  const angles = [15, 25, 35, 45, 55, 65, 75]
  return angles.map((ang) => {
    const res = solveRefractionExperiment({
      theta1Deg: ang,
      nReal,
      dMm,
      pinDistMm: 45,
      errorOffsetMm,
    })
    return {
      theta1Deg: ang,
      sinTheta1: Math.sin(res.theta1Rad),
      sinTheta2Meas: Math.sin(res.theta2MeasRad),
      sinTheta2Real: Math.sin(res.theta2Rad),
    }
  })
}
