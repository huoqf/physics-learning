import { describe, it, expect } from 'vitest'
import {
  calculateAverageVelocity,
  calculateVariableAcceleration,
  calculateSecantSlope,
  calculateTangentSlope,
  calculateInstantaneousVelocity,
  calcGByLatitude,
  calcGByAltitude,
  precomputeFreeFallWithDrag,
  precomputeVariableMotion,
  precomputeVerticalThrowTrajectory,
  precomputeProjectileWithDrag,
  precomputeObliqueThrowWithDrag,
  calculateCircularMotion,
} from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'

describe('calculateAverageVelocity', () => {
  it('应正确计算匀速运动的平均速度', () => {
    const result = calculateAverageVelocity(0, 20, 0, 4)
    expect(result.vBar).toBeCloseTo(5, 10)
    expect(result.deltaX).toBe(20)
    expect(result.deltaT).toBe(4)
  })

  it('应正确计算变速运动的平均速度', () => {
    const result = calculateAverageVelocity(0, 30, 0, 5)
    expect(result.vBar).toBeCloseTo(6, 10)
  })

  it('Δt=0 时平均速度应为 0', () => {
    const result = calculateAverageVelocity(5, 10, 3, 3)
    expect(result.vBar).toBe(0)
    expect(result.deltaT).toBe(0)
  })
})

describe('calculateVariableAcceleration', () => {
  describe('force-increasing 模型', () => {
    const params: VariableMotionParams = { k: 2, v0: 0 }

    it('t=0 时 x=0, v=0, a=0', () => {
      const r = calculateVariableAcceleration('force-increasing', params, 0)
      expect(r.x).toBeCloseTo(0, 10)
      expect(r.v).toBeCloseTo(0, 10)
      expect(r.a).toBeCloseTo(0, 10)
    })

    it('t=3, k=2 时 a=k·t=6', () => {
      const r = calculateVariableAcceleration('force-increasing', params, 3)
      expect(r.a).toBeCloseTo(6, 10)
      expect(r.v).toBeCloseTo(9, 10)   // ½·2·9 = 9
      expect(r.x).toBeCloseTo(9, 10)   // 2·27/6 = 9
    })

    it('有初速度 v0 时应叠加', () => {
      const r = calculateVariableAcceleration('force-increasing', { k: 1, v0: 3 }, 2)
      expect(r.v).toBeCloseTo(5, 10)   // 3 + ½·1·4 = 5
      expect(r.x).toBeCloseTo(7.333, 2) // 3·2 + 1·8/6 ≈ 7.333
    })
  })

  describe('shm 模型', () => {
    const params: VariableMotionParams = { A: 5, omega: 2 }

    it('t=0 时 x=0, v=Aω, a=0', () => {
      const r = calculateVariableAcceleration('shm', params, 0)
      expect(r.x).toBeCloseTo(0, 10)
      expect(r.v).toBeCloseTo(10, 10) // Aω = 5·2 = 10
      expect(r.a).toBeCloseTo(0, 10)
    })

    it('t=π/(2ω) 时 x=A, v=0, a=-Aω²', () => {
      const t = Math.PI / (2 * 2) // π/4
      const r = calculateVariableAcceleration('shm', params, t)
      expect(r.x).toBeCloseTo(5, 5)
      expect(r.v).toBeCloseTo(0, 5)
      expect(r.a).toBeCloseTo(-20, 5) // -Aω² = -5·4 = -20
    })

    it('应满足简谐振动的能量守恒 ½mv² + ½mω²x² = ½mA²ω²', () => {
      for (const t of [0, 0.5, 1, 1.5, 2]) {
        const r = calculateVariableAcceleration('shm', params, t)
        const E = 0.5 * r.v * r.v + 0.5 * (params.omega ?? 2) ** 2 * r.x * r.x
        expect(E).toBeCloseTo(0.5 * (params.A ?? 5) ** 2 * (params.omega ?? 2) ** 2, 8)
      }
    })
  })

  describe('multi-stage 模型', () => {
    const params: VariableMotionParams = { v0: 0, a1: 2, vMax: 6, a3: 3, t1: 3, t2Duration: 2, tStop: 2, a5: 3 }

    it('阶段1：正向加速 t=2 时 v=4, x=4', () => {
      const r = calculateVariableAcceleration('multi-stage', params, 2)
      expect(r.v).toBeCloseTo(4, 10)
      expect(r.x).toBeCloseTo(4, 10) // ½·2·4 = 4
      expect(r.a).toBeCloseTo(2, 10)
    })

    it('阶段1末 t=3 时 v=6', () => {
      const r = calculateVariableAcceleration('multi-stage', params, 3)
      expect(r.v).toBeCloseTo(6, 10)
      expect(r.a).toBeCloseTo(2, 10)
    })

    it('阶段2：正向匀速 t=4 时 v=6, a=0', () => {
      const r = calculateVariableAcceleration('multi-stage', params, 4)
      expect(r.v).toBeCloseTo(6, 10)
      expect(r.a).toBeCloseTo(0, 10)
    })

    it('阶段3：正向减速 t=6 时速度递减', () => {
      // t1=3, t2=2, 匀速段结束于 t=5, 减速段从 t>5 开始
      const r5_5 = calculateVariableAcceleration('multi-stage', params, 5.5)
      const r6 = calculateVariableAcceleration('multi-stage', params, 6)
      expect(r5_5.v).toBeGreaterThan(r6.v)
      expect(r5_5.a).toBeLessThan(0)
    })

    it('阶段4：卸货停留 v=0, x 不变', () => {
      // t1=3, t2=2, t3=vMax/a3=6/3=2, 停留从 t=7 开始
      const r7_5 = calculateVariableAcceleration('multi-stage', params, 7.5)
      const r8 = calculateVariableAcceleration('multi-stage', params, 8)
      expect(r7_5.v).toBeCloseTo(0, 10)
      expect(r8.v).toBeCloseTo(0, 10)
      expect(r7_5.x).toBeCloseTo(r8.x, 10)
      expect(r7_5.a).toBeCloseTo(0, 10)
    })

    it('阶段5：快速返回速度为负', () => {
      // 停留结束于 t=9, 返回段从 t>9 开始
      const r10 = calculateVariableAcceleration('multi-stage', params, 10)
      expect(r10.v).toBeLessThan(0)
      expect(r10.a).toBeLessThan(0)
      expect(r10.x).toBeGreaterThan(0) // 还没回到起点
    })

    it('全程结束后回到起点 x=0, v=0', () => {
      // 足够大的时间
      const r = calculateVariableAcceleration('multi-stage', params, 20)
      expect(r.v).toBeCloseTo(0, 10)
      expect(r.x).toBeCloseTo(0, 10)
    })

    it('位移先增后减，路程单调递增', () => {
      const r5 = calculateVariableAcceleration('multi-stage', params, 5)
      const r9 = calculateVariableAcceleration('multi-stage', params, 9)
      const r11 = calculateVariableAcceleration('multi-stage', params, 11)
      // 位移：阶段2 > 阶段4（停留时位移最大）> 阶段5（位移减小）
      expect(r9.x).toBeGreaterThan(r11.x) // 返回段位移减小
    })
  })
})

