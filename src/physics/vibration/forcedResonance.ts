/**
 * 受迫振动与共振物理纯计算函数
 * 遵循高中物理与大学物理基础力学振动规范，零 React/DOM 依赖，返回物理量数值
 */

export interface ForcedResonanceConfig {
  /** 振子质量 m (kg) */
  m: number
  /** 劲度系数 k (N/m) */
  k: number
  /** 阻尼系数 gamma (N·s/m) 或阻尼因子 beta = gamma / (2m) */
  gamma: number
  /** 驱动力振幅 F0 (N) */
  F0: number
  /** 驱动力圆频率 omega (rad/s) 或频率 f (Hz) */
  f: number
}

export interface SteadyStateResonanceResult {
  /** 固有频率 f0 (Hz) */
  f0: number
  /** 固有圆频率 omega0 (rad/s) */
  omega0: number
  /** 阻尼因子 beta = gamma / (2m) (s^-1) */
  beta: number
  /** 阻尼固有圆频率 omega1 = sqrt(omega0^2 - beta^2) */
  omega1: number
  /** 稳态受迫振动振幅 A (m) */
  amplitude: number
  /** 稳态滞后相位 phi (rad) [0, pi] */
  phaseLag: number
  /** 稳态滞后相位角度 (deg) [0°, 180°] */
  phaseLagDeg: number
  /** 共振频率 f_res (Hz) = sqrt(omega0^2 - 2*beta^2) / (2*pi) (当弱阻尼时近似为 f0) */
  fRes: number
  /** 共振最大振幅 A_res (m) */
  maxAmplitude: number
}

/**
 * 计算受迫振动稳态物理特征量
 */
export function calculateSteadyStateResonance(config: ForcedResonanceConfig): SteadyStateResonanceResult {
  const { m, k, gamma, F0, f } = config
  const safeM = Math.max(0.01, m)
  const safeK = Math.max(0.1, k)
  const omega0 = Math.sqrt(safeK / safeM)
  const f0 = omega0 / (2 * Math.PI)
  const beta = Math.max(0, gamma) / (2 * safeM)
  const omega1 = omega0 * omega0 > beta * beta ? Math.sqrt(omega0 * omega0 - beta * beta) : 0

  const omega = 2 * Math.PI * Math.max(0.01, f)

  // 稳态振幅公式: A = (F0 / m) / sqrt((omega0^2 - omega^2)^2 + (2 * beta * omega)^2)
  const term1 = omega0 * omega0 - omega * omega
  const term2 = 2 * beta * omega
  const denom = Math.sqrt(term1 * term1 + term2 * term2)
  const amplitude = denom > 1e-6 ? (F0 / safeM) / denom : 0

  // 滞后初相位: tan(phi) = 2*beta*omega / (omega0^2 - omega^2) -> 范围 [0, pi]
  const phaseLag = Math.atan2(term2, term1)
  const phaseLagDeg = (phaseLag * 180) / Math.PI

  // 位移共振圆频率: omega_res = sqrt(max(0, omega0^2 - 2*beta^2))
  const omegaResSq = Math.max(0, omega0 * omega0 - 2 * beta * beta)
  const omegaRes = Math.sqrt(omegaResSq)
  const fRes = omegaRes / (2 * Math.PI)

  // 共振最大振幅
  const maxDenom = 2 * beta * Math.sqrt(Math.max(1e-6, omega0 * omega0 - beta * beta))
  const maxAmplitude = (beta > 1e-4 && maxDenom > 1e-6) ? (F0 / safeM) / maxDenom : (F0 / safeK)

  return {
    f0,
    omega0,
    beta,
    omega1,
    amplitude,
    phaseLag,
    phaseLagDeg,
    fRes,
    maxAmplitude,
  }
}

/**
 * 计算某一时刻 t 振子的实时位移、速度与受迫状态
 * 采用稳态近似与初态过渡相结合的解析模型
 */
