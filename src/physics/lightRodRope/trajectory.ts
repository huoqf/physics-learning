import type { LRRModelState } from './types'

/**
 * 预计算双球连接体系统的运动轨迹（数值积分）。
 *
 * @param m1 - A球质量 (kg)
 * @param m2 - B球质量 (kg)
 * @param L - 杆/绳总长度 (m)
 * @param g - 重力加速度 (m/s²)
 * @param mode - 约束类型：0=刚性轻杆，1=双绳分系两球（跨滑轮耦合）
 * @param tMax - 最大模拟时间 (s)，默认 15
 * @param dt - 时间步长 (s)，默认 0.02
 * @param theta0 - 初始角度 (rad)
 * @param v0 - B球初始切向速度大小 (m/s)，默认 0.0
 * @returns 轨迹点数组，按时间升序排列
 */
export function precomputeLightRodRopeTrajectory(
  m1: number,
  m2: number,
  L: number,
  g: number,
  mode: number, // 0=杆, 1=绳
  tMax: number = 15,
  dt: number = 0.02,
  theta0: number = 0.0,
  v0: number = 0.0
): LRRModelState[] {
  const points: LRRModelState[] = []

  // 绳子总长度 (视觉上初始与杆模式重合：A在L/2处，B在L处，所以总长定为 1.5 L)
  const L_rope = 1.5 * L
  const R_A0 = L / 2
  const R_B0 = L

  let thetaA = theta0
  let thetaB = theta0
  
  // 初始角速度，B球线速度为 v0，对应角速度 w0 = v0 / L
  const w0 = v0 / L
  let wA = w0
  let wB = w0

  // 绳子拉直状态极径
  let r_A = R_A0
  let r_B = R_B0
  let v_r = 0.0 // 径向速度 (A球向外/向下为正)

  if (mode === 1) {
    thetaA = Math.PI / 2
    thetaB = theta0
    wA = 0.0
    wB = 0.0
    r_A = R_A0
    r_B = R_B0
    v_r = 0.0
  } else if (mode === 2) {
    thetaA = theta0
    thetaB = theta0
    wA = w0
    wB = w0
    r_A = R_A0
    r_B = R_B0
    v_r = 0.0
  }

  // 初始直角物理坐标 (悬挂点为原点，x向右为正，y向下为正)
  let x_A = mode === 1 ? 0.0 : r_A * Math.cos(thetaA)
  let y_A = r_A * Math.sin(thetaA)
  let x_B = r_B * Math.cos(thetaB)
  let y_B = r_B * Math.sin(thetaB)

  // 初始直角物理坐标下速度分量 (x向右为正，y向下为正)
  let vAx = mode === 1 ? 0.0 : v_r * Math.cos(thetaA) - r_A * wA * Math.sin(thetaA)
  let vAy = mode === 1 ? 0.0 : v_r * Math.sin(thetaA) + r_A * wA * Math.cos(thetaA)
  let vBx = mode === 1 ? 0.0 : -v_r * Math.cos(thetaB) - r_B * wB * Math.sin(thetaB)
  let vBy = mode === 1 ? 0.0 : -v_r * Math.sin(thetaB) + r_B * wB * Math.cos(thetaB)

  // 绳子是否松弛 (一端松弛即整根松弛)
  let isSlack = false
  let stopReason: 'reach_bottom' | 'slack' | null = null

  // 模式 2 辅助变量
  let last_T_OA = 0
  let last_T_AB = 0
  let last_isSlackA = false
  let last_isSlackB = false

  let t = 0.0
  const subSteps = 100
  const subDt = dt / subSteps

  while (t <= tMax + dt * 0.5) {
    const curT = Math.min(t, tMax)

    // 计算当前物理量
    let epA = 0
    let epB = 0
    let ekA = 0
    let ekB = 0
    let alphaA = 0
    let alphaB = 0
    let F_Ax = 0, F_Ay = 0
    let F_Bx = 0, F_By = 0
    let F_A_radial = { x: 0, y: 0 }
    let F_A_tangential = { x: 0, y: 0 }
    let F_B_radial = { x: 0, y: 0 }
    let F_B_tangential = { x: 0, y: 0 }
    let powerB = 0
    let powerA = 0
    let T_A = 0
    let T_B = 0

    // 用于在当前 dt 时间步记录是否触发了状态跳变
    let stepEventA: 'slack' | 'tension' | null = null
    let stepEventB: 'slack' | 'tension' | null = null

    if (mode === 0) {
      // 刚性轻杆连接 (物理计算逻辑完全保持不变)
      const theta = thetaA // 刚性连接，A/B 角度相等
      const w = wA
      
      // 转动定律 alpha
      alphaA = (2 * (m1 + 2 * m2) * g * Math.cos(theta)) / ((m1 + 4 * m2) * L)
      alphaB = alphaA

      epA = m1 * g * (L / 2) * (1 - Math.sin(theta))
      epB = m2 * g * L * (1 - Math.sin(theta))

      const vA_val = (L / 2) * w
      const vB_val = L * w

      ekA = 0.5 * m1 * vA_val * vA_val
      ekB = 0.5 * m2 * vB_val * vB_val

      const F_Br = m2 * g * Math.sin(theta) + m2 * L * w * w
      const F_Bt = (m2 * g * Math.cos(theta) * m1) / (m1 + 4 * m2)

      const F_Ar = m1 * g * Math.sin(theta) + m1 * (L / 2) * w * w
      const F_At = (-m1 * g * Math.cos(theta) * 2 * m2) / (m1 + 4 * m2)

      F_Bx = -F_Br * Math.cos(theta) - F_Bt * Math.sin(theta)
      F_By = F_Br * Math.sin(theta) - F_Bt * Math.cos(theta)

      F_Ax = -F_Ar * Math.cos(theta) - F_At * Math.sin(theta)
      F_Ay = F_Ar * Math.sin(theta) - F_At * Math.cos(theta)

      F_B_radial = { x: -F_Br * Math.cos(theta), y: F_Br * Math.sin(theta) }
      F_B_tangential = { x: -F_Bt * Math.sin(theta), y: -F_Bt * Math.cos(theta) }

      F_A_radial = { x: -F_Ar * Math.cos(theta), y: F_Ar * Math.sin(theta) }
      F_A_tangential = { x: -F_At * Math.sin(theta), y: -F_At * Math.cos(theta) }

      powerB = F_Bt * L * w
      powerA = -powerB

      T_A = F_Ar
      T_B = F_Br
    } else if (mode === 1) {
      // 双绳分系两球（定滑轮耦合高考动力学模型）
      epA = m1 * g * (L_rope - r_A)
      epB = m2 * g * (L_rope - y_B)

      ekA = 0.5 * m1 * v_r * v_r
      ekB = 0.5 * m2 * (v_r * v_r + r_B * wB * r_B * wB)

      const numerator = g * (1 + Math.sin(thetaB)) + r_B * wB * wB
      const denominator = 1.0 / m1 + 1.0 / m2
      const T = numerator / denominator
      const T_val = T > 0 ? T : 0.0

      T_A = T_val
      T_B = T_val

      F_Ax = 0.0
      F_Ay = T_val
      F_A_radial = { x: 0.0, y: T_val }

      F_Bx = -T_val * Math.cos(thetaB)
      F_By = T_val * Math.sin(thetaB)
      F_B_radial = { x: F_Bx, y: F_By }

      powerA = -T_val * v_r
      powerB = T_val * v_r
    } else {
      // mode === 2: 轻绳连接体三阶段
      epA = m1 * g * (R_A0 - y_A)
      epB = m2 * g * (R_B0 - y_B)

      ekA = 0.5 * m1 * (vAx * vAx + vAy * vAy)
      ekB = 0.5 * m2 * (vBx * vBx + vBy * vBy)

      T_A = last_T_OA
      T_B = last_T_AB

      isSlack = last_isSlackB

      const d_A = Math.sqrt(x_A * x_A + y_A * y_A)
      const nx_OA = d_A > 1e-6 ? x_A / d_A : 0
      const ny_OA = d_A > 1e-6 ? y_A / d_A : 1

      const d_AB = Math.sqrt((x_B - x_A) * (x_B - x_A) + (y_B - y_A) * (y_B - y_A))
      const nx_AB = d_AB > 1e-6 ? (x_B - x_A) / d_AB : 0
      const ny_AB = d_AB > 1e-6 ? (y_B - y_A) / d_AB : 1

      F_Ax = -T_A * nx_OA
      F_Ay = T_A * ny_OA
      F_A_radial = { x: F_Ax, y: F_Ay }

      F_Bx = -T_B * nx_AB
      F_By = T_B * ny_AB
      F_B_radial = { x: F_Bx, y: F_By }

      const vBx_phys = vBx
      const vBy_phys = -vBy
      powerB = F_Bx * vBx_phys + F_By * vBy_phys

      const vAx_phys = vAx
      const vAy_phys = -vAy
      powerA = (T_B * nx_AB) * vAx_phys + (-T_B * ny_AB) * vAy_phys
    }

    const d_AB_cur = Math.sqrt((x_B - x_A) * (x_B - x_A) + (y_B - y_A) * (y_B - y_A))
    const nx_AB_cur = d_AB_cur > 1e-6 ? (x_B - x_A) / d_AB_cur : 0
    const ny_AB_cur = d_AB_cur > 1e-6 ? (y_B - y_A) / d_AB_cur : 1
    const vr_cur = vBx * nx_AB_cur + vBy * ny_AB_cur

    const EA = ekA + epA
    const EB = ekB + epB

    points.push({
      t: curT,
      mode,
      thetaA,
      thetaB,
      wA,
      wB,
      vA: Math.sqrt(vAx * vAx + vAy * vAy),
      vB: Math.sqrt(vBx * vBx + vBy * vBy),
      alphaA,
      alphaB,
      EpA: epA,
      EpB: epB,
      EkA: ekA,
      EkB: ekB,
      EA,
      EB,
      Etot: EA + EB,
      F_A: { x: F_Ax, y: F_Ay },
      F_B: { x: F_Bx, y: F_By },
      F_A_radial,
      F_A_tangential,
      F_B_radial,
      F_B_tangential,
      powerB,
      powerA,
      x_A_rel: x_A,
      y_A_rel: y_A,
      x_B_rel: x_B,
      y_B_rel: y_B,
      isSlackA: mode === 2 ? last_isSlackA : isSlack,
      isSlackB: mode === 2 ? last_isSlackB : isSlack,
      T_A,
      T_B,
      eventA: stepEventA,
      eventB: stepEventB,
      vr: mode === 1 ? v_r : (mode === 2 ? vr_cur : 0.0),
      stopReason,
      vAx: vAx,
      vAy: -vAy,
      vBx: vBx,
      vBy: -vBy
    })

    if (stopReason) {
      break
    }

    // 如果是最后一点，直接跳出
    if (t >= tMax) break

    // 子步数值积分 (Euler-Cromer / PBD)
    let breakOuter = false
    let stepStopReason: 'reach_bottom' | 'slack' | null = null

    // 模式 2 碰撞冲量累计
    let t_impact_OA_dt = 0
    let t_impact_AB_dt = 0

    for (let step = 0; step < subSteps; step++) {
      if (mode === 0) {
        // 刚性轻杆
        const curTheta = thetaA
        const curAlpha = (2 * (m1 + 2 * m2) * g * Math.cos(curTheta)) / ((m1 + 4 * m2) * L)
        wA = wA + curAlpha * subDt
        thetaA = thetaA + wA * subDt
        thetaB = thetaA
        wB = wA

        x_A = R_A0 * Math.cos(thetaA)
        y_A = R_A0 * Math.sin(thetaA)
        vAx = -R_A0 * wA * Math.sin(thetaA)
        vAy = R_A0 * wA * Math.cos(thetaA)

        x_B = R_B0 * Math.cos(thetaB)
        y_B = R_B0 * Math.sin(thetaB)
        vBx = -R_B0 * wB * Math.sin(thetaB)
        vBy = R_B0 * wB * Math.cos(thetaB)
      } else if (mode === 1) {
        // 双绳分系，跨滑轮动力学耦合
        const numerator = g * (1 + Math.sin(thetaB)) + r_B * wB * wB
        const denominator = 1.0 / m1 + 1.0 / m2
        const T = numerator / denominator

        if (T <= 0.0001) {
          isSlack = true
          stepStopReason = 'slack'
          breakOuter = true
          break
        }

        if (thetaB >= Math.PI / 2) {
          thetaB = Math.PI / 2
          wB = 0
          v_r = 0
          stepStopReason = 'reach_bottom'
          breakOuter = true
          break
        }

        // 拉紧状态加速
        const a_r = g - T / m1
        const alpha_B = (g * Math.cos(thetaB) + 2.0 * v_r * wB) / r_B

        v_r = v_r + a_r * subDt
        wB = wB + alpha_B * subDt
        thetaB = thetaB + wB * subDt

        r_A = r_A + v_r * subDt
        
        // 极径幅值保护，防止小球冲入滑轮中心导致除零发散
        const MIN_R = 0.05
        if (r_A < MIN_R) {
          r_A = MIN_R
          v_r = 0
        } else if (r_A > L_rope - MIN_R) {
          r_A = L_rope - MIN_R
          v_r = 0
        }
        r_B = L_rope - r_A

        x_A = 0.0
        y_A = r_A
        vAx = 0.0
        vAy = v_r

        x_B = r_B * Math.cos(thetaB)
        y_B = r_B * Math.sin(thetaB)
        vBx = -v_r * Math.cos(thetaB) - r_B * wB * Math.sin(thetaB)
        vBy = -v_r * Math.sin(thetaB) + r_B * wB * Math.cos(thetaB)
      } else {
        // mode === 2: 轻绳连接体三阶段 PBD 仿真
        // 1. 预测步：仅受重力作用 (y向下为正)
        const vAx_pred = vAx
        const vAy_pred = vAy + g * subDt
        const vBx_pred = vBx
        const vBy_pred = vBy + g * subDt

        let xA_pred = x_A + vAx_pred * subDt
        let yA_pred = y_A + vAy_pred * subDt
        let xB_pred = x_B + vBx_pred * subDt
        let yB_pred = y_B + vBy_pred * subDt

        // 2. 碰撞检测与速度同化
        const R_A = L / 2
        const R_AB = L / 2

        const d_A_old = Math.sqrt(x_A * x_A + y_A * y_A)
        const d_AB_old = Math.sqrt((x_B - x_A) * (x_B - x_A) + (y_B - y_A) * (y_B - y_A))

        const d_A_pred = Math.sqrt(xA_pred * xA_pred + yA_pred * yA_pred)
        const d_AB_pred = Math.sqrt((xB_pred - xA_pred) * (xB_pred - xA_pred) + (yB_pred - yA_pred) * (yB_pred - yA_pred))

        let T_impact_OA = 0
        let T_impact_AB = 0

        // OA 绳拉直碰撞检测
        if (d_A_old < R_A - 0.001 && d_A_pred >= R_A) {
          stepEventA = 'tension'
          const nx = xA_pred / d_A_pred
          const ny = yA_pred / d_A_pred
          const v_radial = vAx_pred * nx + vAy_pred * ny
          if (v_radial > 0) {
            const vAx_corr = vAx_pred - v_radial * nx
            const vAy_corr = vAy_pred - v_radial * ny
            T_impact_OA = (m1 * v_radial) / subDt
            xA_pred = x_A + vAx_corr * subDt
            yA_pred = y_A + vAy_corr * subDt
          }
        }

        // AB 绳拉直碰撞检测
        if (d_AB_old < R_AB - 0.001 && d_AB_pred >= R_AB) {
          stepEventB = 'tension'
          const dx = xB_pred - xA_pred
          const dy = yB_pred - yA_pred
          const len = Math.sqrt(dx * dx + dy * dy)
          const nx = len > 1e-6 ? dx / len : 0
          const ny = len > 1e-6 ? dy / len : 1

          const vA_para = vAx_pred * nx + vAy_pred * ny
          const vB_para = vBx_pred * nx + vBy_pred * ny
          const v_rel = vB_para - vA_para
          if (v_rel > 0) {
            const v_para_new = (m1 * vA_para + m2 * vB_para) / (m1 + m2)
            const vAx_corr = vAx_pred + (v_para_new - vA_para) * nx
            const vAy_corr = vAy_pred + (v_para_new - vA_para) * ny
            const vBx_corr = vBx_pred + (v_para_new - vB_para) * nx
            const vBy_corr = vBy_pred + (v_para_new - vB_para) * ny

            T_impact_AB = (m1 * m2 * v_rel) / ((m1 + m2) * subDt)

            xA_pred = x_A + vAx_corr * subDt
            yA_pred = y_A + vAy_corr * subDt
            xB_pred = x_B + vBx_corr * subDt
            yB_pred = y_B + vBy_corr * subDt
          }
        }

        // 3. PBD 约束投影迭代
        let xA_pbd = xA_pred
        let yA_pbd = yA_pred
        let xB_pbd = xB_pred
        let yB_pbd = yB_pred

        for (let iter = 0; iter < 5; iter++) {
          const len_OA = Math.sqrt(xA_pbd * xA_pbd + yA_pbd * yA_pbd)
          if (len_OA > R_A) {
            xA_pbd = R_A * (xA_pbd / len_OA)
            yA_pbd = R_A * (yA_pbd / len_OA)
          }

          const dx = xB_pbd - xA_pbd
          const dy = yB_pbd - yA_pbd
          const len_AB = Math.sqrt(dx * dx + dy * dy)
          if (len_AB > R_AB) {
            const C = len_AB - R_AB
            const nx = dx / len_AB
            const ny = dy / len_AB
            const w1 = 1.0 / m1
            const w2 = 1.0 / m2
            const invMassSum = w1 + w2
            xA_pbd += (w1 / invMassSum) * C * nx
            yA_pbd += (w1 / invMassSum) * C * ny
            xB_pbd -= (w2 / invMassSum) * C * nx
            yB_pbd -= (w2 / invMassSum) * C * ny
          }
        }

        // 4. 更新速度与位置
        vAx = (xA_pbd - x_A) / subDt
        vAy = (yA_pbd - y_A) / subDt
        vBx = (xB_pbd - x_B) / subDt
        vBy = (yB_pbd - y_B) / subDt

        x_A = xA_pbd
        y_A = yA_pbd
        x_B = xB_pbd
        y_B = yB_pbd

        // 5. 绳子松紧判定与解析张力计算
        const d_A = Math.sqrt(x_A * x_A + y_A * y_A)
        const d_AB = Math.sqrt((x_B - x_A) * (x_B - x_A) + (y_B - y_A) * (y_B - y_A))

        last_isSlackA = d_A < R_A - 0.002
        last_isSlackB = d_AB < R_AB - 0.002

        const nx_OA = d_A > 1e-6 ? x_A / d_A : 0
        const ny_OA = d_A > 1e-6 ? y_A / d_A : 1

        const nx_AB = d_AB > 1e-6 ? (x_B - x_A) / d_AB : 0
        const ny_AB = d_AB > 1e-6 ? (y_B - y_A) / d_AB : 1

        const v_rel_x = vBx - vAx
        const v_rel_y = vBy - vAy
        const v_rel_para = v_rel_x * nx_AB + v_rel_y * ny_AB
        const v_rel_perp_x = v_rel_x - v_rel_para * nx_AB
        const v_rel_perp_y = v_rel_y - v_rel_para * ny_AB
        const v_rel_perp_sq = v_rel_perp_x * v_rel_perp_x + v_rel_perp_y * v_rel_perp_y

        const vA_para = vAx * nx_OA + vAy * ny_OA
        const vA_perp_x = vAx - vA_para * nx_OA
        const vA_perp_y = vAy - vA_para * ny_OA
        const vA_perp_sq = vA_perp_x * vA_perp_x + vA_perp_y * vA_perp_y

        let T_AB_smooth = 0
        if (!last_isSlackB) {
          T_AB_smooth = m2 * (g * ny_AB + v_rel_perp_sq / R_AB)
          if (T_AB_smooth < 0) T_AB_smooth = 0
        }

        let T_OA_smooth = 0
        if (!last_isSlackA) {
          const cos_phi = nx_AB * nx_OA + ny_AB * ny_OA
          T_OA_smooth = m1 * (g * ny_OA + vA_perp_sq / R_A) + T_AB_smooth * cos_phi
          if (T_OA_smooth < 0) T_OA_smooth = 0
        }

        t_impact_OA_dt += T_impact_OA * subDt
        t_impact_AB_dt += T_impact_AB * subDt

        last_T_OA = T_OA_smooth
        last_T_AB = T_AB_smooth

        if (d_A_old >= R_A - 0.001 && last_isSlackA) {
          stepEventA = 'slack'
        }
        if (d_AB_old >= R_AB - 0.001 && last_isSlackB) {
          stepEventB = 'slack'
        }
      }
    }

    if (mode === 2) {
      last_T_OA += t_impact_OA_dt / dt
      last_T_AB += t_impact_AB_dt / dt
    }

    if (stepStopReason) {
      stopReason = stepStopReason
    }

    if (breakOuter) {
      // 记录最后一刻截断状态点
      t += dt
      let lastEpA = m1 * g * (L_rope - r_A)
      let lastEpB = m2 * g * (L_rope - y_B)
      let lastEkA = 0.5 * m1 * v_r * v_r
      let lastEkB = 0.5 * m2 * (v_r * v_r + r_B * wB * r_B * wB)
      
      points.push({
        t,
        mode,
        thetaA,
        thetaB,
        wA,
        wB,
        vA: Math.sqrt(vAx * vAx + vAy * vAy),
        vB: Math.sqrt(vBx * vBx + vBy * vBy),
        alphaA: 0,
        alphaB: 0,
        EpA: lastEpA,
        EpB: lastEpB,
        EkA: lastEkA,
        EkB: lastEkB,
        EA: lastEkA + lastEpA,
        EB: lastEkB + lastEpB,
        Etot: lastEkA + lastEpA + lastEkB + lastEpB,
        F_A: { x: 0.0, y: stopReason === 'slack' ? 0.0 : T_A },
        F_B: {
          x: stopReason === 'slack' ? 0.0 : -T_B * Math.cos(thetaB),
          y: stopReason === 'slack' ? 0.0 : T_B * Math.sin(thetaB),
        },
        powerB: 0.0,
        powerA: 0.0,
        x_A_rel: x_A,
        y_A_rel: y_A,
        x_B_rel: x_B,
        y_B_rel: y_B,
        isSlackA: isSlack,
        isSlackB: isSlack,
        T_A: stopReason === 'slack' ? 0.0 : T_A,
        T_B: stopReason === 'slack' ? 0.0 : T_B,
        vr: v_r,
        stopReason,
        vAx: vAx,
        vAy: -vAy,
        vBx: vBx,
        vBy: -vBy
      })
      break
    }

    t += dt
  }

  return points
}
