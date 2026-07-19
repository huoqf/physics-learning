import { test, expect } from '@playwright/test';

/**
 * 电磁感应线框模型 —— 比例尺固定验证
 *
 * 修复前：调整 D 时 scale 反向变化，导致磁场视觉宽度恒定，线框宽度变化。
 * 修复后：使用固定比例尺（useSceneScale + worldToDesign），磁场与线框宽度
 *         均随参数真实变化，画面不缩放。
 */

test.describe('电磁感应线框模型 (anim-induction-loop-field)', () => {
  const gotoWithParams = async (page: any, overrides: Record<string, number>) => {
    const qs = new URLSearchParams(Object.entries(overrides).map(([k, v]) => [k, String(v)])).toString()
    await page.goto(`http://localhost:5173/#/animation/anim-induction-loop-field?${qs}`)
    await page.waitForSelector('svg', { timeout: 15000 })
    await page.waitForTimeout(1500)
  }

  test('磁场宽度随 D 真实变化（画面不缩放）', async ({ page }) => {
    const getMagWidth = async () => {
      const rect = page.locator('svg rect[fill="url(#magneticGlowGrad)"]').first()
      const w = await rect.getAttribute('width')
      return parseFloat(w!)
    }

    // 固定 loopWidth=2，确保始终满足窄线框条件 (d < D)，不会触发保护逻辑
    // D = 8 cm
    await gotoWithParams(page, { loopWidth: 2, fieldWidth: 8, dimensionPreset: 0 })
    const width8 = await getMagWidth()

    // D = 4 cm
    await gotoWithParams(page, { loopWidth: 2, fieldWidth: 4, dimensionPreset: 0 })
    const width4 = await getMagWidth()

    // D = 10 cm
    await gotoWithParams(page, { loopWidth: 2, fieldWidth: 10, dimensionPreset: 0 })
    const width10 = await getMagWidth()

    // D 减半，磁场宽度应接近减半（固定比例尺）
    expect(width4).toBeLessThan(width8 * 0.6)
    // D 增大，磁场宽度应明显增大
    expect(width10).toBeGreaterThan(width8 * 1.2)
  })

  test('线框宽度随 d 真实变化（画面不缩放）', async ({ page }) => {
    const getLoopWidth = async () => {
      const rect = page.locator('svg rect[fill="rgba(248, 250, 252, 0.35)"]').first()
      const w = await rect.getAttribute('width')
      return parseFloat(w!)
    }

    // 固定 fieldWidth=4，dimensionPreset=1（宽线框 d > D），不会触发保护逻辑
    // d = 8 cm
    await gotoWithParams(page, { loopWidth: 8, fieldWidth: 4, dimensionPreset: 1 })
    const width8 = await getLoopWidth()

    // d = 6 cm
    await gotoWithParams(page, { loopWidth: 6, fieldWidth: 4, dimensionPreset: 1 })
    const width6 = await getLoopWidth()

    // d = 2 cm（但 2 > 4 为 false，会触发保护，所以改用 dimensionPreset=0 并固定 D=10）
    await gotoWithParams(page, { loopWidth: 2, fieldWidth: 10, dimensionPreset: 0 })
    const width2 = await getLoopWidth()

    // d 缩小，线框宽度应明显减小
    expect(width2).toBeLessThan(width8 * 0.4)
    // d 接近，线框宽度应接近
    expect(width6).toBeGreaterThan(width8 * 0.6)
    expect(width6).toBeLessThan(width8 * 0.85)
  })
})
