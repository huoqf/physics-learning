import { useMemo } from 'react'
import { wavelengthToHex } from '@/physics/optics'
import {
  EQUILATERAL_PRISM_APEX_DEG,
  SPECTRUM_RED_NM,
  SPECTRUM_VIOLET_NM,
  buildDispersionExtremeMatrix,
  buildPrismLocalGeometry,
  refractiveIndexOfCauchyMedium,
  sampleDispersion,
  tracePrismRay,
  type DispersionExtremeRow,
  type DispersionQuantitySample,
  type Vec2,
} from '@/physics/optics/dispersion'

/* ─── 视景布局常量（严格遵循 CANVAS_PRESETS.full = 840×650 设计坐标系） ─── */

/** 画布设计尺寸 */
export const DISPERSION_VIEW_WIDTH = 840
export const DISPERSION_VIEW_HEIGHT = 650

/** 上分区（三棱镜色散光路）高度：840×325 */
export const DISPERSION_TOP_BAND_HEIGHT = 325

/** 棱镜底边长（设计坐标） */
export const PRISM_BASE_PX = 110
/** 棱镜底边中点位置 */
export const PRISM_BASE_MID = { x: 400, y: 175 }
/** 入射点沿左界面的固定位置（0 = 底边左端，1 = 顶点）——保证全角度排版守恒 */
const PRISM_ENTRY_FRACTION = 0.5

/** 光屏（竖直放置的深色屏）位置与尺寸 */
export const SCREEN_X = 728
export const SCREEN_TOP = 88
export const SCREEN_BOTTOM = 324
export const SCREEN_WIDTH = 16

/** 入射光束自入射点回退的长度（决定光源位置） */
const SOURCE_BACK = 260

/**
 * 视景色散扇形放大系数。
 *
 * 真实冕牌玻璃对 400～700 nm 的偏向角差仅约 1.55°（真实演示依赖数米外的投影屏
 * 才能把光谱拉开到肉眼可辨）。若在 840×325 的设计画布上按真实角度绘制，红紫光带
 * 间距仅约 13 px，教学上无法辨识。
 *
 * 因此视景层对「各波长偏向角相对红紫中点偏向角的偏差量」做统一仿射放大，
 * 属严格等比缩放：不改变 δ(λ) 的单调性，不改变红端与紫端的大小关系与比例，
 * 柯西色散规律 100% 保真。右屏看板给出的始终是未经放大的真实 SI 量值。
 */
const FAN_GAIN = 10

/** 连续光谱采样数（400 → 700 nm） */
const SPECTRUM_SAMPLES = 31

/** 下分区 λ–n 柯西曲线绘图区布局 */
export const CURVE_PLOT = {
  x0: 95,
  x1: 425,
  y0: 372,
  y1: 612,
  nMin: 1.5,
  nMax: 1.534,
} as const

/**
 * 下分区红紫极值对比条布局
 *
 * 水平预算（设计坐标，画布宽 840）：
 *   [455, 576] 行标签（最长「双缝条纹间距 Δx」实测 120）
 *   [586, 604] 红/紫行标（右对齐于 barX−12）
 *   [616, 774] 对比条
 *   [780, 834] 数值文本（最长「1.9901」实测 53）
 */
export const COMPARE_PLOT = {
  labelX: 455,
  barX: 616,
  barMaxWidth: 158,
  rowTop: 408,
  rowStep: 60,
} as const

/** 模式 0：白光连续色散（彩带）；模式 1：红-紫双色光路对比 */
export type DispersionMode = 'spectrum' | 'dual'

export interface DispersionRay {
  /** 波长 (nm) */
  wavelengthNm: number
  /** 由真实波长计算的光线颜色 */
  color: string
  from: Vec2
  to: Vec2
}

/** 光屏上的一小段光谱（用于逐段拼接连续彩带） */
export interface SpectrumBandStop {
  /** 归一化位置 0（上端）→ 1（下端） */
  offset: number
  color: string
  wavelengthNm: number
}

/** 红紫极值对比条的一项 */
export interface ComparisonBarItem {
  key: string
  label: string
  unit: string
  redValue: number
  violetValue: number
  redText: string
  violetText: string
  /** 红端条长（像素） */
  redLength: number
  /** 紫端条长（像素） */
  violetLength: number
  /** 红端相对紫端的关系符号 */
  relation: '>' | '<'
}

