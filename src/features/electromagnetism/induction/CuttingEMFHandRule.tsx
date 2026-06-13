import { HandRule, type HandRuleMode, type HandRuleProps } from '@/components/Physics/HandRule'
import type { Vec2 } from '@/physics'

/**
 * 便捷工厂：直接根据"切割磁感线"参数 (vDir, B_out) 生成 HandRule 所需 props。
 */
export interface CuttingEMFHandRuleProps extends Omit<HandRuleProps, 'mode' | 'thumbDir' | 'middleDir' | 'indexDir'> {
  /** 速度方向：+1 向右、-1 向左（v=0 时显示半透明提示态） */
  vDir: number
  /** 0 = B 入纸面 ⊗、1 = B 出纸面 ⊙ */
  B_out: 0 | 1
  /** 切换手性：'right' 右手定则 / 'left' 左手定则 */
  rule?: 'right' | 'left'
  /** 是否使用握拳姿态 */
  fist?: boolean
}

export function CuttingEMFHandRule({
  vDir,
  B_out,
  rule = 'right',
  fist = false,
  ...rest
}: CuttingEMFHandRuleProps) {
  const mode: HandRuleMode = fist ? 'fist' : rule
  const hasMotion = Math.abs(vDir) > 1e-6
  // 关键：v=0 时 thumbDir/middleDir 设为零向量。
  // 零向量会让 computeHandPose 走"降级分支"返回 rotation=0、chirality=mode，
  // 手就保持在**静止姿态**（拇指在左下侧、指向左上方），不会被任意旋转 130° 翻成"左手"。
  const thumbDir: Vec2 = hasMotion ? { x: vDir, y: 0 } : { x: 0, y: 0 }
  // 食指方向：B 出/入纸面在 2D 中为零向量（用 BLabel 渲染 ⊙/⊗）
  const indexDir: Vec2 = { x: 0, y: 0 }
  // 中指方向：I = v × B → I_canvas = (0, vDir * (B_out==0 ? -1 : 1), 0)
  const sign = B_out === 0 ? -1 : 1
  const middleDir: Vec2 = hasMotion ? { x: 0, y: vDir * sign } : { x: 0, y: 0 }
  return (
    <HandRule
      mode={mode}
      thumbDir={thumbDir}
      indexDir={indexDir}
      middleDir={middleDir}
      active={hasMotion}
      {...rest}
    />
  )
}