describe('calculateSecantSlope', () => {
  const params: VariableMotionParams = { A: 5, omega: 2 }

  it('Δt 很大时割线斜率与切线斜率差异明显', () => {
    const secant = calculateSecantSlope('shm', params, 0, 2)
    const tangent = calculateTangentSlope('shm', params, 0)
    expect(Math.abs(secant.slope - tangent)).toBeGreaterThan(0.1)
  })

  it('Δt→0 时割线斜率趋近切线斜率', () => {
    const secant = calculateSecantSlope('shm', params, 1, 0.0001)
    const tangent = calculateTangentSlope('shm', params, 1)
    expect(secant.slope).toBeCloseTo(tangent, 1)
  })

  it('匀速运动时割线斜率恒等于切线斜率', () => {
    // force-increasing with k=0 is uniform motion with v=v0
    const uniformParams: VariableMotionParams = { k: 0, v0: 5 }
    const secant = calculateSecantSlope('force-increasing', uniformParams, 2, 1)
    const tangent = calculateTangentSlope('force-increasing', uniformParams, 2)
    expect(secant.slope).toBeCloseTo(tangent, 10)
    expect(secant.slope).toBeCloseTo(5, 10)
  })
})

describe('calculateTangentSlope', () => {
  it('应等于瞬时速度', () => {
    const params: VariableMotionParams = { k: 1, v0: 0 }
    const tangent = calculateTangentSlope('force-increasing', params, 3)
    const state = calculateVariableAcceleration('force-increasing', params, 3)
    expect(tangent).toBeCloseTo(state.v, 10)
  })
})