export function calculateForcedVibrationState(
  config: ForcedResonanceConfig,
  time: number,
  mode: number = 1 // 0: 自由 vs 受迫, 1: 共振现象, 2: 阻尼对比
): {
  x: number // 位移 (m)
  v: number // 速度 (m/s)
  a: number // 加速度 (m/s^2)
  driverX: number // 驱动端位移 (m)
  fDriver: number // 实时驱动力 (N)
  elasticForce: number // 弹簧弹力 -k*x (N)
  dampingForce: number // 阻尼阻力 -gamma*v (N)
  totalForce: number // 合外力 (N)
  kineticEnergy: number // 动能 (J)
  potentialEnergy: number // 弹性势能 (J)
  powerAbsorbed: number // 瞬时驱动功率 (W)
} {
  const steady = calculateSteadyStateResonance(config)
  const { F0, f, k, gamma, m } = config
  const safeM = Math.max(0.01, m)
  const omega = 2 * Math.PI * f

  // 驱动源位移 (偏心轮或连杆)：振幅与曲柄偏心距严格同源
  // ⚠️ 此前此处硬编码 0.04 m，与 hook 中的 `crankEccentricity`(自适应 0.04~0.20)
  //构成两套独立真源。现统一经`calculateCrankEccentricity` 派生。
  const { e } = calculateCrankEccentricity(F0, k)
  const driverX = e * Math.sin(omega * time)
  const fDriver = F0 * Math.sin(omega * time)

  // 稳态受迫振动位移 x_steady = A * sin(omega * t - phi)
  const xSteady = steady.amplitude * Math.sin(omega * time - steady.phaseLag)
  const vSteady = steady.amplitude * omega * Math.cos(omega * time - steady.phaseLag)

  let x = xSteady
  let v = vSteady

  // 若在模式 0 (演示初始过渡到稳态)，引入衰减的齐次自由振动分量
  if (mode === 0) {
    const decay = Math.exp(-steady.beta * time)
    const xTransient = -steady.amplitude * Math.sin(-steady.phaseLag) * Math.cos(steady.omega1 * time) * decay
    const vTransient = steady.amplitude * Math.sin(-steady.phaseLag) * steady.omega1 * Math.sin(steady.omega1 * time) * decay
    x = xSteady + xTransient
    v = vSteady + vTransient
  }

  const elasticForce = -k * x
  const dampingForce = -gamma * v
  const totalForce = fDriver + elasticForce + dampingForce
  const a = totalForce / safeM

  const kineticEnergy = 0.5 * safeM * v * v
  const potentialEnergy = 0.5 * k * x * x
  const powerAbsorbed = fDriver * v

  return {
    x,
    v,
    a,
    driverX,
    fDriver,
    elasticForce,
    dampingForce,
    totalForce,
    kineticEnergy,
    potentialEnergy,
    powerAbsorbed,
  }
}

/**
 * 受迫振动演示机构的物理量与几何契约（**全链路唯一真源**）
 * ─────────────────────────────────────────────────────────────────────────
 * 背景：偏心轮驱动的受迫振动实验中，驱动力幅值 F0 与曲柄偏心距 e 存在
 * 严格的物理对应关系 —— 曲柄滑块机构在低频极限（准静态）下，滑块的位移
 * 振幅趋近于偏心距 e，而弹簧振子在此极限下的位移振幅趋近于 F0/k。
 * 二者相等的前提是 **e = F0/k**。
 *
 * ⚠️ 历史问题：此前消费点用`Math.min/Math.max` 把 e 硬夹在 [0.04, 0.20]，
 * 在控制台全量程（F₀ 10 档 × k 15 档 = 150 组）中有 57 组（38.0%）被夹取，
 * 导致「改k 时小球振幅与曲柄行程不同步」的可观测破绽。本模块提供
 * `calculateCrankEccentricity` 作为**唯一入口**，任何消费点都不得再自行夹取。
 */

