import { describe, test, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { wavelengthToHex } from '@/physics/optics'
import {
  SPECTRUM_RED_NM,
  SPECTRUM_VIOLET_NM,
  buildDispersionExtremeMatrix,
} from '@/physics/optics/dispersion'
import { buildDispersionQuantities } from '@/data/quantities/dispersion'
import {
  COMPARE_PLOT,
  CURVE_PLOT,
  DISPERSION_TOP_BAND_HEIGHT,
  DISPERSION_VIEW_HEIGHT,
  DISPERSION_VIEW_WIDTH,
  SCREEN_BOTTOM,
  SCREEN_TOP,
  SCREEN_WIDTH,
  SCREEN_X,
  useDispersionPhysics,
  type DispersionMode,
  type DispersionPhysicsResult,
} from '../hooks/useDispersionPhysics'

/** 入射角全量程（与注册表 paramMeta: min 45 / max 70 一致） */
const INCIDENCE_SWEEP = Array.from({ length: 26 }, (_, i) => 45 + i)

function computeAt(incidenceDeg: number, mode: DispersionMode): DispersionPhysicsResult {
  const { result } = renderHook(() => useDispersionPhysics({ mode, incidenceDeg }))
  return result.current
}

describe('色散视景排版不变量（全入射角量程 × 两种模式）', () => {
  test('光屏、棱镜、光源的视景坐标均落在上分区画布内', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const physics = computeAt(incidence, 'spectrum')

      // 光屏
      expect(SCREEN_TOP).toBeGreaterThan(0)
      expect(SCREEN_BOTTOM).toBeLessThanOrEqual(DISPERSION_TOP_BAND_HEIGHT)

      // 三棱镜顶点
      for (const v of physics.prismVertices) {
        expect(v.x).toBeGreaterThan(0)
        expect(v.x).toBeLessThan(DISPERSION_VIEW_WIDTH)
        expect(v.y).toBeGreaterThan(0)
        expect(v.y).toBeLessThan(DISPERSION_TOP_BAND_HEIGHT)
      }

      // 光源
      expect(physics.source.x).toBeGreaterThan(8)
      expect(physics.source.x).toBeLessThan(DISPERSION_VIEW_WIDTH * 0.5)
      expect(physics.source.y).toBeGreaterThan(8)
      expect(physics.source.y).toBeLessThan(DISPERSION_TOP_BAND_HEIGHT - 6)
    }
  })

  test('出射光线全部准确命中光屏，且彩带不越出上分区', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const physics = computeAt(incidence, 'spectrum')

      for (const ray of physics.exitRays) {
        expect(ray.to.x).toBeCloseTo(SCREEN_X, 6)
        expect(ray.from.x).toBeLessThan(SCREEN_X)
      }
      for (const ray of [physics.redRay, physics.violetRay]) {
        expect(ray.to.x).toBeCloseTo(SCREEN_X, 6)
      }

      // 彩带必须落在画布内，且落在光屏竖向范围内
      expect(physics.bandTopY).toBeGreaterThan(20)
      expect(physics.bandBottomY).toBeLessThan(DISPERSION_TOP_BAND_HEIGHT)
      expect(physics.bandTopY).toBeGreaterThanOrEqual(SCREEN_TOP)
      expect(physics.bandBottomY).toBeLessThanOrEqual(SCREEN_BOTTOM)

      // 红光偏折最小 → 落在最上方；紫光偏折最大 → 落在最下方
      expect(physics.redRay.to.y).toBeLessThan(physics.violetRay.to.y)
      expect(physics.bandTopY).toBeCloseTo(physics.redRay.to.y, 6)
      expect(physics.bandBottomY).toBeCloseTo(physics.violetRay.to.y, 6)
    }
  })

  test('棱镜内光路严格位于入射点与出射点之间，且出射点在棱镜右界面之后', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const physics = computeAt(incidence, 'dual')
      expect(physics.internalRay.from.x).toBeLessThan(physics.internalRay.to.x)
      expect(physics.incidentRay.to).toEqual(physics.internalRay.from)
      expect(physics.internalRay.to.x).toBeLessThan(SCREEN_X)
    }
  })

  test('光线颜色全部由真实波长计算得到', () => {
    for (const incidence of [45, 50, 60, 70]) {
      const physics = computeAt(incidence, 'spectrum')
      expect(physics.exitRays.length).toBe(31)
      for (const ray of physics.exitRays) {
        expect(ray.color).toBe(wavelengthToHex(ray.wavelengthNm))
      }
      // 两端必须是可见光谱的红端与紫端
      expect(physics.redRay.wavelengthNm).toBe(SPECTRUM_RED_NM)
      expect(physics.violetRay.wavelengthNm).toBe(SPECTRUM_VIOLET_NM)
      expect(physics.redRay.color).not.toBe(physics.violetRay.color)
    }
  })

  test('双色光模式下仅保留红紫两条特征光线', () => {
    const physics = computeAt(50, 'dual')
    expect(physics.exitRays.length).toBe(2)
    expect(physics.exitRays.map((r) => r.wavelengthNm)).toEqual([SPECTRUM_VIOLET_NM, SPECTRUM_RED_NM])
  })

  test('屏上彩带色标按位置升序排列且归一化到 [0, 1]', () => {
    const physics = computeAt(50, 'spectrum')
    expect(physics.bandStops.length).toBe(31)
    let prev = -Infinity
    for (const stop of physics.bandStops) {
      expect(stop.offset).toBeGreaterThanOrEqual(0)
      expect(stop.offset).toBeLessThanOrEqual(1)
      expect(stop.offset).toBeGreaterThanOrEqual(prev)
      prev = stop.offset
    }
    expect(physics.bandStops[0].offset).toBeCloseTo(0, 6)
    expect(physics.bandStops[physics.bandStops.length - 1].offset).toBeCloseTo(1, 6)
  })
})