export interface DispersionPhysicsResult {
  /** 棱镜三角形顶点（apex → baseRight → baseLeft） */
  prismVertices: Vec2[]
  /** 入射光起点（光源） */
  source: Vec2
  /** 入射段落：光源 → 入射点 */
  incidentRay: { from: Vec2; to: Vec2 }
  /** 棱镜内段落：入射点 → 出射点 */
  internalRay: { from: Vec2; to: Vec2 }
  /** 出射扇形光线（模式 0 为 31 条连续光谱，模式 1 为红紫两条） */
  exitRays: DispersionRay[]
  /** 光屏上彩带的上下端纵坐标 */
  bandTopY: number
  bandBottomY: number
  /** 光屏彩带的连续色标（按位置排序） */
  bandStops: SpectrumBandStop[]
  /** 红端出射光线 */
  redRay: DispersionRay
  /** 紫端出射光线 */
  violetRay: DispersionRay
  /** λ–n 柯西曲线采样点（含设计坐标与光谱颜色） */
  cauchyCurve: { x: number; y: number; n: number; color: string; wavelengthNm: number }[]
  /** 红紫极值联动对比条 */
  comparison: ComparisonBarItem[]
  /** 七大极值矩阵（供右屏看板） */
  extremeMatrix: DispersionExtremeRow[]
  /** 参考（550 nm）色散物理量 —— 角度标注的真实数据源 */
  reference: DispersionQuantitySample
  /** 红端 700 nm */
  red: DispersionQuantitySample
  /** 紫端 400 nm */
  violet: DispersionQuantitySample
  /** 入射角 i (°) */
  incidenceDeg: number
  /** 顶角 A (°) */
  apexDeg: number
  /** 第二界面是否发生全反射 */
  totalInternalReflection: boolean
  /** 棱镜内第一界面折射角 r₁ (°) */
  r1Deg: number
  /** 棱镜内第二界面入射角 r₂ (°) */
  r2Deg: number
  /** 第二界面折射角 i₂ (°) */
  exitAngleDeg: number
}

interface UseDispersionPhysicsParams {
  mode: DispersionMode
  /** 入射角 i (°) */
  incidenceDeg: number
}

/** 棱镜局部坐标（底边长度归一化为 1）→ 设计坐标 */
function toDesign(local: Vec2): Vec2 {
  return {
    x: PRISM_BASE_MID.x + local.x * PRISM_BASE_PX,
    y: PRISM_BASE_MID.y + local.y * PRISM_BASE_PX,
  }
}

function rotate(vec: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return { x: vec.x * c - vec.y * s, y: vec.x * s + vec.y * c }
}

/**
 * 计算光的色散（三棱镜色散）场景几何与物理量。
 *
 * 双层映射：物理层用真实 SI 单位（nm / mm / m / °）计算；
 * 视景层按 840×650 设计坐标布局，仅对「色散扇形张角」做等比放大以便辨识。
 * 入射点与光屏位置取设计定值，保证入射角在全量程内光路始终落在画布上。
 */