/** 曲柄偏心距的视觉可辨下限 (m)：低于此值肉眼无法分辨转动，过小会被夹取 */
export const CRANK_ECCENTRICITY_MIN = 0.04
/**
 * 曲柄偏心距的几何上限 (m)：超过轮盘半径会导致曲柄销脱出轨盘
 */
export const CRANK_ECCENTRICITY_MAX = 0.20

/**
 * 计算曲柄偏心距 e (m)
 *
 * 物理真值e = F0 / k（准静态下驱动位移振幅 = 弹簧振子位移振幅）。
 *
 * 夹取策略（**唯一且必须走本函数**）：
 * - 下限 0.04 m：偏心距过小时曲柄销几乎不转动，视觉上无法辨识机构在动
 * - 上限 0.20 m：受曲柄臂长与轮盘几何约束，偏心距过大时曲柄销会脱出轨盘
 *
 * 当发生夹取时，`clampType` 标明夹取方向（`'min'` 放大显示 / `'max'` 缩小显示），
 * 消费点**必须**在 UI 上按方向分别提示用户 —— 两个方向的物理含义相反：
 * 下限侧画面偏心距**大于**真值（放大到可辨度下限），上限侧**小于**真值。
 * 若只用单一布尔并统一写"已达上限"，在占多数的下限侧会产生方向颠倒的误导。
 *
 * @param F0 驱动力幅值 (N)
 * @param k 弹簧劲度系数 (N/m)
 * @returns 偏心距 e (m)、物理真值 ideal (m) 与夹取方向 clampType
 */
export interface CrankEccentricityResult {
  /** 画面实际使用的偏心距 (m) */
  e: number
  /** 未夹取的物理真值 e = F₀/k (m)，供 UI 如实告知被限幅了多少 */
  ideal: number
  /**
   * 夹取方向：
   * - `'none'`：未夹取，e === ideal
   * - `'min'`：低于下限，被**放大**到 CRANK_ECCENTRICITY_MIN（视觉可辨度下限）
   * - `'max'`：高于上限，被**缩小**到 CRANK_ECCENTRICITY_MAX（轮盘几何上限）
   */
  clampType: 'none' | 'min' | 'max'
}

export function calculateCrankEccentricity(F0: number, k: number): CrankEccentricityResult {
  const safeK = Math.max(1, k)
  const ideal = F0 / safeK
  const e = Math.min(CRANK_ECCENTRICITY_MAX, Math.max(CRANK_ECCENTRICITY_MIN, ideal))
  const clampType = e > ideal + 1e-9 ? 'min' : e < ideal - 1e-9 ? 'max' : 'none'
  return { e, ideal, clampType }
}

/** 阻尼槽几何契约结果 */
export interface DamperGeometry {
  /** 槽底高度 (m) */
  tankBottom: number
  /** 槽口（液面）高度 (m) */
  tankTop: number
  /** 槽体高度 (m) */
  tankHeight: number
  /** 阻尼叶片中心相对振子平衡位置的固定下垂距离 (m) */
  bladeDrop: number
  /** 当前工况下的最大位移振幅 (m)：用于反推槽深，保证叶片全程浸没 */
  maxAmplitude: number
  /**
 * 是否能在当前舞台内满足「叶片全程浸没、不触底、不超舞台顶，且小球不出画」。
 * false 表示振幅已超出演示舞台的物理容量（属真实极端工况），
 * 消费点应据此在 UI 上显式提示，而非静默画出错误几何。
 */
  fitsStage: boolean
}

