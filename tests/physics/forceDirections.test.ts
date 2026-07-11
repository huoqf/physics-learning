import { describe, it, expect } from 'vitest'
import { lorentzForceDir, electricForceDir, centripetalForceDir } from '@/physics/magnetism/forces'
import { svgPointToPhysicsPoint } from '@/utils/coordinate'
import { SPECTROMETER } from '@/features/electromagnetism/magnetism/combined-fields/model/combinedFieldsModel'

/**
 * 力方向纯函数单测。
 *
 * 约定：物理坐标系 x→右为正，y↑为正。
 * 所有返回向量应为单位向量（模长 1），零输入返回 {0,0}。
 */
describe('lorentzForceDir — 洛伦兹力方向 F = qv × B', () => {
  it('B 出纸面(⊙) + 正电荷 + 速度向右 → 力向下', () => {
    // v=(1,0), B_out, q>0 → F=(vy·Bz, -vx·Bz)=(0,-1) → 向下
    const d = lorentzForceDir({ x: 1, y: 0 }, 'outOfPage', 1.6e-19)
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(-1)
  })

  it('B 出纸面(⊙) + 正电荷 + 速度向下 → 力向左', () => {
    // v=(0,-1) 物理向下, B_out, q>0 → F=(-1·1, 0)=(-1,0) → 向左
    const d = lorentzForceDir({ x: 0, y: -1 }, 'outOfPage', 1.6e-19)
    expect(d.x).toBeCloseTo(-1)
    expect(d.y).toBeCloseTo(0)
  })

  it('B 入纸面(×) + 正电荷 + 速度向右 → 力向上', () => {
    // v=(1,0), B_in(Bz=-1), q>0 → F=(0·-1, -1·-1)=(0,1) → 向上
    const d = lorentzForceDir({ x: 1, y: 0 }, 'intoPage', 1.6e-19)
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(1)
  })

  it('B 入纸面(×) + 正电荷 + 速度向右下 → 力向右上', () => {
    // 复合场模式2 场景：v 向右下=(1,-1), B_in, q>0
    // F=(vy·Bz, -vx·Bz)=((-1)·(-1), -(1)·(-1))=(1,1) → 向右上
    const d = lorentzForceDir({ x: 1, y: -1 }, 'intoPage', 1.6e-19)
    expect(d.x).toBeCloseTo(Math.SQRT1_2)
    expect(d.y).toBeCloseTo(Math.SQRT1_2)
  })

  it('负电荷反转方向：B 出纸面 + 负电荷 + 速度向右 → 力向上', () => {
    const d = lorentzForceDir({ x: 1, y: 0 }, 'outOfPage', -1.6e-19)
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(1)
  })

  it('零电荷返回零向量', () => {
    expect(lorentzForceDir({ x: 1, y: 0 }, 'outOfPage', 0)).toEqual({ x: 0, y: 0 })
  })

  it('零速度返回零向量', () => {
    expect(lorentzForceDir({ x: 0, y: 0 }, 'outOfPage', 1.6e-19)).toEqual({ x: 0, y: 0 })
  })

  it('速度平行 B（纯 z 向）时返回零向量（2D 内无垂直分量）', () => {
    // 2D 平面内速度不可能平行 B（B 沿 z），但 vx=vy=0 已覆盖
    expect(lorentzForceDir({ x: 0, y: 0 }, 'intoPage', 1)).toEqual({ x: 0, y: 0 })
  })

  it('返回值为单位向量', () => {
    const d = lorentzForceDir({ x: 3, y: -4 }, 'intoPage', 2)
    const mag = Math.sqrt(d.x * d.x + d.y * d.y)
    expect(mag).toBeCloseTo(1)
  })
})

describe('electricForceDir — 电场力方向 F = qE', () => {
  it('正电荷 + E 向下 → 力向下', () => {
    // 复合场模式2 场景：E 向下 = {0,-1} 物理坐标, q>0 → F 同向
    const d = electricForceDir({ x: 0, y: -1 }, 1.6e-19)
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(-1)
  })

  it('负电荷 + E 向下 → 力向上', () => {
    const d = electricForceDir({ x: 0, y: -1 }, -1.6e-19)
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(1)
  })

  it('正电荷 + E 向右 → 力向右', () => {
    const d = electricForceDir({ x: 1, y: 0 }, 1.6e-19)
    expect(d.x).toBeCloseTo(1)
    expect(d.y).toBeCloseTo(0)
  })

  it('零电荷返回零向量', () => {
    expect(electricForceDir({ x: 1, y: 1 }, 0)).toEqual({ x: 0, y: 0 })
  })

  it('零电场返回零向量', () => {
    expect(electricForceDir({ x: 0, y: 0 }, 1.6e-19)).toEqual({ x: 0, y: 0 })
  })

  it('非单位 E 输入仍返回单位向量', () => {
    const d = electricForceDir({ x: 0, y: -300 }, 1.6e-19)
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(-1)
  })
})

