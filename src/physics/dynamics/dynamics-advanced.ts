import { GRAVITY } from '../constants'

/**
 * 计算地球表面重力、万有引力与自转向心力的矢量分量及夹角关系
 * @param latitudeDeg 纬度 (度, 0~90)
 * @param m 物体质量
 * @param F_gravitation 万有引力相对大小基准值
 * @param omegaScale 向心力放大系数 (用于在画面上清晰展示夹角)
 */
export function calculateEarthGravity(
  latitudeDeg: number,
  m: number,
  F_gravitation: number,
  omegaScale: number
): {
  F_grav: number;
  F_centripetal: number;
  G_force: number;
  angleDeviation: number;
  Fx_grav: number; Fy_grav: number;
  Fx_cent: number; Fy_cent: number;
  Gx: number; Gy: number;
} {
  const latitudeRad = (latitudeDeg * Math.PI) / 180;
  
  // 真实物理中赤道处向心力约为万有引力的 0.346%
  // 引入 omegaScale 放大显示（例如 omegaScale=80 时，比例为 0.00346 * 80 ≈ 27.7%）
  const ratioAtEquator = 0.00346 * omegaScale; 
  const F_c_equator = F_gravitation * ratioAtEquator;
  
  // 向心力大小跟纬度余弦成正比
  const F_centripetal = m * F_c_equator * Math.cos(latitudeRad);
  
  const cosL = Math.cos(latitudeRad);
  const sinL = Math.sin(latitudeRad);
  
  // 万有引力矢量，指向地心 (0,0) (这里以地心指向物体为正方向)
  const Fx_grav = -F_gravitation * cosL;
  const Fy_grav = -F_gravitation * sinL;
  
  // 向心力矢量，垂直指向自转轴（水平向左即 -X 方向）
  const Fx_cent = -F_centripetal;
  const Fy_cent = 0;
  
  // 重力矢量 G = F_grav - F_cent
  const Gx = Fx_grav - Fx_cent;
  const Gy = Fy_grav - Fy_cent;
  
  const G_force = Math.sqrt(Gx * Gx + Gy * Gy);
  
  // 计算重力与万有引力之间的夹角 (偏角)
  const dotProduct = Gx * Fx_grav + Gy * Fy_grav;
  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (G_force * F_gravitation)));
  const angleDeviation = (Math.acos(cosTheta) * 180) / Math.PI;
  
  return {
    F_grav: F_gravitation,
    F_centripetal,
    G_force,
    angleDeviation,
    Fx_grav,
    Fy_grav,
    Fx_cent,
    Fy_cent,
    Gx,
    Gy
  };
}

/**
 * 计算牛顿第二定律变力模型状态
 * 
 * 模式 0: 线性递增力 F(t) = k * t，含摩擦力。
 * 模式 1: 正弦力 F(t) = F0 * sin(omega * t)，无摩擦力。
 *
 * @param modelType 变力模型类型 (0=线性, 1=正弦)
 * @param params 输入参数 (m: 质量, mu: 动摩擦因数, k?: 斜率, F0?: 正弦幅值, omega?: 角速度, g?: 重力加速度)
 * @param t 当前时间 (s)
 * @returns 包含当前施加力、摩擦力、合力、加速度、速度和位移的对象
 */
export function calculateNewtonSecondVariableMotion(
  modelType: 0 | 1,
  params: {
    m: number;
    mu: number;
    k?: number;
    F0?: number;
    omega?: number;
    g?: number;
  },
  t: number
): {
  F_applied: number;
  f: number;
  F_net: number;
  a: number;
  v: number;
  s: number;
} {
  const m = params.m;
  const mu = params.mu;
  const g = params.g ?? 9.8;
  const N = m * g;

  if (modelType === 0) {
    // 线性变力 F = k * t
    const k = params.k ?? 2;
    const F_applied = k * t;
    const f_max = mu * N;

    if (F_applied <= f_max) {
      return { F_applied, f: F_applied, F_net: 0, a: 0, v: 0, s: 0 };
    } else {
      const t_start = f_max / k;
      const tau = t - t_start;
      const a = (F_applied - f_max) / m;
      const v = (k * tau * tau) / (2 * m);
      const s = (k * tau * tau * tau) / (6 * m);
      return { F_applied, f: f_max, F_net: F_applied - f_max, a, v, s };
    }
  } else {
    // 正弦变力 F = F0 * sin(omega * t)，在光滑平面上 (mu = 0)
    const F0 = params.F0 ?? 15;
    const omega = params.omega ?? 1.5;
    const F_applied = F0 * Math.sin(omega * t);

    // a = F / m = F0 / m * sin(omega * t)
    const a = F_applied / m;
    // v = F0 / (m * omega) * (1 - cos(omega * t))
    const v = (F0 / (m * omega)) * (1 - Math.cos(omega * t));
    // s = F0 / (m * omega) * t - F0 / (m * omega * omega) * sin(omega * t)
    const s = (F0 / (m * omega)) * t - (F0 / (m * omega * omega)) * Math.sin(omega * t);

    return { F_applied, f: 0, F_net: F_applied, a, v, s };
  }
}

