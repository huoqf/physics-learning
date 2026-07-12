/**
 * useSceneScale — 统一 SceneScale 入口 Hook
 *
 * 职责：
 *   根据场景锚点模式（anchor），从 ViewportInfo + preset 构造 SceneScale，
 *   所有输出统一为设计坐标单位（design-unit），避免容器像素混入导致二次缩放。
 *
 * @agent-rule 新页面必须使用此 Hook，禁止直接调用 createSceneScaleFromViewport 的 visibleArea/centerScale 模式
 * @agent-rule SceneScale.originX/Y、scaleX/Y、maxVectorLength 单位均为 design-unit
 *
 * @example
 * ```tsx
 * // viewport 模式（默认 bottomLeft 原点）
 * const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
 * const sceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: 20, physicsHeight: 15 })
 *
 * // center 模式（圆周运动）
 * const sceneScale = useSceneScale({
 *   vp, preset: CANVAS_PRESETS.square,
 *   anchor: 'center',
 *   physicsScaleDesign: 50,
 *   centerSource: 'design',
 *   refMagnitudes: { velocity: 10, acceleration: 5 },
 * })
 * ```
 */

import { useMemo } from 'react'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import type { VectorType } from '@/theme/physics/vectorStyle'
import type { CanvasPreset } from '@/hooks/useAnimationViewport'

// ─── 类型 ──────────────────────────────────────────────────────────────────

export interface UseSceneScaleOptions {
  vp: ViewportInfo
  preset: CanvasPreset

  anchor: 'viewport' | 'center' | 'design' | 'custom'

  // ── center 模式 ──
  /** 设计坐标比例（design-unit / meter），anchor='center' 时必填 */
  physicsScaleDesign?: number
  /** 非等比缩放 X 方向（可选，覆盖 physicsScaleDesign） */
  physicsScaleDesignX?: number
  /** 非等比缩放 Y 方向（可选，覆盖 physicsScaleDesign） */
  physicsScaleDesignY?: number
  /** 中心来源，默认 'viewport' */
  centerSource?: 'viewport' | 'design' | 'custom'
  /** centerSource === 'custom' 时的中心 X（设计坐标） */
  centerX?: number
  /** centerSource === 'custom' 时的中心 Y（设计坐标） */
  centerY?: number

  // ── viewport / design 模式 ──
  /** 物理世界宽度（米），anchor='viewport'|'design' 时必填 */
  physicsWidth?: number
  /** 物理世界高度（米），anchor='viewport'|'design' 时必填 */
  physicsHeight?: number

  // ── custom 模式 ──
  /** anchor === 'custom' 时必填 */
  customScaleX?: number
  /** anchor === 'custom' 时必填 */
  customScaleY?: number
  /** anchor === 'custom' 时必填（设计坐标） */
  customOriginX?: number
  /** anchor === 'custom' 时必填（设计坐标） */
  customOriginY?: number

  // ── viewport / design 模式：物理原点位置 ──
  /** 原点位置，默认 'bottomLeft' */
  originSource?: 'topLeft' | 'bottomLeft' | 'center' | 'custom'
  /** originSource === 'custom' 时的原点 X（设计坐标） */
  originX?: number
  /** originSource === 'custom' 时的原点 Y（设计坐标） */
  originY?: number

