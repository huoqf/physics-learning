export interface LRRModelState {
  /** 时间 (s) */
  t: number
  /** 约束类型: 0=刚性轻杆, 1=柔性轻绳 */
  mode: number
  /** A球角位移 (rad)，以水平向右为 0，顺时针向下为正 */
  thetaA: number
  /** B球角位移 (rad)，以水平向右为 0，顺时针向下为正 */
  thetaB: number
  /** A球角速度 (rad/s) */
  wA: number
  /** B球角速度 (rad/s) */
  wB: number
  /** A球线速度大小 (m/s) */
  vA: number
  /** B球线速度大小 (m/s) */
  vB: number
  /** A球角加速度 (rad/s²) */
  alphaA: number
  /** B球角加速度 (rad/s²) */
  alphaB: number
  /** A球重力势能 (J)，以最低点(theta=pi/2)为 0 势能面 */
  EpA: number
  /** B球重力势能 (J)，以最低点(theta=pi/2)为 0 势能面 */
  EpB: number
  /** A球动能 (J) */
  EkA: number
  /** B球动能 (J) */
  EkB: number
  /** A球总机械能 (J) */
  EA: number
  /** B球总机械能 (J) */
  EB: number
  /** 系统总机械能 (J) */
  Etot: number
  /** 杆/绳对 A球的作用力矢量 (N)，物理坐标 x->, y-向上 */
  F_A: { x: number; y: number }
  /** 杆/绳对 B球的作用力矢量 (N) */
  F_B: { x: number; y: number }
  /** 杆/绳对 A球的径向作用力矢量 (N) */
  F_A_radial?: { x: number; y: number }
  /** 杆/绳对 A球的切向作用力矢量 (N) */
  F_A_tangential?: { x: number; y: number }
  /** 杆/绳对 B球的径向作用力矢量 (N) */
  F_B_radial?: { x: number; y: number }
  /** 杆/绳对 B球的切向作用力矢量 (N) */
  F_B_tangential?: { x: number; y: number }
  /** 能量传输功率 (W) (从A向B为正，柔性绳下为0) */
  powerB: number
  /** 杆对 A球做功功率 (W) */
  powerA: number
  /** A球相对挂点的直角坐标 X (m) */
  x_A_rel: number
  /** A球相对挂点的直角坐标 Y (m，向下为正) */
  y_A_rel: number
  /** B球相对挂点的直角坐标 X (m) */
  x_B_rel: number
  /** B球相对挂点的直角坐标 Y (m，向下为正) */
  y_B_rel: number
  /** A球绳子是否松弛 */
  isSlackA: boolean
  /** B球绳子是否松弛 */
  isSlackB: boolean
  /** A球绳子拉力大小 (N) */
  T_A: number
  /** B球绳子拉力大小 (N) */
  T_B: number
  /** A球在该时间步触发的事件 */
  eventA?: 'slack' | 'tension' | null
  /** B球在该时间步触发的事件 */
  eventB?: 'slack' | 'tension' | null
  /** 径向速度 (m/s) (代表绳的伸缩速度) */
  vr: number
  /** 运动阶段结束原因 */
  stopReason?: 'reach_bottom' | 'slack' | null
  /** A球直角物理速度 x (m/s) */
  vAx: number
  /** A球直角物理速度 y (m/s) */
  vAy: number
  /** B球直角物理速度 x (m/s) */
  vBx: number
  /** B球直角物理速度 y (m/s) */
  vBy: number
}