/** 演示舞台的物理高度 (m)：与 ForcedResonanceAnimation 的 physicsHeight 保持一致 */
export const FORCED_RESONANCE_STAGE_HEIGHT = 6.5
/** 振子平衡位置高度 (m) */
export const FORCED_RESONANCE_EQUILIBRIUM_Y = 3.2
/** 叶片上下各需预留的浸没裕度 (m) */
const DAMPER_MARGIN = 0.15
/** 阻尼叶片相对平衡位置的名义下垂距离 (m)：振幅较小时使用 */
const BLADE_DROP_NOMINAL = 1.85
/**
 * 几何判据的浮点比较容差 (m)。
 *
 * `bladeLowest = eqY − amp − bladeDrop`，而 `bladeDrop` 内含 `eqY − amp − MARGIN`，
 * 相减后 amp 被抵消、真值恒为 MARGIN；但 IEEE754 相减会引入 ~1e-16 的误差
 * （实测 0.14999999999999991 < 0.15）。若无容差，`fitsStage` 会在 A≈1.2~2.4 m
 * 整段被误判为 false，使判据失去单调性 —— 二分求根随之退化（容量算成 1.20 m
 * 而非真实的 2.90 m），并让约 24% 的控制台参数组合弹出虚假告警。
 */
const GEOMETRY_EPS = 1e-9

/**
 * 演示舞台的物理容量契约（**告警阈值的唯一真源**）
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ 历史问题：右屏告警曾用 `min(STAGE − eqY, eqY)` 自行推算容量阈值，
 * 而场景几何用 `calculateDamperGeometry(...).fitsStage`。两条路径的等价关系
 * 需手工推导，极易漂移（实测出现过 1.20 / 1.50 / 2.90 / 3.10 m 多个阈值），
 * 导致振幅落在两者之间的工况**几何已失效却无任何告警** ——
 * 正是"静默输出错误几何"这一缺陷。现改为对本判据数值求根，二者恒等。
 */

/**
 * 计算演示舞台可容纳的最大位移振幅 (m)：`fitsStage` 由 true转为 false 的临界值。
 *
 * ⚠️ 实现说明：此前本函数**手写三条解析公式**求最小值，而 `fitsStage` 的判据
 * 在后续修订中又增加了"bladeDrop 不得被 clamp 到 0"这一条，两者的等价关系
 * 需要手工推导，极易漂移（实测出现过阈值 1.50 / 1.20 / 2.90 三种值）。
 *
 * 现改为**对 `fitsStage` 直接数值求根**：容量阈值由判据本身定义，
 * 因此二者**恒等**。这是本项目 SSOT 原则的延伸 —— 派生量必须由真源求值，
 * 不得另行手写等价公式。
 *
 * @returns 舞台可容纳的最大振幅 (m)；`calculateDamperGeometry(A).fitsStage`
 *          在 A 超过该值时必为 false，可直接用于告警判定。
 */
let cachedStageAmplitudeCapacity: number | null = null

export function calculateStageAmplitudeCapacity(): number {
  // 本函数无入参，结果恒为常数（2.90 m）。缓存以免每次告警都重复跑 60 次二分。
  if (cachedStageAmplitudeCapacity !== null) return cachedStageAmplitudeCapacity
  // fitsStage 单调：振幅越大越不可行，故可二分求临界点
  let lo = 0
  let hi = FORCED_RESONANCE_STAGE_HEIGHT
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (calculateDamperGeometry(mid).fitsStage) lo = mid
    else hi = mid
  }
  cachedStageAmplitudeCapacity = lo
  return lo
}