/**
 * 计算超重与失重电梯变运动模型下的物理状态
 * 
 * 模式 0: 变速升降电梯 (启动加速 -> 匀速 -> 制动减速 -> 停靠)
 * 模式 1: 钢索断裂自由落体 (静止 -> 自由落体 -> 底部阻尼刹车 -> 停靠)
 * 模式 2: 恒定加速度电梯 (匀变速直线运动)
 * 
 * @param modelIdx 运动模型类型 (0=变速升降, 1=自由落体, 2=恒定加速度)
 * @param m 物体质量 (kg)
 * @param g 重力加速度 (m/s²)
 * @param t 当前时间 (s)
 * @param a_ext 外部加速度 (m/s²)，仅模式 2 使用，向上为正
 * @returns 包含加速度、速度、位移、支持力、重力和当前状态名称的对象
 */
export function calculateElevatorMotion(
  modelIdx: 0 | 1 | 2,
  m: number,
  g: number,
  t: number,
  a_ext?: number
): {
  a: number;         // 电梯加速度 (m/s²，向上为正)
  v: number;         // 电梯速度 (m/s，向上为正)
  y: number;         // 电梯位移 (m，向上为正)
  N: number;         // 体重计支持力 (N)
  weight: number;    // 重力 (N)
  state: 'overweight' | 'underweight' | 'weightless' | 'normal'; // 超失重状态
} {
  const weight = m * g;
  let a = 0;
  let v = 0;
  let y = 0;
  let N = weight;
  let state: 'overweight' | 'underweight' | 'weightless' | 'normal' = 'normal';

  if (modelIdx === 0) {
    // 变速升降电梯 (0~10s)
    if (t < 2.0) {
      a = 2.0;
      v = a * t;
      y = 0.5 * a * t * t;
    } else if (t < 5.0) {
      const v1 = 4.0;
      const y1 = 4.0;
      a = 0;
      v = v1;
      y = y1 + v1 * (t - 2.0);
    } else if (t < 7.0) {
      const v1 = 4.0;
      const y2 = 16.0;
      a = -2.0;
      v = v1 + a * (t - 5.0);
      y = y2 + v1 * (t - 5.0) + 0.5 * a * (t - 5.0) * (t - 5.0);
    } else {
      a = 0;
      v = 0;
      y = 20.0;
    }
  } else if (modelIdx === 1) {
    // 钢索断裂自由落体 (0~6s)
    if (t < 1.5) {
      a = 0;
      v = 0;
      y = 0;
    } else if (t < 4.0) {
      // 自由落体，电梯加速度为 -g，支持力为 0
      a = -g;
      v = -g * (t - 1.5);
      y = -0.5 * g * (t - 1.5) * (t - 1.5);
    } else if (t < 5.0) {
      // 刹车，电梯向上加速度为 2.5g
      const v_fall = -g * 2.5;
      const y_fall = -0.5 * g * 2.5 * 2.5;
      a = 2.5 * g;
      v = v_fall + a * (t - 4.0);
      y = y_fall + v_fall * (t - 4.0) + 0.5 * a * (t - 4.0) * (t - 4.0);
    } else {
      // 停在最底部
      const y_bottom = -0.5 * g * 2.5 * 2.5 - 1.25 * g;
      a = 0;
      v = 0;
      y = y_bottom;
    }
  } else {
    // 模式 2: 恒定加速度电梯
    a = a_ext ?? 0;
    v = a * t;
    y = 0.5 * a * t * t;
  }

  // 计算支持力 N = m(g + a)
  N = m * (g + a);
  if (N < 0) N = 0;

  // 状态判定
  if (Math.abs(a) < 0.01) {
    state = 'normal';
  } else if (Math.abs(a + g) < 0.1) {
    state = 'weightless';
  } else if (a > 0) {
    state = 'overweight';
  } else {
    state = 'underweight';
  }

  return { a, v, y, N, weight, state };
}

/**
 * 竖直圆轨道动力学模拟轨迹点接口
 */
