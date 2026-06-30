import { useMemo } from 'react'

export interface ThinLensRayConfig {
  isValid: boolean
  mode: 0 | 1
  objSvgX: number
  uCm: number
  fSvgDist: number
  isReal: boolean
  imgH: number
  isConcave: boolean
  imgSvgX: number
  lensSvgX: number
  screenSvgX: number
  cy: number
  fCm: number
  candleH: number
  VIEW_WIDTH: number
  SCALE_CM: number
}

export function useThinLensRays(config: ThinLensRayConfig) {
  const {
    isValid, mode, objSvgX, uCm, fSvgDist, isReal, imgH, isConcave, imgSvgX, lensSvgX, screenSvgX, cy, fCm, candleH, VIEW_WIDTH, SCALE_CM
  } = config

  const rays = useMemo(() => {
    if (!isValid) return null

    const objTopY = cy - candleH
    const focalDist = fSvgDist
    const imgTopY = isReal ? cy + imgH : cy - imgH

    let r1_refracted: Array<{ x: number; y: number }> = []
    let r1_extended: Array<{ x: number; y: number }> = []

    let r2_refracted: Array<{ x: number; y: number }> = []
    let r2_extended: Array<{ x: number; y: number }> = []

    let r3_incident: Array<{ x: number; y: number }> = []
    let r3_refracted: Array<{ x: number; y: number }> = []
    let r3_extended: Array<{ x: number; y: number }> = []
    let r3_guide: Array<{ x: number; y: number }> = []

    const isCloseToFocus = !isConcave && Math.abs(uCm - fCm) < 0.5

    if (mode === 1) {
      // 共轭模式：光屏固定在 screenSvgX，折射光线汇聚至 x_focus 后射向屏幕
      // 1. 光线1：平行于主光轴 → 折射过右焦点
      const k1 = candleH / focalDist
      const y_end1 = objTopY + k1 * (screenSvgX - lensSvgX)
      r1_refracted = [
        { x: lensSvgX, y: objTopY },
        { x: screenSvgX, y: y_end1 }
      ]

      // 2. 光线2：过光心 → 方向不偏折
      const k2 = candleH / (lensSvgX - objSvgX)
      const y_end2 = cy + k2 * (screenSvgX - lensSvgX)
      r2_refracted = [
        { x: lensSvgX, y: cy },
        { x: screenSvgX, y: y_end2 }
      ]

      // 3. 光线3：过焦点 → 折射平行于主光轴
      if (!isCloseToFocus) {
        const y_lens3 = cy + (candleH * focalDist) / (uCm * SCALE_CM - focalDist)
        if (Math.abs(y_lens3 - cy) < 220) {
          r3_incident = [
            { x: objSvgX, y: objTopY },
            { x: lensSvgX - focalDist, y: cy },
            { x: lensSvgX, y: y_lens3 }
          ]
          r3_refracted = [
            { x: lensSvgX, y: y_lens3 },
            { x: screenSvgX, y: y_lens3 }
          ]
        }
      }
    } else {
      // 基础模式
      // 1. 光线1：平行光轴
      if (!isConcave) {
        if (isReal) {
          const x_end = Math.min(VIEW_WIDTH - 15, imgSvgX + 40)
          const k = (imgTopY - objTopY) / (imgSvgX - lensSvgX)
          const y_end = imgTopY + k * (x_end - imgSvgX)
          r1_refracted = [
            { x: lensSvgX, y: objTopY },
            { x: imgSvgX, y: imgTopY },
            { x: x_end, y: y_end }
          ]
        } else {
          const x_end = VIEW_WIDTH - 15
          const y_end = objTopY + (candleH / focalDist) * (x_end - lensSvgX)
          r1_refracted = [
            { x: lensSvgX, y: objTopY },
            { x: x_end, y: y_end }
          ]
          r1_extended = [
            { x: lensSvgX, y: objTopY },
            { x: imgSvgX, y: imgTopY }
          ]
        }
      } else {
        const x_end = VIEW_WIDTH - 15
        const y_end = objTopY + (-candleH / focalDist) * (x_end - lensSvgX)
        r1_refracted = [
          { x: lensSvgX, y: objTopY },
          { x: x_end, y: y_end }
        ]
        r1_extended = [
          { x: lensSvgX, y: objTopY },
          { x: imgSvgX, y: imgTopY },
          { x: lensSvgX - focalDist, y: cy }
        ]
      }

      // 2. 光线2：过光心
      const k_center = candleH / (lensSvgX - objSvgX)
      if (isReal) {
        const x_end = Math.min(VIEW_WIDTH - 15, imgSvgX + 40)
        const y_end = cy + k_center * (x_end - lensSvgX)
        r2_refracted = [
          { x: lensSvgX, y: cy },
          { x: imgSvgX, y: imgTopY },
          { x: x_end, y: y_end }
        ]
      } else {
        const x_end = VIEW_WIDTH - 15
        const y_end = cy + k_center * (x_end - lensSvgX)
        r2_refracted = [
          { x: lensSvgX, y: cy },
          { x: x_end, y: y_end }
        ]
        r2_extended = [
          { x: lensSvgX, y: cy },
          { x: imgSvgX, y: imgTopY }
        ]
      }

      // 3. 光线3：过焦点
      if (!isCloseToFocus) {
        if (!isConcave) {
          if (isReal) {
            const y_lens3 = cy + (candleH * focalDist) / (uCm * SCALE_CM - focalDist)
            if (Math.abs(y_lens3 - cy) < 220) {
              r3_incident = [
                { x: objSvgX, y: objTopY },
                { x: lensSvgX - focalDist, y: cy },
                { x: lensSvgX, y: y_lens3 }
              ]
              const x_end = Math.min(VIEW_WIDTH - 15, imgSvgX + 40)
              r3_refracted = [
                { x: lensSvgX, y: y_lens3 },
                { x: x_end, y: y_lens3 }
              ]
            }
          } else {
            const y_lens3 = cy - (candleH * focalDist) / (focalDist - uCm * SCALE_CM)
            if (Math.abs(y_lens3 - cy) < 220) {
              r3_incident = [
                { x: objSvgX, y: objTopY },
                { x: lensSvgX, y: y_lens3 }
              ]
              r3_guide = [
                { x: objSvgX, y: objTopY },
                { x: lensSvgX - focalDist, y: cy }
              ]
              const x_end = VIEW_WIDTH - 15
              r3_refracted = [
                { x: lensSvgX, y: y_lens3 },
                { x: x_end, y: y_lens3 }
              ]
              r3_extended = [
                { x: lensSvgX, y: y_lens3 },
                { x: imgSvgX, y: y_lens3 }
              ]
            }
          }
        } else {
          const y_lens3 = cy - (candleH * focalDist) / (uCm * SCALE_CM + focalDist)
          if (Math.abs(y_lens3 - cy) < 220) {
            r3_incident = [
              { x: objSvgX, y: objTopY },
              { x: lensSvgX, y: y_lens3 }
            ]
            r3_guide = [
              { x: lensSvgX, y: y_lens3 },
              { x: lensSvgX + focalDist, y: cy }
            ]
            const x_end = VIEW_WIDTH - 15
            r3_refracted = [
              { x: lensSvgX, y: y_lens3 },
              { x: x_end, y: y_lens3 }
            ]
            r3_extended = [
              { x: lensSvgX, y: y_lens3 },
              { x: imgSvgX, y: y_lens3 }
            ]
          }
        }
      }
    }

    return {
      r1: { incident: [{ x: objSvgX, y: objTopY }, { x: lensSvgX, y: objTopY }], refracted: r1_refracted, extended: r1_extended },
      r2: { incident: [{ x: objSvgX, y: objTopY }, { x: lensSvgX, y: cy }], refracted: r2_refracted, extended: r2_extended },
      r3: { incident: r3_incident, refracted: r3_refracted, extended: r3_extended, guide: r3_guide },
      imgTopY
    }
  }, [isValid, mode, objSvgX, uCm, fSvgDist, isReal, imgH, isConcave, imgSvgX, lensSvgX, screenSvgX, cy, fCm, candleH, VIEW_WIDTH, SCALE_CM])

  return rays
}