describe('calculateInstantaneousVelocity', () => {
  const params: VariableMotionParams = { A: 5, omega: 2 }

  it('Δt→0 时残差趋近于 0', () => {
    const r1 = calculateInstantaneousVelocity('shm', params, 1, 1)
    const r2 = calculateInstantaneousVelocity('shm', params, 1, 0.01)
    const r3 = calculateInstantaneousVelocity('shm', params, 1, 0.001)
    expect(r1.residual).toBeGreaterThan(r2.residual)
    expect(r2.residual).toBeGreaterThan(r3.residual)
    expect(r3.residual).toBeLessThan(0.1)
  })

  it('匀速运动时残差恒为 0', () => {
    const uniformParams: VariableMotionParams = { k: 0, v0: 5 }
    const r = calculateInstantaneousVelocity('force-increasing', uniformParams, 2, 1)
    expect(r.residual).toBeCloseTo(0, 10)
    expect(r.vBar).toBeCloseTo(5, 10)
    expect(r.vInst).toBeCloseTo(5, 10)
  })
})

describe('calcGByLatitude & calcGByAltitude', () => {
  it('不同纬度的 g 应符合 Somigliana 规律 (两极 g 略大于赤道)', () => {
    const gEquator = calcGByLatitude(0)
    const gMid = calcGByLatitude(45)
    const gPole = calcGByLatitude(90)
    expect(gEquator).toBeCloseTo(9.780327, 4)
    expect(gPole).toBeGreaterThan(gMid)
    expect(gMid).toBeGreaterThan(gEquator)
  })

  it('随着海拔升高，g 应当减少', () => {
    const g0 = calcGByLatitude(45)
    const gHigh = calcGByAltitude(g0, 10) // 10km 高空
    expect(gHigh).toBeLessThan(g0)
  })
})

describe('precomputeFreeFallWithDrag', () => {
  it('在无阻力模式下能计算出正确的落地时间和位移轨迹', () => {
    const v0 = 0
    const g = 9.8
    const dragK = 0
    const m = 1
    const maxFallHeight = 2.0
    
    const { points, groundTime } = precomputeFreeFallWithDrag(v0, g, dragK, m, maxFallHeight)
    
    // 解析时间为 t = sqrt(2*h/g) = sqrt(4/9.8) ≈ 0.6388s
    expect(groundTime).toBeCloseTo(0.6388, 3)
    
    const lastPoint = points[points.length - 1]
    expect(lastPoint.y).toBeCloseTo(2.0, 5)
    expect(lastPoint.v).toBe(0) // 落地后速度置零
  })

  it('在有阻力模式下，物体的速度和落体时间会比无阻力时延长', () => {
    const v0 = 0
    const g = 9.8
    const m = 0.003
    const maxFallHeight = 2.0
    
    // 无阻力落地时间
    const { groundTime: tVacuum } = precomputeFreeFallWithDrag(v0, g, 0, m, maxFallHeight)
    
    // 羽毛的阻力 dragK = 0.02
    const { points, groundTime: tAir } = precomputeFreeFallWithDrag(v0, g, 0.02, m, maxFallHeight)
    
    expect(tAir).toBeGreaterThan(tVacuum)
    expect(points.length).toBeGreaterThan(2)
    
    // 检查末端点位移是否精确为 maxFallHeight
    const last = points[points.length - 1]
    expect(last.y).toBeCloseTo(2.0, 5)
  })
})

