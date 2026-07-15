import { test, expect } from '@playwright/test'

/**
 * 物理矢量箭头视觉回归测试
 *
 * 覆盖 Phase 4 迁移的关键动画页面，确保物理矢量箭头渲染正确：
 * - 箭头长度在 maxVectorLength 内（不溢出）
 * - 箭头方向正确（Y 轴翻转一次）
 * - 箭头起点与物理对象对齐
 */

const CRITICAL_ANIMATIONS = [
  // Phase 4 核心修复页面
  { id: 'anim-newton-second', name: 'NewtonSecond' },
  { id: 'anim-velocity', name: 'Velocity' },
  { id: 'anim-system-isolated', name: 'SystemIsolated' },
  { id: 'anim-orbit-transfer', name: 'OrbitTransfer' },
  { id: 'anim-kinematics-advanced', name: 'KinematicsAdvanced' },
  { id: 'anim-acceleration', name: 'Acceleration' },
  // Phase 4 迁移页面
  { id: 'anim-spring-force', name: 'SpringForce' },
  { id: 'anim-conveyor', name: 'Conveyor' },
  { id: 'anim-inclined-plane', name: 'InclinedPlane' },
  { id: 'anim-circular-models', name: 'CircularModels' },
  { id: 'anim-binary-stars', name: 'BinaryStars' },
]

/**
 * 物理动画有 60fps 动态效果（粒子、游标闪烁等），截图会有自然像素差异。
 * 容差设置：允许约 6% 的像素差异（动态效果），超过则视为异常（如箭头溢出）。
 */
const ANIMATION_DIFF_TOLERANCE = 50000

// 全局测试：每个关键动画页面截图
test.describe('Critical Animation Pages', () => {
  for (const anim of CRITICAL_ANIMATIONS) {
    test(`${anim.name} renders without overflow`, async ({ page }) => {
      // 访问动画页面（HashRouter）
      await page.goto(`/#/animation/${anim.id}`)

      // 等待页面完全加载（网络空闲 + SVG 出现）
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('svg', { timeout: 15000 })

      // 额外等待动画初始渲染稳定
      await page.waitForTimeout(2500)

      // 尝试暂停动画（如果页面支持）
      await page.evaluate(() => {
        // @ts-expect-error 页面可能有全局暂停函数
        if (window.__ANIMATION_PAUSER__) window.__ANIMATION_PAUSER__()
      })

      // 截图整个页面（整页截图尺寸更稳定）
      await expect(page).toHaveScreenshot(`${anim.name}-default.png`, {
        maxDiffPixels: ANIMATION_DIFF_TOLERANCE,
        animations: 'disabled',
      })
    })
  }
})

// 专项测试：NewtonSecondAnimation 矢量不溢出
test.describe('NewtonSecondAnimation Vector Overflow', () => {
  test('default parameters: snapshot baseline', async ({ page }) => {
    await page.goto('/#/animation/anim-newton-second')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('svg', { timeout: 15000 })
    await page.waitForTimeout(2500)

    // 截图验证（首次生成基准，后续对比）
    await expect(page).toHaveScreenshot('NewtonSecond-default.png', {
      maxDiffPixels: ANIMATION_DIFF_TOLERANCE,
      animations: 'disabled',
    })
  })

  test('extreme parameters: snapshot with high force', async ({ page }) => {
    await page.goto('/#/animation/anim-newton-second')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('svg', { timeout: 15000 })
    await page.waitForTimeout(1500)

    // 设置极端参数：F=50N, m=0.5kg -> a=100m/s²
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()

    if (sliderCount >= 2) {
      await sliders.nth(0).fill('50')  // F = 50N
      await sliders.nth(1).fill('0.5') // m = 0.5kg
    }

    await page.waitForTimeout(1500)

    // 截图验证
    await expect(page).toHaveScreenshot('NewtonSecond-extreme.png', {
      maxDiffPixels: ANIMATION_DIFF_TOLERANCE,
      animations: 'disabled',
    })
  })
})

// 专项测试：坐标转换正确性（通过视觉验证）
test.describe('Coordinate Transform Correctness', () => {
  test('VelocityAnimation: average velocity arrow visible', async ({ page }) => {
    await page.goto('/#/animation/anim-velocity')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('svg', { timeout: 15000 })
    await page.waitForTimeout(2500)

    // 平均速度箭头应该可见（非最小长度）
    await expect(page).toHaveScreenshot('Velocity-special.png', {
      maxDiffPixels: ANIMATION_DIFF_TOLERANCE,
      animations: 'disabled',
    })
  })
})