export function useDispersionPhysics({
  mode,
  incidenceDeg,
}: UseDispersionPhysicsParams): DispersionPhysicsResult {
  return useMemo(() => {
    const apexDeg = EQUILATERAL_PRISM_APEX_DEG
    const localGeo = buildPrismLocalGeometry(apexDeg)

    // ── 1. 三种特征波长的真实色散物理量 ──
    const reference = sampleDispersion(550, incidenceDeg, apexDeg)
    const red = sampleDispersion(SPECTRUM_RED_NM, incidenceDeg, apexDeg)
    const violet = sampleDispersion(SPECTRUM_VIOLET_NM, incidenceDeg, apexDeg)
    const totalInternalReflection = reference.totalInternalReflection

    // ── 2. 参考波长（550 nm）实际光路：出射点、出射方向的几何来源 ──
    const geo = tracePrismRay({
      incidenceDeg,
      n: reference.refractiveIndex,
      apexDeg,
      entryFraction: PRISM_ENTRY_FRACTION,
    })

    const entryDesign = toDesign(geo.entryPoint)
    const exitDesign = toDesign(geo.exitPoint)
    const baseOutDir = Number.isNaN(geo.outDir.x) ? { x: 1, y: 0 } : geo.outDir

    const prismVertices: Vec2[] = [
      toDesign(localGeo.apex),
      toDesign(localGeo.baseRight),
      toDesign(localGeo.baseLeft),
    ]

    const source: Vec2 = {
      x: entryDesign.x - SOURCE_BACK * geo.inDir.x,
      y: entryDesign.y - SOURCE_BACK * geo.inDir.y,
    }

    // ── 3. 出射扇形：以红紫偏向角中点为轴心，按等比张角展开 ──
    const redDeviation = Number.isNaN(red.deviationDeg) ? 0 : red.deviationDeg
    const violetDeviation = Number.isNaN(violet.deviationDeg) ? 0 : violet.deviationDeg
    const centerDeviation = (redDeviation + violetDeviation) / 2

    const buildExitRay = (wavelengthNm: number, deviationDeg: number): DispersionRay => {
      const safeDeviation = Number.isNaN(deviationDeg) ? centerDeviation : deviationDeg
      const deltaRad = ((safeDeviation - centerDeviation) * Math.PI) / 180
      const dir = rotate(baseOutDir, FAN_GAIN * deltaRad)
      const hitY = exitDesign.y + (SCREEN_X - exitDesign.x) * (dir.y / dir.x)
      return {
        wavelengthNm,
        color: wavelengthToHex(wavelengthNm),
        from: exitDesign,
        to: { x: SCREEN_X, y: hitY },
      }
    }

    const wavelengths: number[] = []
    if (mode === 'spectrum') {
      for (let i = 0; i < SPECTRUM_SAMPLES; i++) {
        wavelengths.push(
          SPECTRUM_VIOLET_NM +
            (i * (SPECTRUM_RED_NM - SPECTRUM_VIOLET_NM)) / (SPECTRUM_SAMPLES - 1),
        )
      }
    } else {
      wavelengths.push(SPECTRUM_VIOLET_NM, SPECTRUM_RED_NM)
    }

    const exitRays: DispersionRay[] = wavelengths.map((wl) =>
      buildExitRay(wl, sampleDispersion(wl, incidenceDeg, apexDeg).deviationDeg),
    )

    const redRay = buildExitRay(SPECTRUM_RED_NM, redDeviation)
    const violetRay = buildExitRay(SPECTRUM_VIOLET_NM, violetDeviation)

    // 彩带端点：红端偏向角最小 → 落在最上方；紫端偏向角最大 → 落在最下方
    const bandTopY = Math.min(redRay.to.y, violetRay.to.y)
    const bandBottomY = Math.max(redRay.to.y, violetRay.to.y)
    const bandSpan = Math.max(1, bandBottomY - bandTopY)

    const bandStops: SpectrumBandStop[] = exitRays
      .map((ray) => ({
        offset: (ray.to.y - bandTopY) / bandSpan,
        color: ray.color,
        wavelengthNm: ray.wavelengthNm,
      }))
      .sort((a, b) => a.offset - b.offset)

    // ── 4. 下分区：λ–n 柯西曲线（按真实折射率绘制，曲线按光谱着色） ──
    const cauchyCurve = Array.from({ length: 31 }, (_, i) => {
      const wl = SPECTRUM_VIOLET_NM + (i * (SPECTRUM_RED_NM - SPECTRUM_VIOLET_NM)) / 30
      const n = refractiveIndexOfCauchyMedium(wl)
      return {
        wavelengthNm: wl,
        n,
        x:
          CURVE_PLOT.x0 +
          ((wl - SPECTRUM_VIOLET_NM) / (SPECTRUM_RED_NM - SPECTRUM_VIOLET_NM)) *
            (CURVE_PLOT.x1 - CURVE_PLOT.x0),
        y:
          CURVE_PLOT.y1 -
          ((n - CURVE_PLOT.nMin) / (CURVE_PLOT.nMax - CURVE_PLOT.nMin)) *
            (CURVE_PLOT.y1 - CURVE_PLOT.y0),
        color: wavelengthToHex(wl),
      }
    })

    // ── 5. 下分区：红紫极值联动对比条 ──
    const extremeMatrix = buildDispersionExtremeMatrix(incidenceDeg, apexDeg)
    const rowByKey = (key: DispersionExtremeRow['key']): DispersionExtremeRow =>
      extremeMatrix.find((row) => row.key === key) as DispersionExtremeRow

    const comparisonSpec: { key: DispersionExtremeRow['key']; label: string }[] = [
      { key: 'speed', label: '玻璃中光速 v' },
      { key: 'criticalAngle', label: '全反射临界角 C' },
      { key: 'fringeSpacing', label: '双缝条纹间距 Δx' },
      { key: 'photonEnergy', label: '光子能量 E' },
    ]

    const comparison: ComparisonBarItem[] = comparisonSpec.map(({ key, label }) => {
      const row = rowByKey(key)
      const scale = Math.max(row.red, row.violet) || 1
      return {
        key,
        label,
        unit: row.unit,
        redValue: row.red,
        violetValue: row.violet,
        redText: row.red.toFixed(row.digits),
        violetText: row.violet.toFixed(row.digits),
        redLength: Math.max(10, (row.red / scale) * COMPARE_PLOT.barMaxWidth),
        violetLength: Math.max(10, (row.violet / scale) * COMPARE_PLOT.barMaxWidth),
        relation: row.relation,
      }
    })

    return {
      prismVertices,
      source,
      incidentRay: { from: source, to: entryDesign },
      internalRay: { from: entryDesign, to: exitDesign },
      exitRays,
      bandTopY,
      bandBottomY,
      bandStops,
      redRay,
      violetRay,
      cauchyCurve,
      comparison,
      extremeMatrix,
      reference,
      red,
      violet,
      incidenceDeg,
      apexDeg,
      totalInternalReflection,
      r1Deg: geo.r1Deg,
      r2Deg: geo.r2Deg,
      exitAngleDeg: geo.exitAngleDeg,
    }
  }, [mode, incidenceDeg])
}