describe('下分区 λ–n 曲线与极值对比数据', () => {
  test('柯西曲线为真实折射率映射，波长增大则曲线下降', () => {
    const physics = computeAt(50, 'spectrum')
    expect(physics.cauchyCurve.length).toBe(31)
    expect(physics.cauchyCurve[0].n).toBeGreaterThan(
      physics.cauchyCurve[physics.cauchyCurve.length - 1].n,
    )
    for (const pt of physics.cauchyCurve) {
      expect(pt.x).toBeGreaterThanOrEqual(CURVE_PLOT.x0)
      expect(pt.x).toBeLessThanOrEqual(CURVE_PLOT.x1)
      expect(pt.y).toBeGreaterThanOrEqual(CURVE_PLOT.y0)
      expect(pt.y).toBeLessThanOrEqual(CURVE_PLOT.y1)
      expect(pt.color).toBe(wavelengthToHex(pt.wavelengthNm))
    }
  })

  test('极值对比条长度按两端较大值归一化且不超出绘图区', () => {
    const physics = computeAt(55, 'dual')
    expect(physics.comparison.length).toBe(4)
    for (const item of physics.comparison) {
      expect(item.redLength).toBeLessThanOrEqual(COMPARE_PLOT.barMaxWidth + 1e-9)
      expect(item.violetLength).toBeLessThanOrEqual(COMPARE_PLOT.barMaxWidth + 1e-9)
      expect(item.redLength).toBeGreaterThan(0)
      expect(item.violetLength).toBeGreaterThan(0)
      // 较长的一条必须是归一化满值
      expect(Math.max(item.redLength, item.violetLength)).toBeCloseTo(COMPARE_PLOT.barMaxWidth, 6)
      const expected = item.redValue >= item.violetValue ? '>' : '<'
      expect(item.relation).toBe(expected)
    }
  })

  test('下分区数据整体落在下分区的设计高度内', () => {
    const lastRowBottom = COMPARE_PLOT.rowTop + 3 * COMPARE_PLOT.rowStep + 40
    expect(lastRowBottom).toBeLessThan(DISPERSION_VIEW_HEIGHT)
    expect(CURVE_PLOT.y0).toBeGreaterThanOrEqual(DISPERSION_TOP_BAND_HEIGHT)
  })

  /**
   * 排版预算：下分区两个面板并排，任何一侧的轴线与文字标注都不得越入对方列。
   * 曾出现「λ/nm 压住对比列脚注」「红 700nm n 压住 光子能量 E」「红/紫 行标压住最长行标签」
   * 三类越界，此处固化为不变量。数字为浏览器 DOM 实测的文本墨迹宽度。
   */
  test('曲线面板的轴线与刻度文字不越入右侧对比列', () => {
    const AXIS_OVERHANG = 14 // 轴线超出 CURVE_PLOT.x1 的长度
    const LONGEST_ROW_LABEL_W = 121 // 「双缝条纹间距 Δx」实测墨迹宽度
    const RED_MARKER_W = 18 // 「红」/「紫」行标实测墨迹宽度
    const RED_MARKER_GAP = 12 // 行标右端到条形起点的间距
    const LONGEST_VALUE_W = 54 // 「1.9901」实测墨迹宽度
    const VALUE_GAP = 6 // 条形右端到数值文本的间距

    // 轴线右端必须留在对比列标签列左侧
    expect(CURVE_PLOT.x1 + AXIS_OVERHANG).toBeLessThan(COMPARE_PLOT.labelX)
    // 对比列内部：标签列 → 行标 → 条形 → 数值，四段必须依次排开且整体不越出画布
    expect(COMPARE_PLOT.labelX + LONGEST_ROW_LABEL_W).toBeLessThanOrEqual(
      COMPARE_PLOT.barX - RED_MARKER_GAP - RED_MARKER_W,
    )
    expect(
      COMPARE_PLOT.barX + COMPARE_PLOT.barMaxWidth + VALUE_GAP + LONGEST_VALUE_W,
    ).toBeLessThanOrEqual(DISPERSION_VIEW_WIDTH)
  })

  test('光屏侧波长标注不越出画布右边界', () => {
    const SCREEN_LABEL_GAP = 22 // 光屏右缘到光谱模式标注起点的间距（与 DispersionScene 一致）
    const SCREEN_LABEL_W = 69 // 「红 700nm」实测墨迹宽度
    // 光谱模式：标注右对齐于画布右缘，仅需保证起点不压到引出线终点
    const LABEL_RIGHT = DISPERSION_VIEW_WIDTH - 2
    const LONGEST_EDGE_LINE_W = 77 // 「δ 最小」实测墨迹宽度
    const LEADER_END = SCREEN_X + SCREEN_WIDTH + 8

    expect(LEADER_END + 2).toBeLessThan(LABEL_RIGHT - LONGEST_EDGE_LINE_W)
    // 双色光模式：起点锚定，整行必须留在画布内
    expect(SCREEN_X + SCREEN_WIDTH + SCREEN_LABEL_GAP + SCREEN_LABEL_W).toBeLessThanOrEqual(
      DISPERSION_VIEW_WIDTH,
    )
  })

  test('对比列脚注整行不越出画布右边界', () => {
    const FOOTNOTE_W = 373 // 「参考装置：双缝间距 d=0.20mm，缝屏距离 L=1.0m」实测墨迹宽度
    expect(COMPARE_PLOT.labelX + FOOTNOTE_W).toBeLessThanOrEqual(DISPERSION_VIEW_WIDTH)
  })

  test('下分区最底部文字仍留在画布内，且刻度文字与轴端标签错开', () => {
    const X_TICK_LABEL_DY = 28 // x 轴刻度标签相对 CURVE_PLOT.y1 的下移量
    const DIGIT_INK_H = 13 // font(10) 在设计坐标下约 18px 字号，数字墨迹高 ≈ 0.72em
    const X_TICK_BASELINE = CURVE_PLOT.y1 + X_TICK_LABEL_DY
    const X_TICK_INK_TOP = X_TICK_BASELINE - DIGIT_INK_H
    const Y_BOTTOM_TICK_INK_BOTTOM = CURVE_PLOT.y1 + 4 // 最低一条 y 刻度（1.50）的基线

    // 刻度基线本身必须落在画布内（数字无下伸部，墨迹不越过基线）
    expect(X_TICK_BASELINE).toBeLessThan(DISPERSION_VIEW_HEIGHT)
    // 左下角：x 轴首刻度文字的上沿必须在 y 轴末刻度文字下沿之下，二者不得争位
    expect(X_TICK_INK_TOP).toBeGreaterThan(Y_BOTTOM_TICK_INK_BOTTOM)
  })
})

