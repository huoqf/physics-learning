/**
 * 手部姿态计算工具。
 * 用于右手定则、左手定则等物理手势渲染。
 */

/**
 * 手性约定：右手 / 左手。决定中指相对拇指的"绕向"。
 * - 'right'：中指在拇指顺时针 90°（右手定则：B 出纸面时拇 v、食 B、中 I 满足 v×B=I）
 * - 'left' ：中指在拇指逆时针 90°（左手定则：B 入纸面时拇 F、食 B、中 I 满足 F=BIL）
 */
export type HandChirality = 'right' | 'left'

/**
 * 2D 向量辅助（手指定位纯函数）。Canvas 坐标：+x 向右，+y 向下。
 */
export interface Vec2 { x: number; y: number }

/**
 * 右手拇指的静止方向（度，Canvas 坐标系）。
 * 配合 `computeHandPose` 推算整只手的旋转角：
 *   `rotationDeg = atan2(thumbDir.y, thumbDir.x) * 180/π - THUMB_BASE_ANGLE`
 * 即"整只手额外旋转 `THUMB_BASE_ANGLE`"才能让拇指精确对齐 `thumbDir`。
 * 该值与 `SkeletalHand.tsx` 的解剖学约定保持一致（拇指静止时指向左上方）。
 */
export const THUMB_BASE_ANGLE = -90

/**
 * 手指定位结果：决定每根手指相对"手指根部局部坐标系"的旋转角。
 * 渲染端会再叠加 `handRotation`（整只手的整体旋转）。
 */
export interface HandFingerAngles {
  /** 拇指（拇）相对手掌的"外展角"（度） */
  thumb: number
  /** 食指（食）弯曲角（度）：0=伸直，>0=向掌心弯 */
  index: number
  /** 中指（中）弯曲角（度） */
  middle: number
  /** 无名指弯曲角（度） */
  ring: number
  /** 小拇指弯曲角（度） */
  little: number
}

/**
 * 整只手在画布上的姿态结果（[M4-1.x] 增强）。
 *
 * - rotationDeg ：整只手绕手掌中心的整体旋转角，使 拇指 与 `thumbDir` 同向、中指 与 `middleDir` 同向
 * - chirality   ：手性，决定中指绕拇指的绕向（右手 = 中指在拇指顺时针 90°，左手 = 逆时针 90°）
 * - pose        ：张开 / 半握 / 握拳
 * - B_out       ：true 表示磁场方向 ⊙（出纸面），false 表示 ⊗（入纸面）
 */
export interface HandPoseResult {
  rotationDeg: number
  chirality: HandChirality
  pose: 'open' | 'half-fist' | 'fist'
  B_out: boolean
}

/**
 * 由三个 2D 向量（v、B 投影、I）计算 2D 骨骼手的整体旋转。
 *
 * 物理含义：右手定则下，拇指沿 v 方向、中指沿 I 方向、整只手应旋转
 *          `atan2(v.y, v.x)`，使拇指对齐 v。此时 B 必须满足 `v × B = I`
 *          （B 在 +z 出纸面方向）；若方向相反则手性翻转为左手。
 *
 * 约定：传入的 v/I 均为 Canvas 2D 向量（+x 右，+y 下）。零向量返回 0。
 *
 * @param v 拇指方向（2D）
 * @param I 中指方向（2D）
 * @returns HandPoseResult
 */
/**
 * 重构后的手部姿态计算：
 * 以四指平面（中指指向）为旋转基准，确保手部角度自然垂直。
 * 在右手右手定则中，四指指代 B 方向（或者更准确地，令掌心平面指向 I 方向）。
 */
export function computeHandPose(v: Vec2, I: Vec2): HandPoseResult {
  const vMag = Math.hypot(v.x, v.y)
  const iMag = Math.hypot(I.x, I.y)

  if (vMag < 1e-9 || iMag < 1e-9) {
    return { rotationDeg: 0, chirality: 'right', pose: 'open', B_out: true }
  }

  // 计算中指（手掌中轴）应当指向的角度
  const iAngle = Math.atan2(I.y, I.x)

  // 修正旋转角：使中指（掌心轴）指向 I 方向。
  // 在静止姿态 (0°) 下，SkeletonHand 组件中的四指是朝上（-90°）定义的。
  // 所以当 I 方向为 iAngle 时，需要旋转 `iAngle - (-90°)`.
  const rotationDeg = (iAngle * 180) / Math.PI + 90

  // 手性判定（B 出/入纸面）。推导：
  //   设 Canvas 向量 v=(vx,vy)、I=(ix,iy)，对应物理向量 v_p=(vx,-vy)、I_p=(ix,-iy)。
  //   右手定则 I = v × B，取 B=(0,0,Bz)，则 I_p = v_p × B = (-vy·Bz, -vx·Bz, 0)，
  //   翻回 Canvas 得 I = (-vy·Bz, vx·Bz)。代入 Canvas 叉积：
  //     cross = v.x·I.y - v.y·I.x = vx·(vx·Bz) - vy·(-vy·Bz) = Bz·(vx² + vy²)
  //   故 sign(cross) = sign(Bz)：cross > 0 ⇔ B 出纸面（⊙）⇔ 右手定则成立。
  const cross = v.x * I.y - v.y * I.x
  const chirality: HandChirality = cross > 0 ? 'right' : 'left'
  const B_out = cross > 0

  return {
    rotationDeg,
    chirality,
    pose: 'open',
    B_out,
  }
}

/**
 * 给定 (v, B, I) 三个 2D/3D 分量，输出整只手应当呈现的姿态。
 *
 * 用于"导体切割磁感线"动画：根据 v 方向（正/负）、B 方向（出/入纸面），
 * 自动推导出 I 方向（I = v × B 右手螺旋），进而决定手的整体旋转与手性。
 *
 * @param vDir    速度方向：+1 向右、-1 向左
 * @param B_out   0 = B 入纸面 ⊗，1 = B 出纸面 ⊙
 * @returns HandPoseResult，含 rotationDeg / chirality / B_out
 */
export function computeCuttingEMFHandPose(vDir: number, B_out: 0 | 1): HandPoseResult {
  const v: Vec2 = { x: vDir, y: 0 }
  // I = v × B（右手定则）：v=(vx,0,0), B=(0,0,Bz) → I_3d = (0, -vx*Bz, 0)
  //   Canvas 中 y 翻转：I_canvas = (0, vx*Bz, 0)
  const sign = B_out === 0 ? -1 : 1
  const I: Vec2 = { x: 0, y: vDir * sign }
  const result = computeHandPose(v, I)
  return { ...result, B_out: B_out === 1 }
}