describe('precomputeVariableMotion', () => {
  it('在 force-increasing 模型下能正确计算位移、速度、加速度和累计路程', () => {
    const params: VariableMotionParams = { k: 2, v0: 0 }
    const points = precomputeVariableMotion('force-increasing', params, 3.0, 0.001, 0.5)
    
    expect(points.length).toBeGreaterThanOrEqual(7)
    
    expect(points[0].t).toBe(0)
    expect(points[0].x).toBe(0)
    expect(points[0].v).toBe(0)
    expect(points[0].a).toBe(0)
    expect(points[0].s).toBe(0)

    const lastPoint = points[points.length - 1]
    expect(lastPoint.t).toBeCloseTo(3.0, 3)
    expect(lastPoint.x).toBeCloseTo(9, 2)
    expect(lastPoint.v).toBeCloseTo(9, 2)
    expect(lastPoint.a).toBeCloseTo(6, 2)
    expect(lastPoint.s).toBeCloseTo(9, 2)
  })

  it('在 shm 简谐运动下位移是波动的，但累计路程 s 单调递增且大于位移绝对值', () => {
    const params: VariableMotionParams = { A: 5, omega: 2 }
    const points = precomputeVariableMotion('shm', params, 6.28, 0.001, 0.01)

    for (let i = 1; i < points.length; i++) {
      expect(points[i].s).toBeGreaterThanOrEqual(points[i - 1].s)
    }

    const quarterPoint = points.reduce((prev, curr) => Math.abs(curr.t - 0.785) < Math.abs(prev.t - 0.785) ? curr : prev)
    expect(quarterPoint.x).toBeCloseTo(5, 1)
    expect(quarterPoint.s).toBeCloseTo(5, 1)

    const halfPoint = points.reduce((prev, curr) => Math.abs(curr.t - 1.57) < Math.abs(prev.t - 1.57) ? curr : prev)
    expect(halfPoint.x).toBeCloseTo(0, 1)
    expect(halfPoint.s).toBeCloseTo(10, 1)

    const lastPoint = points[points.length - 1]
    expect(lastPoint.x).toBeCloseTo(0, 1)
    expect(lastPoint.s).toBeCloseTo(40, 1)
  })

  it('在 multi-stage 往返运动中能正确积分出阶段累计路程', () => {
    const params: VariableMotionParams = { v0: 0, a1: 2, vMax: 6, a3: 3, t1: 3, t2Duration: 2, tStop: 2, a5: 3 }
    const points = precomputeVariableMotion('multi-stage', params, 15, 0.001, 0.1)

    const lastPoint = points[points.length - 1]
    expect(lastPoint.x).toBeCloseTo(0, 1)
    expect(lastPoint.s).toBeCloseTo(54, 1)
  })
})

describe('precomputeVerticalThrowTrajectory', () => {
  it('在无阻力真空模式下，阻力轨道数据和真空轨道对照数据完全一致', () => {
    const v0 = 20
    const g = 10
    const k = 0
    const res = precomputeVerticalThrowTrajectory(v0, g, k, 0.02)

    expect(res.peakTime).toBeCloseTo(2, 5)
    expect(res.maxHeight).toBeCloseTo(20, 5)
    expect(res.landTime).toBeCloseTo(4, 5)

    expect(res.peakTimeVac).toBeCloseTo(2, 5)
    expect(res.maxHeightVac).toBeCloseTo(20, 5)
    expect(res.landTimeVac).toBeCloseTo(4, 5)

    expect(res.points.length).toBe(res.vacuumPoints.length)
    const midIdx = Math.floor(res.points.length / 2)
    expect(res.points[midIdx].y).toBeCloseTo(res.vacuumPoints[midIdx].y, 5)
  })

  it('在有阻力模式下，阻力轨道上升最大高度变矮，且 peakTime 和 landTime 有所偏斜', () => {
    const v0 = 20
    const g = 10
    const k = 0.15
    const res = precomputeVerticalThrowTrajectory(v0, g, k, 0.01)

    expect(res.maxHeight).toBeLessThan(res.maxHeightVac)
    expect(res.maxHeightVac).toBeCloseTo(20, 5)
    expect(res.peakTime).toBeLessThan(res.peakTimeVac)

    const lastPoint = res.points[res.points.length - 1]
    expect(lastPoint.y).toBeCloseTo(0, 5)
  })
})