/**
 * 依据当前工况的最大位移振幅，反推阻尼槽尺寸，保证阻尼叶片
 * **全程 100% 浸没**于介质中（不露头、不触底）。
 *
 * 几何可行性推导（设最大振幅 A，叶片下垂距离 d，平衡位置 eqY，舞台高 H）：
 *   叶片中心行程区间 = [eqY − A − d,  eqY + A − d]，跨度 2A
 *   要求该区间落在 [tankBottom, tankTop] ⊆ [0, H] 内，故必须同时满足：
 *     d ≥ eqY + A − (H − margin)      ① 叶片上沿不得超舞台顶
 *     d ≤ eqY − A − margin            ② 叶片下沿不得低于地板
 *   ①② 同时可解 ⟺ 2A ≤ H − 2·margin，即 A ≤ H/2 − margin = 3.10 m
 *   ③ 叶片下垂不得退化 ⟺ A ≤ eqY − 2·margin = 2.90 m
 *   故舞台实际容量 = min(3.10, 2.90) = 2.90 m
 *
 * ⚠️ 历史缺陷一：`fitsStage` 曾**只检查 ②**（漏掉 ①），导致 A 大于真实失效点
 * 时仍返回 true —— 叶片上沿已越出舞台顶（实测 A=3.0 m 时 fitsStage仍为 true，
 * 而叶片上沿已达 6.15 m）。这是比阈值错位更根本的契约漏洞，现三式并重。
 *
 * ⚠️ 历史缺陷二：判据曾用裸比较 `bladeLowest >= DAMPER_MARGIN`，而左值由相减
 * 抵消得出，~1e-16 的浮点误差使其在 A≈1.2~2.4 m 段塌陷为 0.14999999999999991，
 * 谓词失去单调性 —— 二分求根把容量算成 1.20 m，并让 24% 的参数组合虚假告警。
 * 现统一加 GEOMETRY_EPS 容差，`fitsStage` 恢复单调，容量恒为 2.90 m。
 *
 * 当A 较大时 `d` 必须缩短（否则叶片会捅穿地板），此处按 ②自适应收缩；
 * 若 ①② 交叉导致无解（振幅超出舞台容量），返回 `fitsStage = false`
 * 交由 UI 显式提示，绝不静默输出错误几何。
 *
 * @param maxAmplitude 当前工况最大位移振幅 (m)，通常取共振最大振幅
 * @returns 槽底/槽口/叶片下垂距离等几何参数
 */
export function calculateDamperGeometry(maxAmplitude: number): DamperGeometry {
  const amp = Math.max(0, maxAmplitude)
  const eqY = FORCED_RESONANCE_EQUILIBRIUM_Y
  const stageTop = FORCED_RESONANCE_STAGE_HEIGHT

  // 叶片下沿不低于地板 → 对 d 的上界
  const dropUpperBound = eqY - amp - DAMPER_MARGIN
  // 叶片中心行程区间（含名义下垂与夹取后的实际值）
  // 实际使用的下垂距离：先按上界夹取，再对退化情形兜底
  const bladeDrop = Math.max(0, Math.min(BLADE_DROP_NOMINAL, dropUpperBound))
  const bladeLowest = eqY - amp - bladeDrop
  const bladeHighest = eqY + amp - bladeDrop

  // 可行性必须基于**实际取用的 bladeDrop** 判定，而非仅看上下界是否交叉：
  // ① 叶片上沿不得超舞台顶（留margin）
  // ② 叶片下沿不得低于地板（留 margin）
  // ③ bladeDrop 不得被 clamp 到 0（否则叶片与球心重合，视觉异常）
  // 三式均须带 GEOMETRY_EPS 容差：左值由相减抵消得出，裸比较会被浮点误差误判
  const fitsStage =
    bladeHighest <= stageTop - DAMPER_MARGIN + GEOMETRY_EPS &&
    bladeLowest >= DAMPER_MARGIN - GEOMETRY_EPS &&
    dropUpperBound >= DAMPER_MARGIN - GEOMETRY_EPS

  const tankTop = Math.min(
    stageTop - DAMPER_MARGIN,
    bladeHighest + DAMPER_MARGIN,
  )
  const tankBottom = Math.max(0, bladeLowest - DAMPER_MARGIN)

  return {
    tankBottom,
    tankTop,
    tankHeight: Math.max(0.3, tankTop - tankBottom),
    bladeDrop,
    maxAmplitude: amp,
    fitsStage,
  }
}

/**
 * 生成 A-f 共振特性曲线采样点集
 */
export function generateResonanceCurvePoints(
  m: number,
  k: number,
  gamma: number,
  F0: number,
  fMax: number = 3.0,
  stepCount: number = 80
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const step = fMax / stepCount

  for (let i = 1; i <= stepCount; i++) {
    const f = i * step
    const res = calculateSteadyStateResonance({ m, k, gamma, F0, f })
    points.push({ x: f, y: res.amplitude })
  }

  return points
}
