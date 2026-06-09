import { describe, it, expect } from 'vitest'
import { getFingersForPose, type HandPose, type Finger } from '@/features/electromagnetism/shared/SkeletalHand'

/** 复现 SkeletalHand.tsx 内部的 computeFingerTip（不导出，但需要测试其行为）。
 *  这里用相同的算法计算指尖坐标，验证"标签位置 = 指尖位置"。 */
function computeFingerTip(finger: Finger): { x: number; y: number } {
  let x = 0
  let y = 0
  let cumulativeAngleDeg = 0
  for (const bone of finger.bones) {
    cumulativeAngleDeg += bone.angle
    const rad = (cumulativeAngleDeg * Math.PI) / 180
    x += bone.length * Math.cos(rad)
    y += bone.length * Math.sin(rad)
  }
  return { x: finger.baseX + x, y: finger.baseY + y }
}

describe('SkeletalHand · 手指姿态预设', () => {
  const POSES: HandPose[] = ['open', 'half-fist', 'fist']

  it('三种姿态都返回 5 根手指且骨骼总长 > 0', () => {
    for (const pose of POSES) {
      const fingers = getFingersForPose(pose)
      expect(fingers).toHaveLength(5)
      const names = fingers.map((f) => f.name)
      expect(names).toEqual(['thumb', 'index', 'middle', 'ring', 'little'])
      for (const f of fingers) {
        const total = f.bones.reduce((s, b) => s + b.length, 0)
        expect(total).toBeGreaterThan(0)
      }
    }
  })

  it('解剖学约定：右手拇指基部在左下侧、四指基部在上方', () => {
    const right = getFingersForPose('open', 'right')
    const thumb = right.find((f) => f.name === 'thumb')!
    expect(thumb.baseX).toBeLessThan(0)
    expect(thumb.baseY).toBeGreaterThanOrEqual(0)
    for (const name of ['index', 'middle', 'ring', 'little'] as const) {
      const f = right.find((x) => x.name === name)!
      expect(f.baseY).toBeLessThan(0)
    }
  })

  it('右手静止姿态：拇指第一段指向左上方（-130°），四指第一段指向上方（-90°）', () => {
    const right = getFingersForPose('open', 'right')
    const thumb = right.find((f) => f.name === 'thumb')!
    expect(thumb.bones[0].angle).toBe(-130)
    for (const name of ['index', 'middle', 'ring', 'little'] as const) {
      const f = right.find((x) => x.name === name)!
      expect(f.bones[0].angle).toBe(-90)
    }
  })

  it('握拳姿态：四指第二段骨大幅折弯（≥ 80°，卷回掌心）', () => {
    const fingers = getFingersForPose('fist')
    const curled = fingers.filter((f) => f.name !== 'thumb')
    for (const f of curled) {
      expect(Math.abs(f.bones[1].angle)).toBeGreaterThanOrEqual(80)
    }
  })

  it('右手 vs 左手 = 水平镜像：baseX 取反、bone[0] 角度取 180-angle', () => {
    const right = getFingersForPose('open', 'right')
    const left = getFingersForPose('open', 'left')
    for (let i = 0; i < right.length; i++) {
      expect(left[i].baseX).toBeCloseTo(-right[i].baseX, 10)
      expect(left[i].baseY).toBeCloseTo(right[i].baseY, 10)
      // 第一段骨（绝对角度）取 (180 - angle)
      expect(left[i].bones[0].angle).toBeCloseTo(180 - right[i].bones[0].angle, 10)
      // 第二段及之后（相对父骨骼）保持不变
      for (let b = 1; b < right[i].bones.length; b++) {
        expect(left[i].bones[b].angle).toBeCloseTo(right[i].bones[b].angle, 10)
      }
    }
  })

  it('左手静止姿态：拇指基部在右下侧、第一段指向右上方（310° ≡ -50°）', () => {
    const left = getFingersForPose('open', 'left')
    const thumb = left.find((f) => f.name === 'thumb')!
    expect(thumb.baseX).toBeGreaterThan(0)
    // 180 - (-130) = 310°（未规范化），等价于 -50°（指向右下方 ≈ 西偏南 50°）
    expect(thumb.bones[0].angle).toBeCloseTo(310, 10)
  })

  it('半握姿态：拇/食/中 保持伸直（与张开姿态完全相同），无名/小指 卷起', () => {
    const open = getFingersForPose('open')
    const half = getFingersForPose('half-fist')
    for (const name of ['thumb', 'index', 'middle'] as const) {
      const o = open.find((f) => f.name === name)!
      const h = half.find((f) => f.name === name)!
      for (let b = 0; b < o.bones.length; b++) {
        expect(h.bones[b].angle).toBeCloseTo(o.bones[b].angle, 10)
      }
    }
    // 无名/小指 在半握中应有明显折弯
    for (const name of ['ring', 'little'] as const) {
      const h = half.find((f) => f.name === name)!
      expect(Math.abs(h.bones[1].angle)).toBeGreaterThanOrEqual(40)
    }
  })

  it('握拳姿态：四指（非拇指）的第二段骨折弯幅度 ≥ 半握', () => {
    const half = getFingersForPose('half-fist')
    const fist = getFingersForPose('fist')
    for (const name of ['index', 'middle', 'ring', 'little'] as const) {
      const h = half.find((f) => f.name === name)!
      const f = fist.find((x) => x.name === name)!
      expect(Math.abs(f.bones[1].angle)).toBeGreaterThanOrEqual(Math.abs(h.bones[1].angle))
    }
  })
})