describe('precomputeProjectileWithDrag', () => {
  it('在无阻力模式下应符合真空抛体运动公式规律', () => {
    const v0x = 10
    const g = 9.8
    const k = 0
    const h = 10.0 // 10米抛出高度
    
    const res = precomputeProjectileWithDrag(v0x, g, k, h)
    
    // 落地时间：t = sqrt(2*h/g) = sqrt(20/9.8) ≈ 1.42857s
    expect(res.groundTimeVac).toBeCloseTo(1.42857, 4)
    expect(res.groundTime).toBeCloseTo(1.42857, 4)
    
    // 真空和实际轨道应完全一致
    expect(res.points.length).toBe(res.vacuumPoints.length)
    
    const lastPoint = res.points[res.points.length - 1]
    expect(lastPoint.y).toBeCloseTo(-10.0, 4) // 落地截止于 -h
    expect(lastPoint.x).toBeCloseTo(14.2857, 3) // x = v0x * t = 10 * 1.42857 = 14.2857
  })

  it('在有空气阻力模式下实际水平位移和竖直高度下落应比真空对照更慢', () => {
    const v0x = 10
    const g = 9.8
    const k = 0.1
    const h = 10.0
    
    const res = precomputeProjectileWithDrag(v0x, g, k, h)
    
    // 有阻力时的落地时间应该比真空更长，因为竖直向上的空气阻力延缓了下落
    expect(res.groundTime).toBeGreaterThan(res.groundTimeVac)
    
    // 在某一中间时刻（例如 0.8s），实际水平位移应显著小于真空位移，实际下落高度也更低
    const checkT = 0.8
    const ptActive = res.points.find(p => Math.abs(p.t - checkT) < 0.01)
    const ptVac = res.vacuumPoints.find(p => Math.abs(p.t - checkT) < 0.01)
    
    if (ptActive && ptVac) {
      expect(ptActive.x).toBeLessThan(ptVac.x) // 水平阻力使 vx 变小
      expect(Math.abs(ptActive.y)).toBeLessThan(Math.abs(ptVac.y)) // 竖直阻力减缓了下落
    }
    
    // 最终落地时的实际水平位移应小于真空
    const lastActive = res.points[res.points.length - 1]
    const lastVac = res.vacuumPoints[res.vacuumPoints.length - 1]
    expect(lastActive.x).toBeLessThan(lastVac.x)
  })
})

describe('precomputeObliqueThrowWithDrag', () => {
  it('在无阻力模式下应符合真空斜抛运动规律', () => {
    const v0 = 15
    const angle = 45
    const g = 9.8
    const k = 0

    const res = precomputeObliqueThrowWithDrag(v0, angle, g, k)

    // 真空斜抛理论值计算
    // v0y = 15 * sin(45) = 15 * 0.70710678 ≈ 10.6066 m/s
    // groundTime = 2 * v0y / g = 21.2132 / 9.8 ≈ 2.1646s
    // range = v0x * groundTime = 10.6066 * 2.1646 ≈ 22.959m
    // maxHeight = v0y^2 / 2g = 112.5 / 19.6 ≈ 5.7397m
    expect(res.groundTimeVac).toBeCloseTo(2.1646, 3)
    expect(res.groundTime).toBeCloseTo(2.1646, 3)
    expect(res.rangeVac).toBeCloseTo(22.959, 2)
    expect(res.range).toBeCloseTo(22.959, 2)
    expect(res.maxHeightVac).toBeCloseTo(5.7397, 3)
    expect(res.maxHeight).toBeCloseTo(5.7397, 3)

    // 落地终点高度应归零
    const lastPoint = res.points[res.points.length - 1]
    expect(lastPoint.y).toBeCloseTo(0, 3)
  })

  it('在有阻力模式下，斜抛上升高度、水平射程和落地速度均应小于真空对照组', () => {
    const v0 = 15
    const angle = 45
    const g = 9.8
    const k = 0.1

    const res = precomputeObliqueThrowWithDrag(v0, angle, g, k)

    expect(res.maxHeight).toBeLessThan(res.maxHeightVac)
    expect(res.range).toBeLessThan(res.rangeVac)

    // 落地瞬间的速度大小应由于空气阻力做负功而小于初速度 v0
    const lastActive = res.points[res.points.length - 1]
    expect(lastActive.v).toBeLessThan(v0)
  })
})

describe('calculateCircularMotion', () => {
  it('应该正确计算旋转坐标、线速度和向心加速度', () => {
    const r = 2
    const omega = 1.5
    
    // t = 0 时，x = r, y = 0, v = r*omega = 3, a_c = r*omega^2 = 4.5
    const res0 = calculateCircularMotion(r, omega, 0)
    expect(res0.x).toBeCloseTo(2, 5)
    expect(res0.y).toBeCloseTo(0, 5)
    expect(res0.v).toBeCloseTo(3, 5)
    expect(res0.a_c).toBeCloseTo(4.5, 5)
    expect(res0.period).toBeCloseTo((2 * Math.PI) / 1.5, 5)

    // t = pi / (2 * omega) 时（旋转 90 度），x = 0, y = r = 2
    const res90 = calculateCircularMotion(r, omega, Math.PI / 3)
    expect(res90.x).toBeCloseTo(0, 5)
    expect(res90.y).toBeCloseTo(2, 5)
  })
})