export interface VerticalCircularMotionPoint {
  /** 当前时间 (s) */
  time: number
  /** 水平物理坐标 (m) */
  x: number
  /** 竖直物理坐标 (m) */
  y: number
  /** 水平物理速度 (m/s) */
  vx: number
  /** 竖直物理速度 (m/s) */
  vy: number
  /** 相对最低点的弧度角 (rad)，最低点为 0，逆时针为正 */
  theta: number
  /** 角速度 (rad/s) */
  omega: number
  /** 轨道支持力或拉力 (N)，正值代表向心拉/压，负值代表离心支/推 */
  N: number
  /** 运行状态：'on-track' 轨道滑动，'flying' 脱轨飞行 */
  state: 'on-track' | 'flying'
  /** 运动类型判定：'swing' 摆动，'fall' 脱轨掉落，'loop' 完整圆周 */
  caseType: 'swing' | 'fall' | 'loop'
}

/**
 * 计算竖直圆轨道动力学仿真数据（纯函数，无副作用，完全可序列化）
 *
 * @param r 轨道半径 (m)，范围 [3, 5]
 * @param v0 最低点初速度 (m/s)
 * @param m 小球质量 (kg)
 * @param trackType 轨道模型 (0: 单面轨/绳模型, 1: 双面轨/杆模型)
 * @param maxTime 仿真最大时间上限 (s)，默认 30
 * @param dt 数值积分步长 (s)，默认 0.002
 * @returns 包含轨迹点数组、摆动临界速 (m/s) 与通关临界速 (m/s) 的对象
 */
export function precomputeVerticalCircularMotion(
  r: number,
  v0: number,
  m: number,
  trackType: number,
  maxTime = 30,
  dt = 0.002
): { trajectory: VerticalCircularMotionPoint[]; vSwingLimit: number; vLoopLimit: number } {
  const g = GRAVITY
  const steps = Math.ceil(maxTime / dt)
  const trajectory: VerticalCircularMotionPoint[] = []

  const vSwingLimit = Math.sqrt(2 * g * r)
  const vLoopLimit = trackType === 1 ? Math.sqrt(4 * g * r) : Math.sqrt(5 * g * r)

  let category: 'swing' | 'fall' | 'loop' = 'fall'
  if (v0 <= vSwingLimit) {
    category = 'swing'
  } else if (v0 >= vLoopLimit) {
    category = 'loop'
  } else if (trackType === 1) {
    category = 'swing'
  }

  let state: 'on-track' | 'flying' = 'on-track'
  let theta = 0
  let omega = v0 / r

  let flyTime = 0
  let xFly = 0
  let yFly = 0
  let vxFly = 0
  let vyFly = 0

  let x = 0
  let y = -r
  let vx = v0
  let vy = 0
  let N = m * g + (m * v0 * v0) / r

  for (let i = 0; i <= steps; i++) {
    const currentTime = i * dt

    if (state === 'on-track') {
      const alpha = -(g / r) * Math.sin(theta)
      omega += alpha * dt
      theta += omega * dt

      x = r * Math.sin(theta)
      y = -r * Math.cos(theta)

      vx = r * omega * Math.cos(theta)
      vy = r * omega * Math.sin(theta)

      N = m * g * Math.cos(theta) + m * r * omega * omega

      // 仅在单面轨道下，且属于脱轨类型时，在支持力减为 0 处脱轨
      if (trackType === 0 && category === 'fall' && N <= 0) {
        state = 'flying'
        flyTime = currentTime
        xFly = x
        yFly = y
        vxFly = vx
        vyFly = vy
        N = 0
      }
    } else {
      const tFly = currentTime - flyTime
      x = xFly + vxFly * tFly
      y = yFly + vyFly * tFly - 0.5 * g * tFly * tFly
      vx = vxFly
      vy = vyFly - g * tFly
      N = 0

      // 再次撞击圆轨道壁的回收碰撞检测
      if (tFly > 0.05 && x * x + y * y >= r * r) {
        const dist = Math.sqrt(x * x + y * y)
        x = (x / dist) * r
        y = (y / dist) * r
        theta = Math.atan2(x, -y)

        const cosT = Math.cos(theta)
        const sinT = Math.sin(theta)
        const vt = vx * cosT + vy * sinT

        state = 'on-track'
        omega = vt / r
        vx = r * omega * cosT
        vy = r * omega * sinT
        N = m * g * cosT + m * r * omega * omega
      }
    }

    trajectory.push({
      time: currentTime,
      x,
      y,
      vx,
      vy,
      theta,
      omega,
      N,
      state,
      caseType: category,
    })
  }

  return { trajectory, vSwingLimit, vLoopLimit }
}
