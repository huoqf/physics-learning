/**
 * @file src/physics/inclined_plane.ts
 * 斜面模型物理受力与运动学纯计算函数。
 *
 * 纯函数，无 DOM / React / window 依赖，所有数据结构可序列化。
 */

/**
 * 斜面模型输入参数
 * @property theta - 倾角 θ（°，角度制，范围 0~90）
 * @property mu    - 动摩擦因数 μ（无量纲，范围 0~1）
 * @property m     - 滑块质量（kg）
 * @property g     - 重力加速度（m/s²，默认 9.8）
 */
export interface InclinedPlaneParam {
  theta: number;
  mu: number;
  m: number;
  g?: number;
}

/**
 * 斜面模型计算结果
 * @property isSliding     - 是否下滑（倾角 > 临界角时为 true）
 * @property FN            - 斜面对滑块的支持力（N），FN = mg·cosθ
 * @property Ff            - 摩擦力（N）；静止时为静摩擦力 mg·sinθ，下滑时为滑动摩擦力 μFN
 * @property accel         - 沿斜面方向的加速度（m/s²）；静止时为 0
 * @property criticalTheta - 临界下滑角 θ_crit（°），满足 tan θ_crit = μ
 */
export interface InclinedPlaneResult {
  isSliding: boolean;
  FN: number;
  Ff: number;
  accel: number;
  criticalTheta: number;
}

/**
 * 计算滑块在固定直角斜面上的受力平衡与运动学参数。
 *
 * 当倾角 θ > 临界角 θ_crit（tan θ_crit = μ）时，滑块沿斜面加速下滑；
 * 否则滑块静止，静摩擦力与重力沿斜面分力平衡。
 *
 * @param param - 物理输入参数（见 {@link InclinedPlaneParam}）
 * @returns     - 动力学与运动学结果（见 {@link InclinedPlaneResult}）
 */
export function computeInclinedPlane(param: InclinedPlaneParam): InclinedPlaneResult {
  const { theta, mu, m } = param;
  const g = param.g ?? 9.8;
  const rad = (theta * Math.PI) / 180;
  
  // 临界角计算 (tanθ = μ)
  const criticalTheta = (Math.atan(mu) * 180) / Math.PI;
  const FN = m * g * Math.cos(rad);
  
  let isSliding = false;
  let Ff = 0;
  let accel = 0;
  
  // 核心判定：当倾角大于最大静摩擦临界角时下滑
  if (theta > criticalTheta) {
    isSliding = true;
    Ff = mu * FN; // 滑动摩擦力
    accel = g * Math.sin(rad) - mu * g * Math.cos(rad);
  } else {
    isSliding = false;
    Ff = m * g * Math.sin(rad); // 静摩擦力，与重力沿斜面的分力平衡
    accel = 0;
  }
  
  return {
    isSliding,
    FN,
    Ff,
    accel,
    criticalTheta,
  };
}