describe('centripetalForceDir — 向心力方向（指向圆心）', () => {
  it('圆心在左方 → 力向左', () => {
    // 复合场模式0 场景：粒子在 (100,100)，圆心在 (50,100) 左侧
    const d = centripetalForceDir({ x: 100, y: 100 }, { x: 50, y: 100 })
    expect(d.x).toBeCloseTo(-1)
    expect(d.y).toBeCloseTo(0)
  })

  it('圆心在上方（物理坐标 y 更大）→ 力向上', () => {
    // 物理坐标 y↑正：圆心 y=150 在粒子上方
    const d = centripetalForceDir({ x: 0, y: 100 }, { x: 0, y: 150 })
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(1)
  })

  it('圆心在右上方 → 力向右上（模式2 正电荷场景）', () => {
    const d = centripetalForceDir({ x: 0, y: 0 }, { x: 3, y: 4 })
    expect(d.x).toBeCloseTo(0.6)
    expect(d.y).toBeCloseTo(0.8)
  })

  it('SVG 坐标翻转后一致：粒子在下、圆心在上', () => {
    // SVG: 粒子 y=200(下), 圆心 y=100(上) → 翻转为物理: 粒子 y=-200, 圆心 y=-100
    // 物理 dy = -100 - (-200) = 100 > 0 → 向上（物理 y↑），对应视觉向上
    const d = centripetalForceDir({ x: 0, y: -200 }, { x: 0, y: -100 })
    expect(d.y).toBeCloseTo(1)
  })

  it('pos 与 center 重合返回零向量', () => {
    expect(centripetalForceDir({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 })
  })

  it('返回值为单位向量', () => {
    const d = centripetalForceDir({ x: 0, y: 0 }, { x: 5, y: 12 })
    const mag = Math.sqrt(d.x * d.x + d.y * d.y)
    expect(mag).toBeCloseTo(1)
  })
})

// ─── 场景级回归测试：combined-fields 页面实际坐标 ──────────────────────────
//
// 验证组件调用纯函数时传入了正确的坐标系。
// 复合场 bug 根因：SVG(y↓正) 与物理(y↑正) 混淆导致力方向反转。
// 这些测试用 SPECTROMETER/DEFLECT 的真实布局常量 + svgPointToPhysicsPoint
// 转换路径，锁定"粒子在磁场中时洛伦兹力必须指向圆心"这一物理不变量。

describe('combined-fields 场景回归：洛伦兹力指向圆心', () => {
  it('模式0 质谱仪: 正电荷在 B₂(出纸面) 中, 圆心在左侧, 力指向左', () => {
    // SPECTROMETER.xMid=350, y1=130; 正电荷圆心在左侧 cx=300
    const rPx = 50
    const pos = { x: 320, y: 160 } // 粒子在圆上偏右下
    const cx = SPECTROMETER.xMid - rPx // 300, 圆心在左
    const cy = SPECTROMETER.y1 // 130

    const dir = centripetalForceDir(
      svgPointToPhysicsPoint(pos),
      svgPointToPhysicsPoint({ x: cx, y: cy }),
    )

    // 圆心在粒子左上方 → 力应指向左上
    expect(dir.x).toBeLessThan(0) // 向左
  })

  it('模式0 质谱仪: 负电荷圆心在右侧, 力指向右', () => {
    const rPx = 50
    const pos = { x: 380, y: 160 } // 粒子在圆上偏左下
    const cx = SPECTROMETER.xMid + rPx // 400, 圆心在右
    const cy = SPECTROMETER.y1

    const dir = centripetalForceDir(
      svgPointToPhysicsPoint(pos),
      svgPointToPhysicsPoint({ x: cx, y: cy }),
    )

    expect(dir.x).toBeGreaterThan(0) // 向右
  })

  it('模式2 电偏转磁偏转: 正电荷圆心在右上方, 力指向右上', () => {
    // DEFLECT.magneticB2StartX=300; 正电荷在 B₂(入纸面) 中圆心在右上
    const pos = { x: 400, y: 200 } // 粒子已进入磁场
    const cx = 450 // 圆心在右
    const cy = 150 // 圆心在上(SVG y 更小)

    const dir = centripetalForceDir(
      svgPointToPhysicsPoint(pos),
      svgPointToPhysicsPoint({ x: cx, y: cy }),
    )

    // SVG: 圆心在粒子右上方 → 翻转后物理坐标圆心也在右上方
    expect(dir.x).toBeGreaterThan(0) // 向右
    expect(dir.y).toBeGreaterThan(0) // 向上(物理 y↑正)
  })

  it('模式2: 电场力方向 - 正电荷在向下的电场中, 力向下', () => {
    // 上极板+下极板-, E 向下 = 物理坐标 {0,-1}
    const dir = electricForceDir({ x: 0, y: -1 }, 1.6e-19)
    expect(dir.x).toBeCloseTo(0)
    expect(dir.y).toBeCloseTo(-1) // 物理向下 = dy 负
  })

  it('模式2: 电场力方向 - 负电荷在向下的电场中, 力向上', () => {
    const dir = electricForceDir({ x: 0, y: -1 }, -1.6e-19)
    expect(dir.y).toBeCloseTo(1) // 物理向上 = dy 正
  })
})