describe('右屏看板数据构建', () => {
  test('非目标动画返回 null', () => {
    expect(buildDispersionQuantities('anim-diffraction', {})).toBeNull()
  })

  test('看板输出含七大极值矩阵行与真实偏向角', () => {
    const data = buildDispersionQuantities('anim-dispersion', { mode: 0, incidenceAngle: 50 })
    expect(data).not.toBeNull()
    const labels = data!.quantities.map((q) => q.label)
    expect(labels).toContain('入射角 i')
    expect(labels).toContain('棱镜顶角 A')
    expect(labels).toContain('偏向角 δ（红 / 紫）')
    for (const row of buildDispersionExtremeMatrix(50)) {
      expect(labels.some((l) => l.includes(row.label))).toBe(true)
    }
  })

  test('偏向角一行与物理层红紫真实值一致（未做视景放大）', () => {
    const data = buildDispersionQuantities('anim-dispersion', { incidenceAngle: 50 })
    const deltaRow = data!.quantities.find((q) => q.label === '偏向角 δ（红 / 紫）')
    expect(deltaRow?.value).toBe('37.76 / 39.30')
    expect(deltaRow?.unit).toBe('°')
    expect(deltaRow?.highlight).toBe('extreme')
  })

  test('七大极值矩阵的极性文案与数值一致', () => {
    const data = buildDispersionQuantities('anim-dispersion', { incidenceAngle: 50 })
    const find = (keyword: string) => data!.quantities.find((q) => q.label.includes(keyword))!
    expect(find('波长').label).toContain('红 > 紫')
    expect(find('折射率').label).toContain('红 < 紫')
    expect(find('条纹间距').label).toContain('红 > 紫')
    expect(find('光子能量').label).toContain('红 < 紫')
  })

  test('公式区覆盖柯西色散律与最小偏向角，考点区覆盖七大极值链', () => {
    const data = buildDispersionQuantities('anim-dispersion', { incidenceAngle: 50 })
    const formulaNames = data!.formulas!.map((f) => f.name)
    expect(formulaNames).toContain('柯西经验色散律')
    expect(formulaNames).toContain('最小偏向角')
    const points = data!.gaokaoPoints!.map((p) => p.text).join('\n')
    expect(points).toContain('λ红>λ紫')
    expect(points).toContain('E红<E紫')
  })

  test('量程内不出现全反射告警', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const data = buildDispersionQuantities('anim-dispersion', { incidenceAngle: incidence })
      expect(data!.warnings ?? []).toHaveLength(0)
    }
  })
})