describe('SkeletalHand · 指尖位置（标签锚点）', () => {
  it('拇指静止姿态：指尖在左上区域（y < 0, x < baseX）', () => {
    // 拇指静止方向 ≈ -130° + (-25°) → 应指向左上方
    const [thumb] = getFingersForPose('open').filter((f) => f.name === 'thumb')
    const tip = computeFingerTip(thumb)
    expect(tip.x).toBeLessThan(thumb.baseX) // 向左
    expect(tip.y).toBeLessThan(0) // 向上（canvas 中 y<0 为上）
  })

  it('四指静止姿态：指尖都在手掌上方（y < 0）', () => {
    const fingers = getFingersForPose('open')
    for (const name of ['index', 'middle', 'ring', 'little'] as const) {
      const f = fingers.find((x) => x.name === name)!
      const tip = computeFingerTip(f)
      expect(tip.y).toBeLessThan(0)
    }
  })

  it('中指指尖比食指更高（静止姿态下 y 更小）', () => {
    const fingers = getFingersForPose('open')
    const index = fingers.find((f) => f.name === 'index')!
    const middle = fingers.find((f) => f.name === 'middle')!
    const tipI = computeFingerTip(index)
    const tipM = computeFingerTip(middle)
    expect(tipM.y).toBeLessThan(tipI.y)
  })

  it('四指指尖按 index→middle→ring→little 顺序 x 递增', () => {
    const fingers = getFingersForPose('open')
    const tips = ['index', 'middle', 'ring', 'little'].map((name) => {
      const f = fingers.find((x) => x.name === name)!
      return { name, x: computeFingerTip(f).x }
    })
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i].x).toBeGreaterThan(tips[i - 1].x)
    }
  })

  it('握拳姿态：四指指尖 y 坐标大幅下移（卷回掌心）', () => {
    const openFingers = getFingersForPose('open')
    const fistFingers = getFingersForPose('fist')
    for (const name of ['index', 'middle', 'ring', 'little'] as const) {
      const o = openFingers.find((f) => f.name === name)!
      const f = fistFingers.find((x) => x.name === name)!
      const tipO = computeFingerTip(o)
      const tipF = computeFingerTip(f)
      // 握拳后指尖应该比张开时**更低**（canvas y 更大），即 y 增加
      expect(tipF.y).toBeGreaterThan(tipO.y)
    }
  })
})