  // ── 公共 ──
  refMagnitudes?: Partial<Record<VectorType, number>>
  /** 矢量归一化上限（设计坐标单位），不传则自动计算 */
  maxVectorLength?: number
  /** 中心区域布局模式，影响 maxVectorLength 默认值 */
  centerLayout?: 'splitH' | 'splitV'
  /** 标记非等比缩放是设计需求 */
  intentionalNonUniformScale?: boolean
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSceneScale(options: UseSceneScaleOptions): SceneScale {
  const {
    vp, preset, anchor, physicsScaleDesign,
    physicsScaleDesignX, physicsScaleDesignY,
    centerSource = 'viewport', originSource = 'bottomLeft',
    centerX: customCX, centerY: customCY,
    customScaleX, customScaleY, customOriginX, customOriginY,
    originX: modeOriginX, originY: modeOriginY,
    physicsWidth, physicsHeight, refMagnitudes, maxVectorLength,
    centerLayout, intentionalNonUniformScale,
  } = options

  return useMemo(() => {
    // ── 参数校验 ──────────────────────────────────────────
    if (anchor === 'viewport' || anchor === 'design') {
      if (physicsWidth == null || physicsHeight == null) {
        throw new Error(`[useSceneScale] anchor "${anchor}" requires physicsWidth and physicsHeight`)
      }
    }
    if (anchor === 'center' && physicsScaleDesign == null && (physicsScaleDesignX == null || physicsScaleDesignY == null)) {
      throw new Error('[useSceneScale] anchor "center" requires physicsScaleDesign (or physicsScaleDesignX/Y)')
    }
    if (anchor === 'custom' && (customScaleX == null || customScaleY == null || customOriginX == null || customOriginY == null)) {
      throw new Error('[useSceneScale] anchor "custom" requires customScaleX, customScaleY, customOriginX, customOriginY')
    }
    if (originSource === 'custom' && (modeOriginX == null || modeOriginY == null)) {
      throw new Error('[useSceneScale] originSource "custom" requires originX and originY')
    }

    // ── 坐标计算 ──────────────────────────────────────────
    const visibleDesign = {
      x: (vp.visibleX - vp.tx) / vp.scale,
      y: (vp.visibleY - vp.ty) / vp.scale,
      width: vp.visibleW / vp.scale,
      height: vp.visibleH / vp.scale,
    }

    const viewportCenterDesign = {
      dx: (vp.centerX - vp.tx) / vp.scale,
      dy: (vp.centerY - vp.ty) / vp.scale,
    }

    // maxVectorLength 默认值（layout-aware）
    const getDefaultMaxVL = (w: number, h: number): number => {
      if (centerLayout === 'splitH') return Math.min(w * 0.45, h * 0.3)
      return Math.min(w, h) * 0.3
    }

    // ── anchor 分支 ────────────────────────────────────────
    switch (anchor) {
      case 'viewport': {
        const scaleX = visibleDesign.width / physicsWidth!
        const scaleY = visibleDesign.height / physicsHeight!
        let ox: number, oy: number
        if (originSource === 'topLeft') {
          ox = visibleDesign.x
          oy = visibleDesign.y
        } else if (originSource === 'center') {
          ox = viewportCenterDesign.dx
          oy = viewportCenterDesign.dy
        } else if (originSource === 'custom') {
          ox = modeOriginX!
          oy = modeOriginY!
        } else {
          // bottomLeft（默认）
          ox = visibleDesign.x
          oy = visibleDesign.y + visibleDesign.height
        }
        return {
          scaleX, scaleY,
          scale: Math.min(scaleX, scaleY),
          originX: ox, originY: oy,
          maxVectorLength: maxVectorLength ?? getDefaultMaxVL(visibleDesign.width, visibleDesign.height),
          refMagnitudes,
          intentionalNonUniformScale,
        }
      }

      case 'center': {
        const resolvedCX = centerSource === 'design'
          ? preset.width / 2
          : centerSource === 'custom' ? customCX! : viewportCenterDesign.dx
        const resolvedCY = centerSource === 'design'
          ? preset.height / 2
          : centerSource === 'custom' ? customCY! : viewportCenterDesign.dy
        const sx = physicsScaleDesignX ?? physicsScaleDesign!
        const sy = physicsScaleDesignY ?? physicsScaleDesign!
        const scale = Math.min(sx, sy)
        return {
          scaleX: sx, scaleY: sy, scale,
          originX: resolvedCX, originY: resolvedCY,
          maxVectorLength: maxVectorLength ?? getDefaultMaxVL(visibleDesign.width, visibleDesign.height),
          refMagnitudes,
          intentionalNonUniformScale: intentionalNonUniformScale ?? (sx !== sy),
        }
      }

      case 'design': {
        const scaleX = preset.width / physicsWidth!
        const scaleY = preset.height / physicsHeight!
        let ox: number, oy: number
        if (originSource === 'topLeft') {
          ox = 0; oy = 0
        } else if (originSource === 'center') {
          ox = preset.width / 2; oy = preset.height / 2
        } else if (originSource === 'custom') {
          ox = modeOriginX!; oy = modeOriginY!
        } else {
          // bottomLeft（默认）
          ox = 0; oy = preset.height
        }
        return {
          scaleX, scaleY,
          scale: Math.min(scaleX, scaleY),
          originX: ox, originY: oy,
          maxVectorLength: maxVectorLength ?? Math.min(preset.width, preset.height) * 0.3,
          refMagnitudes,
          intentionalNonUniformScale,
        }
      }

      case 'custom': {
        return {
          scaleX: customScaleX!,
          scaleY: customScaleY!,
          scale: Math.min(customScaleX!, customScaleY!),
          originX: customOriginX!,
          originY: customOriginY!,
          maxVectorLength: maxVectorLength ?? getDefaultMaxVL(visibleDesign.width, visibleDesign.height),
          refMagnitudes,
          intentionalNonUniformScale: intentionalNonUniformScale ?? (customScaleX !== customScaleY),
        }
      }
    }
  }, [
    vp.visibleX, vp.visibleY, vp.visibleW, vp.visibleH,
    vp.centerX, vp.centerY, vp.tx, vp.ty, vp.scale,
    preset, anchor, physicsScaleDesign,
    physicsScaleDesignX, physicsScaleDesignY,
    centerSource, originSource,
    customCX, customCY,
    customScaleX, customScaleY, customOriginX, customOriginY,
    modeOriginX, modeOriginY,
    physicsWidth, physicsHeight, refMagnitudes, maxVectorLength,
    centerLayout, intentionalNonUniformScale,
  ])
}
