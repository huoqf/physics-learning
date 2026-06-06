export function calculateNewtonSecond(F_net: number, m: number): { a: number } {
  return { a: F_net / m };
}

export function calculateFriction(mu: number, N: number, _isKinetic: boolean): { f: number } {
  return { f: mu * N };
}

export function calculateElasticForce(k: number, x: number): { F: number } {
  return { F: -k * x };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number } {
  return { F: k * q1 * q2 / (r * r) };
}

export function calculateGravitation(G: number, m1: number, m2: number, r: number): { F: number } {
  return { F: G * m1 * m2 / (r * r) };
}

export function calculateInclinedPlane(m: number, angleDeg: number, mu: number, g: number): { N: number; f: number; a: number; F_parallel: number; F_vertical: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const F_parallel = m * g * Math.sin(angleRad);
  const F_vertical = m * g * Math.cos(angleRad);
  const N = F_vertical;
  const f = mu * N;
  const a = (F_parallel - f) / m;
  return { N, f, a, F_parallel, F_vertical };
}

export function calculateConnectedBody(m1: number, m2: number, F: number, mu: number, g: number): { a: number; T: number } {
  const totalMass = m1 + m2;
  const f = mu * m2 * g;
  const a = (F - f) / totalMass;
  const T = m2 * (a + mu * g);
  return { a, T };
}

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

export function calculateFrictionPullModel(
  m: number,
  mu: number,
  F_applied: number,
  g: number
): {
  F_normal: number;
  f_max: number;
  f_slip: number;
  f_actual: number;
  a: number;
  F_net: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const F_normal = weight;
  const mu_static = mu * 1.12; // 最大静摩擦系数
  const f_max = mu_static * F_normal;
  const f_slip = mu * F_normal;
  const isSliding = F_applied > f_max;
  const f_actual = isSliding ? f_slip : F_applied;
  const a = isSliding ? (F_applied - f_slip) / m : 0;
  const F_net = F_applied - f_actual;

  return { F_normal, f_max, f_slip, f_actual, a, F_net, isSliding };
}

export function calculateFrictionInclineModel(
  m: number,
  mu: number,
  angleDeg: number,
  g: number
): {
  F_normal: number;
  F_gravity_parallel: number;
  f_max: number;
  f_actual: number;
  a: number;
  criticalAngle: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const angleRad = (angleDeg * Math.PI) / 180;
  const mu_static = mu * 1.12; // 最大静摩擦系数
  const criticalAngleRad = Math.atan(mu_static);
  const criticalAngle = (criticalAngleRad * 180) / Math.PI;
  const isSliding = angleDeg > criticalAngle;

  const F_normal = weight * Math.cos(angleRad);
  const F_gravity_parallel = weight * Math.sin(angleRad);
  const f_max = mu_static * F_normal;
  const f_actual = isSliding ? mu * F_normal : F_gravity_parallel;
  const a = isSliding ? g * Math.sin(angleRad) - mu * g * Math.cos(angleRad) : 0;

  return {
    F_normal,
    F_gravity_parallel,
    f_max,
    f_actual,
    a,
    criticalAngle,
    isSliding
  };
}